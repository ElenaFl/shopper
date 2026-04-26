import React, { useContext, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSaved } from "../../../context/save/useSaved.js";
import { CartContext } from "../../../context/cart/CartContext.jsx";

/**
 * Card — карточка товара.
 *
 * @param {Object} props
 * @param {Object} props.details - Объект с данными продукта.
 * @param {(number|string)} [props.details.id] - Идентификатор продукта.
 * @param {(number|string)} [props.details.product_id] - Альтернативное поле идентификатора.
 * @param {string} [props.details.title] - Название продукта.
 * @param {string} [props.details.name] - Альтернативное название.
 * @param {(number|string)} [props.details.price] - Базовая цена продукта.
 * @param {(number|string)} [props.details.final_price] - Итоговая (финальная) цена (при наличии — авторитетна).
 * @param {string} [props.details.currency] - Код валюты (ISO 3-letter).
 * @param {string} [props.details.currency_code] - Альтернативное поле кода валюты.
 * @param {string} [props.details.img_url] - URL изображения (приоритет).
 * @param {string} [props.details.img] - Локальный путь изображения (альтернатива).
 * @param {Object|string|number} [props.details.discount] - Объект/значение скидки (если есть). Ожидается структура { id, type, value, percent, price_after, ... } или поле discount_percent.
 * @param {(string|number)} [props.details.discount_percent] - Процент скидки в стороннем формате.
 * @param {(number|string)} [props.details.unit_price] - Цена за единицу (если отличается от displayPrice).
 * @param {string} [props.details.sku] - Артикул (SKU).
 *
 * @param {Object} [props.size] - Размеры для рендеринга карточки.
 * @param {(number|string)} [props.size.width] - Ширина в px (число или строка-число).
 * @param {(number|string)} [props.size.height] - Высота в px.
 * @param {(number|string)} [props.size.heightImg] - Высота области изображения в px.
 *
 * @param {string} [props.className=""] - Дополнительные CSS-классы для корневого контейнера.
 * @param {Object} [props.style={}] - Дополнительный inline-стиль для корневого контейнера.
 * @param {(function)} [props.onOpenDetails] - Колбэк открытия детализации товара; вызывается как onOpenDetails(id).
 *
 * Контекст/хуки:
 * - Использует useSaved() для работы с сохранёнными товарами: ожидает { items, save, remove, add }.
 * - Получает addToCart из CartContext для добавления товара в корзину.
 *
 * Поведение:
 * - displayPrice = details.final_price ?? details.price
 * - Если details.discount или discount_percent есть — отображается метка скидки; при отсутствии серверного поля вычисляется процент из цен как fallback.
 * - Кнопка добавления в корзину вызывает addToCart({ id, title, price, img, quantity, sku }).
 * - Внутренний div ведёт себя как кнопка: role="button", tabIndex=0, обработка Enter/Space.
 */

// форматирование отображения цены
//  принимает value (число/строка/null) и currency (код валюты). Возвращает строку для отображения("$1,234.56" или "1 234,56 €" в зависимости от локали, Intel - класс для форматирования(валют и др.)).
const formatMoney = (value, currency) => {
  if (value == null) return "";
  try {
    if (currency && typeof currency === "string" && currency.length === 3) {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value));
    }
  } catch (e) {
    console.error("formatMoney Intl error:", e);
  }
  return Number(value).toFixed(2) + (currency ? ` ${currency}` : "");
};

// возвращает картинку или плейсхолдер
const safeImg = (details) =>
  details?.img_url ?? details?.img ?? "/images/placeholder.png";

// React.memo - (кеширует(запоминает для экономии вычислений) последний результат рендера для данных пропсов: компонент будет ре-рендериться только если props изменились по shallow-сравнению(поверхностное сравнение по значению пропсов))
export const Card = React.memo((props) => {
  // берём объект деталей продукта (d) из props.details; если нет — пустой объект (чтобы избежать ошибок при доступе к полям)
  const d = props.details || {};
  // для установления значения переменной id используем d.id, если он задан; иначе, если он null/undefined, то через оператор нулевого слияния (??) используем d.product_id (для нормализации данных, если данные поступят не из объекта продукта из ProductController, а из объекта сохраненного товара. например)
  const id = d.id ?? d.product_id;
  const title = d.title ?? d.name ?? "";
  const origPrice = d.price != null ? Number(d.price) : null;
  const finalPrice = d.final_price != null ? Number(d.final_price) : null;
  const currency = d.currency ?? d.currency_code ?? null;
  const imgSrc = safeImg(d);

  const { width, height, heightImg } = props.size || {};
  // деструктурируем дополнительные props: className (по умолчанию пустая строка), style (по умолчанию пустой объект) и onOpenDetails (функция, если передана)
  const { className = "", style = {}, onOpenDetails } = props;

  // используем хук useSavedItems (кастомный) для работы с сохранёнными товарами; передаём user из props. Получаем массив items и операции save/remove/add
  // кастомный хук useSavedItems возвращает массив сохраненных товаров items и операции save/remove/add
  const { items, save, remove, add } = useSaved();
  const savedEntry = items.find((s) => String(s.product_id) === String(id));
  const savedActive = Boolean(savedEntry);

  const { addToCart } = useContext(CartContext);

  const displayPrice = finalPrice ?? origPrice;
  const hasDiscount =
    finalPrice != null && origPrice != null && origPrice > finalPrice;
  const discountLabel =
    d.discount?.percent ??
    d.discount_percent ??
    (hasDiscount
      ? `${Math.round(((origPrice - displayPrice) / origPrice) * 100)}%`
      : null);

  const unitForCart = d.unit_price ?? displayPrice ?? origPrice ?? 0;

  // обработчик клика по кнопке «в корзину» на карточке товара. Его задачи: Предотвратить побочный эффект клика по карточке. e?.stopPropagation() останавливает всплытие события, чтобы родительский onClick (открытие страницы товара) не срабатывал.
  // useCallback(fn, deps (зависимости)-[id, title, unitForCart, imgSrc, d.sku, addToCart]) возвращает мемоизированную версию функции fn, которая сохраняется между рендерами, пока не изменится хотя бы одна зависимость из deps.
  const handleAddToCartClick = useCallback(
    (e) => {
      //защито от отсутствия addToCart()
      if (typeof addToCart !== "function")
        return console.warn("addToCart not available");
      e?.stopPropagation();
      // вызывает addToCart из CartContext, передает в нее аргументы
      addToCart({
        id: Number(id),
        title,
        price: Number(unitForCart),
        img: imgSrc,
        quantity: 1,
        sku: d.sku ?? null,
      });
    },
    [id, title, unitForCart, imgSrc, d.sku, addToCart],
  );

  return (
    <div
      className={`cursor-pointer ${className}`}
      style={{ width: `${width}px`, height: `${height}px`, ...style }}
      onClick={() => onOpenDetails && onOpenDetails(id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetails && onOpenDetails(id);
        }
      }}
    >
      <div
        style={{ height: `${heightImg}px` }}
        className="relative rounded-lg mb-6 overflow-hidden group border-1 border-taupe-100"
      >
        <img
          loading="lazy"
          src={imgSrc}
          alt={title || ""}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="flex items-center gap-x-7.5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition duration-300 group-hover:opacity-100 group-hover:scale-105">
          <button
            type="button"
            className="btn"
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCartClick(e);
            }}
            aria-label="Add to cart"
          >
            <img src="/images/shoppingCart.svg" alt="shopping-cart" />
          </button>

          <Link
            to={`/products/${id}`}
            className="btn"
            onClick={(e) => e.stopPropagation()}
          >
            <img src="/images/eye.svg" alt="eye" />
          </Link>

          <button
            type="button"
            className="btn"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                if (!id) return alert("Нет продукта");
                if (savedActive) {
                  await remove({
                    savedId: savedEntry?.id ?? null,
                    productId: id,
                  });
                } else {
                  await save(id, d);
                  if (typeof add === "function") add(d, 1);
                }
              } catch (err) {
                console.error("save toggle error", err);
                alert(err?.message || "Error saving item");
              }
            }}
            aria-label={savedActive ? "Unsave product" : "Save product"}
          >
            <img
              src={savedActive ? "/images/heard-fill.svg" : "/images/heart.svg"}
              alt="heart"
            />
          </button>
        </div>
      </div>

      <p className="text-xl mb-4">{title}</p>

      <div>
        {hasDiscount ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                color: "#6b7280",
                textDecoration: "line-through",
                marginRight: 8,
              }}
              aria-label={`Old price ${formatMoney(origPrice, currency)}`}
              title={`Old price ${formatMoney(origPrice, currency)}`}
            >
              {formatMoney(origPrice, currency) || ""}
            </span>

            <span style={{ color: "red", fontWeight: 700 }}>
              {formatMoney(displayPrice, currency) || ""}
            </span>

            {discountLabel && (
              <span style={{ marginLeft: 8, color: "green" }}>
                {discountLabel}
              </span>
            )}
          </div>
        ) : (
          <div style={{ color: "#6b7280", fontWeight: 600 }}>
            {formatMoney(displayPrice, currency) || ""}
          </div>
        )}
      </div>
    </div>
  );
});
