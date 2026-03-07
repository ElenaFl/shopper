import React, { useState } from 'react'
import styles from './Trackbar.module.css'

/**
 * Компонент трекбар.
 */
export const Trackbar = () => {
    const [value, setValue] = useState(500)

    const handleChange = (e) => {
        const newValue = Number(e.target.value);
        if (newValue >= 0 && newValue <= 10000) {
            setValue(newValue);
        }
    }

    const handleFilter = () => {
    // Здесь можно вызвать внешнюю функцию фильтрации
    // например: onFilter?(value);
    console.log('Фильтрация по цене:', value);
    }

    return (
        <div className={styles.trackbarWrapper}>
            <span className={styles.trackbarAfterSpan} />
            <input
                type="range"
                min="0"
                max="10000"
                value={value}
                onChange={handleChange}
                className={styles.trackbar}
                aria-label="Price range"
                role="slider"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={10000}
            />
            <div className={styles.controls}>
            <p>Price: 0 – ${value}</p>
            <button
                className={styles.filterButton}
                onClick={handleFilter}  // Исправлено: onClick вместо onChange
            >
                Filter
            </button>
        </div>
    </div>
)}