import React from "react";
import { Link } from "react-router-dom";

/**
 * Компонент карточка.
 *
 * props.details — объект товара
 * props.size — размеры
 * props.onOpenDetails — колбэк открытия
 * props.className, props.style — дополнительный класс/стиль (для анимации)
 */
export const Card = React.memo((props) => {
  const { id, title, currency, price, img } = props.details || {};
  const { width, height, heightImg } = props.size || {};
  const { className = "", style = {}, onOpenDetails } = props;

  return (
    <div
      className={`cursor-pointer ${className}`}
      style={{ width: `${width}px`, height: `${height}px`, ...style }}
      onClick={() => onOpenDetails && onOpenDetails(id)}
    >
      {/* Блок изображения с наложением */}
      <div
        style={{ height: `${heightImg}px` }}
        className="relative rounded-lg mb-6 overflow-hidden group"
      >
        {/* Изображение */}
        {img && (
          <img src={img} alt={title} className="w-full h-full object-cover" />
        )}

        {/* Прозрачная белая вуаль (появляется при наведении) */}
        <div
          className="
            absolute
            inset-0
            bg-white/60
            opacity-0
            group-hover:opacity-100
            transition-opacity
            duration-300
          "
        />

        {/* Иконки над вуалью */}
        <div className="flex items-center gap-x-7.5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition duration-300 group-hover:opacity-100 group-hover:scale-105">
          <Link to="/cart" className="btn">
            <img src="/images/shoppingCart.svg" alt="shopping-cart" />
          </Link>
          <Link
            to={`/products/${id}`}
            className="btn"
            onClick={(e) => e.stopPropagation()}
          >
            <img src="/images/eye.svg" alt="eye" />
          </Link>
          <Link to="" className="btn" onClick={(e) => e.stopPropagation()}>
            <img src="/images/heart.svg" alt="heart" />
          </Link>
        </div>
      </div>

      {/* Наименование товара */}
      <p className="text-xl mb-4">{title}</p>

      {/* Цена */}
      <span className="text-xl font-medium" style={{ color: "#A18A68" }}>
        {currency} {Number(price || 0).toFixed(2)}
      </span>
    </div>
  );
});
