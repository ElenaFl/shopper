import React from 'react';
import styles from './Toggle.module.css';

/**
 * Компонент кнопка-переключатель(toggle)
 */

export const Toggle = (props) => {

    const nameToggle = props.nameToggle

    return (
        <label className={styles.labelToggle}>
            {nameToggle}
            <input
                className={styles.toggleInput}
                type="checkbox"
            />
            <span className={styles.toggleTrack}>
                <span className={styles.toggleThumb}></span>
            </span>
        </label>
    )}