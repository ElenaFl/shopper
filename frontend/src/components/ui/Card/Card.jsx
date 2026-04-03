import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { useSaved } from "../../../context/save/useSaved.js";
import { CartContext } from "../../../context/cart/CartContext.jsx";

/**
 Компонент карточка.
 props.details — объект товара
 props.size — размеры
 props.onOpenDetails — колбэк открытия
 props.className, props.style — дополнительный класс/стиль (для анимации)
*/

// helper: безопасно форматируем валюту
const formatMoney = (value, currencyLabel) => {
  if (value == null) return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  try {
    if (
      currencyLabel &&
      typeof currencyLabel === "string" &&
      currencyLabel.length === 3
    ) {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyLabel,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
    }
  } catch (e) {
    // fallback
  }
  return n.toFixed(2) + (currencyLabel ? " " + currencyLabel : "");
};

// compute display percent for UI only (non-authoritative)
const computeDisplayPercent = (original, final) => {
  const o = Number(original);
  const f = Number(final);
  if (!Number.isFinite(o) || !Number.isFinite(f) || o <= 0) return null;
  const pct = Math.round(((o - f) / o) * 100);
  return pct > 0 ? `-${pct}%` : null;
};

const safeSrc = (img, img_url) => {
  if (img_url && typeof img_url === "string" && img_url.startsWith("http"))
    return img_url;
  if (!img) return "/images/placeholder.png";
  const base = window.location.origin.replace(/\/$/, "");
  return img.startsWith("/") ? base + img : base + "/" + img;
};

function normalizeDiscount(raw) {
  if (!raw) return null;

  if (Array.isArray(raw) && raw.length > 0) {
    return normalizeDiscount(raw[0]);
  }

  if (typeof raw === "object") {
    if (raw.discount && typeof raw.discount === "object") {
      return normalizeDiscount(raw.discount);
    }

    const type = raw.type ?? null;
    const value = raw.value ?? raw.amount ?? null;
    const price_after = raw.price_after ?? raw.priceAfter ?? null;
    const currency = raw.currency ?? raw.currency_code ?? null;

    if (price_after != null) {
      return {
        type: type || (price_after != null ? "fixed" : null),
        value: value != null ? Number(value) : null,
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

  return null;
}

export const Card = React.memo((props) => {
  const { id, title, currency, price, img } = props.details || {};
  const rawDiscount =
    props.details?.discount ?? props.details?.discounts ?? null;

  // Normalize incoming discount shape (but avoid heavy calculations)
  const discount = normalizeDiscount(rawDiscount);

  const { width, height, heightImg } = props.size || {};
  const { className = "", style = {}, onOpenDetails } = props;

  const { isSaved, setOpen, add } = useSaved();
  const savedActive = isSaved(id);

  // get cart functions
  const { addToCart } = useContext(CartContext);

  const parsePrice = (v) =>
    v === null || v === undefined || v === "" ? null : Number(String(v).trim());

  const origPrice = parsePrice(price);

  // Prefer server final_price (authoritative). Fallback to discount.price_after or client calc (display only)
  const serverFinalRaw = props.details?.final_price ?? null;
  const serverFinal =
    serverFinalRaw != null && !Number.isNaN(Number(serverFinalRaw))
      ? Number(serverFinalRaw)
      : null;

  let priceAfter = null;
  if (serverFinal != null) {
    priceAfter = serverFinal;
  } else if (
    discount?.price_after != null &&
    Number.isFinite(Number(discount.price_after))
  ) {
    priceAfter = Number(discount.price_after);
  } else if (
    discount?.type === "percent" &&
    discount?.value != null &&
    !Number.isNaN(Number(discount.value)) &&
    origPrice != null
  ) {
    priceAfter = Math.max(
      0,
      Number((origPrice * (1 - Number(discount.value) / 100)).toFixed(2)),
    );
  } else if (
    discount?.type === "fixed" &&
    discount?.value != null &&
    origPrice != null
  ) {
    priceAfter = Math.max(
      0,
      Number((origPrice - Number(discount.value)).toFixed(2)),
    );
  } else {
    priceAfter = origPrice;
  }

  const hasDiscount =
    Number.isFinite(Number(origPrice)) &&
    Number.isFinite(Number(priceAfter)) &&
    Number(origPrice) > Number(priceAfter);

  const discountPercentLabel = (() => {
    if (discount && discount.type === "percent" && discount.value != null) {
      return `-${Math.round(Number(discount.value))}%`;
    }
    // fallback compute if server didn't provide percent
    return computeDisplayPercent(origPrice, priceAfter);
  })();

  const imgSrc = safeSrc(img, props.details?.img_url);

  // handler: add product to cart using final price
  const handleAddToCartClick = (e) => {
    e?.stopPropagation();
    const product = props.details || {};
    const cartItem = {
      id: Number(product.id ?? product.product_id),
      title: product.title ?? product.name ?? "",
      price:
        priceAfter != null ? Number(priceAfter) : Number(product.price ?? 0),
      img: product.img ?? product.img_url ?? null,
      quantity: 1,
      sku: product.sku ?? product.SKU ?? null,
    };
    addToCart(cartItem);
  };

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
          <button
            type="button"
            className="btn"
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCartClick(e);
            }}
            aria-label="Add to cart"
          >
            <img src="/images/shoppingCart.svg" alt="shopping-cart" />
          </button>

          <Link
            to={`/products/${id}`}
            className="btn"
            onClick={(e) => e.stopPropagation()}
          >
            <img src="/images/eye.svg" alt="eye" />
          </Link>

          <button
            type="button"
            className="btn"
            onClick={(e) => {
              e.stopPropagation();
              add(props.details, 1);
              setOpen(true);
            }}
            aria-label="Save product"
          >
            <img src={"/images/heart.svg"} alt="heart" />
          </button>
        </div>
      </div>

      <p className="text-xl mb-4">{title}</p>

      <div>
        {hasDiscount ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                color: "#6b7280",
                textDecoration: "line-through",
                marginRight: 8,
              }}
              aria-label={`Old price ${formatMoney(origPrice, currency)}`}
              title={`Old price ${formatMoney(origPrice, currency)}`}
            >
              {formatMoney(origPrice, currency) || ""}
            </span>

            <span style={{ color: "red", fontWeight: 700 }}>
              {formatMoney(priceAfter, currency) || ""}
            </span>

            {discountPercentLabel && (
              <span style={{ marginLeft: 8, color: "green" }}>
                {discountPercentLabel}
              </span>
            )}
          </div>
        ) : (
          <div style={{ color: "#6b7280", fontWeight: 600 }}>
            {formatMoney(origPrice, currency) || ""}
          </div>
        )}
      </div>
    </div>
  );
});
