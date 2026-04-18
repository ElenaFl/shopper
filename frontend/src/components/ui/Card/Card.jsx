import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { useSavedItems } from "../../../hooks/useSavedItems";
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
  } catch (err) {
    console.warn("formatMoney: failed to format currency, fallback used", err);
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
  const id = props.details?.id ?? props.details?.product_id ?? null;
  const title = props.details?.title ?? props.details?.name ?? "";
  const currency =
    props.details?.currency ?? props.details?.currency_code ?? null;
  const price = props.details?.price ?? props.details?.price_amount ?? null;
  const img = props.details?.img ?? props.details?.img_url ?? null;
  const rawDiscount =
    props.details?.discount ?? props.details?.discounts ?? null;

  // Normalize incoming discount shape (but avoid heavy calculations)
  const discount = normalizeDiscount(rawDiscount);

  const { width, height, heightImg } = props.size || {};
  const { className = "", style = {}, onOpenDetails } = props;
  const { add } = useSavedItems();
  const { items, save, remove } = useSavedItems({ user: props.user });
  const savedEntry = items.find((s) => String(s.product_id) === String(id));
  const savedActive = Boolean(savedEntry);

  // get cart functions
  const { addToCart } = useContext(CartContext);

  // unified helpers
  const parsePrice = (v) =>
    v === null || v === undefined || v === "" ? null : Number(String(v).trim());

  const origPrice = parsePrice(price);

  // Prefer server final_price (authoritative) or discount.price_after for display.
  // Fallback to discount percent/fixed calculation using origPrice, then finally to snapshot/unit.
  const serverFinalRaw = props.details?.final_price ?? null;
  const serverFinal =
    serverFinalRaw != null && !Number.isNaN(Number(serverFinalRaw))
      ? Number(serverFinalRaw)
      : null;

  // discount already normalized above: may have { type, value, price_after }
  let priceAfterForDisplay = null;
  if (serverFinal != null && Number.isFinite(serverFinal)) {
    priceAfterForDisplay = serverFinal;
  } else if (
    discount?.price_after != null &&
    Number.isFinite(Number(discount.price_after))
  ) {
    priceAfterForDisplay = Number(discount.price_after);
  } else if (
    discount?.type === "percent" &&
    discount?.value != null &&
    !Number.isNaN(Number(discount.value)) &&
    origPrice != null
  ) {
    priceAfterForDisplay = Math.max(
      0,
      Number((origPrice * (1 - Number(discount.value) / 100)).toFixed(2)),
    );
  } else if (
    discount?.type === "fixed" &&
    discount?.value != null &&
    origPrice != null
  ) {
    priceAfterForDisplay = Math.max(
      0,
      Number((origPrice - Number(discount.value)).toFixed(2)),
    );
  } else {
    // fallback: use snapshot/unit if available, otherwise origPrice
    const getUnitPrice = (it = {}) => {
      const rawAfter =
        it?.price_after ?? it?.product?.price_after ?? it?.priceAfter ?? null;
      if (rawAfter != null && Number.isFinite(Number(rawAfter)))
        return Number(rawAfter);
      const raw = it?.price ?? it?.product?.price ?? it?.price_amount ?? null;
      return raw != null && Number.isFinite(Number(raw)) ? Number(raw) : null;
    };
    const snapshotSource = savedEntry ?? props.details;
    const unit = getUnitPrice(snapshotSource);
    priceAfterForDisplay = unit != null ? unit : origPrice;
  }

  // final flags for rendering
  const priceAfter = priceAfterForDisplay;
  const hasDiscount =
    Number.isFinite(Number(origPrice)) &&
    Number.isFinite(Number(priceAfter)) &&
    Number(origPrice) > Number(priceAfter);

  const discountPercentLabel = (() => {
    if (discount && discount.type === "percent" && discount.value != null) {
      return `-${Math.round(Number(discount.value))}%`;
    }
    return computeDisplayPercent(origPrice, priceAfter);
  })();

  const imgSrc = safeSrc(img, props.details?.img_url);

  // handler: add product to cart using unified unit price from snapshot (keep current behavior)
  const getUnitPriceForCart = (it = {}) => {
    const rawAfter = it?.price_after ?? it?.product?.price_after ?? null;
    if (rawAfter != null && Number.isFinite(Number(rawAfter)))
      return Number(rawAfter);
    const raw = it?.price ?? it?.product?.price ?? it?.price_amount ?? null;
    return raw != null && Number.isFinite(Number(raw)) ? Number(raw) : 0;
  };

  const snapshotSourceForCart = savedEntry ?? props.details;
  const unitForCart = getUnitPriceForCart(snapshotSourceForCart);

  const handleAddToCartClick = (e) => {
    e?.stopPropagation();
    const product = props.details || {};
    const cartItem = {
      id: Number(product.id ?? product.product_id),
      title: product.title ?? product.name ?? "",
      price: Number(unitForCart),
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
            onClick={async (e) => {
              e.stopPropagation();
              try {
                if (!id) {
                  alert("Нет продукта");
                  return;
                }
                if (savedActive) {
                  await remove({
                    savedId: savedEntry?.id ?? null,
                    productId: id,
                  });
                } else {
                  // pass product snapshot so guest saves include price/img
                  await save(id, props.details);
                  if (typeof add === "function") add(props.details, 1);
                }
              } catch (err) {
                console.error("save toggle error", err);
                alert(err?.message || "Error saving item");
              }
            }}
            aria-label={savedActive ? "Unsave product" : "Save product"}
          >
            <img
              src={savedActive ? "/images/heard-fill.svg" : "/images/heart.svg"}
              alt="heart"
            />{" "}
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
