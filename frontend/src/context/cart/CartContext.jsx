import React from "react";
import { createContext } from "react";

/**
 * CartContext — контекст корзины.
 *
 */
export const CartContext = createContext({
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
});
