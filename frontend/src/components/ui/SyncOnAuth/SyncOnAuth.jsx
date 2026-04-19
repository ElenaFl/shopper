import React, { useEffect, useContext } from "react";
import { useAuth } from "../../../context/auth/useAuth.js";
import { CartContext } from "../../../context/cart/CartContext.jsx";

export const SyncOnAuth = () => {
  const { user } = useAuth();
  const { syncGuestToServer } = useContext(CartContext);

  useEffect(() => {
    if (!user) return;
    if (typeof syncGuestToServer !== "function") {
      console.warn("SyncOnAuth: syncGuestToServer not available");
      return;
    }

    (async () => {
      try {
        const ok = await syncGuestToServer(user);
        if (ok) {
          console.log("SyncOnAuth: guest cart synced to server");
        } else {
          console.warn("SyncOnAuth: sync returned false");
        }
      } catch (err) {
        console.error("SyncOnAuth: sync failed", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return null;
};
