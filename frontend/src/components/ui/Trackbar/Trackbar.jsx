import React from "react";
import styles from "./Trackbar.module.css";

/**
 *
 * Trackbar — простой контрол для выбора числового значения с помощью input[type="range"].
 *
 * Props:
 * @param {number} [min=0]    - Минимальное значение ползунка.
 * @param {number} [max=1000] - Максимальное значение ползунка.
 * @param {number} [value=1000] - Текущее значение (контролируемый компонент).
 * @param {(value:number)=>void} [onChange] - Коллбек, вызывается при изменении значения (каждое движение ползунка).
 * @param {(value:number)=>void} [onFilter] - Коллбек, вызывается при клике на кнопку Filter (применить фильтр).
 *
 * Поведение:
 * - input[type="range"] рендерит ползунок; при изменении значения вызывается onChange с числовым значением.
 * - Кнопка Filter вызывает onFilter с текущим значением value (например, для применения фильтра в списке товаров).
 *
 * Accessibility (A11y):
 * - Ползунку задан aria-label="Max price"
 */

export const Trackbar = ({
  min = 0,
  max = 1000,
  value = 1000,
  onChange,
  onFilter,
}) => {
  const handleChange = (e) => {
    const v = Number(e.target.value);
    if (!Number.isNaN(v)) onChange?.(v);
  };

  const handleFilter = () => {
    onFilter?.(value);
  };

  return (
    <div className={styles.trackbarWrapper}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        className={styles.trackbar}
        aria-label="Max price"
      />
      <div className={styles.controls}>
        <p>Price: 0 — ${value}</p>
        <button className={styles.filterButton} onClick={handleFilter}>
          Filter
        </button>
      </div>
    </div>
  );
};
