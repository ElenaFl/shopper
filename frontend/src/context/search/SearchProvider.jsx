import React, { useState } from "react";
import { SearchContext } from "./SearchContext.jsx"

/**
 * SearchProvider — провайдер общего контекста для поискового запроса. *
 *
 */

export const SearchProvider = ({ children }) => {

  // создает локальное значение query для компонента - провайдера (оно же глобальное для всех компонентов приложения, обернутых провайдером)
  const [query, setQuery] = useState("");
  return (
    <SearchContext.Provider value={{ query, setQuery }}>
      {children}
    </SearchContext.Provider>
  );
};
