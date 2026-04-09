import React, { useContext, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../context/cart/CartContext.jsx";
import { Counter } from "../components/ui/Counter/Counter.jsx";
import { Select } from "../components/ui/Select/Select.jsx";
import { computeDiscount } from "../utils/coupons.js";
import { useAuth } from "../context/auth/useAuth.js";

/**
 * Компонент Корзина для товаров.
 * Отображает содержимое корзины, позволяет менять количество и удалять товары, управлять адресом доставки (страна/город/индекс), рассчитывать стоимость доставки, применять купоны и переходить к оформлению (checkout). Также проводит локальную и серверную валидацию наличия товаров.
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

  // add near other useState hooks
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

  // total = subtotal + shipping (shipping set by Update totals)
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

    // Russia
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

    // Belarus
    if (c === "belarus" || c === "беларусь") {
      if (ci === "minsk" || ci === "минск") return 51;
      return 51; // default Belarus -> 51
    }

    // India
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

    // default for others
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
    // include dependencies referenced in effect
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
      // if product has stock field (number), use it
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
      const data = await res.json(); // expected [{ id, availableQuantity }]
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

    // 1) Try local validation first
    const localUpdates = validateLocalStock();
    if (localUpdates.length > 0) {
      // Apply local corrections
      localUpdates.forEach((u) => {
        if (u.available > 0) {
          updateQuantity(u.id, u.available);
        } else {
          // available == 0 -> remove from cart
          removeFromCart(u.id);
        }
      });

      // Notify user
      const msgs = localUpdates.map((u) =>
        u.available > 0
          ? `${u.title} доступен(а) только в количестве ${u.available}. Количество обновлено.`
          : `${u.title} больше нет в наличии и был(а) удалён(а) из корзины.`,
      );
      alert(msgs.join("\n"));
      return;
    }

    // 2) If no local stock info for items, fallback to server validation
    const items = cart.map((p) => ({ id: p.id, quantity: p.quantity }));
    const serverRes = await validateServerStock(items);

    if (!serverRes.ok) {
      // server error — inform user but don't change cart
      alert("Не удалось проверить наличие на складе. Попробуйте позже.");
      return;
    }

    // serverRes.data expected list of { id, availableQuantity }
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

    // if everything OK
    alert("Cart updated — все товары в наличии в запрошенном количестве.");
  };

  // demo options (replace with API-driven options if needed)
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
    setCouponError(serverRes.error || "Invalid coupon code.");
  };

  //сбрасывает купон и скидку
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponError("");
  };

  // New effect: ensure coupon validity when subtotal changes
  useEffect(() => {
    if (!appliedCoupon) {
      console.log("coupon effect:", {
        subtotal,
        appliedCoupon,
        discountAmount,
      });
      // no coupon — ensure discount cleared
      if (discountAmount !== 0) setDiscountAmount(0);
      return;
    }

    // check if coupon has a minTotal requirement and subtotal falls below it
    const minTotal = appliedCoupon.minTotal || appliedCoupon.min_amount || 0;
    const newDiscount = computeDiscount(appliedCoupon, subtotal);

    // If coupon requires a minimum subtotal and it's no longer met, remove coupon
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

    // If computed discount is zero (coupon yields nothing at this subtotal) — remove it
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

  // proceed to checkout handler (Option B: navigate to internal checkout page)
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
        // ignore
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
          {/* left column */}
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

          {/* right column */}
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

            {/* show total only when everything selected and update applied */}
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

// import React, { useState } from "react";
// import { Link, NavLink, useNavigate } from "react-router-dom";
// import { Tabs } from "../../components/ui/Tabs/Tabs.jsx";
// import { Select } from "../../components/ui/Select/Select.jsx";
// import { Button } from "../../components/ui/Button/Button.jsx";
// import { useAuth } from "../../context/auth/useAuth.js";

// /**
//  * Компонент Account - UI для входа и регистрации со вкладками (Tabs).
//  *
//  * 1. Делает POST /api/login и /api/register на бекенд (Laravel) с включёнными cookie (credentials: "include") и CSRF-токеном
//  * 2. После успешного ответа обновляет контекст пользователя через fetchUser() и показывает приветствие.
//  */

// export const Account = () => {
//   // 1. Tabs вкладка активна ("Sign in" / "Register")
//   const [activeCategory, setActiveCategory] = useState("Sign in");
//   // 2. Tabs вкладка активна ("Dashboard"...)
//   const [activeDashboard, setActiveDashboard] = useState("Dashboard");
//   // индикатор выполнения запроса
//   const [loading, setLoading] = useState(false);
//   // общее текстовое сообщение ошибки (показано сверху)
//   const [error, setError] = useState(null);
//   // объект полевых ошибок (из Laravel validation: errors → { field: [msg] })
//   const [formErrors, setFormErrors] = useState({});

//   // ф-я для перехода по ссылкам
//   const navigate = useNavigate();

//   // получаем API из контекста
//   const { getCsrf, fetchUser, BACKEND, user, setUser, logout } = useAuth();

//   // ф-я очистки поля с текстом ошибки
//   const clearErrorOnInput = (e) => {
//     const name = e.target.name;
//     setError(null);
//     if (formErrors && formErrors[name]) {
//       setFormErrors((prev) => {
//         const next = { ...prev };
//         delete next[name];
//         return next;
//       });
//     }
//   };

//   // вспомогательная функция; берёт cookie по имени (используется для XSRF-TOKEN)
//   const getCookie = (name) => {
//     const match = document.cookie.match(
//       new RegExp("(^| )" + name + "=([^;]+)"),
//     );
//     return match ? decodeURIComponent(match[2]) : null;
//   };

//   // валидация на клиенте
//   const isValidName = (name) => {
//     if (!name) return false;
//     const trimmed = name.trim();
//     return /^[A-Za-zА-Яа-яЁё\s]{2,}$/.test(trimmed);
//   };

//   const isValidEmail = (email) => {
//     if (!email) return false;
//     return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
//   };

//   const isValidPassword = (password) => {
//     return typeof password === "string" && password.length >= 6;
//   };

//   // вспомогательная функция для обработки ошибок ответа сервера (формат Laravel)
//   const handleResponseErrors = async (res) => {
//     const data = await res.json().catch(() => ({}));
//     if (data.errors && typeof data.errors === "object") {
//       const flat = {};
//       Object.entries(data.errors).forEach(([k, v]) => {
//         flat[k] = Array.isArray(v) ? v[0] : String(v);
//       });
//       setFormErrors(flat);
//       setError(
//         flat[Object.keys(flat)[0]] || data.message || "Validation error",
//       );
//       return true;
//     }
//     if (data.message) {
//       setError(data.message);
//       return true;
//     }
//     return false;
//   };

//   // логика входа
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError(null);
//     setFormErrors({});

//     const form = e.target;
//     const email = form.email.value.trim();
//     const password = form.password.value;

//     if (!isValidEmail(email)) {
//       setError("Please enter a valid email address.");
//       return;
//     }
//     if (!isValidPassword(password)) {
//       setError("Password should be at least 6 characters.");
//       return;
//     }

//     setLoading(true);
//     try {
//       await getCsrf();
//       const res = await fetch(`${BACKEND}/api/login`, {
//         method: "POST",
//         credentials: "include",
//         headers: {
//           "Content-Type": "application/json",
//           "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
//         },
//         body: JSON.stringify({ email, password }),
//       });

//       if (!res.ok) {
//         const handled = await handleResponseErrors(res);
//         if (handled) return;
//         throw new Error("Login failed");
//       }

//       const serverUser = await fetchUser();
//       if (serverUser) {
//         setUser(serverUser);
//         navigate("/", { replace: true });
//       }
//     } catch (err) {
//       console.error(err);
//       setError(err.message || "Login error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // регистрация
//   const handleSubmitReg = async (e) => {
//     e.preventDefault();
//     setError(null);
//     setFormErrors({});

//     const form = e.target;
//     const name = form.name.value.trim();
//     const email = form.email.value.trim();
//     const password = form.password.value;
//     const password_confirmation = form.confirmPassword.value;

//     if (!isValidName(name)) {
//       setError(
//         "Name should be at least 2 letters and contain only letters and spaces.",
//       );
//       return;
//     }
//     if (!isValidEmail(email)) {
//       setError("Please enter a valid email address.");
//       return;
//     }
//     if (!isValidPassword(password)) {
//       setError("Password should be at least 6 characters.");
//       return;
//     }
//     if (password !== password_confirmation) {
//       setError("Passwords do not match.");
//       return;
//     }

//     setLoading(true);
//     try {
//       await getCsrf();
//       const res = await fetch(`${BACKEND}/api/register`, {
//         method: "POST",
//         credentials: "include",
//         headers: {
//           "Content-Type": "application/json",
//           "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
//         },
//         body: JSON.stringify({ name, email, password, password_confirmation }),
//       });

//       if (!res.ok) {
//         const handled = await handleResponseErrors(res);
//         if (handled) return;
//         throw new Error("Registration failed");
//       }

//       const serverUser = await fetchUser();
//       if (serverUser) {
//         setUser(serverUser);
//         navigate("/", { replace: true });
//       }
//     } catch (err) {
//       console.error(err);
//       setError(err.message || "Registration error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="my-62 mb-72">
//       <div className="max-w-125 mx-auto">
//         <h1 className="text-[33px] font-medium text-center mb-16">
//           My account
//         </h1>

//         {/* GitHub OAuth button */}
//         <div className="max-w-125 mx-auto mb-6">
//           <button
//             type="button"
//             onClick={() => {
//               // используем BACKEND из контекста auth (пример: http://shopper.local)
//               // если у вас BACKEND в useAuth, замените соответственно
//               const backend =
//                 typeof BACKEND !== "undefined" && BACKEND
//                   ? BACKEND.replace(/\/$/, "")
//                   : "http://shopper.local";
//               window.location.href = `${backend}/auth/github`;
//             }}
//             className="w-full flex items-center justify-center gap-3 py-3 px-4 font-medium border rounded-sm bg-white hover:bg-[#EFEFEF] text-black cursor-pointer"
//             aria-label="Sign in with GitHub"
//           >
//             {/* GitHub icon (inline SVG) */}
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               width="20"
//               height="20"
//               viewBox="0 0 24 24"
//               fill="currentColor"
//               aria-hidden="true"
//             >
//               <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.9 3.19 9.06 7.61 10.53.56.1.76-.24.76-.53 0-.26-.01-1-.02-1.95-3.09.67-3.74-1.49-3.74-1.49-.5-1.28-1.22-1.62-1.22-1.62-.99-.68.08-.67.08-.67 1.1.08 1.68 1.13 1.68 1.13.97 1.66 2.54 1.18 3.15.9.1-.7.38-1.18.69-1.45-2.47-.28-5.07-1.24-5.07-5.53 0-1.22.44-2.22 1.16-3-.12-.28-.5-1.42.11-2.96 0 0 .95-.3 3.12 1.15a10.8 10.8 0 012.84-.38c.96.01 1.93.13 2.84.38 2.16-1.45 3.11-1.15 3.11-1.15.62 1.54.24 2.68.12 2.96.72.78 1.16 1.78 1.16 3 0 4.29-2.61 5.24-5.09 5.52.39.34.73 1.02.73 2.06 0 1.49-.01 2.69-.01 3.06 0 .3.2.64.77.53 4.42-1.47 7.61-5.63 7.61-10.53C23.25 5.48 18.27.5 12 .5z" />
//             </svg>

//             <span>Log in through the GitHub</span>
//           </button>
//         </div>
//       </div>

//       {error && <div className="text-red-500 mb-4 text-center">{error}</div>}
//       <div className="h-7 mb-4 text-center">
//         {loading ? <div>Loading...</div> : null}
//       </div>

//       {user ? (
//         <div className="w-full">
//           <Tabs
//             categories={[
//               "Dashboard",
//               "Orders",
//               "Downloads",
//               "Addresses",
//               "Account details",
//               "Logout",
//             ]}
//             activeCategory={activeDashboard}
//             onCategoryChange={(category) => setActiveDashboard(category)}
//             tabClassName="flex list-none gap-12 justify-start border-b border-[#D8D8D8]"
//             tabItemClassName="inline-flex pl-0 items-center justify-center px-4 py-2 text-lg cursor-pointer"
//             activeClassName="text-black border-b-2 border-black"
//             inactiveClassName="text-gray-500"
//           />

//           {activeDashboard === "Dashboard" && (
//             <div className="mt-10 mb-51">
//               <p>
//                 From your account dashboard you can view your{" "}
//                 <span className="text-[#A18A68]">recent orders</span>, manage
//                 your
//                 <span className="text-[#A18A68]">
//                   Lshipping and billing addresses
//                 </span>
//                 , and edit your{" "}
//                 <span className="text-[#A18A68]">
//                   password and account details
//                 </span>
//                 .
//               </p>
//             </div>
//           )}

//           {activeDashboard === "Orders" && (
//             <div className="mt-10 mb-50">
//               <table className="w-full">
//                 <thead>
//                   <tr className="pb-4 border-b">
//                     <th className="pb-4 pr-35 text-left">ORDER NUMBER</th>
//                     <th className="pb-4 pr-35 text-left">DATE</th>
//                     <th className="pb-4 pr-35 text-left">STATUS</th>
//                     <th className="pb-4 pr-35 text-left">TOTAL</th>
//                     <th className="pb-4 pr-35 text-left">ACTIONS</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {(() => {
//                     const orders = JSON.parse(
//                       localStorage.getItem("shopper_orders") || "[]",
//                     );
//                     if (!orders || orders.length === 0) {
//                       return (
//                         <tr className="border-b border-[#D8D8D8] text-[#707070]">
//                           <td className="py-6 text-left" colSpan={5}>
//                             No orders yet
//                           </td>
//                         </tr>
//                       );
//                     }
//                     return orders.map((o) => (
//                       <tr
//                         key={o.id}
//                         className="border-b border-[#D8D8D8] text-[#707070]"
//                       >
//                         <td className="py-6 text-left">{o.number}</td>
//                         <td className="py-6 text-left">
//                           {new Date(o.created_at).toLocaleString()}
//                         </td>
//                         <td className="py-6 text-left">Completed</td>
//                         <td className="py-6 text-left">
//                           ${(o.totals?.total || 0).toFixed(2)}
//                         </td>
//                         <td className="py-6 text-left">
//                           <button
//                             onClick={() =>
//                               (window.location.href = `/orderDetails/${o.id}`)
//                             }
//                             className="text-blue-600 underline"
//                           >
//                             View
//                           </button>
//                         </td>
//                       </tr>
//                     ));
//                   })()}
//                 </tbody>
//               </table>
//             </div>
//           )}

//           {activeDashboard === "Downloads" && (
//             <div className="mt-10 mb-50">
//               <table className="w-full">
//                 <thead>
//                   <tr className="border-b text-left">
//                     <th className="pb-4 pr-35">ORDER NUMBER</th>
//                     <th className="pb-4 pr-35">DATE</th>
//                     <th className="pb-4 pr-35">STATUS</th>
//                     <th className="pb-4 pr-35">TOTAL</th>
//                     <th className="pb-4 pr-35">ACTIONS</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   <tr className="border-b border-[#D8D8D8] text-[#707070] text-left">
//                     <td className="py-6">text</td>
//                     <td className="py-6">text</td>
//                     <td className="py-6">text</td>
//                     <td className="py-6">text</td>
//                     <td className="py-6">text</td>
//                   </tr>
//                 </tbody>
//               </table>
//             </div>
//           )}

//           {activeDashboard === "Addresses" && (
//             <div className="mt-10 mb-50">
//               <div className="w-full flex justify-between text-[#707070] mb-62">
//                 <div className="w-[46%]">
//                   <h2 className="text-2xl text-black">Billing Details</h2>
//                   <form className="mb-16">
//                     <div className="w-full flex justify-between items-center border-b border-[#D8D8D8]">
//                       <div className="w-[46%] pt-7 pb-3">
//                         <input
//                           type="text"
//                           name="first"
//                           placeholder="First name *"
//                         />
//                       </div>
//                       <div className="w-[46%] pt-7 pb-3">
//                         <input
//                           type="text"
//                           name="last"
//                           placeholder="Last name *"
//                         />
//                       </div>
//                     </div>
//                     <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
//                       <input
//                         type="text"
//                         name="company"
//                         placeholder="Company Name"
//                       />
//                     </div>
//                     <Select
//                       className="w-full pt-7 pb-3 border-b border-[#D8D8D8] text-[#c6c2c2]  appearance-none"
//                       arrowClassName="w-[16px] h-[16px] absolute top-[32px] right-3 pointer-events-none"
//                     />
//                     <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
//                       <input
//                         type="text"
//                         name="street"
//                         placeholder="Street Address *"
//                       />
//                     </div>
//                     <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
//                       <input
//                         type="text"
//                         name="postCode"
//                         placeholder="Postcode / ZIP *"
//                       />
//                     </div>
//                     <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
//                       <input
//                         type="text"
//                         name="city"
//                         placeholder="Town / City *"
//                       />
//                     </div>
//                     <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
//                       <input type="text" name="phone" placeholder="Phone *" />
//                     </div>
//                     <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
//                       <input type="email" name="email" placeholder="Email *" />
//                     </div>
//                   </form>
//                   <div className="w-1/2">
//                     <Button color="black" name="SAVE ADDRESS" />
//                   </div>
//                 </div>

//                 <div className="w-[46%]">
//                   <h2 className="text-2xl text-black pb-7">Shipping Address</h2>
//                   <p className="mb-4 font-bold text-[#A18A68]">ADD</p>
//                   <p className="text-[Y#707070]">
//                     You have not set up this type of address yet.
//                   </p>
//                 </div>
//               </div>
//             </div>
//           )}

//           {activeDashboard === "Account details" && (
//             <div className="mt-10 mb-50">
//               <form className="max-w-lg">
//                 <label className="block mb-4">
//                   <span className="text-sm text-gray-700">Full name</span>
//                   <input
//                     type="text"
//                     name="name"
//                     className="w-full border-b py-2 mt-2 focus:outline-none"
//                     placeholder="Your name"
//                     autoComplete="name"
//                     required
//                   />
//                 </label>

//                 <label className="block mb-4">
//                   <span className="text-sm text-gray-700">Email</span>
//                   <input
//                     type="email"
//                     name="email"
//                     className="w-full border-b py-2 mt-2 focus:outline-none"
//                     placeholder="you@example.com"
//                     autoComplete="email"
//                     required
//                   />
//                 </label>

//                 <label className="block mb-4">
//                   <span className="text-sm text-gray-700">
//                     Password (leave blank to keep)
//                   </span>
//                   <input
//                     type="password"
//                     name="password"
//                     className="w-full border-b py-2 mt-2 focus:outline-none"
//                     placeholder="New password"
//                     autoComplete="new-password"
//                   />
//                 </label>
//                 <div className="w-1/2 mt-10 mb-62">
//                   <Button type="submit" color="black" name="SAVE ADDRESS" />
//                 </div>
//               </form>
//             </div>
//           )}

//           {activeDashboard === "Logout" && (
//             <div className="mt-10 mb-50">
//               <p className="inline-block text-xl font-medium mb-4 mr-10">
//                 <span className="text-[#A18A68]">Log out</span> of your account
//               </p>
//               <div className="inline-block w-34">
//                 <Button
//                   color="black"
//                   name="Confirm logout"
//                   onClick={async () => {
//                     try {
//                       await logout(); // разлогин (AuthProvider.logout) — уже не делает redirect
//                       navigate("/", { replace: true }); // внутри SPA — плавный переход на главную
//                     } catch (err) {
//                       console.error("Logout failed", err);
//                       // при необходимости показать ошибку пользователю
//                     }
//                   }}
//                 />
//               </div>
//               {/* <button
//                 onClick={async () => {
//                   try {
//                     await logout(); // разлогин (AuthProvider.logout) — уже не делает redirect
//                     navigate("/", { replace: true }); // внутри SPA — плавный переход на главную
//                   } catch (err) {
//                     console.error("Logout failed", err);
//                     // при необходимости показать ошибку пользователю
//                   }
//                 }}
//                 className="inline-block px-4 py-2 border rounded text-white bg-black"
//               > */}
//               {/* Confirm logout
//               </button> */}
//             </div>
//           )}
//         </div>
//       ) : (
//         <div className="mb-51 max-w-125 mx-auto">
//           <div className=" w-full p-1 bg-[#EFEFEF] mb-12 rounded-sm">
//             <Tabs
//               categories={["Sign in", "Register"]}
//               activeCategory={activeCategory}
//               onCategoryChange={(category) => setActiveCategory(category)}
//               tabClassName="flex w-full bg-[#EFEFEF] p-1 rounded-sm"
//               tabItemClassName="flex-1 text-center py-4 font-medium rounded-sm"
//               activeClassName="bg-white text-black cursor-pointer"
//               inactiveClassName="bg-transparent text-[#707070] cursor-pointer"
//             />
//           </div>

//           {activeCategory === "Sign in" && (
//             <div className="text-[#707070]" id="sign-content">
//               <form onSubmit={handleSubmit}>
//                 <input
//                   type="email"
//                   name="email"
//                   className="w-full pb-3 border-b border-[#D8D8D8] mb-12"
//                   placeholder="Email*"
//                   required
//                   onInput={clearErrorOnInput}
//                 />
//                 {formErrors.email && (
//                   <div className="text-red-500 text-sm mb-4">
//                     {formErrors.email}
//                   </div>
//                 )}
//                 <input
//                   type="password"
//                   name="password"
//                   className="w-full pb-3 border-b border-[#D8D8D8] mb-4"
//                   placeholder="Password*"
//                   required
//                   onInput={clearErrorOnInput}
//                 />
//                 {formErrors.password && (
//                   <div className="text-red-500 text-sm mb-4">
//                     {formErrors.password}
//                   </div>
//                 )}

//                 <div className="w-[27%] flex items-center justify-between gap-x-2 mb-30">
//                   <input type="checkbox" id="rememberMe" className="w-4 h-4" />
//                   <label htmlFor="rememberMe">Remember me</label>
//                 </div>

//                 <button
//                   type="submit"
//                   className="block w-full text-center mb-3 mx-auto py-4 font-bold border rounded-sm bg-black text-white hover:bg-white hover:text-black cursor-pointer"
//                   disabled={loading}
//                 >
//                   Sign in
//                 </button>

//                 <Link
//                   to="#"
//                   className="block w-full py-4 px-10 text-center hover:border rounded-sm cursor-pointer bg-white text-black"
//                 >
//                   Have you forgotten your password?
//                 </Link>
//               </form>
//             </div>
//           )}

//           {activeCategory === "Register" && (
//             <form onSubmit={handleSubmitReg}>
//               <div className="text-[#707070]" id="additional-information">
//                 <input
//                   type="text"
//                   name="name"
//                   className="w-full pb-3 border-b border-[#D8D8D8] mb-12"
//                   placeholder="Name*"
//                   required
//                   onInput={clearErrorOnInput}
//                 />
//                 {formErrors.name && (
//                   <div className="text-red-500 text-sm mb-4">
//                     {formErrors.name}
//                   </div>
//                 )}

//                 <input
//                   type="email"
//                   name="email"
//                   className="w-full pb-3 border-b border-[#D8D8D8] mb-1"
//                   placeholder="Email*"
//                   required
//                   onInput={clearErrorOnInput}
//                 />
//                 {formErrors.email && (
//                   <div className="text-red-500 text-sm mb-4">
//                     {formErrors.email}
//                   </div>
//                 )}

//                 <input
//                   type="password"
//                   name="password"
//                   className="w-full pb-3 border-b border-[#D8D8D8] mb-12"
//                   placeholder="Password*"
//                   required
//                   onInput={clearErrorOnInput}
//                 />
//                 {formErrors.password && (
//                   <div className="text-red-500 text-sm mb-4">
//                     {formErrors.password}
//                   </div>
//                 )}

//                 <input
//                   type="password"
//                   name="confirmPassword"
//                   className="w-full pb-3 border-b border-[#D8D8D8] mb-4"
//                   placeholder="Confirm password*"
//                   required
//                   onInput={clearErrorOnInput}
//                 />
//                 {formErrors.password_confirmation && (
//                   <div className="text-red-500 text-sm mb-4">
//                     {formErrors.password_confirmation}
//                   </div>
//                 )}

//                 <div className="w-[32%] flex items-center justify-between gap-x-2 mb-4">
//                   <input type="checkbox" id="registerMe" className="w-4 h-4" />
//                   <label htmlFor="registerMe">I agree to Terms</label>
//                 </div>

//                 <button
//                   type="submit"
//                   className="block w-full text-center mb-3 mx-auto py-4 font-bold border rounded-sm cursor-pointer bg-black text-white hover:bg-white hover:text-black"
//                   disabled={loading}
//                 >
//                   Register
//                 </button>
//               </div>
//             </form>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };
