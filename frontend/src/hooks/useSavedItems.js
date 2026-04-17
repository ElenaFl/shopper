// frontend/src/hooks/useSavedItems.js
import { useEffect, useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";
const GUEST_KEY = "guest_saved_items_v1";

function getXsrf() {
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

async function ensureCsrf() {
  try {
    await fetch(`${API_BASE}/sanctum/csrf-cookie`, { credentials: "include" });
  } catch (e) {
    // ignore
  }
  return getXsrf();
}

export function useSavedItems({ user, onAuthChange } = {}) {
  const [items, setItems] = useState([]); // array of saved items (server objects with id, product_id, product)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // load from server if user exists, otherwise from sessionStorage (guest)
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
        // guest: from sessionStorage (store array of product_ids)
        const raw = sessionStorage.getItem(GUEST_KEY);
        const ids = raw ? JSON.parse(raw) : [];
        // convert to simple objects: { product_id }
        setItems((ids || []).map((pid) => ({ product_id: pid })));
      }
    } catch (err) {
      console.error("load saved items failed", err);
      setError(err.message || "Error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // save single product
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
        // server returns saved item
        setItems((prev) => {
          // avoid duplicates by product_id
          const exists = prev.find((p) => p.product_id === productId);
          if (exists) {
            // replace if server returned id
            return prev.map((p) => (p.product_id === productId ? json : p));
          }
          return [json, ...prev];
        });
        return json;
      } else {
        // guest: store product id in sessionStorage
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

  // remove saved by server id or by product_id
  const remove = useCallback(
    async ({ savedId = null, productId = null } = {}) => {
      if (user?.id) {
        // if savedId not provided, try find by productId
        let idToDelete = savedId;
        if (!idToDelete && productId) {
          const found = items.find((it) => it.product_id === productId);
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
              (it) => it.id !== idToDelete && it.product_id !== productId,
            ),
          );
          return true;
        }

        if (res.status === 404) {
          // eslint-disable-next-line no-console
          console.warn(
            `Saved item ${idToDelete} not found on server; treating as deleted.`,
          );
          setItems((prev) =>
            prev.filter(
              (it) => it.id !== idToDelete && it.product_id !== productId,
            ),
          );
          return true;
        }

        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      } else {
        // guest: remove from sessionStorage by productId
        if (!productId) throw new Error("productId required for guest delete");
        const raw = sessionStorage.getItem(GUEST_KEY);
        const ids = raw ? JSON.parse(raw) : [];
        const next = ids.filter((p) => p !== productId);
        sessionStorage.setItem(GUEST_KEY, JSON.stringify(next));
        setItems((prev) => prev.filter((it) => it.product_id !== productId));
        return true;
      }
    },
    [user?.id, items],
  );
  // sync guest -> user
  const sync = useCallback(
    async (productIds = []) => {
      if (!user?.id) return;
      if (!productIds || productIds.length === 0) return;
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
      // server returns all items
      setItems(Array.isArray(json.data) ? json.data : []);
      // clear guest cache
      sessionStorage.removeItem(GUEST_KEY);
    },
    [user?.id],
  );

  // when user changes (login/logout) we may want to sync guest list
  useEffect(() => {
    // if user just logged in, sync any guest items
    if (user?.id) {
      const raw = sessionStorage.getItem(GUEST_KEY);
      const ids = raw ? JSON.parse(raw) : [];
      if (Array.isArray(ids) && ids.length) {
        // call sync then load
        sync(ids).catch((err) => console.error("sync error", err));
        return;
      }
    }
    // always load appropriate list
    load().catch((err) => console.error("load error", err));
  }, [user?.id, load, sync]);

  // optionally allow external trigger to reload on demand
  useEffect(() => {
    if (typeof onAuthChange === "function") {
      onAuthChange(load);
    }
  }, [onAuthChange, load]);

  return {
    items,
    loading,
    error,
    load,
    save,
    remove,
    sync,
  };
}
