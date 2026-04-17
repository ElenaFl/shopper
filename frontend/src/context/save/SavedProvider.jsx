import React, { useCallback, useEffect, useState } from "react";
import { SavedContext } from "./SavedContext.jsx";
import { useAuth } from "../auth/useAuth.js";

const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";
const GUEST_KEY = "guest_saved_items_v1";

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

export const SavedProvider = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [open, setOpen] = useState(false);
  const count = Array.isArray(items) ? items.length : 0;

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
        setItems(Array.isArray(json.data) ? json.data : []);
      } else {
        const raw = sessionStorage.getItem(GUEST_KEY);
        const ids = raw ? JSON.parse(raw) : [];
        setItems((ids || []).map((pid) => ({ product_id: pid })));
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
    async (productId) => {
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
        setItems((prev) => {
          const exists = prev.find(
            (p) => String(p.product_id) === String(productId),
          );
          if (exists)
            return prev.map((p) =>
              String(p.product_id) === String(productId) ? json : p,
            );
          return [json, ...prev];
        });
        return json;
      } else {
        const raw = sessionStorage.getItem(GUEST_KEY);
        const ids = raw ? JSON.parse(raw) : [];
        if (!ids.includes(productId)) {
          ids.push(productId);
          sessionStorage.setItem(GUEST_KEY, JSON.stringify(ids));
          setItems((prev) => [{ product_id: productId }, ...prev]);
        }
        return { product_id: productId };
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
        const raw = sessionStorage.getItem(GUEST_KEY);
        const ids = raw ? JSON.parse(raw) : [];
        const next = ids.filter((p) => String(p) !== String(productId));
        sessionStorage.setItem(GUEST_KEY, JSON.stringify(next));
        setItems((prev) =>
          prev.filter((it) => String(it.product_id) !== String(productId)),
        );
        return true;
      }
    },
    [user?.id, items],
  );

  // quantity helpers (локальное мгновенное обновление)
  const increase = (id, by = 1) => {
    setItems((prev) =>
      prev.map((it) =>
        String(it.id) === String(id) || String(it.product_id) === String(id)
          ? { ...it, qty: Math.max(1, (Number(it.qty) || 1) + Number(by)) }
          : it,
      ),
    );
  };

  const decrease = (id, by = 1) => {
    setItems((prev) =>
      prev.map((it) =>
        String(it.id) === String(id) || String(it.product_id) === String(id)
          ? { ...it, qty: Math.max(1, (Number(it.qty) || 1) - Number(by)) }
          : it,
      ),
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
      setItems(Array.isArray(json.data) ? json.data : []);
      sessionStorage.removeItem(GUEST_KEY);
    },
    [user?.id],
  );

  useEffect(() => {
    if (user?.id) {
      const raw = sessionStorage.getItem(GUEST_KEY);
      const ids = raw ? JSON.parse(raw) : [];
      if (Array.isArray(ids) && ids.length) {
        sync(ids).catch((e) => console.error("sync error", e));
        return;
      }
    }
    load().catch((e) => console.error("load error", e));
  }, [user?.id, load, sync]);

  // очистить все saved items (клиент + попытка на сервере)
  const clear = useCallback(async () => {
    // клиентский fallback
    try {
      sessionStorage.removeItem(GUEST_KEY);
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
        increase,
        decrease,
        clear,
      }}
    >
      {children}
    </SavedContext.Provider>
  );
};
