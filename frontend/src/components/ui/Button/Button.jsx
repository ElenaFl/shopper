import React from "react";

export const Button = ({ type = "button", name, color = "white", onClick }) => {
  const base = "w-full py-4 font-bold border rounded-sm mb-3 cursor-pointer";
  const colorClasses =
    color === "black"
      ? "bg-black text-white hover:bg-white hover:text-black"
      : "bg-white text-black hover:bg-black hover:text-white";

  return (
    <div className="w-full">
      <button
        type={type}
        onClick={onClick}
        className={`${base} ${colorClasses}`}
      >
        {name}
      </button>
    </div>
  );
};
