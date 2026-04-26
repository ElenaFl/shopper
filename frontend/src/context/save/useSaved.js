import React, { useContext } from "react";
import { SavedContext } from "./SavedContext.jsx";

// вспомогательный хук
export const useSaved = () => {
  const ctx = useContext(SavedContext);
  if (!ctx) {
    throw new Error("useSaved must be used within SavedProvider");
  }
  return ctx;
};
