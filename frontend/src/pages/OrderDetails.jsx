import React from "react";
import { useParams, useNavigate } from "react-router-dom";

export const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Считываем заказ синхронно из localStorage (без эффекта) — это простая и надёжная стратегия здесь
  let order = null;
  try {
    const all = JSON.parse(localStorage.getItem("shopper_orders") || "[]");
    order = all.find((o) => o.id === id) || null;
  } catch (err) {
    order = null;
  }

  if (!order) {
    return (
      <div className="p-8">
        <h2 className="text-2xl mb-4">Order not found</h2>
        <p className="text-[#707070] mb-6">
          We couldn't find the order you requested.
        </p>
        <button
          onClick={() => navigate("/account#orders")}
          className="px-4 py-2 bg-black text-white rounded"
        >
          Go to my orders
        </button>
      </div>
    );
  }

  const fmt = (v) => `$${Number(v || 0).toFixed(2)}`;

  return (
    <div className="mt-62 mb-62 w-full flex justify-between">
      {/* левый блок */}
      <div className="w-145">
        <h2 className="text-[26px] mb-7">Order Details</h2>

        <div className="flex justify-between">
          <div className="w-[45%]">
            <h3 className="mb-2">ORDER NUMBER</h3>
            <p className="text-[#707070] mb-10">{order.number}</p>

            <h3 className="mb-2">EMAIL</h3>
            <p className="text-[#707070] mb-10">
              {order.billing?.email || "-"}
            </p>

            <h3 className="mb-2">PAYMENT METHOD</h3>
            <p className="text-[#707070] mb-10">
              {order.payment?.method === "card"
                ? `Card •••• ${order.payment?.card_last4 || "xxxx"}`
                : order.payment?.method === "ykassa"
                  ? "ЮKassa (QR)"
                  : order.payment?.method || "-"}
            </p>

            <h3 className="mb-2">ORDER DATE</h3>
            <p className="text-[#707070] mb-10">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <div className="w-[28%]">
            <h3 className="mb-2">DELIVERY OPTIONS</h3>
            <p className="text-[#707070] mb-10">
              {order.totals?.shipping
                ? order.totals.shipping
                : "Standard delivery"}
            </p>

            <h3 className="mb-2">DELIVERY ADDRESS</h3>
            <p className="text-[#707070] mb-10">
              {order.billing?.street ? (
                <>
                  {order.billing.street}, {order.billing.city}
                  {order.billing.postCode ? `, ${order.billing.postCode}` : ""}
                  {order.billing.country ? `, ${order.billing.country}` : ""}
                </>
              ) : (
                "—"
              )}
            </p>

            <h3 className="mb-2">CONTACT NUMBER</h3>
            <p className="text-[#707070] mb-10">
              {order.billing?.phone || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* правый блок */}
      <div className="w-145">
        <h2 className="text-[26px] mb-7">ORDER Summary</h2>

        <div className="w-full px-9 py-15 bg-[#EFEFEF]">
          <table className="w-full mb-15">
            <thead>
              <tr className="border-b border-[#D8D8D8]">
                <th className="pb-5 text-start">PRODUCT</th>
                <th className="pb-5 text-end">TOTAL</th>
              </tr>
            </thead>

            <tbody className="text-[#707070]">
              {order.items && order.items.length ? (
                order.items.map((it) => (
                  <tr key={it.id || `${it.title}-${Math.random()}`}>
                    <td className="pt-4 pb-3 text-start">
                      {it.title}
                      {it.quantity > 1 ? ` × ${it.quantity}` : ""}
                    </td>
                    <td className="pt-4 pb-3 text-end">
                      {fmt(
                        (Number(it.price) || 0) * (Number(it.quantity) || 1),
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-6" colSpan={2}>
                    No items
                  </td>
                </tr>
              )}

              <tr className="border-b border-[#D8D8D8]">
                <td className="text-black pt-4 pb-3 text-start">SUBTOTAL</td>
                <td className="pt-4 pb-3 text-end">
                  {fmt(order.totals?.subtotal)}
                </td>
              </tr>

              <tr className="border-b border-[#D8D8D8]">
                <td className="text-black pt-4 pb-3 text-start">SHIPPING</td>
                <td className="pt-4 pb-3 text-end">
                  {order.totals?.shipping
                    ? fmt(order.totals.shipping)
                    : "Free shipping"}
                </td>
              </tr>
            </tbody>

            <tfoot>
              <tr className="text-black font-bold border-b border-[#D8D8D8]">
                <td className="pt-4 pb-3 text-start">TOTAL</td>
                <td className="pt-4 pb-3 text-end">
                  {fmt(order.totals?.total)}
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => navigate("/account#orders")}
              className="px-4 py-2 bg-white border rounded"
            >
              Go to my orders
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-black text-white rounded"
            >
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
