import React from "react";
import { useEffect, useState, useContext, useRef } from "react";
import { AuthContext } from "./AuthContext.jsx";
import { BACKEND } from "../../config/backend.js";
import { CartContext } from "../cart/CartContext.jsx";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const cartCtx = useContext(CartContext);
  const fetchServerCart =
    cartCtx && typeof cartCtx.fetchServerCart === "function"
      ? cartCtx.fetchServerCart
      : null;
  const clearCart =
    cartCtx && typeof cartCtx.clearCart === "function"
      ? cartCtx.clearCart
      : null;
  const deleteAllServerCartForUser =
    cartCtx && typeof cartCtx.deleteAllServerCartForUser === "function"
      ? cartCtx.deleteAllServerCartForUser
      : null;
  const syncGuestToServer =
    cartCtx && typeof cartCtx.syncGuestToServer === "function"
      ? cartCtx.syncGuestToServer
      : null;

  const syncCalledRef = useRef(false);

  const getCsrf = async () => {
    try {
      await fetch(`${BACKEND}/sanctum/csrf-cookie`, {
        method: "GET",
        credentials: "include",
      });
    } catch (err) {
      console.error("getCsrf error", err);
      throw err;
    }
  };

  const getCookie = (name) => {
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)"),
    );
    return match ? decodeURIComponent(match[2]) : null;
  };

  const fetchUser = async ({ keepLocal = false } = {}) => {
    try {
      setChecking(true);
      const res = await fetch(`${BACKEND}/api/user`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      if (!res.ok) {
        if (!keepLocal) setUser(null);
        return null;
      }
      const data = await res.json();
      setUser(data);

      try {
        const pending = sessionStorage.getItem("saved_move_to_cart_pending");
        if (pending) {
          sessionStorage.removeItem("saved_move_to_cart_pending");
          window.dispatchEvent(new CustomEvent("saved:moveToCartPending"));
        }
      } catch (e) {}

      return data;
    } catch (err) {
      console.error("fetchUser error", err);
      if (!keepLocal) setUser(null);
      return null;
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResponseErrors = async (res) => {
    const data = await res.json().catch(() => ({}));
    if (data.errors && typeof data.errors === "object") {
      const flat = {};
      Object.entries(data.errors).forEach(([k, v]) => {
        flat[k] = Array.isArray(v) ? v[0] : String(v);
      });
      const err = new Error(
        flat[Object.keys(flat)[0]] || data.message || "Validation error",
      );
      err.formErrors = flat;
      throw err;
    }
    if (data.message) throw new Error(data.message);
    throw new Error("Request failed");
  };

  const login = async ({ email, password }) => {
    await getCsrf();
    const res = await fetch(`${BACKEND}/api/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
      },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) await handleResponseErrors(res);
    const serverUser = await fetchUser();

    try {
      const raw = localStorage.getItem("shopper_cart");
      if (raw) {
        sessionStorage.setItem("shopper_merge_pending", "1");
        window.dispatchEvent(new CustomEvent("cart:mergePending"));
      }
    } catch (e) {
      //
    }

    return serverUser;
  };

  const register = async ({ name, email, password, password_confirmation }) => {
    await getCsrf();
    const res = await fetch(`${BACKEND}/api/register`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
      },
      body: JSON.stringify({ name, email, password, password_confirmation }),
    });
    if (!res.ok) await handleResponseErrors(res);
    const serverUser = await fetchUser();
    return serverUser;
  };

  const logout = async ({ clearServerCart = false } = {}) => {
    try {
      await getCsrf();
      let res;
      try {
        res = await fetch(`${BACKEND}/api/logout`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
          },
        });
        console.log("AuthProvider.logout: status =", res.status);
      } catch (fetchErr) {
        console.error("AuthProvider.logout: fetch threw", fetchErr);
        throw fetchErr;
      }

      if (!res.ok) {
        try {
          const data = await res.json();
          console.error("Logout failed:", data);
        } catch (err) {
          console.error("Logout failed (no json)", err);
        }
      }
    } catch (err) {
      console.error("logout error", err);
    } finally {
      setUser(null);

      try {
        // clear in-memory + localStorage
        if (typeof clearCart === "function") {
          clearCart();
        } else {
          try {
            localStorage.removeItem("shopper_cart");
          } catch (e) {}
          window.dispatchEvent(new CustomEvent("cart:cleared:client"));
        }

        if (
          clearServerCart &&
          typeof deleteAllServerCartForUser === "function"
        ) {
          try {
            await deleteAllServerCartForUser();
          } catch (e) {
            console.warn("logout: deleteAllServerCartForUser failed", e);
          }
        }

        try {
          sessionStorage.removeItem("shopper_merge_pending");
        } catch (e) {}
      } catch (e) {
        console.error("AuthProvider.logout: clearing cart failed", e);
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    if (syncCalledRef.current) {
      console.log("AuthProvider: sync already running, skipping duplicate");
      return;
    }
    syncCalledRef.current = true;

    (async () => {
      try {
        if (typeof syncGuestToServer === "function") {
          try {
            console.log("AuthProvider: calling syncGuestToServer");
            const synced = await syncGuestToServer();
            console.log("AuthProvider: syncGuestToServer result =", synced);
            if (synced) {
              window.dispatchEvent(new CustomEvent("cart:merged"));
            }
          } catch (e) {
            console.warn("AuthProvider: syncGuestToServer failed", e);
          }
        }

        if (typeof fetchServerCart === "function") {
          try {
            const serverCart = await fetchServerCart();
            window.dispatchEvent(
              new CustomEvent("cart:setFromServer", { detail: { serverCart } }),
            );
          } catch (e) {
            console.warn("AuthProvider: fetchServerCart failed", e);
          }
        }
      } catch (e) {
        console.warn("AuthProvider: cart sync flow failed", e);
      } finally {
        // Allow subsequent syncs after a short cooldown (in case needed)
        setTimeout(() => {
          syncCalledRef.current = false;
        }, 1500);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        checking,
        fetchUser,
        getCsrf,
        BACKEND,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
