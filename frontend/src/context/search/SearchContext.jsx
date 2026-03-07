import React, { createContext } from "react";

/**
 * SearchContext — общий контекст для поискового запроса.
 * Хранит:
 *  - query: текст в строке поиска (строка поиска)
 *  - setQuery: функция для её обновления
 *
 */
export const SearchContext = createContext({
  query: "",
  setQuery: () => {},
});

