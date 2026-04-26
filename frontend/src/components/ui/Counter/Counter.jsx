import React from "react";

/**
 * Counter — компонент для увеличения/уменьшения числового значения.
 *
 * Особенности:
 * - Контролирует значение через переданный props `count` (контролируемый компонент).
 * - Вызывает `onChange(nextValue)` при каждом изменении.
 * - Поддерживает ограничения `min` и `max`.
 * - Присутствуют aria-label для кнопок (улучшение доступности).
 *
 * Props:
 * @param {number} [count=0] - Текущее значение счётчика. Компонент контролируемый: родитель должен обновлять значение.
 * @param {function(number):void} [onChange=() => {}] - Коллбек, вызывается с новым значением при клике на +/-.
 * @param {number} [min=0] - Минимально допустимое значение (включительно).
 * @param {number} [max=9] - Максимально допустимое значение (включительно).
 * @param {string} [className=""] - Дополнительные CSS-классы для корневого контейнера.
 *
 * Поведение:
 * - При клике на кнопку "-" значение уменьшается на 1, но не опускается ниже `min`.
 * - При клике на кнопку "+" значение увеличивается на 1, но не превышает `max`.
 * - Значение отображается в span; если `count` falsy, отображается 0.
 *
 * Accessibility (A11y) (доступность):
 * - Кнопки имеют aria-label ("decrease" / "increase").
 *
 * Пример использования:
 * const [value, setValue] = useState(3);
 * <Counter count={value} onChange={setValue} min={0} max={10} />
 */

export const Counter = ({
  count = 0,
  onChange = () => {},
  min = 0,
  max = 9,
  className = "",
}) => {
  // декремент: вычисляем следующий значение и вызываем onChange
  const handleDec = () => {
    const next = Math.max(min, (count || 0) - 1);
    onChange(next);
  };

  // инкремент: вычисляем следующий значение и вызываем onChange
  const handleInc = () => {
    const next = Math.min(max, (count || 0) + 1);
    onChange(next);
  };

  return (
    // корневой контейнер счётчика (flex-контейнер, рамка, закругления)
    <div
      className={`counter-root flex items-center border rounded w-full h-full cursor-pointer ${className}`}
    >
      {/* Кнопка уменьшения */}
      <button
        aria-label="decrease"
        onClick={handleDec}
        className="w-[33%] px-4 py-2 flex justify-center items-center cursor-pointer counter-button"
      >
        -
      </button>
      {/* Текущее значение */}
      <span className="px-3 counter-value">{count || 0}</span>
      {/* Кнопка увеличения */}
      <button
        aria-label="increase"
        onClick={handleInc}
        className="w-[33%] px-4 py-2 flex justify-center items-center cursor-pointer counter-button"
      >
        +
      </button>
    </div>
  );
};
