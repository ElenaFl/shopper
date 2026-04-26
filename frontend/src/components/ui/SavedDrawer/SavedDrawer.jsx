import React, { useEffect, useContext, useState, useRef, useMemo } from "react";
import { useSaved } from "../../../context/save/useSaved.js";
import { CartContext } from "../../../context/cart/CartContext.jsx";
import { Drawer } from "../Drawer/Drawer.jsx";
import { Counter } from "../Counter/Counter";

/**
 * SavedDrawer — панель «Сохранённые» товары.
 *
 * @param {Object} props - компонент использует контексты;
 * @param {Array<SavedItemSnapshot>} [props.items] - список сохранённых элементов (для тестов)
 * @param {(itemId:number)=>void} [props.addToCart] - функция добавления в корзину (используется CartContext) *
 *
 * Назначение:
 * - Отображает список сохранённых товаров (из useSaved) в выдвигаемой панели (Drawer).
 * - Позволяет управлять количеством, удалять элементы, переносить все сохранённые в корзину.
 * - При отображении использует кэширование запросов к серверу для получения актуальных данных о товаре и ценах.
 *
 * Основные принципы ценовой политики:
 * - Всегда предпочитать серверно-авторитетное значение цены (product.final_price или product.discount.price_after).
 * - Если серверные данные недоступны — использовать snapshot/entry-данные из сохранённого элемента (entry.price_after / entry.price).
 * - В качестве финального fallback вычислять цену из snapshot через computePriceFromSnapshot.
 * - Кешировать полученные данные по productId с коротким TTL (по умолчанию 5 минут).
 *
 * Props / контексты:
 * - Компонент не принимает пропсы напрямую, но использует:
 *   - useSaved() — список saved элементов и методы (items, open, setOpen, remove, increase, decrease, total, clear, loading, load).
 *   - CartContext — для добавления в корзину (addToCart).
 *   - useAuth() — данные пользователя (user) при необходимости.
 *
 * Поведение:
 * - При открытии панели (open === true) выполняется фоновая подгрузка недостающих product-данных (non-blocking).
 * - При клике Add to cart — перебираются все saved items, для каждого определяется эффективная цена (getEffectivePrice)
 *   и формируется объект cartItem, который добавляется в корзину через addToCart. Затем saved очищаются (clear()).
 * - Есть локальный productCache для уменьшения количества запросов к API.
 *
 * Безопасность и отказоустойчивость:
 * - Все сетевые вызовы защищены try/catch и возвращают null при ошибках.
 * - Кэш читается через ref (cacheRef) чтобы избежать проблем c замыканиями внутри async функций.
 *
 */

/* (Time To Live, буквально «время жизни») для кеша product данных (5 минут)
  задаёт длительность (обычно в секундах или миллисекундах), в течение которой закэшированные данные считаются валидными; чтобы не держать устаревшую информацию в кеше слишком долго и периодически запрашивать актуальные данные с сервера
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * computePriceFromSnapshot — вычисляет цену по snapshot/product-данным.
 * - берёт orig из price / price_amount.
 * - поддерживает discount.type === 'percent' и 'fixed'.
 * - Возвращает Number (0 в случае ошибки/отсутствия данных). *
 * @returns {number} вычисленная цена (float)
 */

function computePriceFromSnapshot(s = {}) {
  const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // original price
  const orig = toNumber(s.price ?? s.price_amount ?? null);

  // discount — либо объект или массив (сервер обычно отдаёт объект discountPayload)
  const discount = Array.isArray(s.discount)
    ? s.discount[0]
    : (s.discount ?? null);

  if (discount) {
    // если сервер уже прислал готовую цену после скидки — используем её
    const serverPriceAfter = toNumber(discount.price_after ?? null);
    if (serverPriceAfter != null) return serverPriceAfter;

    // иначе: если есть тип/значение и у нас есть orig — применим простую логику
    const type = discount.type ?? null;
    const val = toNumber(
      discount.value ?? discount.amount ?? discount.percent ?? null,
    );
    if (type && val != null && orig != null) {
      if (type === "percent") {
        return Math.max(0, Number((orig * (1 - val / 100)).toFixed(2)));
      }
      if (type === "fixed") {
        return Math.max(0, Number((orig - val).toFixed(2)));
      }
    }
  }
  // orig or 0
  return orig != null ? orig : 0;
}

export const SavedDrawer = () => {
  // деструктуризация возвращаемого значения из кастомного хука useSaved().
  // возвращает объект (или массив с объектом), в котором есть методы и состояния, связанные со списком сохранённых элементов;
  const { items, open, setOpen, remove, increase, decrease, clear, loading } =
    useSaved();

  // создаёт локальный state-объект productCache и одновременно держит его актуальную копию в ref (cacheRef).
  //  Цель — иметь и реактивный state (чтобы React рендерил компонент при изменениях), и стабильный доступ к актуальным данным внутри асинхронных функций без проблем с замыканиями
  const [productCache, setProductCache] = useState({}); // объект кеша

  // создаётся ref, который изначально содержит текущее значение productCache.
  // ref останется одной и той же ссылкой между рендерами, поэтому его можно безопасно читать внутри async-функций/эффектов без риска использования «устаревшего» замкнутого значения.
  const cacheRef = useRef(productCache);

  // синхронизирует ref с state при каждом изменении productCache.
  // благодаря этому внутри любых асинхронных обработчиков можно читать cacheRef.current и получить самое свежее состояние кеша, даже если функция была создана в более раннем рендере (избегаете проблемы stale closure).
  useEffect(() => {
    cacheRef.current = productCache;
  }, [productCache]);

  // подсчёт числа сохранённых элементов.
  // если items не массив (например, undefined), возвращаем 0, чтобы избежать ошибок в рендере.
  const localCount = Array.isArray(items) ? items.length : 0;
  // берём функцию addToCart из контекста корзины.
  // она используется в localMoveToCart для добавления сформированных элементов в корзину.
  const { addToCart } = useContext(CartContext);

  // эффект подписывается на глобальное DOM-событие "saved:moveToCartPending".
  // цель: при запуске этого события открыть drawer (setOpen(true)) из любого места приложения.
  // используем именованную функцию onPending, чтобы корректно отписаться в cleanup.
  // зависимость [setOpen] гарантирует, что при изменении функции setOpen подписка обновится.
  useEffect(() => {
    const onPending = () => setOpen(true);
    window.addEventListener("saved:moveToCartPending", onPending);
    return () =>
      window.removeEventListener("saved:moveToCartPending", onPending);
  }, [setOpen]);

  // чтение из кеша через cacheRef (а не напрямую из state) позволяет получить актуальное значение внутри асинхронных функций.
  // проверяем TTL: если запись свежая — возвращаем cached.data (быстрый путь, без сетевого запроса).
  // в catch игнорируем любые ошибки чтения кеша — безопасный fallback к сетевому запросу.
  const fetchProduct = async (pid) => {
    if (!pid) return null;
    try {
      const cached = cacheRef.current?.[pid];
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return cached.data;
      }
    } catch (e) {
      // ignore cache read errors
    }
    // формируем URL API из переменных окружения (Vite). Если переменная не задана — используем локальный fallback.
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";
      const res = await fetch(`${API_BASE}/api/products/${pid}`, {
        credentials: "include", // отправляем cookie/сессию, если требуется аутентификация
        headers: { Accept: "application/json" }, // ожидаем JSON
      });
      if (!res.ok) return null; // если ответ с ошибкой — возвращаем null (не ломаем поток)
      const json = await res.json().catch(() => null); // безопасный parse JSON (возвращает null при ошибке парсинга)
      const product = (json && (json.data ?? json)) || null; // нормализуем формат: api может отдавать { data: ... } или сам объект
      // сохраняем в локальный кеш с таймстампом
      if (product) {
        setProductCache((prev) => ({
          ...(prev || {}),
          [pid]: { data: product, ts: Date.now() },
        }));
      }
      return product; // возвращаем объект продукта или null
    } catch {
      return null; // при сетевой/прочей ошибке возвращаем null
    }
  };

  const getEffectivePrice = (entry, productData) => {
    const prod = productData ?? entry?.product ?? {};
    if (
      prod?.final_price != null &&
      Number.isFinite(Number(prod.final_price))
    ) {
      return Number(prod.final_price);
    }
    const serverDiscountPrice =
      prod?.discount?.price_after ?? prod?.discounts?.[0]?.price_after ?? null;
    if (
      serverDiscountPrice != null &&
      Number.isFinite(Number(serverDiscountPrice))
    ) {
      return Number(serverDiscountPrice);
    }
    if (
      entry?.price_after != null &&
      Number.isFinite(Number(entry.price_after))
    ) {
      return Number(entry.price_after);
    }
    return computePriceFromSnapshot({
      ...prod,
      ...entry,
      price: prod?.price ?? entry?.price,
    });
  };

  const localMoveToCart = async () => {
    if (!items || items.length === 0) return;
    for (const it of items) {
      const pid = Number(it.product?.id ?? it.product_id);
      if (!pid) {
        console.warn("SavedDrawer: missing product id on saved item", it);
        continue;
      }
      const cached = cacheRef.current?.[pid]?.data ?? it.product ?? null;
      const unit = getEffectivePrice(it, cached);
      const cartItem = {
        id: pid,
        title: cached?.title ?? it.product?.title ?? it.title ?? "",
        price: Number(unit),
        img:
          cached?.img ??
          cached?.img_url ??
          it?.product?.img ??
          it?.product?.img_url ??
          "/images/placeholder.png",
        quantity: it.qty ?? 1,
        sku: cached?.sku ?? it?.product?.sku ?? it?.product?.SKU ?? null,
      };
      try {
        addToCart(cartItem);
      } catch (e) {
        console.error("SavedDrawer: addToCart failed", e);
      }
    }
    try {
      await clear();
    } catch (e) {
      console.warn("SavedDrawer: clear() failed", e);
    }
    setOpen(false);
  };

  useEffect(() => {
    let cancelled = false;
    const loadMissing = async () => {
      if (!open) return;
      if (!Array.isArray(items) || !items.length) return;
      const missing = [];
      for (const it of items) {
        const pid = Number(it.product?.id ?? it.product_id);
        if (!pid) continue;
        const cached = cacheRef.current?.[pid];
        if (!cached || Date.now() - cached.ts > CACHE_TTL) missing.push(pid);
      }
      if (!missing.length) return;
      const results = {};
      for (const pid of missing) {
        if (cancelled) return;
        const p = await fetchProduct(pid);
        if (p) results[pid] = { data: p, ts: Date.now() };
      }
      if (!cancelled && Object.keys(results).length)
        setProductCache((prev) => ({ ...(prev || {}), ...results }));
    };
    loadMissing();
    return () => {
      cancelled = true;
    };
  }, [open, items]);

  const { rows, computedTotal } = useMemo(() => {
    console.log("SavedDrawer memo items:", items);
    console.log("productCache:", productCache);

    let accTotal = 0;
    const accRows = [];

    if (!Array.isArray(items) || !items.length)
      return { rows: [], computedTotal: 0 };

    for (const it of items) {
      const pid = Number(it.product?.id ?? it.product_id);
      const cached = productCache[pid]?.data ?? it.product ?? null;

      const unitRaw = getEffectivePrice(it, cached);
      const unitNum = Number.isFinite(Number(unitRaw)) ? Number(unitRaw) : null;
      const qty = Number.isFinite(Number(it.qty)) ? Number(it.qty) : 1;
      const lineTotal = unitNum != null ? unitNum * qty : 0;

      accTotal += lineTotal;

      const imgRaw =
        cached?.img ??
        cached?.img_url ??
        it?.product?.img ??
        it?.product?.img_url;
      const imgSrc = imgRaw
        ? imgRaw.startsWith("http")
          ? imgRaw
          : imgRaw.startsWith("/")
            ? window.location.origin + imgRaw
            : window.location.origin + "/" + imgRaw
        : "/images/placeholder.png";
      const titleText =
        cached?.title ?? it?.product?.title ?? it?.product?.name ?? "";

      accRows.push(
        <div
          key={it.id != null ? `s-${it.id}` : `g-${it.product_id}`}
          className="flex items-center gap-3 py-3 border-b"
        >
          <img
            src={imgSrc}
            alt={titleText}
            className="w-16 h-16 object-cover rounded"
          />
          <div className="flex-1">
            <div className="font-medium">{titleText}</div>
            <div className="text-sm text-gray-600">
              {unitNum != null ? Number(unitNum).toFixed(2) : "0.00"} each
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-28">
              <Counter
                count={it.qty ?? 1}
                min={1}
                onChange={(next) => {
                  const current = Number(it.qty ?? 1);
                  const delta = Number(next) - current;
                  if (delta > 0) increase(it.id ?? it.product_id, delta);
                  else if (delta < 0) decrease(it.id ?? it.product_id, -delta);
                }}
                className="w-full"
              />
            </div>

            <div className="px-3 font-semibold">
              {Number(lineTotal).toFixed(2)}
            </div>

            <button
              className="text-gray-500 px-2"
              onClick={async () => {
                try {
                  const isServerId = Number.isFinite(Number(it.id));
                  if (isServerId) await remove({ savedId: it.id });
                  else {
                    const pid2 = it.product?.id ?? it.product_id ?? null;
                    if (pid2 == null)
                      console.warn(
                        "SavedDrawer: cannot remove item, no id/productId",
                        it,
                      );
                    else await remove({ productId: pid2 });
                  }
                } catch (err) {
                  console.error("remove failed", err);
                }
              }}
            >
              ✕
            </button>
          </div>
        </div>,
      );
    }

    return { rows: accRows, computedTotal: accTotal };
  }, [items, productCache, increase, decrease, remove]);

  return (
    <Drawer
      isOpen={open}
      onClose={() => setOpen(false)}
      align="right"
      title="Saved products"
    >
      <div className="p-0">
        <div
          className="p-4 overflow-auto"
          style={{ maxHeight: "calc(100% - 140px)" }}
        >
          {items.length === 0 ? (
            <div className="text-sm text-gray-500">No saved products</div>
          ) : (
            rows
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex justify-between mb-3">
            <div>{localCount} products</div>
            <div className="font-semibold">
              {Number.isFinite(computedTotal)
                ? computedTotal.toFixed(2)
                : "0.00"}
            </div>
          </div>
          <button
            onClick={localMoveToCart}
            disabled={items.length === 0 || loading}
            className="w-full py-3 bg-black text-white disabled:opacity-50"
          >
            {loading ? "Processing..." : "ADD TO CART"}
          </button>
        </div>
      </div>
    </Drawer>
  );
};
