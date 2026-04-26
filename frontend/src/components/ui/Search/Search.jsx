//forwardRef - утилита React; пробрасывает ref(объект для доступа к какому-либо элементу или экземпляру компонента извне) из родительского компонента внутрь дочернего, для доступа к DOM‑элементу или к экземпляру/методу дочернего компонента

import React, { forwardRef } from "react";

/**
 * Search — контролируемый компонент поля поиска с поддержкой ref.
 *
 * Ключевые моменты:
 * - forwardRef пробрасывает ref от родителя напрямую к input (позволяет фокусировать поле извне).
 * - Компонент контролируемый: значение передаётся через prop `value`, изменения отдаются через `onChange`.
 * - При нажатии Enter вызывается onSubmit(value) (value предварительно .trim()).
 *
 * Props:
 * @param {string} [value=""] - Текущее значение поля (контролируемое).
 * @param {(val:string)=>void} [onChange=()=>{}] - Коллбек при изменении текста.
 * @param {(val:string)=>void} [onSubmit=()=>{}] - Вызывается при подтверждении (Enter).
 * @param {string} [placeholder=""] - Плейсхолдер для input.
 * @param {string} [wrapperClassName=""] - Доп. классы для обёртки (контейнера).
 * @param {string} [inputClassName=""] - Доп. классы для input.
 *
 * Accessibility:
 * - input имеет aria-label="Search". При необходимости можно заменить на aria-labelledby с явной меткой.
 * - Иконка помечена pointer-events-none и декоративна (alt="search"), можно сделать alt="" и aria-hidden="true", если иконка чисто декоративна.
 * - Рекомендуется добавить role="search" на контейнер при включении дополнительных элементов управления (поле + кнопка).
 *
 * Поведение:
 * - Нажатие Enter: предотвращается дефолт и вызывается onSubmit(trimmedValue).
 * - input принимает ref от родителя, поэтому родитель может делать: inputRef.current.focus().
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
