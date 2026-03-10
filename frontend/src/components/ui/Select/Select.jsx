import React from "react";
import { categories } from "../../../../categories.js";

/**
 * Универсальный компонент выпадающий список.
 * Props:
 * - options: [{ value, label }, ...]
 * - value: текущий выбранный value
 * - onChange: функция (value) => void
 * - onSelectChange: устаревший алиас для onChange
 * - className: класс для <select>
 * - wrapperClassName: класс для обёртки
 * - ...rest: прочие пропсы (style, disabled и т.д.) будут прокинуты в <select>
 */
export const Select = ({
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
    console.log("Select: handleChange event, value=", val);
  };

  return (
    <div>
      <div className={`relative ${wrapperClassName}`}>
        <select
          className={`${className}`}
          onChange={handleChange}
          value={value ?? ""}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled>
              {" "}
              {placeholder}{" "}
            </option>
          ) : null}
          {opts.map((opt) => (
            <option
              className="text-gray-800 bg-white text-sm"
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
