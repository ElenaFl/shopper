import React from "react";
import styles from "./Trackbar.module.css";

export const Trackbar = ({
  min = 0,
  max = 1000,
  value = 1000,
  onChange, // function(value) => void, called immediately while dragging
  onFilter, // function(value) => void, called on button click
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
