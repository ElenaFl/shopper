import React, { useEffect, useState, useCallback } from "react";
import { SavedContext } from "./SavedContext.jsx";

const STORAGE_KEY = "saved_items_v1";

/**
 SavedProvider — хранит items: { id, product, qty, price_after, currency }
 price_after — финальная цена на момент добавления (число)
 currency — код валюты (если есть)
*/
export const SavedProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to load saved items", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Failed to persist saved items", e);
    }
  }, [items]);

  // helper: derive final price for a product object (mirror logic used in Card/ProductDetails)
  const deriveFinalPrice = useCallback((product) => {
    if (!product)
      return { price_after: null, currency: product?.currency ?? null };

    // prefer server-provided final_price
    if (
      product.final_price != null &&
      !Number.isNaN(Number(product.final_price))
    ) {
      return {
        price_after: Number(product.final_price),
        currency: product.currency ?? null,
      };
    }

    // server discount object may include price_after
    const discount =
      product.discount ??
      (Array.isArray(product.discounts) ? product.discounts[0] : null);
    if (
      discount &&
      discount.price_after != null &&
      !Number.isNaN(Number(discount.price_after))
    ) {
      return {
        price_after: Number(discount.price_after),
        currency: discount.currency ?? product.currency ?? null,
      };
    }

    // compute locally if percent or fixed present (client fallback)
    const basePrice = Number(product.price ?? 0);
    if (
      discount &&
      discount.type === "percent" &&
      discount.value != null &&
      !Number.isNaN(Number(discount.value))
    ) {
      const pct = Number(discount.value) / 100;
      return {
        price_after: Math.max(0, Number((basePrice * (1 - pct)).toFixed(2))),
        currency: discount.currency ?? product.currency ?? null,
      };
    }
    if (
      discount &&
      discount.type === "fixed" &&
      discount.value != null &&
      !Number.isNaN(Number(discount.value))
    ) {
      return {
        price_after: Math.max(
          0,
          Number((basePrice - Number(discount.value)).toFixed(2)),
        ),
        currency: discount.currency ?? product.currency ?? null,
      };
    }

    // fallback to base price
    return {
      price_after: Number(basePrice),
      currency: product.currency ?? null,
    };
  }, []);

  // count = total quantity of saved items
  const count = items.reduce((s, it) => s + (it.qty ?? 1), 0);

  // total: use price_after if available, otherwise product.price
  const total = items.reduce((s, it) => {
    const unit =
      it.price_after != null
        ? Number(it.price_after)
        : Number(it.product?.price ?? 0);
    return s + unit * (it.qty ?? 1);
  }, 0);

  const isSaved = useCallback(
    (productId) =>
      items.some(
        (i) => String(i.product?.id ?? i.product_id) === String(productId),
      ),
    [items],
  );

  // add: if exists => increase qty and keep price_after as originally stored (do not override),
  // if new => compute price_after now and store it with item
  const add = useCallback(
    (product, qty = 1) => {
      setItems((prev) => {
        const key = String(product.id ?? product.product_id);
        const existing = prev.find(
          (p) => String(p.product?.id ?? p.product_id) === key,
        );
        if (existing) {
          // increase qty, keep existing price_after
          return prev.map((p) =>
            String(p.product?.id ?? p.product_id) === key
              ? { ...p, qty: (p.qty ?? 1) + qty }
              : p,
          );
        }
        const derived = deriveFinalPrice(product);
        const item = {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          product,
          qty,
          price_after: derived.price_after,
          currency: derived.currency,
        };
        return [item, ...prev];
      });
      setOpen(true);
    },
    [deriveFinalPrice],
  );

  const remove = useCallback((idOrProductId) => {
    setItems((prev) =>
      prev.filter(
        (i) =>
          String(i.id) !== String(idOrProductId) &&
          String(i.product?.id ?? i.product_id) !== String(idOrProductId),
      ),
    );
  }, []);

  const increase = useCallback((idOrProductId, delta = 1) => {
    setItems((prev) =>
      prev.map((i) =>
        String(i.id) === String(idOrProductId) ||
        String(i.product?.id ?? i.product_id) === String(idOrProductId)
          ? { ...i, qty: (i.qty ?? 1) + delta }
          : i,
      ),
    );
  }, []);

  const decrease = useCallback((idOrProductId, delta = 1) => {
    setItems((prev) =>
      prev
        .map((i) =>
          String(i.id) === String(idOrProductId) ||
          String(i.product?.id ?? i.product_id) === String(idOrProductId)
            ? { ...i, qty: Math.max(0, (i.qty ?? 1) - delta) }
            : i,
        )
        .filter((i) => (i.qty ?? 1) > 0),
    );
  }, []);

  // toggle: now behaves as add (increase by 1)
  const toggle = useCallback(
    (product) => {
      add(product, 1);
      setOpen(true);
    },
    [add],
  );

  const clear = useCallback(() => setItems([]), []);

  // moveToCart: include price_after and currency per item in payload
  const moveToCart = useCallback(
    async ({ apiBase, onSuccess } = {}) => {
      if (items.length === 0) return;
      setLoading(true);
      try {
        if (apiBase) {
          const payload = items.map((it) => ({
            product_id: it.product.id ?? it.product.product_id,
            qty: it.qty ?? 1,
            price_after: it.price_after ?? Number(it.product?.price ?? 0),
            currency: it.currency ?? it.product?.currency ?? null,
          }));
          try {
            const res = await fetch(`${apiBase}/api/cart/batch-add`, {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                "X-XSRF-TOKEN": (window.getXsrf && window.getXsrf()) || "",
              },
              body: JSON.stringify({ items: payload }),
            });
            if (!res.ok) throw new Error("batch failed");
          } catch (e) {
            // fallback to individual adds
            for (const it of payload) {
              await fetch(`${apiBase}/api/cart`, {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  "X-XSRF-TOKEN": (window.getXsrf && window.getXsrf()) || "",
                },
                body: JSON.stringify({
                  product_id: it.product_id,
                  qty: it.qty,
                  price_after: it.price_after,
                  currency: it.currency,
                }),
              });
            }
          }
        }
        clear();
        if (typeof onSuccess === "function") onSuccess();
      } catch (e) {
        console.error("moveToCart failed", e);
      } finally {
        setLoading(false);
      }
    },
    [items, clear],
  );

  return (
    <SavedContext.Provider
      value={{
        items,
        setItems,
        open,
        setOpen,
        loading,
        count,
        total,
        isSaved,
        add,
        remove,
        toggle,
        increase,
        decrease,
        clear,
        moveToCart,
      }}
    >
      {children}
    </SavedContext.Provider>
  );
};
