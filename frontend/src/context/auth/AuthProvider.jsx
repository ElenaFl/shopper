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

    // After login, load server cart and set it as current cart (do not auto-merge guest cart)
    try {
      if (typeof fetchServerCart === "function") {
        const serverCart = await fetchServerCart();
        window.dispatchEvent(
          new CustomEvent("cart:setFromServer", { detail: { serverCart } }),
        );
      }
    } catch (e) {
      console.warn("login: failed to load server cart", e);
    }

    // mark merge pending only if guest cart exists
    try {
      const raw = localStorage.getItem("shopper_cart");
      if (raw) {
        sessionStorage.setItem("shopper_merge_pending", "1");
        window.dispatchEvent(new CustomEvent("cart:mergePending"));
      }
    } catch (e) {}

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
      // aggressive client cleanup: clear user and cart state
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

        // optionally clear server cart for this user (if requested and API supports)
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

        // remove any merge flag
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
    if (typeof fetchServerCart !== "function") {
      console.debug("AuthProvider: fetchServerCart not available");
      return;
    }
    (async () => {
      try {
        console.log(
          "AuthProvider: fetching server cart for user",
          user.id ?? user,
        );
        const serverCart = await fetchServerCart();
        console.log("AuthProvider: serverCart fetched", serverCart);
        window.dispatchEvent(
          new CustomEvent("cart:setFromServer", { detail: { serverCart } }),
        );
      } catch (e) {
        console.warn("AuthProvider: failed to fetch server cart", e);
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
