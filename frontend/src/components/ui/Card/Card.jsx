import React from "react";
import { Link } from "react-router-dom";

/**
 * Компонент карточка.
 *
 * @param {object} props.details - Детали карточки.
 * @param {string} props.details.title - Наименование товара.
 * @param {string} props.details.currency - Валюта.
 * @param {number} props.details.price - Цена.
 * @param {number} props.details.img - Путь к изображению.
 * @param {number} props.size - Размеры карточки и зображения.
 * @param {number} props.size.width - Ширина карточки.
 * @param {number} props.size.height - Высота карточки.
 * @param {number} props.size.widthImg - Ширина изображения.
 * @param {number} props.size.heightImg - Высота изображения.
 * @param {} props.onOpenDetails - Функция-колбэк для обработки клика по карточке.
 */
export const Card = (props) => {
  const { id, title, currency, price, img } = props.details;
  const { width, height, heightImg } = props.size;

  return (
    <div style={{ width: `${width}px`, height: `${height}px` }} className="cursor-pointer">
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
        <div className="
          absolute
          inset-0
          bg-white/60
          opacity-0
          group-hover:opacity-100
          transition-opacity
          duration-300
        " />

        {/* Иконки поверх вуали */}
        <div className="flex items-center gap-x-7.5 absolute top-1/2 left-1/2  -translate-x-1/2 -translate-y-1/2 opacity-0 transition duration-300 group-hover:opacity-100 group-hover:scale-105
        ">
          <Link to="/cart" className="btn">
            <img src="/images/shoppingCart.svg" alt="shopping-cart" />
          </Link>
          <Link to={`/products/${id}`} className="btn">
            <img src="/images/eye.svg" alt="eye" />
          </Link>
          <Link to="" className="btn">
            <img src="/images/heart.svg" alt="heart" />
          </Link>
        </div>
      </div>

      {/* Наименование товара */}
      <p className="text-xl mb-4">{title}</p>

      {/* Цена */}
      <span className="text-xl font-medium" style={{ color: "#A18A68" }}>
        {currency} {price.toFixed(2)}
      </span>
    </div>
  );
};


