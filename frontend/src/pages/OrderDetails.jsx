import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 *
 * OrderDetails - страница подробностей заказа: загружает заказ по id, отображает основные данные (номер, дата, платеж, адрес, контакты) и список позиций с итогами (subtotal, shipping, total).
 * Обрабатывает состояния загрузки, ошибки, отсутствие доступа и неавторизованность.
 *
 * Ключевые состояния (useState / useEffect):
 *
 * order: объект заказа (null пока не загружен).
 * status: "idle" | "loading" | "success" | "notfound" | "forbidden" | "unauth" | "error" — контролирует UI.
 * error: строка с текстом ошибки (при status === "error").
 * temsWithKeys: массив order.items, но с гарантированными уникальными ключами _key (для render).
 */

export const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // хуки объявляем сразу, чтобы порядок всегда был одинаковым
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [itemsWithKeys, setItemsWithKeys] = useState([]);

  useEffect(() => {
    // если id нет — выставим notfound и ничего не запрашиваем
    if (!id) {
      setStatus("notfound");
      return;
    }

    let mounted = true;
    const controller = new AbortController();
    const signal = controller.signal;

    const load = async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal,
        });

        if (!mounted) return;

        if (res.status === 401) {
          setStatus("unauth");
          return;
        }
        if (res.status === 403) {
          setStatus("forbidden");
          return;
        }
        if (res.status === 404) {
          setStatus("notfound");
          return;
        }
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!mounted) return;
        setOrder(data);
        setStatus("success");
      } catch (err) {
        if (err.name === "AbortError") return;
        if (!mounted) return;
        console.error("Order fetch error", err);
        setError(err.message || "Unknown error");
        setStatus("error");
      }
    };

    load();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [id]);

  useEffect(() => {
    if (status === "unauth") {
      navigate("/account");
    }
  }, [status, navigate]);

  useEffect(() => {
    if (order?.items) {
      setItemsWithKeys(
        order.items.map((it, i) => ({
          ...it,
          _key: it.id ?? `${it.title}-${it.sku ?? ""}-${it.price}-${i}`,
        })),
      );
    } else {
      setItemsWithKeys([]);
    }
  }, [order]);

  const fmt = (v) => `$${Number(v || 0).toFixed(2)}`;

  // рендерим в зависимости от статуса
  if (status === "loading" || status === "idle") {
    return (
      <div className="p-8">
        <h2 className="text-2xl mb-4">Loading order…</h2>
      </div>
    );
  }

  if (status === "unauth") {
    // navigate уже выполнится в эффекте, пока можно показывать заглушку
    return null;
  }

  if (status === "forbidden") {
    return (
      <div className="p-8">
        <h2 className="text-2xl mb-4">Access denied</h2>
        <p className="text-[#707070] mb-6">
          You don't have permission to view this order.
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

  if (status === "notfound") {
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

  if (status === "error") {
    return (
      <div className="p-8">
        <h2 className="text-2xl mb-4">Error loading order</h2>
        <p className="text-[#707070] mb-6">{error}</p>
        <button
          onClick={() => navigate("/account#orders")}
          className="px-4 py-2 bg-black text-white rounded"
        >
          Go to my orders
        </button>
      </div>
    );
  }

  // status === 'success' and order exists
  return (
    <div className="mt-62 mb-62 w-full flex justify-between">
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
              {order.created_at
                ? new Date(order.created_at).toLocaleString()
                : "-"}
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
                itemsWithKeys.map((it) => (
                  <tr key={it._key}>
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
