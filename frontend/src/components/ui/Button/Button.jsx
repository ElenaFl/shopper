import React from "react";

/**
 * Button — компонент кнопки.
 *
 * Props:
 * @param {'button'|'submit'|'reset'} [type='button'] — HTML type кнопки.
 * @param {string} name — Текст кнопки (обязателен).
 * @param {'white'|'black'} [color='white'] — Цветовая схема: 'white' (светлая) или 'black' (тёмная).
 * @param {(event: React.MouseEvent<HTMLButtonElement>) => void} [onClick] — Обработчик клика.
 *
 * Поведение:
 * - Рендерит <button> с базовыми стилями и класcами для hover.
 * - Занимает всю ширину контейнера (w-full).
 *
 */

export const Button = ({
  type = "button",
  name,
  color = "white",
  onClick,
  children,
}) => {
  const base = "w-full py-4 font-bold border rounded-sm mb-3 cursor-pointer";
  const colorClasses =
    color === "black"
      ? "bg-black text-white hover:bg-white hover:text-black"
      : "bg-white text-black hover:bg-black hover:text-white";

  return (
    <div className="w-full">
      <button
        type={type}
        onClick={onClick}
        className={`${base} ${colorClasses}`}
      >
        {name}
        {children}
      </button>
    </div>
  );
};
