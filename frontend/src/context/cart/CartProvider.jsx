import React, { useEffect, useState, useCallback } from "react";
import { CartContext } from "./CartContext.jsx";
import { Alert } from "../../components/ui/Alert/Alert.jsx";

// ---------- config ----------
const LOCAL_STORAGE_KEY = "shopper_cart";
const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";
function getXsrf() {
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}
// ---------- end config ----------

export const CartProvider = ({ children }) => {
  // initial cart from localStorage
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("CartProvider: parse localStorage failed", e);
      return [];
    }
  });

  const [alert, setAlert] = useState({
    isOpen: false,
    variant: "neutral",
    title: "",
    subtitle: "",
  });

  const showAlert = ({ variant = "neutral", title = "", subtitle = "" }) =>
    setAlert({ isOpen: true, variant, title, subtitle });

  const toNum = (v) => {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };

  // persist cart -> localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error("CartProvider: save localStorage failed", e);
    }
  }, [cart]);

  // ---------- helpers ----------
  const normalizeSnapshot = (snapshot) => {
    if (snapshot === null || snapshot === undefined) return [];
    if (Array.isArray(snapshot)) return snapshot;
    if (typeof snapshot === "string") {
      try {
        const parsed = JSON.parse(snapshot);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        return [snapshot];
      }
    }
    return [snapshot];
  };

  const buildItemPayload = (p) => ({
    product_id: p.id,
    quantity: p.quantity ?? 1,
    unit_price: p.price ?? p.unit_price ?? null,
    snapshot: normalizeSnapshot(p.snapshot),
  });

  // detect "stale" local items: no visual info and no snapshot
  const isStaleLocalItem = (item) => {
    const hasTitle = item?.title && String(item.title).trim() !== "";
    const hasImg = item?.img && String(item.img).trim() !== "";
    const snapshot = item?.snapshot;
    const hasSnapshot = Array.isArray(snapshot)
      ? snapshot.length > 0
      : snapshot != null;
    return !(hasTitle || hasImg || hasSnapshot);
  };

  const cleanStaleLocalItems = (items) => {
    if (!Array.isArray(items)) return [];
    const cleaned = items.filter((it) => !isStaleLocalItem(it));
    if (cleaned.length !== items.length) {
      console.log("CartProvider: removed stale local items", {
        before: items.length,
        after: cleaned.length,
      });
    }
    return cleaned;
  };
  // ---------- end helpers ----------

  // ---------- server helpers ----------
  const fetchServerCart = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/cart`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : json;
    } catch (err) {
      console.warn("fetchServerCart failed", err);
      throw err;
    }
  };

  const postServerCartItem = async (payload) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/cart`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getXsrf(),
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const json = await res.json();
      return json.data ?? json;
    } catch (err) {
      console.warn("postServerCartItem failed", err);
      throw err;
    }
  };

  const putServerCartItem = async (id, payload) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/cart/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getXsrf(),
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const json = await res.json();
      return json.data ?? json;
    } catch (err) {
      console.warn("putServerCartItem failed", err);
      throw err;
    }
  };

  const deleteServerCartItem = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/cart/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-XSRF-TOKEN": getXsrf(), Accept: "application/json" },
      });
      if (!res.ok && res.status !== 204) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      return true;
    } catch (err) {
      console.warn("deleteServerCartItem failed", err);
      throw err;
    }
  };

  const postServerSync = async (items) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/cart/sync`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getXsrf(),
          Accept: "application/json",
        },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : json;
    } catch (err) {
      console.warn("postServerSync failed", err);
      throw err;
    }
  };

  const deleteAllServerCartForUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/cart/clear`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getXsrf(),
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      return true;
    } catch (err) {
      console.warn("deleteAllServerCartForUser failed", err);
      return false;
    }
  };
  // ---------- end server helpers ----------

  // ---------- cart ops ----------
  const addToCart = async (item) => {
    if (!item || item.id == null) {
      showAlert({
        variant: "error",
        title: "Ошибка",
        subtitle: "Некорректный товар",
      });
      return;
    }
    const itemId = toNum(item.id);
    if (itemId === null) {
      showAlert({
        variant: "error",
        title: "Ошибка",
        subtitle: "ID товара должен быть числом",
      });
      return;
    }

    // optimistic local update
    setCart((prev) => {
      const existing = prev.find((i) => toNum(i.id) === itemId);
      if (existing) {
        return prev.map((i) =>
          toNum(i.id) === itemId
            ? { ...i, quantity: (i.quantity || 1) + (item.quantity || 1) }
            : i,
        );
      }
      return [...prev, { ...item, id: itemId, quantity: item.quantity || 1 }];
    });

    // persist to server if logged in (server returns 401 if not)
    try {
      const payload = buildItemPayload(item);
      console.log("addToCart payload:", payload);
      const serverResult = await postServerCartItem(payload);
      if (serverResult) {
        setCart((prev) => {
          const found = prev.find(
            (p) => Number(p.id) === Number(serverResult.product_id),
          );
          const mapped = {
            id: serverResult.product_id ?? serverResult.product_id,
            title:
              serverResult.snapshot?.title ??
              serverResult.title ??
              found?.title ??
              item.title ??
              "",
            img:
              serverResult.snapshot?.img ??
              serverResult.snapshot?.img_url ??
              serverResult.img ??
              found?.img ??
              item.img ??
              null,
            price: Number(
              serverResult.unit_price ?? found?.price ?? item.price ?? 0,
            ),
            quantity: Number(
              serverResult.quantity ?? item.quantity ?? found?.quantity ?? 1,
            ),
            snapshot:
              serverResult.snapshot ?? found?.snapshot ?? item.snapshot ?? null,
          };
          if (found)
            return prev.map((p) =>
              Number(p.id) === Number(mapped.id) ? mapped : p,
            );
          return [...prev, mapped];
        });
      }
    } catch (err) {
      console.warn("addToCart: server persist failed (kept local):", err);
    }
  };

  const removeFromCart = (itemId) => {
    const idNum = toNum(itemId);
    if (idNum === null) {
      showAlert({
        variant: "error",
        title: "Ошибка",
        subtitle: "Некорректный ID",
      });
      return;
    }

    const toRemove = cart.find((i) => toNum(i.id) === idNum);
    setCart((prev) => prev.filter((i) => toNum(i.id) !== idNum));

    if (toRemove)
      showAlert({
        variant: "info",
        title: "Удалено из корзины",
        subtitle: toRemove.title || "",
      });

    (async () => {
      try {
        const serverCart = await fetchServerCart();
        const found = serverCart.find((s) => Number(s.product_id) === idNum);
        if (found && found.id) await deleteServerCartItem(found.id);
      } catch (err) {
        // ignore
      }
    })();
  };

  const updateQuantity = async (itemId, quantity) => {
    const idNum = toNum(itemId);
    if (idNum === null) {
      showAlert({
        variant: "error",
        title: "Ошибка",
        subtitle: "Некорректный ID",
      });
      return;
    }

    setCart((prev) => {
      if (Number(quantity) <= 0)
        return prev.filter((i) => toNum(i.id) !== idNum);
      return prev.map((i) => (toNum(i.id) === idNum ? { ...i, quantity } : i));
    });

    showAlert({
      variant: "success",
      title: "Количество обновлено",
      subtitle: "",
    });

    (async () => {
      try {
        const serverCart = await fetchServerCart();
        const found = serverCart.find((s) => Number(s.product_id) === idNum);
        if (found && found.id) {
          const payload = { product_id: idNum, quantity };
          await putServerCartItem(found.id, payload);
        } else {
          const local = (cart || []).find((c) => Number(c.id) === idNum) || {};
          const payloadWithSnapshot = { ...buildItemPayload(local), quantity };
          await postServerCartItem(payloadWithSnapshot);
        }
      } catch (err) {
        // ignore
      }
    })();
  };

  const clearCart = useCallback(() => {
    setCart([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.error("clearCart: localStorage remove failed", e);
    }
    showAlert({ variant: "info", title: "Корзина очищена", subtitle: "" });
  }, []);

  const syncGuestToServer = useCallback(async () => {
    try {
      const mergeFlag = sessionStorage.getItem("shopper_merge_pending");
      if (!mergeFlag) {
        console.debug(
          "syncGuestToServer: merge not allowed (no merge_pending flag)",
        );
        return false;
      }

      const localCart = Array.isArray(cart) ? [...cart] : [];
      console.log(
        "local cart snapshot before sync:",
        JSON.stringify(localCart),
      );

      const items = localCart.map((p) => buildItemPayload(p));
      console.log("syncGuestToServer payload:", JSON.stringify({ items }));

      const serverItems = await postServerSync(items);
      console.log("syncGuestToServer serverItems:", serverItems);

      const serverByProductId = new Map();
      (serverItems || []).forEach((s) =>
        serverByProductId.set(Number(s.product_id), s),
      );

      const merged = localCart.map((localItem) => {
        const s = serverByProductId.get(Number(localItem.id));
        if (!s) return localItem;
        return {
          id: localItem.id,
          title:
            s.snapshot?.title ??
            s.title ??
            s.name ??
            s.product_name ??
            localItem.title ??
            "",
          img:
            s.snapshot?.img ??
            s.snapshot?.img_url ??
            s.img ??
            s.image ??
            localItem.img ??
            null,
          price: Number(s.unit_price ?? localItem.price ?? 0),
          quantity: Number(s.quantity ?? localItem.quantity ?? 1),
          snapshot: s.snapshot ?? localItem.snapshot ?? null,
        };
      });

      (serverItems || []).forEach((s) => {
        const found = localCart.find(
          (p) => Number(p.id) === Number(s.product_id),
        );
        if (!found)
          merged.push({
            id: s.product_id,
            title: s.snapshot?.title ?? s.title ?? "",
            img: s.snapshot?.img ?? s.snapshot?.img_url ?? s.img ?? null,
            price: Number(s.unit_price ?? 0),
            quantity: Number(s.quantity ?? 1),
            snapshot: s.snapshot ?? null,
          });
      });

      setCart(merged);
      console.log("cart after merge:", JSON.stringify(merged));

      try {
        sessionStorage.removeItem("shopper_merge_pending");
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (e) {}

      return true;
    } catch (err) {
      console.error("syncGuestToServer failed", err);
      return false;
    }
  }, [cart]);

  // handle server cart set event from AuthProvider
  useEffect(() => {
    const handler = (e) => {
      const serverCart = e?.detail?.serverCart;
      if (!Array.isArray(serverCart)) return;
      // Map server items to client shape
      const mapped = serverCart.map((s) => ({
        id: s.product_id ?? s.product_id,
        title: s.snapshot?.title ?? s.title ?? "",
        img: s.snapshot?.img ?? s.snapshot?.img_url ?? s.img ?? null,
        price: Number(s.unit_price ?? 0),
        quantity: Number(s.quantity ?? 1),
        snapshot: s.snapshot ?? null,
      }));
      // If mapped empty but local cart has only stale items -> clear them
      if (
        (!mapped || mapped.length === 0) &&
        Array.isArray(cart) &&
        cart.length > 0
      ) {
        const cleaned = cleanStaleLocalItems(cart);
        setCart(cleaned);
        console.log(
          "CartProvider: replaced stale local cart with cleaned:",
          cleaned,
        );
      } else {
        setCart(mapped);
        console.log("CartProvider: setCart from server event:", mapped);
      }
    };
    window.addEventListener("cart:setFromServer", handler);
    return () => window.removeEventListener("cart:setFromServer", handler);
  }, [cart]);

  // on mount: if local cart exists but appears stale, clean it.
  useEffect(() => {
    try {
      const local = Array.isArray(cart) ? cart : [];
      if (local.length > 0) {
        const cleaned = cleanStaleLocalItems(local);
        if (cleaned.length !== local.length) {
          setCart(cleaned);
          console.log("CartProvider: cleaned stale items on mount", {
            before: local.length,
            after: cleaned.length,
          });
        }
      }
    } catch (e) {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        syncGuestToServer,
        fetchServerCart,
        deleteAllServerCartForUser,
      }}
    >
      {children}
      <Alert
        variant={alert.variant}
        isOpen={alert.isOpen}
        title={alert.title}
        subtitle={alert.subtitle}
        onClose={() => setAlert((s) => ({ ...s, isOpen: false }))}
      />
    </CartContext.Provider>
  );
};

export default CartProvider;
