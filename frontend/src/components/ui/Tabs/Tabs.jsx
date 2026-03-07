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
    <div className={`relative w-full ${tabClassName}`} data-tabs="tabs" role="tablist">
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
// import React from 'react'

// /**
//  * Компонент вкладки.
//  * @param {string[]} categories - Категории для отображения во вкладках.
//  * @param {string} activeCategory - Активная категория.
//  * @param {Function} onCategoryChange - Функция, вызываемая при изменении категории.
//  *
//  */
// export const Tabs = ({ categories, activeCategory, onCategoryChange }) => {
//     return (
//         <div
//           className="relative w-full mb-4 flex border-b border-[#D8D8D8] list-none"
//           data-tabs="tabs"
//           role="list"
//         >
//           {categories?.length > 0 && categories?.map((category) => {
//             return (
//                 <button
//                     key={category}
//                     className={`flex flex-auto items-center justify-center w-full px-0 py-2 text-sm mb-0 transition-all ease-in-out border-0 cursor-pointer text-center ${
//                     activeCategory === category
//                       ? "text-dark border-b border-[#A18A68]"
//                       : "text-[#707070]"
//                     }`}
//                     onClick={() => onCategoryChange(category)}
//                     role="tab"
//                     aria-selected={activeCategory === category}
//                 >
//                     {category}
//                 </button>
//             );
//           })}
//         </div>
//     );
// }
