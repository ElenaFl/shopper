import React from "react";
import { categories } from "../../../../categories.js";

/**
 * Select — универсальный компонент выпадающего списка.
 *
 * Props:
 * @param {Array<{value: any, label: string}>} [options] - Массив опций. Каждая опция: { value, label }.
 *   Если options не передан, компонент попробует взять данные из импортированного `categories`.
 * @param {any} [value] - Текущее выбранное значение (контролируемый компонент).
 * @param {(value:any) => void} [onChange] - Коллбек при изменении значения. Вызывается с новым value.
 * @param {string} [placeholder] - Опциональная placeholder-опция (отображается как <option value="">...).
 * @param {string} [className=""] - Дополнительные классы для тега <select>.
 * @param {string} [wrapperClassName=""] - Классы для обёртки селекта (контейнера).
 * @param {string} [arrowClassName=""] - Классы для контейнера стрелки (иконки).
 * @param {...any} rest - Прочие props (disabled, style, name и т.д.) будут прокинуты в <select>.
 *
 * Поведение:
 * - Если переданы options, используется их набор.
 * - Иначе, если доступен импортированный categories — трансформирует его в опции.
 * - Иначе выводит одну опцию с текстом "No options".
 * - При выборе опции вызывается onChange(value) или (если он не передан) onSelectChange(value).
 *
 * Accessibility (A11y):
 * - Иконка стрелки помечена aria-hidden="true".
 * - Если placeholder используется, его value = "" — убедитесь, что value контролируемо.
 */

export const Select = ({
  label,
  id,
  options,
  value,
  onChange,
  onSelectChange,
  placeholder,
  className = "",
  wrapperClassName = "",
  arrowClassName = "",
  ...rest
}) => {
  const selectId = id;
  const opts =
    options && options.length > 0
      ? options
      : categories && categories.length > 0
        ? categories.map((c, idx) => ({
            value: c.value ?? c.title ?? `opt-${idx}`,
            label: c.label ?? c.title ?? c.name ?? `Option ${idx + 1}`,
          }))
        : [{ value: "", label: "No options" }];

  const handleChange = (e) => {
    const val = e.target.value;
    if (typeof onChange === "function") onChange(val);
    else if (typeof onSelectChange === "function") onSelectChange(val);
  };

  return (
    <div>
      {label ? (
        <label htmlFor={selectId} className="block text-lg mt-3 mb-2">
          {label}
        </label>
      ) : null}
      <div className={`relative ${wrapperClassName}`}>
        <select
          id={selectId}
          className={`${className}`}
          onChange={handleChange}
          value={value ?? ""}
          {...rest}
        >
          {opts.map((opt) => (
            <option
              className="text-sm"
              key={String(opt.value)}
              value={opt.value}
            >
              {opt.label}
            </option>
          ))}
        </select>
        <div className={`${arrowClassName}`}>
          <img
            className="w-full h-full object-cover"
            src="/images/inlineDown.svg"
            alt="arrowBottom"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
};
