import React, { useEffect, useContext, useState, useRef, useMemo } from "react";
import { useSaved } from "../../../context/save/useSaved.js";
import { CartContext } from "../../../context/cart/CartContext.jsx";
import { Drawer } from "../Drawer/Drawer.jsx";
import { useAuth } from "../../../context/auth/useAuth";

/**
 SavedDrawer: minimal & flexible pricing strategy
 - Always prefer server-provided final price when available (product.final_price or product.discount.price_after)
 - Cache per-product fetch results for short TTL (default 5 minutes)
 - Fallback to computePriceFromSnapshot using saved snapshot when server data unavailable
*/

// TTL for cached product data (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

function computePriceFromSnapshot(productOrSnapshot = {}) {
  try {
    const rawPrice =
      productOrSnapshot?.price ?? productOrSnapshot?.price_amount ?? null;
    const orig = rawPrice != null ? Number(rawPrice) : null;

    const serverFinalRaw =
      productOrSnapshot?.final_price ??
      productOrSnapshot?.price_after ??
      productOrSnapshot?.priceAfter ??
      null;
    const serverFinal =
      serverFinalRaw != null && !Number.isNaN(Number(serverFinalRaw))
        ? Number(serverFinalRaw)
        : null;

    const discountRaw =
      productOrSnapshot?.discount ?? productOrSnapshot?.discounts ?? null;
    let discount = null;
    if (Array.isArray(discountRaw) && discountRaw.length)
      discount = discountRaw[0];
    else discount = discountRaw;

    if (serverFinal != null && Number.isFinite(serverFinal)) return serverFinal;

    if (
      productOrSnapshot != null &&
      productOrSnapshot.price_after != null &&
      Number.isFinite(Number(productOrSnapshot.price_after))
    ) {
      return Number(productOrSnapshot.price_after);
    }

    if (discount && typeof discount === "object") {
      const dType = discount.type ?? null;
      const dValue = discount.value ?? discount.amount ?? null;
      if (dType === "percent" && dValue != null && orig != null) {
        const pct = Number(dValue) / 100;
        return Math.max(0, Number((orig * (1 - pct)).toFixed(2)));
      }
      if (dType === "fixed" && dValue != null && orig != null) {
        return Math.max(0, Number((orig - Number(dValue)).toFixed(2)));
      }
    }

    if (orig != null && Number.isFinite(orig)) return Number(orig);

    return 0;
  } catch (err) {
    console.warn("computePriceFromSnapshot error", err);
    return 0;
  }
}

export const SavedDrawer = () => {
  const {
    items,
    open,
    setOpen,
    remove,
    increase,
    decrease,
    total,
    clear,
    loading,
    load,
  } = useSaved();

  // productCache: { [productId]: { data: productObj, ts: number } }
  const [productCache, setProductCache] = useState({});
  const cacheRef = useRef(productCache);
  useEffect(() => {
    cacheRef.current = productCache;
  }, [productCache]);

  const localCount = Array.isArray(items) ? items.length : 0;
  const { user } = useAuth();
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    const onPending = () => setOpen(true);
    window.addEventListener("saved:moveToCartPending", onPending);
    return () =>
      window.removeEventListener("saved:moveToCartPending", onPending);
  }, [setOpen]);

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

    try {
      const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";
      const res = await fetch(`${API_BASE}/api/products/${pid}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return null;
      const json = await res.json().catch(() => null);
      const product = (json && (json.data ?? json)) || null;
      if (product) {
        setProductCache((prev) => ({
          ...(prev || {}),
          [pid]: { data: product, ts: Date.now() },
        }));
      }
      return product;
    } catch (err) {
      return null;
    }
  };

  // compute effective price preferring server final_price, then snapshot fields, then computed fallback
  const getEffectivePrice = (entry, productData) => {
    // productData may be fresh fetched product or cached
    const prod = productData ?? entry?.product ?? {};
    // prefer authoritative server field if present
    if (
      prod?.final_price != null &&
      Number.isFinite(Number(prod.final_price))
    ) {
      return Number(prod.final_price);
    }
    // product.discount?.price_after if present on server product
    const serverDiscountPrice =
      prod?.discount?.price_after ?? prod?.discounts?.[0]?.price_after ?? null;
    if (
      serverDiscountPrice != null &&
      Number.isFinite(Number(serverDiscountPrice))
    ) {
      return Number(serverDiscountPrice);
    }
    // entry-level explicit price_after (snapshot)
    if (
      entry?.price_after != null &&
      Number.isFinite(Number(entry.price_after))
    ) {
      return Number(entry.price_after);
    }
    // fallback compute from combined snapshot/product
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

      // Use the exact same source as row rendering: prefer cached product data,
      // otherwise fall back to snapshot in saved item. Do NOT fetch new server data.
      const cached = cacheRef.current?.[pid]?.data ?? it.product ?? null;
      const unit = getEffectivePrice(it, cached);

      // Debugging helper (optional) — uncomment if you want to see values in console:
      // console.debug("SavedDrawer moveToCart", { pid, unit, qty: it.qty ?? 1, snapshotPrice_after: it.price_after, snapshotPrice: it.price, cached });

      const cartItem = {
        id: pid,
        title: cached?.title ?? it.product?.title ?? it.title ?? "",
        price: Number(unit), // unit price as shown in UI
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

  // ensure productCache gets updated for missing items when drawer opens (non-blocking)
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
      if (!cancelled && Object.keys(results).length) {
        setProductCache((prev) => ({ ...(prev || {}), ...results }));
      }
    };
    loadMissing();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items]);

  // compute rows and total in one pass using useMemo for stability
  const { rows, computedTotal } = useMemo(() => {
    let accTotal = 0;
    const accRows = [];

    if (!Array.isArray(items) || !items.length) {
      return { rows: [], computedTotal: 0 };
    }

    for (const it of items) {
      const pid = Number(it.product?.id ?? it.product_id);
      const cached = productCache[pid]?.data ?? it.product ?? null;
      const unit = getEffectivePrice(it, cached);
      const lineTotal = Number(unit) * Number(it.qty ?? 1);
      accTotal += Number.isFinite(lineTotal) ? lineTotal : 0;

      // normalize image URL so it's always absolute
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
              {Number(unit).toFixed(2)} each
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                typeof decrease === "function"
                  ? decrease(it.id ?? it.product_id, 1)
                  : null
              }
              className="px-2"
            >
              −
            </button>
            <div className="px-2">{it.qty ?? 1}</div>
            <button
              onClick={() =>
                typeof increase === "function"
                  ? increase(it.id ?? it.product_id, 1)
                  : null
              }
              className="px-2"
            >
              +
            </button>
            <div className="px-3 font-semibold">
              {Number(lineTotal).toFixed(2)}
            </div>
            <button
              className="text-gray-500 px-2"
              onClick={async () => {
                try {
                  const isServerId = Number.isFinite(Number(it.id));
                  if (isServerId) {
                    await remove({ savedId: it.id });
                  } else {
                    const pid = it.product?.id ?? it.product_id ?? null;
                    if (pid == null) {
                      console.warn(
                        "SavedDrawer: cannot remove item, no id/productId",
                        it,
                      );
                    } else {
                      await remove({ productId: pid });
                    }
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
    // productCache is included because it affects unit price display
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
              {Number(computedTotal || 0).toFixed(2)}
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
