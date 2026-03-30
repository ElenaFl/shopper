import React from "react";
import { Link } from "react-router-dom";

/**
 Компонент карточка.
 props.details — объект товара
 props.size — размеры
 props.onOpenDetails — колбэк открытия
 props.className, props.style — дополнительный класс/стиль (для анимации)
*/

const safeSrc = (img, img_url) => {
  if (img_url && typeof img_url === "string" && img_url.startsWith("http"))
    return img_url;
  if (!img) return "/images/placeholder.png";
  const base = window.location.origin.replace(/\/$/, "");
  return img.startsWith("/") ? base + img : base + "/" + img;
};

// Robust discount extractor
function normalizeDiscount(raw) {
  if (!raw) return null;

  // If discount is nested under discount.discount or discounts array
  if (Array.isArray(raw) && raw.length > 0) {
    return normalizeDiscount(raw[0]);
  }

  if (typeof raw === "object") {
    // Sometimes API returns { discount: { ... } }
    if (raw.discount && typeof raw.discount === "object") {
      return normalizeDiscount(raw.discount);
    }

    // Common shapes:
    // { type: 'percent', value: 10 }
    // { price_after: 12.5 }
    // { value: 10, currency: 'USD' }
    // { amount: 10, currency: 'USD' }
    const type = raw.type ?? null;
    const value = raw.value ?? raw.amount ?? null;
    const price_after = raw.price_after ?? raw.priceAfter ?? null;
    const currency = raw.currency ?? raw.currency_code ?? null;

    // If object already contains price_after, prefer that
    if (price_after != null) {
      return {
        type: "fixed",
        value: value,
        price_after: Number(price_after),
        currency,
      };
    }

    if (type === "percent" && (value != null || raw.value != null)) {
      return { type: "percent", value: Number(value), currency };
    }

    if (value != null) {
      return { type: "fixed", value: Number(value), currency };
    }
  }

  // Unknown format -> null
  return null;
}

export const Card = React.memo((props) => {
  const { id, title, currency, price, img } = props.details || {};
  const rawDiscount =
    props.details?.discount ?? props.details?.discounts ?? null;
  const discount = normalizeDiscount(rawDiscount);

  const { width, height, heightImg } = props.size || {};
  const { className = "", style = {}, onOpenDetails } = props;

  const parsePrice = (v) =>
    v === null || v === undefined || v === "" ? null : Number(String(v).trim());

  const origPrice = parsePrice(price);
  const priceAfter = parsePrice(discount?.price_after ?? discount?.price_after); // normalized name

  const formatPrice = (value, currencyLabel) => {
    if (value == null || isNaN(Number(value))) return "";
    const num = Number(value).toFixed(2);
    return `${num}${currencyLabel ? " " + currencyLabel : ""}`;
  };

  const discountPercent = (() => {
    if (!discount) return null;
    if (discount.type === "percent" && discount.value != null) {
      const v = Number(discount.value);
      if (!isNaN(v)) return `-${v.toFixed(0)}%`;
      return null;
    }
    if (origPrice != null && origPrice > 0 && priceAfter != null) {
      const pct = Math.round((1 - priceAfter / origPrice) * 100);
      return `-${pct}%`;
    }
    return null;
  })();

  const details = props.details || {};
  const imgSrc = safeSrc(details.img, details.img_url);

  return (
    <div
      className={`cursor-pointer ${className}`}
      style={{ width: `${width}px`, height: `${height}px`, ...style }}
      onClick={() => onOpenDetails && onOpenDetails(id)}
    >
      <div
        style={{ height: `${heightImg}px` }}
        className="relative rounded-lg mb-6 overflow-hidden group border-1 border-taupe-100"
      >
        <img
          loading="lazy"
          src={imgSrc}
          alt={title ?? ""}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="flex items-center gap-x-7.5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition duration-300 group-hover:opacity-100 group-hover:scale-105">
          <Link to="/cart" className="btn" onClick={(e) => e.stopPropagation()}>
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

      <p className="text-xl mb-4">{title}</p>

      <div>
        {priceAfter != null ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                color: "#6b7280",
                textDecoration: "line-through",
                marginRight: 8,
              }}
              aria-label={`Old price ${formatPrice(origPrice, currency)}`}
              title={`Old price ${formatPrice(origPrice, currency)}`}
            >
              {formatPrice(origPrice, currency) || ""}
            </span>

            <span style={{ color: "red", fontWeight: 700 }}>
              {formatPrice(priceAfter, currency) || ""}
            </span>

            {discountPercent && (
              <span style={{ marginLeft: 8, color: "green" }}>
                {discountPercent}
              </span>
            )}
          </div>
        ) : (
          <div style={{ color: "#000", fontWeight: 600 }}>
            {formatPrice(origPrice, currency) || ""}
            {/* if there's a percent discount but no explicit priceAfter, show percent */}
            {!priceAfter &&
            discount?.type === "percent" &&
            discount?.value != null ? (
              <span style={{ marginLeft: 8, color: "green" }}>
                {`-${Number(discount.value).toFixed(0)}%`}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
});
