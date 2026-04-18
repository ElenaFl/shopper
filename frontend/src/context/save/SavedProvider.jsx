import React, { useCallback, useEffect, useState } from "react";
import { SavedContext } from "./SavedContext.jsx";
import { useAuth } from "../auth/useAuth.js";

const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";
const GUEST_KEY = "saved_items_v1";

function getXsrf() {
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}
async function ensureCsrf() {
  try {
    await fetch(`${API_BASE}/sanctum/csrf-cookie`, { credentials: "include" });
  } catch (e) {}
  return getXsrf();
}

/**
 * Helper: compute effective price from a product object or a saved snapshot.
 * Priority:
 * 1) explicit snapshot.price_after
 * 2) discount object (percent/fixed) applied to original price
 * 3) snapshot.price or product.price
 * 4) fallback 0
 */
function computePriceFromSnapshot(productOrSnapshot = {}) {
  try {
    const rawPrice =
      productOrSnapshot?.price ?? productOrSnapshot?.price_amount ?? null;
    const orig = rawPrice != null ? Number(rawPrice) : null;

    // discount may be array or object
    const discountRaw =
      productOrSnapshot?.discount ?? productOrSnapshot?.discounts ?? null;
    let discount = null;
    if (Array.isArray(discountRaw) && discountRaw.length)
      discount = discountRaw[0];
    else discount = discountRaw;

    // 1) explicit snapshot price_after (snapshot override)
    if (
      productOrSnapshot != null &&
      productOrSnapshot.price_after != null &&
      Number.isFinite(Number(productOrSnapshot.price_after))
    ) {
      return Number(productOrSnapshot.price_after);
    }

    // 2) discount object applied to original price
    if (discount && typeof discount === "object" && orig != null) {
      const dType = discount.type ?? null;
      const dValue = discount.value ?? discount.amount ?? null;
      if (dType === "percent" && dValue != null) {
        const pct = Number(dValue) / 100;
        return Math.max(0, Number((orig * (1 - pct)).toFixed(2)));
      }
      if (dType === "fixed" && dValue != null) {
        return Math.max(0, Number((orig - Number(dValue)).toFixed(2)));
      }
    }

    // 3) explicit price on snapshot/product
    if (orig != null && Number.isFinite(orig)) return Number(orig);

    // 4) fallback
    return 0;
  } catch (err) {
    console.warn("computePriceFromSnapshot error", err);
    return 0;
  }
}

/**
 * Normalize a saved item (from server or localStorage) to ensure:
 * - qty is numeric
 * - price and price_after are numeric (or computed fallback)
 * - product present as object or null
 */
function normalizeSavedItem(item = {}) {
  const productObj = item.product ?? {};
  // compute with product overridden by snapshot fields (snapshot should win)
  const computed = computePriceFromSnapshot({ ...productObj, ...item });

  const rawPrice = item.price ?? productObj?.price ?? null;
  const parsedPrice =
    rawPrice != null && Number.isFinite(Number(rawPrice))
      ? Number(rawPrice)
      : null;

  const rawPriceAfter =
    item.price_after ??
    productObj?.final_price ??
    productObj?.price_after ??
    null;
  const parsedPriceAfter =
    rawPriceAfter != null && Number.isFinite(Number(rawPriceAfter))
      ? Number(rawPriceAfter)
      : null;

  return {
    ...item,
    product: productObj ?? null,
    qty: Number(item.qty ?? 1),
    price: parsedPrice ?? computed,
    price_after: parsedPriceAfter ?? computed,
  };
}

export const SavedProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [open, setOpen] = useState(false);
  const count = Array.isArray(items) ? items.length : 0;

  function getUnitPrice(item) {
    // item может быть saved snapshot or product
    const rawAfter = item?.price_after ?? item?.product?.price_after ?? null;
    if (rawAfter != null && Number.isFinite(Number(rawAfter)))
      return Number(rawAfter);
    const rawPrice =
      item?.price ?? item?.product?.price ?? item?.price_amount ?? null;
    return rawPrice != null && Number.isFinite(Number(rawPrice))
      ? Number(rawPrice)
      : 0;
  }

  const total = (items || []).reduce(
    (s, it) => s + getUnitPrice(it) * (Number(it.qty ?? 1) || 0),
    0,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (user?.id) {
        await ensureCsrf();
        const res = await fetch(`${API_BASE}/api/user/saved-items`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) {
          if (res.status === 401) {
            setItems([]);
            return;
          }
          throw new Error("Failed to load saved items");
        }
        const json = await res.json();
        const raw = Array.isArray(json.data) ? json.data : [];
        // normalize server items so price_after/price are present and numeric
        const normalized = raw.map((it) => normalizeSavedItem(it));
        setItems(normalized);
      } else {
        let raw = null;
        try {
          raw = localStorage.getItem(GUEST_KEY);
        } catch (e) {
          raw = null;
        }

        let parsed = [];
        try {
          parsed = raw ? JSON.parse(raw) : [];
        } catch (e) {
          parsed = [];
        }

        const normalized = [];
        if (Array.isArray(parsed)) {
          for (const entry of parsed) {
            if (entry == null) continue;
            if (typeof entry === "object" && entry !== null) {
              // compute effective price and ensure consistent fields
              const productObj = entry.product ?? {};
              const computed = computePriceFromSnapshot({
                ...productObj,
                ...entry,
              });
              normalized.push({
                ...normalizeSavedItem({
                  ...entry,
                  product: productObj,
                  qty: Number(entry.qty ?? 1),
                  price: entry.price ?? productObj?.price ?? computed,
                  price_after:
                    entry.price_after ??
                    productObj?.final_price ??
                    productObj?.price_after ??
                    computed,
                }),
              });
            } else {
              normalized.push({ product_id: entry, qty: 1 });
            }
          }
        }
        setItems(normalized);
      }
    } catch (err) {
      console.error("load saved items failed", err);
      setError(err?.message || "Error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const save = useCallback(
    async (productId, productSnapshot = null) => {
      if (!productId) throw new Error("productId required");
      if (user?.id) {
        await ensureCsrf();
        const res = await fetch(`${API_BASE}/api/user/saved-items`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": getXsrf(),
            Accept: "application/json",
          },
          body: JSON.stringify({ product_id: productId }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const json = await res.json();
        // normalize server response item
        const normalizedItem = normalizeSavedItem(json);
        setItems((prev) => {
          const exists = prev.find(
            (p) => String(p.product_id) === String(productId),
          );
          if (exists)
            return prev.map((p) =>
              String(p.product_id) === String(productId) ? normalizedItem : p,
            );
          return [normalizedItem, ...prev];
        });
        return normalizedItem;
      } else {
        // guest branch: persist snapshot object when available (backwards-compatible)
        let rawGuest = null;
        try {
          rawGuest = localStorage.getItem(GUEST_KEY);
        } catch (e) {
          console.error(
            "SavedProvider.save (guest) - localStorage.getItem failed",
            e,
          );
          rawGuest = null;
        }
        console.log("SavedProvider.save (guest) - raw before:", rawGuest);

        let arr = [];
        try {
          arr = rawGuest ? JSON.parse(rawGuest) : [];
        } catch (e) {
          console.warn(
            "SavedProvider.save (guest) - parse failed, resetting arr",
            e,
          );
          arr = [];
        }
        if (!Array.isArray(arr)) arr = [];

        // normalize existing entries to objects
        const normalized = arr.map((entry) =>
          typeof entry === "object" && entry !== null
            ? entry
            : { product_id: entry },
        );

        // compute snapshot with ensured price fields
        const snapshotProduct = productSnapshot ?? null;
        const computedPrice = computePriceFromSnapshot(snapshotProduct ?? {});
        const snapshot = {
          product_id: productId,
          qty: 1,
          product: snapshotProduct,
          price_after:
            snapshotProduct?.price_after ??
            snapshotProduct?.final_price ??
            computedPrice,
          price:
            snapshotProduct?.price ??
            snapshotProduct?.price_amount ??
            computedPrice,
        };

        const existsIndex = normalized.findIndex(
          (p) => String(p.product_id) === String(productId),
        );
        if (existsIndex === -1) {
          normalized.unshift(snapshot);
        } else if (productSnapshot) {
          // update existing snapshot with richer data
          normalized[existsIndex] = {
            ...normalized[existsIndex],
            ...snapshot,
          };
        }

        try {
          localStorage.setItem(GUEST_KEY, JSON.stringify(normalized));
          console.log(
            "SavedProvider.save (guest) - wrote:",
            localStorage.getItem(GUEST_KEY),
          );
        } catch (e) {
          console.error(
            "SavedProvider.save (guest) - localStorage.setItem failed",
            e,
          );
        }

        const normalizedItem = normalizeSavedItem({
          product_id: productId,
          product: snapshotProduct ?? null,
          qty: 1,
          price_after: snapshot.price_after,
          price: snapshot.price,
        });

        setItems((prev) => [normalizedItem, ...prev]);
        return normalizedItem;
      }
    },
    [user?.id],
  );

  const remove = useCallback(
    async ({ savedId = null, productId = null } = {}) => {
      if (user?.id) {
        let idToDelete = savedId;
        if (!idToDelete && productId) {
          const found = items.find(
            (it) => String(it.product_id) === String(productId),
          );
          idToDelete = found?.id ?? null;
        }
        if (!idToDelete)
          throw new Error("savedId or productId required for delete");
        await ensureCsrf();
        const res = await fetch(
          `${API_BASE}/api/user/saved-items/${idToDelete}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: { "X-XSRF-TOKEN": getXsrf(), Accept: "application/json" },
          },
        );
        if (res.ok) {
          setItems((prev) =>
            prev.filter(
              (it) =>
                it.id !== idToDelete &&
                String(it.product_id) !== String(productId),
            ),
          );
          return true;
        }
        if (res.status === 404) {
          console.warn(
            `Saved item ${idToDelete} not found on server; treating as deleted.`,
          );
          setItems((prev) =>
            prev.filter(
              (it) =>
                it.id !== idToDelete &&
                String(it.product_id) !== String(productId),
            ),
          );
          return true;
        }
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      } else {
        if (!productId) throw new Error("productId required for guest delete");
        const raw = localStorage.getItem(GUEST_KEY);
        const ids = raw ? JSON.parse(raw) : [];
        const next = ids.filter((p) => String(p) !== String(productId));
        localStorage.setItem(GUEST_KEY, JSON.stringify(next));
        setItems((prev) =>
          prev.filter((it) => String(it.product_id) !== String(productId)),
        );
        return true;
      }
    },
    [user?.id, items],
  );

  const increase = (identifier, by = 1) => {
    setItems((prev) =>
      prev.map((it) => {
        const matches =
          String(it.id ?? "") === String(identifier) ||
          String(it.product_id ?? "") === String(identifier) ||
          String(`guest-${it.product_id ?? ""}`) === String(identifier);
        if (!matches) return it;
        const newQty = Math.max(1, (Number(it.qty) || 1) + Number(by));
        return { ...it, qty: newQty };
      }),
    );
  };

  const decrease = (identifier, by = 1) => {
    setItems((prev) =>
      prev.map((it) => {
        const matches =
          String(it.id ?? "") === String(identifier) ||
          String(it.product_id ?? "") === String(identifier) ||
          String(`guest-${it.product_id ?? ""}`) === String(identifier);
        if (!matches) return it;
        const newQty = Math.max(1, (Number(it.qty) || 1) - Number(by));
        return { ...it, qty: newQty };
      }),
    );
  };

  const sync = useCallback(
    async (productIds = []) => {
      if (!user?.id || !productIds || !productIds.length) return;
      await ensureCsrf();
      const res = await fetch(`${API_BASE}/api/user/saved-items/sync`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getXsrf(),
          Accept: "application/json",
        },
        body: JSON.stringify({ product_ids: productIds }),
      });
      if (!res.ok) throw new Error("Sync failed");
      const json = await res.json();
      const raw = Array.isArray(json.data) ? json.data : [];
      // normalize synced items
      const normalized = raw.map((it) => normalizeSavedItem(it));
      setItems(normalized);
      localStorage.removeItem(GUEST_KEY);
    },
    [user?.id],
  );

  useEffect(() => {
    const run = async () => {
      try {
        if (user?.id) {
          let raw = null;
          try {
            raw = localStorage.getItem(GUEST_KEY);
          } catch (e) {
            raw = null;
          }
          let parsed = [];
          try {
            parsed = raw ? JSON.parse(raw) : [];
          } catch (e) {
            parsed = [];
          }

          const ids = [];
          if (Array.isArray(parsed)) {
            for (const entry of parsed) {
              if (entry == null) continue;
              if (typeof entry === "object" && entry !== null) {
                if (entry.product_id != null) ids.push(entry.product_id);
                else if (entry.id != null) ids.push(entry.id);
              } else {
                ids.push(entry);
              }
            }
          }

          if (ids.length) {
            try {
              await sync(ids);
            } catch (e) {
              console.error("SavedProvider sync error", e);
            }
          }

          await load();
        } else {
          await load();
        }
      } catch (e) {
        console.error("SavedProvider effect error", e);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // очистить все saved items (клиент + попытка на сервере)
  const clear = useCallback(async () => {
    // клиентский fallback
    try {
      localStorage.removeItem(GUEST_KEY);
    } catch (e) {}
    setItems([]);

    if (!user?.id) return true;

    try {
      await ensureCsrf();
      // Попробуйте endpoint очистки; если у вас нет такого, удалите по id ниже
      const res = await fetch(`${API_BASE}/api/user/saved-items/clear`, {
        method: "POST", // или "DELETE" - проверьте API
        credentials: "include",
        headers: { "X-XSRF-TOKEN": getXsrf(), Accept: "application/json" },
      });
      if (res.ok) {
        setItems([]);
        return true;
      }

      // Если API не поддерживает /clear, удалим единично (получим current items ids)
      // (в некоторых API нет /clear — выполняем delete по каждому id)
      if (res.status === 404 || !res.ok) {
        // fallback: try delete each known saved id
        try {
          for (const it of items || []) {
            const idToDelete = it?.id;
            if (idToDelete) {
              await fetch(`${API_BASE}/api/user/saved-items/${idToDelete}`, {
                method: "DELETE",
                credentials: "include",
                headers: {
                  "X-XSRF-TOKEN": getXsrf(),
                  Accept: "application/json",
                },
              }).catch(() => {});
            }
          }
          setItems([]);
          return true;
        } catch (errInner) {
          console.error("clear fallback failed", errInner);
        }
      }

      const txt = await res.text().catch(() => "");
      console.warn("clear response not ok:", res.status, txt);
      // несмотря на проблему на сервере, очистим клиент
      setItems([]);
      return false;
    } catch (err) {
      console.error("clear failed", err);
      // не откатываем клиентскую очистку
      setItems([]);
      return false;
    }
  }, [user?.id, items]);

  console.log("SavedProvider items:", items);

  return (
    <SavedContext.Provider
      value={{
        items,
        loading,
        error,
        load,
        save,
        remove,
        sync,
        open,
        setOpen,
        count,
        total,
        increase,
        decrease,
        clear,
      }}
    >
      {children}
    </SavedContext.Provider>
  );
};
