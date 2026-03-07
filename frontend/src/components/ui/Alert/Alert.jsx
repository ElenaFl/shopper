import React, { useEffect } from "react";
import { Icon } from "../Icon/Icon.jsx";
 
//  Стили для variant
const variantClasses = {
  // info: "border-l-4 border-blue-600 bg-blue-200 text-zinc-800",
  info: "border-l-4 border-blue-600 bg-gray-200 text-zinc-800",
  warning: "border-l-4 border-amber-600 bg-amber-200 text-zinc-800",
  // success: "border-l-4 border-emerald-600 bg-emerald-200 text-zinc-800",
  success: "border-l-4 border-emerald-600 bg-gray-200 text-zinc-800",
  error: "border-l-4 border-rose-600 bg-rose-200 text-zinc-800",
  neutral: "border-l-4 border-neutral-600 bg-neutral-200 text-zinc-800"
};
 
// Варианты иконок
const iconVariants = {
  info: <Icon name="info" className="w-6 h-6 text-blue-500" />,
  warning: <Icon name="warning" className="w-6 h-6 text-amber-600" />,
  success: <Icon name="checkmark-outline" className="w-6 h-6 text-gray-600" />,
  error: <Icon name="error" className="w-6 h-6 text-rose-600" />
};
 
// Стили для align
const alignClasses = {
  "top-left": "top-4 left-4",
  "top-right": "top-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "bottom-right": "bottom-4 right-4"
};
 
/**
 * Компонент уведомления.
 * @param {string} props.variant - Вариант компонента (info, warning, success, error) (обязательный).
 * @param {string} [props.align="bottom-right"] - Позиционирование компонента.
 * @param {string} props.title - Заголовок компонента.
 * @param {string} props.subtitle - Подзаголовок компонента.
 * @param {boolean} props.isOpen - Компонент показан/скрыт.
 * @param {function} props.onClose - Обработчик закрытия компонента (необязательно).
 */
export const Alert = ({
  variant = "neutral",
  isOpen,
  title,
  subtitle,
  align = "bottom-right",
  onClose
}) => {
  
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);
 
  return (
    <div
      id="alert"
      className={`inline-flex transform-gpu transition-transform duration-500 ease-in-out items-center ${
        variantClasses[variant]
      } ${alignClasses[align]} ${
        isOpen ? "translate-y-0" : "translate-y-96"
      } fixed z-2 w-87.5 px-3 py-2 rounded-sm`}
      role="alert"
    >
      {<div id="icon">{iconVariants[variant]}</div>}
      <div className="ml-4 mr-4">
        {title && <h3 className="font-bold text-sm text-zinc-800">{title}</h3>}
        {subtitle && <p className="text-sm text-zinc-800">{subtitle}</p>}
      </div>
      <button className="absolute right-2 top-2" onClick={onClose}>
        <Icon name="close" className="w-6 h-6 fill-zinc-800" />
      </button>
    </div>
  );
};
 