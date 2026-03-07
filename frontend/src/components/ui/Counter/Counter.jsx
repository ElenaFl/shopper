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


// import React from "react";

// export const Counter = ({
//   // контролируемый компонент: текущее значение приходит через prop count, изменения сообщаются через onChange(next).
//   count = 0,
//   onChange = () => {},
//   min = 0,
//   max = 9,
//   className = "", // новая опция: позволяет передать дополнительные классы извне
// }) => {
//   const handleDec = () => {
//     const next = Math.max(min, (count || 0) - 1);
//     onChange(next);
//   };

//   const handleInc = () => {
//     const next = Math.min(max, (count || 0) + 1);
//     onChange(next);
//   };

//   return (
//     <div
//       className={`flex items-center border border-gray-300 rounded w-full h-full cursor-pointer hover:bg-[#EFEFEF] ${className}`}
//     >
//       <button
//         aria-label="decrease"
//         onClick={handleDec}
//         className="w-[33%] px-4 py-2 text-gray-700 flex justify-center items-center cursor-pointer counter-button"
//       >
//         -
//       </button>
//       <span className="px-3 counter-value">{count || 0}</span>
//       <button
//         aria-label="increase"
//         onClick={handleInc}
//         className="w-[33%] px-4 py-2 text-gray-700 flex justify-center items-center cursor-pointer counter-button"
//       >
//         +
//       </button>
//     </div>
//   );
// };


// import React from "react";

// export const Counter = ({
//   //не содержит внутреннего состояния счётчика — это контролируемый компонент: текущее значение приходит через пропс count, а изменения сообщаются наверх через onChange(next).
//   count = 0,
//   onChange = () => {},
//   min = 0,
//   max = 9,
// }) => {
//   const handleDec = () => {
//     const next = Math.max(min, (count || 0) - 1);
//     onChange(next);
//   };

//   const handleInc = () => {
//     const next = Math.min(max, (count || 0) + 1);
//     onChange(next);
//   };

//   return (
//     <div className="flex items-center border border-gray-300 rounded w-full h-full cursor-pointer hover:bg-[#EFEFEF]">
//       <button
//         aria-label="decrease"
//         onClick={handleDec}
//         className="w-[33%] px-4 py-2 text-gray-700 flex justify-center items-center cursor-pointer"
//       >
//         -
//       </button>
//       <span className="px-3">{count || 0}</span>
//       <button
//         aria-label="increase"
//         onClick={handleInc}
//         className="w-[33%] px-4 py-2 text-gray-700 flex justify-center items-center cursor-pointer"
//       >
//         +
//       </button>
//     </div>
//   );
// };
