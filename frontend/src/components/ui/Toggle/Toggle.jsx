import React from "react";
import styles from "./Toggle.module.css";
/**
 *
 * Компонент кнопка-переключатель(toggle)
 * props: * - nameToggle: string
 * - value: boolean (контролируемое состояние)
 * - onChange: function(checked: boolean)
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
