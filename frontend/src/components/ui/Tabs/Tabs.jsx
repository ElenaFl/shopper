import React from "react";

/**
 * Универсальный компонент вкладок (Tabs).
 *
 * Пропсы:
 * - categories: string[] — список вкладок
 * - activeCategory: string — текущая активная вкладка
 * - onCategoryChange: (category) => void — обработчик клика
 * - tabClassName: string — классы для контейнера (flex, justify-start и т.д.)
 * - tabItemClassName: string — базовые классы для каждой кнопки
 * - activeClassName: string — дополнительные классы для активной кнопки
 * - inactiveClassName: string — дополнительные классы для неактивной кнопки
 */
export const Tabs = ({
  categories = [],
  activeCategory,
  onCategoryChange,
  tabClassName = "flex list-none gap-2",
  tabItemClassName = "inline-flex items-center justify-center px-4 py-2 text-base rounded-sm",
  activeClassName = "bg-black text-white",
  inactiveClassName = "bg-white text-black",
}) => {
  return (
    <div
      className={`relative w-full ${tabClassName}`}
      data-tabs="tabs"
      role="tablist"
    >
      {categories?.map((category) => (
        <button
          key={category}
          type="button"
          role="tab"
          aria-selected={activeCategory === category}
          onClick={() => onCategoryChange(category)}
          className={`${tabItemClassName} ${activeCategory === category ? activeClassName : inactiveClassName}`}
        >
          {category}
        </button>
      ))}
    </div>
  );
};
