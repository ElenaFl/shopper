import React, { useEffect, useState, useCallback } from "react";
import { CartContext } from "./CartContext.jsx";
import { Alert } from "../../components/ui/Alert/Alert.jsx";
import { useAuth } from "../auth/useAuth";

const LOCAL_STORAGE_KEY = "shopper_cart";
const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";
function getXsrf() {
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export const CartProvider = ({ children }) => {
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

  const { user } = useAuth() ?? { user: null };

  (function () {
    try {
      const origSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === LOCAL_STORAGE_KEY) {
          console.warn("[localStorage.debug] setItem shopper_cart", {
            valueSample: String(v).slice(0, 200),
            stack: new Error().stack.split("\n").slice(2, 6).join("\n"),
          });
        }
        return origSet.apply(this, arguments);
      };
    } catch (e) {}
  })();

  function isAuthenticated() {
    if (typeof document === "undefined" || !document.cookie) return false;
    return (
      document.cookie.includes("laravel_session=") ||
      document.cookie.includes("laravel-session=") ||
      document.cookie.includes("XSRF-TOKEN=")
    );
  }

  const safeWriteLocalCart = (obj) => {
    try {
      const isAuth = Boolean(user && user.id) || isAuthenticated();
      if (isAuth) {
        console.log(
          "safeWriteLocalCart: user is authenticated — skip writing localStorage",
        );
        return false;
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(obj));
      return true;
    } catch (e) {
      console.error("safeWriteLocalCart failed", e);
      return false;
    }
  };

  useEffect(() => {
    try {
      const isAuth = Boolean(user && user.id) || isAuthenticated();
      console.log("CartProvider: localStorage effect", {
        cartLength: Array.isArray(cart) ? cart.length : null,
        isAuth,
      });

      if (isAuth) {
        try {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          console.log(
            "CartProvider: removed guest cart from localStorage because authenticated",
          );
        } catch (e) {
          console.error("CartProvider: failed removing localStorage", e);
        }
      } else {
        try {
          const safe = Array.isArray(cart) ? cleanStaleLocalItems(cart) : [];
          safeWriteLocalCart(safe);
          console.log("CartProvider: wrote guest cart to localStorage", {
            len: safe.length,
          });
        } catch (e) {
          console.error("CartProvider: failed writing localStorage", e);
        }
      }
    } catch (e) {
      console.error("CartProvider: localStorage effect outer error", e);
    }
  }, [cart, user?.id]);

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

  const fetchServerCart = async () => {
    const res = await fetch(`${API_BASE}/api/user/cart`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : json;
  };

  const postServerCartItem = async (payload) => {
    const pending = sessionStorage.getItem("shopper_merge_pending");
    if (pending) {
      console.log(
        "postServerCartItem: merge pending, skipping server persist",
        pending,
      );
      return null;
    }
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
  };

  const postServerSync = async (items) => {
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
  };

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

    try {
      const pending = sessionStorage.getItem("shopper_merge_pending");
      if (pending) {
        console.log("addToCart: merge pending, skipping server add", pending);
        return;
      }
      const payload = buildItemPayload({ ...item, id: itemId });
      const serverResult = await postServerCartItem(payload);
      if (serverResult) {
        setCart((prev) => {
          const prodId = Number(
            serverResult.product_id ?? serverResult.product_id,
          );
          const foundIdx = prev.findIndex((p) => Number(p.id) === prodId);
          const existing = foundIdx >= 0 ? prev[foundIdx] : null;

          const incomingQty = Number(
            serverResult.added_quantity ??
              serverResult.quantity ??
              item.quantity ??
              1,
          );

          const resolvedQuantity =
            serverResult.quantity !== undefined &&
            serverResult.quantity !== null
              ? Number(serverResult.quantity)
              : existing
                ? Math.max(
                    0,
                    Number(existing.quantity || 0) -
                      (item.quantity || 1) +
                      incomingQty,
                  )
                : incomingQty;

          const mapped = {
            id: prodId,
            title:
              serverResult.snapshot?.title ??
              serverResult.title ??
              existing?.title ??
              item.title ??
              "",
            img:
              serverResult.snapshot?.img ??
              serverResult.snapshot?.img_url ??
              serverResult.img ??
              existing?.img ??
              item.img ??
              null,
            price: Number(
              serverResult.unit_price ?? existing?.price ?? item.price ?? 0,
            ),
            quantity: resolvedQuantity,
            snapshot:
              serverResult.snapshot ??
              existing?.snapshot ??
              item.snapshot ??
              null,
          };

          if (existing) {
            const newPrev = [...prev];
            newPrev[foundIdx] = mapped;
            return newPrev;
          }
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
        if (found && found.id)
          await fetch(`${API_BASE}/api/user/cart/${found.id}`, {
            method: "DELETE",
            credentials: "include",
            headers: { "X-XSRF-TOKEN": getXsrf(), Accept: "application/json" },
          });
      } catch (err) {}
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
          await fetch(`${API_BASE}/api/user/cart/${found.id}`, {
            method: "PUT",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-XSRF-TOKEN": getXsrf(),
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          });
        } else {
          const local = (cart || []).find((c) => Number(c.id) === idNum) || {};
          const payloadWithSnapshot = { ...buildItemPayload(local), quantity };
          await postServerCartItem(payloadWithSnapshot);
        }
      } catch (err) {}
    })();
  };

  const clearCart = useCallback(() => {
    setCart([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {}
    showAlert({ variant: "info", title: "Корзина очищена", subtitle: "" });
  }, []);

  const syncGuestToServer = useCallback(async () => {
    try {
      const localCart = Array.isArray(cart) ? [...cart] : [];
      if (localCart.length === 0) return false;
      const items = localCart.map((p) => buildItemPayload(p));
      const serverItems = await postServerSync(items);
      const serverByProductId = new Map();
      (serverItems || []).forEach((s) =>
        serverByProductId.set(Number(s.product_id), s),
      );
      const merged = localCart.map((localItem) => {
        const s = serverByProductId.get(Number(localItem.id));
        if (!s) return localItem;
        return {
          id: localItem.id,
          title: s.snapshot?.title ?? s.title ?? localItem.title ?? "",
          img: s.snapshot?.img ?? s.snapshot?.img_url ?? localItem.img ?? null,
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

  useEffect(() => {
    const handler = (e) => {
      const serverCart = e?.detail?.serverCart;
      if (!Array.isArray(serverCart)) return;
      const mapped = serverCart.map((s) => ({
        id: s.product_id ?? s.product_id,
        title: s.snapshot?.title ?? s.title ?? "",
        img: s.snapshot?.img ?? s.snapshot?.img_url ?? s.img ?? null,
        price: Number(s.unit_price ?? 0),
        quantity: Number(s.quantity ?? 1),
        snapshot: s.snapshot ?? null,
      }));
      if (
        (!mapped || mapped.length === 0) &&
        Array.isArray(cart) &&
        cart.length > 0
      ) {
        const cleaned = cleanStaleLocalItems(cart);
        Promise.resolve().then(() => setCart(cleaned));
      } else {
        Promise.resolve().then(() => setCart(mapped));
      }
    };
    window.addEventListener("cart:setFromServer", handler);
    return () => window.removeEventListener("cart:setFromServer", handler);
  }, [cart]);

  useEffect(() => {
    try {
      const local = Array.isArray(cart) ? cart : [];
      if (local.length > 0) {
        const cleaned = cleanStaleLocalItems(local);
        if (cleaned.length !== local.length) {
          Promise.resolve().then(() => setCart(cleaned));
        }
      }
    } catch (e) {}
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
