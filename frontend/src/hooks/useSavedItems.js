// frontend/src/hooks/useSavedItems.js
// import { useEffect, useState, useCallback } from "react";
import { useSaved } from "../context/save/useSaved";

export function useSavedItems() {
  return useSaved();
}
