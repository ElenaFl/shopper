import React from "react";
import styles from "./Toggle.module.css";

/**
 *
 * Toggle — контролируемый компонент переключателя (checkbox styled).
 *
 * Props:
 * @param {string} [nameToggle] - Метка/текст рядом с переключателем.
 * @param {boolean} [value=false] - Текущее состояние переключателя (контролируемый компонент).
 * @param {(checked:boolean)=>void} [onChange] - Коллбек, вызываемый при изменении состояния с аргументом (true/false).
 * @param {Object} [rest] - Дополнительные props (id, disabled, aria-* и т.д.) можно прокинуть в <input>.
 *
 * Поведение:
 * - Компонент контролируемый: родитель передаёт value и обновляет его через onChange.
 * - Визуальная часть реализована через input[type="checkbox"] и стилизованную дорожку/ползунок (CSS).
 */

export const Toggle = (props) => {
  const nameToggle = props.nameToggle;
  const value = !!props.value;
  const onChange = props.onChange ?? (() => {});

  return (
    <label className={styles.labelToggle}>
      {nameToggle}
      <input
        className={styles.toggleInput}
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.toggleTrack}>
        <span className={styles.toggleThumb}></span>
      </span>
    </label>
  );
};
