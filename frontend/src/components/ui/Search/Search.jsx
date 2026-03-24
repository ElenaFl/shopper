//forwardRef - утилита React; пробрасывает ref(объект для доступа к какому-либо элементу или экземпляру компонента извне) из родительского компонента внутрь дочернего, для доступа к DOM‑элементу или к экземпляру/методу дочернего компонента

import React, { forwardRef } from "react";

/**
 * Контролируемый Search, поддерживает ref для фокуса,
 * вызывает onSubmit(value) для запуска поиска
 */

//forwardRef принимает ref от родителя и пробрасывает его внутрь (в input).
export const Search = forwardRef(function Search(
  {
    value = "",
    onChange = () => {},
    onSubmit = () => {},
    placeholder = "",
    wrapperClassName = "",
    inputClassName = "",
  },
  ref,
) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit(value.trim());
    }
  };
  return (
    <div className={`relative  ${wrapperClassName || "w-full"}`}>
      {/* Иконка поиска слева */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <img src="/images/searchHeader.svg" alt="search" className="w-4 h-4" />
      </span>

      {/* input с отступом слева */}
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${inputClassName || "w-full"} search-input text-sm text-[#707070] px-3 py-2 border rounded pl-10`}
        aria-label="Search"
      />
    </div>
  );
});
