import React, { useContext } from "react";
import { useSaved } from "../../../context/save/useSaved.js";
import { CartContext } from "../../../context/cart/CartContext.jsx";
import { Drawer } from "../Drawer/Drawer.jsx";
import { useAuth } from "../../../context/auth/useAuth.js";
import { useNavigate } from "react-router-dom";

export const SavedDrawer = () => {
  const {
    items,
    open,
    setOpen,
    remove,
    increase,
    decrease,
    count,
    total,
    clear,
    loading,
  } = useSaved();

  const { addToCart } = useContext(CartContext);
  const { user } = useAuth();
  const navigate = useNavigate();

  const localMoveToCart = async () => {
    // Require auth
    if (!user) {
      // Close drawer first, then redirect to account/login
      setOpen(false);
      navigate("/account");
      return;
    }

    if (!items || items.length === 0) return;

    for (const it of items) {
      const product = it.product || {};
      const cartItem = {
        id: Number(product.id ?? product.product_id),
        title: product.title ?? product.name ?? "",
        price:
          it.price_after != null
            ? Number(it.price_after)
            : Number(product.price ?? 0),
        img: product.img ?? product.img_url ?? null,
        quantity: it.qty ?? 1,
        sku: product.sku ?? product.SKU ?? null,
      };

      try {
        addToCart(cartItem);
      } catch (e) {
        console.error("Failed to add to cart", e);
      }
    }

    clear();
    setOpen(false);
  };

  return (
    <Drawer
      isOpen={open}
      onClose={() => setOpen(false)}
      align="right"
      title="Saved products"
    >
      <div className="p-0">
        <div
          className="p-4 overflow-auto"
          style={{ maxHeight: "calc(100% - 140px)" }}
        >
          {items.length === 0 ? (
            <div className="text-sm text-gray-500">No saved products</div>
          ) : (
            items.map((it) => {
              const unit =
                it.price_after != null
                  ? Number(it.price_after)
                  : Number(it.product?.price ?? 0);
              const lineTotal = unit * (it.qty ?? 1);
              return (
                <div
                  key={it.id}
                  className="flex items-center gap-3 py-3 border-b"
                >
                  <img
                    src={
                      it.product?.img
                        ? it.product.img.startsWith("/")
                          ? window.location.origin + it.product.img
                          : it.product.img
                        : "/images/placeholder.png"
                    }
                    alt={it.product?.title || ""}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{it.product?.title}</div>
                    <div className="text-sm text-gray-600">
                      {(it.currency ? `${it.currency}` : "") +
                        (unit != null ? Number(unit).toFixed(2) : "")}{" "}
                      each
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => decrease(it.id, 1)} className="px-2">
                      −
                    </button>
                    <div className="px-2">{it.qty ?? 1}</div>
                    <button onClick={() => increase(it.id, 1)} className="px-2">
                      +
                    </button>
                    <div className="px-3 font-semibold">
                      {(it.currency ? `${it.currency} ` : "") +
                        Number(lineTotal).toFixed(2)}
                    </div>
                    <button
                      className="text-gray-500 px-2"
                      onClick={() => remove(it.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex justify-between mb-3">
            <div>{count} products</div>
            <div className="font-semibold">{Number(total || 0).toFixed(2)}</div>
          </div>
          <button
            onClick={localMoveToCart}
            disabled={items.length === 0 || loading}
            className="w-full py-3 bg-black text-white disabled:opacity-50"
          >
            {loading ? "Processing..." : "ADD TO CART"}
          </button>
        </div>
      </div>
    </Drawer>
  );
};
