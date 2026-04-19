import React from "react";

export const Counter = ({
  count = 0,
  onChange = () => {},
  min = 0,
  max = 9,
  className = "",
}) => {
  const handleDec = () => {
    const next = Math.max(min, (count || 0) - 1);
    onChange(next);
  };

  const handleInc = () => {
    const next = Math.min(max, (count || 0) + 1);
    onChange(next);
  };

  return (
    <div
      className={`counter-root flex items-center border rounded w-full h-full cursor-pointer ${className}`}
    >
      <button
        aria-label="decrease"
        onClick={handleDec}
        className="w-[33%] px-4 py-2 flex justify-center items-center cursor-pointer counter-button"
      >
        -
      </button>
      <span className="px-3 counter-value">{count || 0}</span>
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
