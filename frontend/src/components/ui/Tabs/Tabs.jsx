import React from "react";

/**
 *
 *Tabs — универсальный компонент вкладок.
 *
 * Props:
 * @param {string[]} [categories=[]] - Массив названий вкладок (строк). Порядок определяет визуальный порядок.
 * @param {string} [activeCategory] - Текущая активная вкладка (строка, совпадающая с одним из categories).
 * @param {(category:string) => void} [onCategoryChange] - Коллбек при выборе вкладки. Вызывается с названием вкладки.
 * @param {string} [tabClassName="flex list-none gap-2"] - CSS‑классы для контейнера вкладок (гибкость/раскладка).
 * @param {string} [tabItemClassName="inline-flex items-center justify-center px-4 py-2 text-base rounded-sm"] - Базовые классы для каждой кнопки‑вкладки.
 * @param {string} [activeClassName="bg-black text-white"] - Доп. классы, применяемые к активной вкладке.
 * @param {string} [inactiveClassName="bg-white text-black"] - Доп. классы, применяемые к неактивной вкладке.
 *
 * Поведение:
 * - Рендерит набор кнопок по categories.
 * - Кнопка получает role="tab" и aria-selected для доступности.
 * - При клике вызывается onCategoryChange(category).
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
