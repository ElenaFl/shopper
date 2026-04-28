import React, { useContext, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../context/cart/CartContext.jsx";
import { Counter } from "../components/ui/Counter/Counter.jsx";
import { Select } from "../components/ui/Select/Select.jsx";
import { computeDiscount } from "../utils/coupons.js";
import { useAuth } from "../context/auth/useAuth.js";

/**
 * Cart - компонент Корзина для товаров.
 *
 * Отображает товары в корзине, позволяет изменить количество, удалить позицию, выбрать адрес доставки (страна/город/индекс), рассчитать стоимость доставки, применить купон и перейти к оформлению заказа.
 * Выполняет локальную и серверную валидацию наличия товаров перед обновлением.
 * Использует sessionStorage для сохранения snapshot при переходе к оформлению (если пользователь не авторизован).
 *
 * Ключевые состояния (useState):
 *
 * couponCode: вводимый код купона
 * couponApplying: флаг применения купона (запрос)
 * appliedCoupon: объект применённого купона или null
 * discountAmount: сумма скидки (число)
 * couponError: сообщение об ошибке купона
 * selectedCountry, selectedCity, selectedPostal: выбранные значения адреса
 * applied: флаг — пользователь нажал UPDATE TOTALS и расчёт применён
 * shipping: рассчитанная стоимость доставки
 * isProcessing: флаг обработки при proceed to checkout
 * showAuthModal: отображение модального окна для логина
 */
export const Cart = () => {
  // Код вводимого купона (строка)
  const [couponCode, setCouponCode] = useState("");

  // Флаг: сейчас идёт попытка применения купона (запрос/ожидание)
  const [couponApplying, setCouponApplying] = useState(false);

  // Объект применённого купона или null (пример: { code, type, value, description, minTotal })
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Сумма скидки в денежном выражении, вычисляется на основе appliedCoupon и subtotal
  const [discountAmount, setDiscountAmount] = useState(0);

  // Сообщение об ошибке при применении купона (показывать пользователю)
  const [couponError, setCouponError] = useState("");

  //Даёт доступ к cart, removeFromCart, updateQuantity, и некоторым полям/функциям контекста (ctxCountry, ctxShippingCountry, address, setShippingCountry)
  const {
    cart,
    removeFromCart,
    updateQuantity,
    country: ctxCountry,
    shippingCountry: ctxShippingCountry,
    address,
    setShippingCountry,
  } = useContext(CartContext);

  // локальные выбранные значения адреса (Select).
  const [selectedCountry, setSelectedCountry] = useState(
    ctxShippingCountry || ctxCountry || address?.country || "",
  );
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedPostal, setSelectedPostal] = useState("");

  //  флаг - пользователь нажал UPDATE TOTALS и расчёт применён
  const [applied, setApplied] = useState(false);

  // рассчитанная стоимость доставки (устанавливается по UPDATE TOTALS)
  const [shipping, setShipping] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // синхронизирует локальное состояние selectedCountry с данными из контекста (или адреса), когда контекст содержит непустое значение.
  useEffect(() => {
    const c = ctxShippingCountry || ctxCountry || address?.country || "";
    if (c && c !== selectedCountry) {
      setSelectedCountry(c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxShippingCountry, ctxCountry, address]);

  // сумма всех позиций: sum(price * quantity)
  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0),
        0,
      ),
    [cart],
  );

  // total = subtotal + shipping
  const total = useMemo(() => {
    const sub = Number(subtotal) || 0;
    const ship = Number(shipping) || 0;
    const disc = Number(discountAmount) || 0;
    return Math.max(0, sub - disc + ship);
  }, [subtotal, shipping, discountAmount]);

  // динамический список городов для выбранной страны (мемоизируется чтобы ссылка была стабильна)
  const citiesByCountry = useMemo(
    () => ({
      Russia: ["Moscow", "Saint Petersburg"],
      Belarus: ["Minsk"],
      USA: ["New York"],
      India: ["Delhi"],
      Other: [],
    }),
    [],
  );

  const cityOptions = useMemo(() => {
    const list = citiesByCountry[selectedCountry] || [];
    const base = [{ value: "", label: "SELECT A CITY" }];
    return base.concat(list.map((c) => ({ value: c, label: c })));
  }, [selectedCountry, citiesByCountry]);

  //  правила для разных стран/городов (с разными тарифами). Возвращает число (стоимость).
  const computeShipping = (country = "", city = "") => {
    if (subtotal <= 0) return 0;

    const c = (country || "").toString().trim().toLowerCase();
    const ci = (city || "").toString().trim().toLowerCase();

    // Россия
    if (c === "russia" || c === "россия" || c === "рф") {
      if (ci === "moscow" || ci === "москва") return 22;
      if (
        ci === "saint petersburg" ||
        ci === "st petersburg" ||
        ci === "st. petersburg" ||
        ci === "санкт-петербург"
      )
        return 32;
      return 22; // default Russia
    }

    // Беларусь
    if (c === "belarus" || c === "беларусь") {
      if (ci === "minsk" || ci === "минск") return 51;
      return 51; // default Belarus -> 51
    }

    // Индия
    if (c === "india" || c === "индия") {
      if (ci === "delhi" || ci === "дели") return 80;
      return 80;
    }

    // USA
    if (
      c === "usa" ||
      c === "us" ||
      c === "united states" ||
      c === "united states of america"
    ) {
      if (ci === "new york" || ci === "nyc" || ci === "new-york") return 100;
      return 100;
    }

    return 100;
  };

  // проверка, что выбранный город разрешён для страны
  const isValidPair = (country, city) => {
    if (!country || !city) return false;
    const allowed = (citiesByCountry[country] || []).map((s) =>
      s.toLowerCase(),
    );
    return allowed.length > 0 && allowed.includes((city || "").toLowerCase());
  };

  // обновляют локальные значения и сбрасывают applied (пользователь должен снова нажать UPDATE TOTALS).
  const handleCountryChange = (val) => {
    setSelectedCountry(val);
    setSelectedCity("");
    setSelectedPostal(""); // сбрасываем индекс при смене страны
    setApplied(false);
  };
  const handleCityChange = (val) => {
    setSelectedCity(val);
    setApplied(false);
  };
  const handlePostalChange = (val) => {
    setSelectedPostal(val);
    setApplied(false);
  };

  // проверяет, что страна/город/индекс выбраны и что пара city/country валидна, затем вычисляет shipping = computeShipping(...) и помечает applied = true. При наличии setShippingCountry — записывает страну в контекст.
  const handleUpdateTotals = () => {
    if (!selectedCountry) {
      alert("Please select a country.");
      return;
    }
    if (!selectedCity) {
      alert("Please select a city.");
      return;
    }
    if (!selectedPostal) {
      alert("Please select a post code / zip.");
      return;
    }
    if (!isValidPair(selectedCountry, selectedCity)) {
      alert(
        "Selected city does not belong to selected country. Please choose a valid city.",
      );
      return;
    }

    const computed = computeShipping(selectedCountry, selectedCity);
    setShipping(computed);
    setApplied(true);
    if (typeof setShippingCountry === "function") {
      setShippingCountry(selectedCountry);
    }
  };

  // следит за subtotal и очищает selectedCountry/city/postal, shipping и applied, а также сбрасывает контекстную страну, если корзина стала пустой — чтобы не оставлять устаревшие данные.
  useEffect(() => {
    if (subtotal <= 0) {
      if (shipping !== 0) setShipping(0);
      if (applied !== false) setApplied(false);
      if (selectedCountry !== "") setSelectedCountry("");
      if (selectedCity !== "") setSelectedCity("");
      if (selectedPostal !== "") setSelectedPostal("");
      if (typeof setShippingCountry === "function") {
        const ctxHasCountry = Boolean(
          ctxShippingCountry || ctxCountry || address?.country,
        );
        if (ctxHasCountry) setShippingCountry("");
      }
    }
  }, [
    subtotal,
    shipping,
    applied,
    selectedCountry,
    selectedCity,
    selectedPostal,
    setShippingCountry,
    ctxShippingCountry,
    ctxCountry,
    address,
  ]);

  // -------------------------------
  // Валидация наличия (Update Cart)
  // -------------------------------

  // проверяет локально, есть ли у товара поле stock; если requested > stock — возвращает список проблем.
  const validateLocalStock = () => {
    const updates = []; // { id, title, requested, available }
    cart.forEach((p) => {
      const stock = p.stock === undefined ? undefined : Number(p.stock);
      if (!Number.isNaN(stock) && stock >= 0) {
        const requested = Number(p.quantity) || 0;
        if (requested > stock) {
          updates.push({
            id: p.id,
            title: p.title,
            requested,
            available: stock,
          });
        }
      }
    });
    return updates;
  };

  // отправляет POST /api/cart/validate и ожидает [{id, availableQuantity}] — для проверки наличия на сервере.
  const validateServerStock = async (items) => {
    // adapt endpoint & response format to your backend
    try {
      const res = await fetch("/api/cart/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json(); //  [{ id, availableQuantity }]
      return { ok: true, data };
    } catch (err) {
      console.error("Server validation error:", err);
      return { ok: false, error: err.message || String(err) };
    }
  };

  // если есть локальные проблемы — применяет коррекции (updateQuantity/removeFromCart) и уведомляет пользователя.иначе вызывает серверную проверку и аналогично применяет изменения или сообщает ошибку.если всё ок — сообщает, что корзина обновлена.
  const handleUpdateCart = async () => {
    if (!cart || cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    const localUpdates = validateLocalStock();
    if (localUpdates.length > 0) {
      localUpdates.forEach((u) => {
        if (u.available > 0) {
          updateQuantity(u.id, u.available);
        } else {
          removeFromCart(u.id);
        }
      });

      const msgs = localUpdates.map((u) =>
        u.available > 0
          ? `${u.title} доступен(а) только в количестве ${u.available}. Количество обновлено.`
          : `${u.title} больше нет в наличии и был(а) удалён(а) из корзины.`,
      );
      alert(msgs.join("\n"));
      return;
    }

    const items = cart.map((p) => ({ id: p.id, quantity: p.quantity }));
    const serverRes = await validateServerStock(items);

    if (!serverRes.ok) {
      alert("Не удалось проверить наличие на складе. Попробуйте позже.");
      return;
    }

    const serverUpdates = [];
    serverRes.data.forEach((it) => {
      const requested = cart.find((p) => p.id === it.id)?.quantity || 0;
      const available = Number(it.availableQuantity) || 0;
      if (requested > available) {
        serverUpdates.push({
          id: it.id,
          title: cart.find((p) => p.id === it.id)?.title,
          requested,
          available,
        });
      }
    });

    if (serverUpdates.length > 0) {
      serverUpdates.forEach((u) => {
        if (u.available > 0) updateQuantity(u.id, u.available);
        else removeFromCart(u.id);
      });

      const msgs = serverUpdates.map((u) =>
        u.available > 0
          ? `${u.title} доступен(а) только в количестве ${u.available}. Количество обновлено.`
          : `${u.title} больше нет в наличии и был(а) удалён(а) из корзины.`,
      );
      alert(msgs.join("\n"));
      return;
    }

    alert("Cart updated — все товары в наличии в запрошенном количестве.");
  };

  const countryOptions = [
    { value: "", label: "SELECT A COUNTRY" },
    { value: "Russia", label: "Russia" },
    { value: "Belarus", label: "Belarus" },
    { value: "USA", label: "USA" },
    { value: "India", label: "India" },
    { value: "Other", label: "Other" },
  ];

  const postalOptions = [
    { value: "", label: "SELECT POST CODE / ZIP" },
    { value: "101000", label: "101000" },
    { value: "190000", label: "190000" },
    { value: "10001", label: "10001" },
  ];

  const currencySign = "$";

  //----Купоны----------
  //набор демо-купонoв (SAVE10, FIXED5, VIP50).
  const localCoupons = {
    SAVE10: { type: "percent", value: 10, description: "10% off" },
    FIXED5: { type: "fixed", value: 5, description: "$5 off" },
    VIP50: {
      type: "percent",
      value: 50,
      description: "50% off (VIP)",
      minTotal: 150,
    },
  };

  // пробует проверить купон на сервере
  const validateCouponServer = async (code, currentSubtotal) => {
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: currentSubtotal }),
      });
      if (!res.ok) {
        const txt = await res.text();
        return { ok: false, error: txt || `HTTP ${res.status}` };
      }
      const data = await res.json(); // expect { ok: true, coupon: {...} }
      return data;
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  };
  // для кнопки Apply Coupon:
  const handleApplyCoupon = async () => {
    setCouponError("");
    if (!couponCode || couponCode.trim().length === 0) {
      setCouponError("Please enter a coupon code.");
      return;
    }
    setCouponApplying(true);

    // пытается провести серверную валидацию; если сервер вернёт купон — считает скидку (computeDiscount) и применяет.
    const serverRes = await validateCouponServer(couponCode.trim(), subtotal);
    if (serverRes.ok && serverRes.coupon) {
      const coupon = serverRes.coupon;
      const discount = computeDiscount(coupon, subtotal);
      setAppliedCoupon(coupon);
      setDiscountAmount(discount);
      setCouponApplying(false);
      setCouponCode("");
      return;
    }

    // иначе использует локальную таблицу; если купон найден — считает discount и применяет.
    const local = localCoupons[couponCode.trim().toUpperCase()];
    if (local) {
      const coupon = { code: couponCode.trim().toUpperCase(), ...local };
      const discount = computeDiscount(coupon, subtotal);
      setAppliedCoupon(coupon);
      setDiscountAmount(discount);
      setCouponApplying(false);
      setCouponCode("");
      return;
    }

    // если купон не найден — показывает ошибку.
    setCouponApplying(false);
    setCouponApplying(false);
    const rawErr = serverRes && serverRes.error ? String(serverRes.error) : "";
    let cleaned = "";
    try {
      // Парсим как HTML и извлекаем текстовое содержимое (удаляем теги)
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawErr, "text/html");
      cleaned =
        doc && doc.body && doc.body.textContent
          ? doc.body.textContent.trim()
          : rawErr.trim();
    } catch (e) {
      cleaned = rawErr.replace(/\s+/g, " ").trim();
    }
    const finalMsg = cleaned
      ? cleaned.length > 200
        ? cleaned.slice(0, 200) + "…"
        : cleaned
      : "Invalid coupon code.";
    setCouponError(finalMsg);
  };

  //сбрасывает купон и скидку
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponError("");
  };

  useEffect(() => {
    if (!appliedCoupon) {
      console.log("coupon effect:", {
        subtotal,
        appliedCoupon,
        discountAmount,
      });
      if (discountAmount !== 0) setDiscountAmount(0);
      return;
    }

    const minTotal = appliedCoupon.minTotal || appliedCoupon.min_amount || 0;
    const newDiscount = computeDiscount(appliedCoupon, subtotal);

    if (minTotal > 0 && subtotal < minTotal) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponError(
        `Coupon ${appliedCoupon.code} removed — requires minimum subtotal ${currencySign}${Number(
          minTotal,
        ).toFixed(2)}.`,
      );
      return;
    }

    if (!newDiscount || Number(newDiscount) <= 0) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponError(
        `Coupon ${appliedCoupon.code} removed — no discount applicable at current subtotal.`,
      );
      return;
    }

    // Otherwise update discountAmount
    if (Number(discountAmount) !== Number(newDiscount)) {
      setDiscountAmount(newDiscount);
      setCouponError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, appliedCoupon]);

  const handleProceedToCheckout = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (!cart || cart.length === 0) {
        alert("Cart is empty");
        return;
      }

      if (!selectedCountry || !selectedCity || !selectedPostal || !applied) {
        alert(
          "Please select country, city, postal code and click UPDATE TOTALS before proceeding to checkout.",
        );
        return;
      }

      // Если пользователь не авторизован — показываем модалку для логина
      if (!user) {
        // Сохраняем snapshot, чтобы пользователь мог вернуться к оформлению после логина
        try {
          const checkoutSnapshot = {
            items: cart,
            subtotal,
            discountAmount,
            appliedCoupon,
            shipping,
            total,
            shippingAddress: {
              country: selectedCountry,
              city: selectedCity,
              postal: selectedPostal,
            },
            timestamp: Date.now(),
          };
          sessionStorage.setItem(
            "shopper_checkout",
            JSON.stringify(checkoutSnapshot),
          );
        } catch (err) {
          // ignore sessionStorage errors
        }

        setShowAuthModal(true);
        return;
      }

      // Пользователь авторизован — обычный поток оформления
      const checkoutSnapshot = {
        items: cart,
        subtotal,
        discountAmount,
        appliedCoupon,
        shipping,
        total,
        shippingAddress: {
          country: selectedCountry,
          city: selectedCity,
          postal: selectedPostal,
        },
        timestamp: Date.now(),
      };

      try {
        sessionStorage.setItem(
          "shopper_checkout",
          JSON.stringify(checkoutSnapshot),
        );
      } catch (err) {
        //
      }

      // Перейти на страницу оформления
      window.location.href = "/checkout";
    } catch (err) {
      console.error("Proceed to checkout error:", err);
      alert("Unable to start checkout. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="mt-31 pt-24 mb-50">
        {/* title */}
        <h2 className="text-3xl text-center mb-16">Shopping Cart</h2>

        <div className="flex justify-between">
          {/* левая колонка */}
          <div className="w-145 mb-10">
            {cart.map((product) => (
              <div
                key={product.id}
                className="w-full flex justify-between pb-10 mb-10"
              >
                <div className="w-34 h-34">
                  <img
                    className="w-full h-full object-cover"
                    src={product?.img}
                    alt={product?.title}
                  />
                </div>

                <div className="flex items-start gap-x-10">
                  <div className="w-41.5">
                    <p className="text-xl mb-10">{product.title}</p>
                    <p className="text-[#A18A68]">
                      {currencySign} {product?.price.toFixed(2)}
                    </p>
                  </div>

                  <div className="w-41 flex items-start justify-between">
                    <div className="w-26 h-13">
                      <Counter
                        count={product.quantity}
                        onChange={(newCount) =>
                          updateQuantity(product.id, newCount)
                        }
                      />
                    </div>
                    <button
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeFromCart(product.id)}
                      disabled={!product.id}
                      aria-label={`Удалить ${product.title}`}
                    >
                      <img className="w-full h-full" src="/images/cross.jpg" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="w-full flex justify-end mb-16">
              <div className="w-42">
                <button
                  onClick={handleUpdateCart}
                  className="w-full font-bold border rounded-sm py-4 px-6 hover:bg-black hover:text-white"
                >
                  UPDATE CART
                </button>
              </div>
            </div>
            {/* //Купоны/Дисконт */}
            <div className="mt-6">
              {appliedCoupon ? (
                <div className="w-full flex items-center justify-between p-3 border rounded">
                  <div className="w-84">
                    <div className="font-bold">{appliedCoupon.code}</div>
                    <div className="text-sm text-gray-600">
                      {appliedCoupon.description}
                    </div>
                    <div className="text-sm text-green-600">
                      Saved {currencySign}
                      {discountAmount.toFixed(2)}
                    </div>
                  </div>
                  <div className="w-42">
                    <button
                      onClick={handleRemoveCoupon}
                      className="w-full py-4 border rounded-sm bg-black text-white"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full flex justify-between gap-2 items-end">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Coupon code"
                    className="w-84 border px-3 py-2 rounded-sm border-b border-[#D8D8D8] border-t-0 border-l-0 border-r-0"
                  />
                  <div className="w-42">
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponApplying}
                      className="w-full py-4 border rounded-sm bg-black text-white hover:bg-white hover:text-black font-bold"
                    >
                      {couponApplying ? "Applying..." : "APPLY COUPON"}
                    </button>
                  </div>
                </div>
              )}
              {couponError && (
                <div className="text-red-600 text-sm mt-2">{couponError}</div>
              )}
            </div>
          </div>

          {/* правая колонка */}
          <div className="w-145 pt-10 px-15 pb-12">
            <h3 className="text-2xl mb-11">Cart totals</h3>

            <div className="grid grid-cols-2 grid-rows-2 mb-10 border-b border-[#D8D8D8]">
              <div className="text-4">
                SUBTOTAL
                {appliedCoupon && (
                  <>
                    <div className="text-4">DISCOUNT</div>
                    <div className="pb-6 text-[#707070]">
                      <span>-{currencySign} </span>
                      <span>{discountAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="pb-6 text-[#707070]">
                <span>{currencySign} </span>
                <span>{subtotal.toFixed(2)}</span>
              </div>

              <div className="text-4">SHIPPING</div>
              <p className="text-4 text-[#707070]">
                Shipping costs will be calculated once you have provided
                address.
              </p>

              <div></div>

              <Select
                wrapperClassName="pt-6 text-3 text-[#707070] relative border-b border-[#707070] z-10"
                className="w-full py-4 border-b border-[#D8D8D8]   appearance-none rounded-sm cursor-pointer"
                arrowClassName="w-4 h-4 absolute top-1/2 right-0
                pointer-events-none"
                options={countryOptions}
                value={selectedCountry ?? ""}
                onChange={handleCountryChange}
              />

              <div></div>

              <Select
                wrapperClassName="pt-6 text-3 text-[#707070] relative border-b border-[#707070] z-10"
                className="w-full py-4 border-b border-[#D8D8D8]   appearance-none rounded-sm cursor-pointer"
                arrowClassName="w-4 h-4 absolute top-1/2 right-0
                pointer-events-none"
                options={cityOptions}
                value={selectedCity ?? ""}
                onChange={handleCityChange}
                disabled={!selectedCountry}
              />

              <div></div>

              <Select
                wrapperClassName="pt-6 text-3 text-[#707070] relative border-b border-[#707070] z-10"
                className="w-full py-4 border-b border-[#D8D8D8] appearance-none rounded-sm cursor-pointer"
                arrowClassName="w-4 h-4 absolute top-1/2 right-0 pointer-events-none"
                options={postalOptions}
                value={selectedPostal ?? ""}
                onChange={handlePostalChange}
                disabled={!selectedCountry || !selectedCity}
              />

              <div></div>

              <div className="font-bold mb-10">
                <button
                  className="w-full mt-6 border rounded-sm py-4 px-12 hover:bg-black hover:text-white"
                  onClick={handleUpdateTotals}
                >
                  UPDATE TOTALS
                </button>
              </div>
            </div>

            {/* показывать общее количество только тогда, когда все выбрано*/}
            {subtotal > 0 &&
            selectedCountry &&
            selectedCity &&
            selectedPostal &&
            applied ? (
              <div className="flex justify-between items-center font-bold mb-11">
                <p>TOTAl</p>
                <div>
                  <span>{currencySign}</span>
                  <span>{total.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center font-bold mb-11">
                <p>TOTAl</p>
                <div className="text-[#707070] ml-6" style={{ marginLeft: 24 }}>
                  <span>
                    Please select products, country, city and postal code and
                    click UPDATE TOTALS
                  </span>
                </div>
              </div>
            )}

            <button
              className="w-full border bg-black text-white font-bold py-4 rounded-sm hover:bg-white hover:text-black "
              onClick={handleProceedToCheckout}
              disabled={isProcessing || !cart || cart.length === 0}
            >
              {isProcessing ? "Processing..." : "PROCEED TO CHECKOUT"}
            </button>
          </div>
        </div>
      </div>
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
          {" "}
          <div
            className={`absolute inset-0 bg-black/48 backdrop-blur-sm transition-opacity duration-200 ${showAuthModal ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            onClick={() => setShowAuthModal(false)}
          />
          <div
            className={`relative w-[92%] max-w-[520px] bg-white rounded-xl shadow-lg p-5 transform transition-all duration-200 ease-in-out ${showAuthModal ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95"}`}
            role="document"
          >
            <h3 className="text-lg font-semibold mb-2">Sign in required</h3>
            <p className="text-sm text-gray-700 mb-4">
              You need to sign in to proceed to checkout. Would you like to go
              to the login page?
            </p>

            <div className="flex gap-3 justify-end mt-3">
              <button
                className="px-3 py-2 rounded-lg font-semibold border border-gray-200 bg-white text-gray-900"
                onClick={() => setShowAuthModal(false)}
              >
                Cancel
              </button>

              <button
                className="px-3 py-2 rounded-lg font-semibold bg-gray-900 text-white"
                onClick={() => {
                  try {
                    sessionStorage.setItem("shopper_intent", "checkout");
                  } catch (e) {}
                  setShowAuthModal(false);
                  navigate("/account");
                }}
              >
                Go to login
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Cart;
