// import React from "react";

// /**
//  * Компонент Select (строки) с кастомной стрелкой.
//  * Props:
//  * - options: string[]
//  * - value: string
//  * - onChange: (value: string) => void
//  * - placeholder?: string
//  * - className?: string  // стили для <select>
//  * - wrapperClassName?: string // стили для внешнего контейнера
//  * - arrowClassName?: string // стили для блока с иконкой (position: absolute)
//  * - hideNativeArrow?: boolean // по умолчанию true — скрывает нативную стрелку
//  * - ...rest => прокидывается в <select>
//  */
// export const Select = ({
//   options = [],
//   value = "",
//   onChange,
//   placeholder,
//   className = "",
//   wrapperClassName = "",
//   arrowClassName = "",
//   hideNativeArrow = true,
//   ...rest
// }) => {
//   const handleChange = (e) => {
//     const val = e.target.value;
//     if (typeof onChange === "function") onChange(val);
//     console.log("Select: handleChange value=", val);
//   };

//   const selectClass = `${className} ${hideNativeArrow ? "appearance-none" : ""}`.trim();

//   return (
//     <div className={`relative ${wrapperClassName}`}>
//       <select
//         className={selectClass}
//         value={value}
//         onChange={handleChange}
//         {...rest}
//       >
//         {placeholder ? (
//           <option value="" disabled>
//             {placeholder}
//           </option>
//         ) : null}

//         {options.length > 0 ? (
//           options.map((opt) => (
//             <option key={opt} value={opt}>
//               {opt}
//             </option>
//           ))
//         ) : (
//           <option value="" disabled>
//             No options
//           </option>
//         )}
//       </select>

//       {/* кастомная стрелка — позиционируется через arrowClassName */}
//       <div className={arrowClassName || "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"}>
//         <img
//           className="w-full h-full object-contain"
//           src="/images/inlineDown.svg"
//           alt="arrowBottom"
//           aria-hidden="true"
//         />
//       </div>
//     </div>
//   );
// };


// import React from "react";

// /**
//  * Компонент Select.
//  * Props:
//  * - options: string[]
//  * - value: string
//  * - onChange: (value: string) => void
//  * - placeholder?: string
//  * - className?: string
//  * - wrapperClassName?: string
//  * - arrowClassName?: string
//  * - ...rest => прокидывается в <select>
//  */
// export const Select = ({
//   //массив строк, по умолчанию пустой массив
//   options = [],
//   //текущее выбранное значение селекта, по умолчанию пустая строка
//   value = "",
//   //функция-обработчик, которую вызовем при выборе опции
//   onChange,
//   //текст-подсказка, который будет добавлен в невыбранной option
//   placeholder,
//   className = "",
//   //для внешнего контейнера <div>
//   wrapperClassName = "",
//   //
//   arrowClassName = "",
//   //остальные пропсы (disabled, style, name и т.д.)
//   ...rest
// }) => {
//   const handleChange = (e) => {
//     //выбранное значение
//     const val = e.target.value;
//     //вызов переданной функции (при наличии)
//     if (typeof onChange === "function") onChange(val);
//     console.log("Select: handleChange value=", val);
//   };

//   return (
//     <div className={wrapperClassName}>
//       <select
//         className={className}
//         value={value}
//         onChange={handleChange}
//         {...rest}
//       >
//         {placeholder ? (
//           <option value="" disabled>
//             {placeholder}
//           </option>
//         ) : null}

//         {options.length > 0 ? (
//           options.map((opt) => (
//             <option key={opt} value={opt}>
//               {opt}
//             </option>
//           ))
//         ) : (
//           <option value="" disabled>
//             No options
//           </option>
//         )}
//       </select>

//       {arrowClassName ? (
//         <div className={arrowClassName}>
//           <img
//             className="w-full h-full object-cover"
//             src="/images/inlineDown.svg"
//             alt="arrowBottom"
//             aria-hidden="true"
//           />
//         </div>
//       ) : null}
//     </div>
//   );
// };




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
        >{placeholder ? ( <option value="" disabled> {placeholder} </option> ) : null}
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
