import React from "react";
import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../context/cart/CartContext.jsx";
import { useAuth } from "../context/auth/useAuth.js";
import { Select } from "../components/ui/Select/Select.jsx";

// helper id generator (не требуется, но оставлен если frontend хочет передавать id)
const genOrderId = () => `order-${Date.now()}`;

export const Checkout = () => {
  const { cart, clearCart } = useContext(CartContext) || {
    cart: [],
    clearCart: undefined,
  };
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first: "",
    last: "",
    company: "",
    country: "",
    street: "",
    postCode: "",
    city: "",
    phone: "",
    email: "",
    notes: "",
    paymentMethod: "ykassa", // 'ykassa' | 'card'
    cardBank: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [lastPaymentInfo, setLastPaymentInfo] = useState(null);

  useEffect(() => {
    // Clean up any old local orders on app load
    try {
      localStorage.removeItem("shopper_orders");
    } catch (e) {
      // ignore
    }

    // try load snapshot from cart page
    try {
      const snapshot = JSON.parse(
        sessionStorage.getItem("shopper_checkout") || "null",
      );
      if (snapshot?.shippingAddress) {
        setForm((f) => ({
          ...f,
          country: snapshot.shippingAddress.country || f.country,
          city: snapshot.shippingAddress.city || f.city,
          postCode: snapshot.shippingAddress.postal || f.postCode,
        }));
      }
    } catch (e) {
      // ignore
    }

    // fill from user (account) if available
    if (user) {
      setForm((f) => ({
        ...f,
        first: (user.first_name || user.name || f.first || "").toString(),
        last: (user.last_name || f.last || "").toString(),
        phone: (user.phone || f.phone || "").toString(),
        email: (user.email || f.email || "").toString(),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updateField = (key, value) => {
    setForm((s) => ({ ...s, [key]: value }));
  };

  // --- NEW submitOrder: POST to /api/orders ---
  const submitOrder = async (e) => {
    e?.preventDefault?.();

    if (!cart || cart.length === 0) {
      alert("Cart empty");
      return;
    }
    if (!paymentConfirmed) {
      alert("Please confirm payment first");
      return;
    }

    setIsSubmitting(true);
    try {
      const subtotal = cart.reduce(
        (s, c) => s + (Number(c.price) || 0) * (Number(c.quantity) || 0),
        0,
      );

      const payload = {
        // optional: frontend-generated id (server may ignore or use it)
        id: genOrderId(),
        items: cart.map((c) => ({
          product_id: c.id,
          title: c.title,
          sku: c.sku,
          price: c.price,
          quantity: c.quantity,
          img: c.img,
        })),
        totals: {
          subtotal,
          shipping: 0,
          total: subtotal,
        },
        billing: { ...form },
        payment: lastPaymentInfo,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        credentials: "include", // send cookies (session)
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        // not authenticated — redirect to account/login
        alert("Please sign in to place order");
        navigate("/account");
        return;
      }

      if (res.status === 422) {
        const err = await res.json();
        alert("Validation error: " + (err.message || "Invalid data"));
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const created = await res.json(); // expect { id, number, ... }

      // cleanup local caches and cart
      try {
        localStorage.removeItem("shopper_orders");
        localStorage.removeItem("shopper_cart");
      } catch (e) {
        // ignore
      }

      if (typeof clearCart === "function") {
        try {
          clearCart();
        } catch (e) {
          // ignore
        }
      }

      // navigate to details page using server id
      navigate(`/orderDetails/${created.id}`);
    } catch (err) {
      console.error("Failed to create order:", err);
      alert("Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };
  // --- END submitOrder ---

  return (
    <div className="mt-55 mb-62">
      <h1 className="text-4xl font-medium text-center">Checkout</h1>

      <div className="w-full mt-24 flex justify-between text-[#707070]">
        <div className="w-[46%]">
          <h2 className="text-2xl text-black">Billing Details</h2>
          <form className="mb-9" onSubmit={submitOrder}>
            <div className="w-full flex justify-between items-center border-b border-[#D8D8D8]">
              <div className="w-[46%] pt-7 pb-3">
                <input
                  type="text"
                  name="first"
                  placeholder="First name *"
                  value={form.first}
                  onChange={(e) => updateField("first", e.target.value)}
                />
              </div>
              <div className="w-[46%] pt-7 pb-3">
                <input
                  type="text"
                  name="last"
                  placeholder="Last name *"
                  value={form.last}
                  onChange={(e) => updateField("last", e.target.value)}
                />
              </div>
            </div>

            <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
              <input
                type="text"
                name="company"
                placeholder="Company Name"
                value={form.company}
                onChange={(e) => updateField("company", e.target.value)}
              />
            </div>

            <Select
              className="w-full pt-7 pb-3 border-b border-[#D8D8D8] text-[#c6c2c2] appearance-none"
              arrowClassName="w-[16px] h-[16px] absolute top-[32px] right-3 pointer-events-none"
              value={form.country}
              onChange={(v) => updateField("country", v)}
            />

            <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
              <input
                type="text"
                name="street"
                placeholder="Street Address *"
                value={form.street}
                onChange={(e) => updateField("street", e.target.value)}
              />
            </div>

            <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
              <input
                type="text"
                name="postCode"
                placeholder="Postcode / ZIP *"
                value={form.postCode}
                onChange={(e) => updateField("postCode", e.target.value)}
              />
            </div>

            <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
              <input
                type="text"
                name="city"
                placeholder="Town / City *"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </div>

            <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
              <input
                type="text"
                name="postCode"
                placeholder="Postcode / ZIP *"
                value={form.postCode}
                onChange={(e) => updateField("postCode", e.target.value)}
              />
            </div>

            <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
              <input
                type="text"
                name="city"
                placeholder="Town / City *"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </div>

            <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
              <input
                type="text"
                name="phone"
                placeholder="Phone *"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>

            <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
              <input
                type="email"
                name="email"
                placeholder="Email *"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>

            <div className="pt-7 pb-3">
              <textarea
                name="notes"
                placeholder="Order notes"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                className="w-full"
              />
            </div>
          </form>
        </div>

        <div className="w-[46%]">
          <h2 className="text-2xl text-black pb-7">YOUR ORDER</h2>
          <div className="w-full px-9 py-15 bg-[#EFEFEF]">
            <table className="w-full mb-15">
              <thead>
                <tr className="border-b border-[#D8D8D8]">
                  <th className="pb-5 text-start">PRODUCT</th>
                  <th className="pb-5 text-end">TOTAL</th>
                </tr>
              </thead>
              <tbody className="text-[#707070]">
                {cart.map((p) => (
                  <tr key={p.id}>
                    <td className="pt-4 pb-3 text-start">
                      {p.title}
                      {p.quantity > 1 ? ` × ${p.quantity}` : ""}
                    </td>
                    <td className="pt-4 pb-3 text-end">
                      $
                      {(
                        (Number(p.price) || 0) * (Number(p.quantity) || 1)
                      ).toFixed(2)}
                    </td>
                  </tr>
                ))}

                <tr className="border-b border-[#D8D8D8]">
                  <td className="text-black pt-4 pb-3 text-start">SUBTOTAL</td>
                  <td className="pt-4 pb-3 text-end">
                    $
                    {cart
                      .reduce(
                        (s, c) =>
                          s +
                          (Number(c.price) || 0) * (Number(c.quantity) || 0),
                        0,
                      )
                      .toFixed(2)}
                  </td>
                </tr>
                <tr className="border-b border-[#D8D8D8]">
                  <td className="text-black pt-4 pb-3 text-start">SHIPPING</td>
                  <td className="pt-4 pb-3 text-end">Free shipping</td>
                </tr>
              </tbody>

              <tfoot>
                <tr className="text-black font-bold border-b border-[#D8D8D8]">
                  <td className="pt-4 pb-3 text-start">TOTAL</td>
                  <td className="pt-4 pb-3 text-end">
                    $
                    {cart
                      .reduce(
                        (s, c) =>
                          s +
                          (Number(c.price) || 0) * (Number(c.quantity) || 0),
                        0,
                      )
                      .toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div>
              <div className="mb-6">
                <label className="flex items-center mb-3">
                  <input
                    className="mr-2"
                    type="radio"
                    name="radioPay"
                    value="ykassa"
                    checked={form.paymentMethod === "ykassa"}
                    onChange={() => updateField("paymentMethod", "ykassa")}
                  />
                  <span>ЮKassa (QR)</span>
                </label>

                <label className="flex items-center mb-3">
                  <input
                    className="mr-2"
                    type="radio"
                    name="radioPay"
                    value="card"
                    checked={form.paymentMethod === "card"}
                    onChange={() => updateField("paymentMethod", "card")}
                  />
                  <span>Card payment (Мир / Альфа‑банк / T‑bank)</span>
                </label>

                <div className="flex gap-2 mt-3 items-center">
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                    onClick={() => setPaymentModalOpen(true)}
                  >
                    Open payment modal
                  </button>
                  <span className="ml-3 text-sm text-gray-600">
                    {paymentConfirmed
                      ? "Payment confirmed"
                      : "Payment not confirmed"}
                  </span>
                </div>
              </div>

              <button
                onClick={submitOrder}
                disabled={!paymentConfirmed || isSubmitting}
                className={`w-full px-44 py-6 font-bold rounded-sm border transition-colors duration-150 ${paymentConfirmed ? "bg-black text-white border-black hover:bg-white hover:text-black" : "bg-transparent text-gray-600 border-gray-300 cursor-not-allowed"} ${isSubmitting ? "opacity-75 pointer-events-none" : ""}`}
              >
                {isSubmitting ? "Placing..." : "PLACE ORDER"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
          <div
            className="absolute inset-0 bg-black/48 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => {
              setPaymentModalOpen(false);
              setPaymentConfirmed(false);
            }}
          />
          <div className="relative w-11/12 max-w-lg bg-white rounded-xl shadow-lg p-6 transform transition-all duration-200">
            <h3 className="text-lg font-semibold mb-2">
              {form.paymentMethod === "ykassa" ? "ЮKassa (QR)" : "Card payment"}
            </h3>

            {form.paymentMethod === "ykassa" ? (
              <>
                <p className="mb-3 text-sm text-gray-700">
                  Scan this QR code with your banking app (simulated).
                </p>
                <div className="w-40 h-40 bg-gray-100 flex items-center justify-center my-3">
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="#f3f4f6" />
                    <text
                      x="50%"
                      y="50%"
                      dominantBaseline="middle"
                      textAnchor="middle"
                      fontSize="12"
                    >
                      QR
                    </text>
                  </svg>
                </div>
                <p className="text-xs text-gray-500">Simulated QR code.</p>
              </>
            ) : (
              <>
                <p className="mb-3 text-sm text-gray-700">
                  Choose bank and simulate card payment.
                </p>
                <div className="mb-3">
                  <label className="block text-sm mb-2">Select bank</label>
                  <select
                    value={form.cardBank || ""}
                    onChange={(e) => updateField("cardBank", e.target.value)}
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Choose bank</option>
                    <option value="mir">Мир</option>
                    <option value="alfabank">Альфа‑банк</option>
                    <option value="tbank">T‑bank</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="block text-sm mb-2">
                    Card number (simulated)
                  </label>
                  <input
                    type="text"
                    value={form.cardNumber || ""}
                    onChange={(e) => updateField("cardNumber", e.target.value)}
                    placeholder="4111 1111 1111 1111"
                    className="w-full border p-2 rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    value={form.cardExpiry || ""}
                    onChange={(e) => updateField("cardExpiry", e.target.value)}
                    placeholder="MM/YY"
                    className="w-full border p-2 rounded"
                  />
                  <input
                    type="text"
                    value={form.cardCvv || ""}
                    onChange={(e) => updateField("cardCvv", e.target.value)}
                    placeholder="CVV"
                    className="w-full border p-2 rounded"
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded mb-3 text-sm text-gray-600">
                  Demo card entry — enter any values. Click "I paid" to simulate
                  success.
                </div>
              </>
            )}

            <div className="flex gap-3 justify-end">
              <button
                className="px-3 py-2 rounded-lg border border-gray-200"
                onClick={() => {
                  setPaymentModalOpen(false);
                  setPaymentConfirmed(false);
                }}
              >
                Cancel
              </button>
              <button
                className="px-3 py-2 rounded-lg bg-green-600 text-white"
                onClick={() => {
                  const info = {
                    method: form.paymentMethod === "ykassa" ? "ykassa" : "card",
                    provider_ref:
                      form.paymentMethod === "ykassa"
                        ? `QR-${Date.now()}`
                        : `CARD-${(form.cardNumber || "xxxx").replace(/\s+/g, "").slice(-4)}-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    bank: form.cardBank || null,
                    card_last4: form.cardNumber
                      ? form.cardNumber.replace(/\s+/g, "").slice(-4)
                      : null,
                  };
                  setLastPaymentInfo(info);
                  setPaymentConfirmed(true);
                  setPaymentModalOpen(false);
                }}
              >
                I paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
