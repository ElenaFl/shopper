import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Counter } from "../components/ui/Counter/Counter.jsx";
import { Button } from "../components/ui/Button/Button.jsx";
import { Tabs } from "../components/ui/Tabs/Tabs.jsx";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import { CartContext } from "../context/cart/CartContext.jsx";
import { Card } from "../components/ui/Card/Card.jsx";

const safeSrc = (img, img_url) => {
  if (img_url && typeof img_url === "string" && img_url.startsWith("http"))
    return img_url;
  if (!img) return "/images/placeholder.png";
  const base = window.location.origin.replace(/\/$/, "");
  return img.startsWith("/") ? base + img : base + "/" + img;
};

export const ProductDetails = () => {
  const { id } = useParams();
  const { cart, addToCart, updateQuantity } = useContext(CartContext);

  const productId = Number(id);
  const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";

  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [productError, setProductError] = useState(null);

  const [similar, setSimilar] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarError, setSimilarError] = useState(null);

  const [categoryTitle, setCategoryTitle] = useState("");
  const [activeCategory, setActiveCategory] = useState("Description");

  const existing = cart.find((i) => Number(i.id) === productId);
  const derivedCount = existing ? Number(existing.quantity) : 1;
  const [local, setLocal] = useState(() => ({
    count: derivedCount,
    isAdded: Boolean(existing),
  }));

  const [rating, setRating] = useState(0);

  const normalizeProduct = (p = {}) => {
    const colours = Array.isArray(p.colours)
      ? p.colours
      : typeof p.colours === "string" && p.colours.trim() !== ""
        ? p.colours
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const weight =
      p.weight ??
      (p.weight_value
        ? `${p.weight_value}${p.weight_unit ? " " + p.weight_unit : ""}`
        : null);
    const description = p.description ?? p.short_description ?? "";

    return { ...p, colours, weight, description };
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadProduct = async () => {
      setLoadingProduct(true);
      setProductError(null);
      try {
        const res = await fetch(`${API_BASE}/api/products/${productId}`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) {
          setProductError(
            `Failed to load product: ${res.status} ${res.statusText}`,
          );
          return;
        }

        const json = await res.json();
        const payload = json && json.data ? json.data : json;
        if (!cancelled) {
          const normalized = normalizeProduct(payload);
          setProduct(normalized);

          if (normalized.user_rating) setRating(Number(normalized.user_rating));
          else if (normalized.rating) setRating(Math.round(normalized.rating));

          if (normalized && normalized.category && normalized.category.title)
            setCategoryTitle(normalized.category.title);
          else if (payload && payload.category_id) setCategoryTitle("");
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        if (!cancelled)
          setProductError("Failed to load product (network error)");
      } finally {
        if (!cancelled) setLoadingProduct(false);
      }
    };

    loadProduct();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [API_BASE, productId]);

  useEffect(() => {
    if (!product || categoryTitle) return;
    if (!product.category_id) return;

    let cancelled = false;
    const controller = new AbortController();

    const loadCategory = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/categories/${product.category_id}`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );
        if (!res.ok) return;
        const j = await res.json();
        const payload = j && j.data ? j.data : j;
        if (!cancelled && payload && payload.title)
          setCategoryTitle(payload.title);
      } catch (err) {
        // ignore
      }
    };

    loadCategory();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [API_BASE, product, categoryTitle]);

  useEffect(() => {
    if (!product || !product.category_id) {
      setSimilar([]);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadSimilar = async () => {
      setLoadingSimilar(true);
      setSimilarError(null);
      try {
        const params = new URLSearchParams();
        params.append("category_id", String(product.category_id));
        params.append("per_page", "3");
        const res = await fetch(
          `${API_BASE}/api/products?${params.toString()}`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const j = await res.json();
        const items = Array.isArray(j) ? j : (j?.data ?? j?.items ?? []);
        const filtered = Array.isArray(items)
          ? items.filter((p) => Number(p.id) !== Number(productId)).slice(0, 3)
          : [];
        if (!cancelled) setSimilar(filtered);
      } catch (err) {
        if (!cancelled && err.name !== "AbortError") {
          setSimilarError("Failed to load similar products");
        }
      } finally {
        if (!cancelled) setLoadingSimilar(false);
      }
    };

    loadSimilar();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [API_BASE, product, productId]);

  useEffect(() => {
    const inCart = cart.find((i) => Number(i.id) === productId);
    const next = inCart
      ? { count: Number(inCart.quantity) || 0, isAdded: true }
      : { count: 1, isAdded: false };
    setLocal((prev) => {
      if (prev.count === next.count && prev.isAdded === next.isAdded)
        return prev;
      return next;
    });
  }, [cart, productId]);

  const handleCounterChange = (newCount) => {
    const q = Number(newCount) || 0;
    setLocal((prev) => ({ ...prev, count: q }));
    if (q <= 0) {
      updateQuantity(productId, 0);
      setLocal((prev) => ({ ...prev, isAdded: false }));
    }
  };

  const handleAddToCart = () => {
    const inCart = cart.find((i) => Number(i.id) === productId);
    if (inCart) {
      setLocal((prev) => ({ ...prev, isAdded: true }));
      return;
    }
    const qty = Number(local.count) > 0 ? Number(local.count) : 1;
    if (!product) return;
    addToCart({ ...product, quantity: qty });
    setLocal((prev) => ({ ...prev, isAdded: true }));
  };

  const addButtonClass = local.isAdded
    ? "w-90 h-13 font-semibold border rounded-sm cursor-not-allowed flex justify-center items-center text-center bg-white text-[#D8D8D8]"
    : "w-90 h-13 font-semibold border rounded-sm cursor-pointer flex justify-center items-center text-center bg-black text-white hover:bg-black hover:text-white";

  const counterWrapperClass = "w-26 h-13 bg-white";

  if (loadingProduct) {
    return (
      <div className="mt-31 pt-24">
        <div>Loading product...</div>
      </div>
    );
  }
  if (productError) {
    return (
      <div className="mt-31 pt-24">
        <div className="text-red-500">{productError}</div>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="mt-31 pt-24">
        <div>Product not found</div>
      </div>
    );
  }

  return (
    <div className="mt-60 mb-62">
      <div className="flex justify-between items-center gap-x-9px mb-10">
        <div className="w-30">
          <div className="relative">
            <Swiper
              className="w-30 h-150 cursor-pointer absolute top-2 left-0"
              modules={[Pagination, Autoplay]}
              direction="vertical"
              pagination={{ clickable: true }}
              slidesPerView={4}
              centeredSlides={false}
              loop={true}
              autoplay={{ delay: 4000 }}
              spaceBetween={10}
              speed={600}
              touchRatio={1}
            >
              {Array.isArray(product.images) && product.images.length > 0 ? (
                product.images.map((imgItem, idx) => {
                  const slideSrc = safeSrc(
                    imgItem || product.img,
                    product.img_url,
                  );
                  return (
                    <SwiperSlide key={idx}>
                      <div className="w-30 h-30 relative">
                        <img
                          loading="lazy"
                          src={slideSrc}
                          alt={product.title ?? ""}
                          className="w-full h-full rounded-sm"
                        />
                      </div>
                    </SwiperSlide>
                  );
                })
              ) : (
                <SwiperSlide key={product.id}>
                  <div className="w-30 h-30 relative">
                    <img
                      loading="lazy"
                      src={safeSrc(product.img, product.img_url)}
                      alt={product.title ?? ""}
                      className="w-full h-full rounded-sm"
                    />
                  </div>
                </SwiperSlide>
              )}
            </Swiper>
          </div>
        </div>

        <div className="w-272 flex justify-between items-center gap-x-12px">
          <div className="w-135 h-145">
            <img
              loading="lazy"
              src={safeSrc(product.img, product.img_url)}
              alt={product.title ?? ""}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="w-121">
            <h3 className="text-2xl mb-6">{product.title}</h3>

            <p className="text-xl text-medium mb-16">
              {product.currency}{" "}
              {typeof product.price === "number"
                ? product.price.toFixed(2)
                : product.price}
            </p>

            <div className="w-73 h-6 flex justify-between items-center mb-5">
              <div className="w-32.5 flex justify-between items-center cursor-pointer">
                {[...Array(5)].map((_, i) => (
                  <img key={i} src="/images/star.svg" alt="star" />
                ))}
              </div>
              <div className="w-34.5 flex justify-between items-center">
                <div>n</div>
                <div className="text-[#707070]">customer review</div>
              </div>
            </div>

            <p className="mb-12" style={{ color: "#707070" }}>
              {product.description || "No description available."}
            </p>

            <div className="h-13 flex justify-between items-center mb-20">
              <div
                className={counterWrapperClass}
                aria-disabled={local.isAdded}
              >
                <Counter count={local.count} onChange={handleCounterChange} />
              </div>
              <button
                onClick={handleAddToCart}
                className={addButtonClass}
                disabled={local.isAdded}
              >
                ADD TO CART
              </button>
            </div>

            <div className="w-60 h-4.5 mb-9 flex justify-between items-center ">
              <img
                src="/images/heart.svg"
                alt="heart"
                className="cursor-pointer"
              />
              <div>|</div>
              <img
                src="/images/instagram.svg"
                alt="instagram"
                className="cursor-pointer"
              />
            </div>

            <div>
              <span className="inline-block mr-4">SKU: </span>
              <span className="inline-block mb-4 text-[#707070]">
                {product.sku ?? product.SKU}
              </span>
            </div>

            <div>
              <span className="inline-block mr-4">Categories:</span>
              <span className="inline-block mb-4 text-[#707070]">
                {categoryTitle}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-xl">
        <Tabs
          categories={["Description", "Additional information", "Reviews(n)"]}
          activeCategory={activeCategory}
          onCategoryChange={(category) => setActiveCategory(category)}
          tabClassName="flex list-none gap-25 justify-start border-b border-[#D8D8D8]"
          tabItemClassName="inline-flex pl-0 items-center justify-center px-4 py-2 text-lg cursor-pointer"
          activeClassName="text-black border-b-2 border-black"
          inactiveClassName="text-gray-500"
        />
      </div>

      {activeCategory === "Description" && (
        <div
          className="w-full mt-10 mb-24 text-[#707070] text-left"
          id="description-content"
        >
          <p>{product.description || "No description available."}</p>
        </div>
      )}

      {activeCategory === "Additional information" && (
        <div
          className="w-full mt-10 mb-14 text-[#707070] text-left"
          id="information-content"
        >
          <ul>
            <li>
              <span className="inline-block mb-3 mr-4 text-black">Weight:</span>{" "}
              <span className="text-[#707070]">{product.weight ?? "—"}</span>
            </li>
            <li>
              <span className="inline-block mb-3 mr-4 text-black">
                Dimensions:
              </span>{" "}
              <span className="text-[#707070]">
                {product.dimensions ?? "—"}
              </span>
            </li>
            <li>
              <span className="inline-block mb-3 mr-4 text-black">
                Colours:
              </span>{" "}
              <span className="text-[#707070]">
                {Array.isArray(product.colours) && product.colours.length > 0
                  ? product.colours.map((c, i) => (
                      <span key={i} className="inline-block mr-2">
                        {c}
                      </span>
                    ))
                  : "—"}
              </span>
            </li>
            <li>
              <span className="inline-block mb-3 mr-4 text-black">
                Material:
              </span>{" "}
              <span className="text-[#707070]">{product.material ?? "—"}</span>
            </li>
          </ul>
        </div>
      )}

      {activeCategory === "Reviews(n)" && (
        <div className="w-full mt-10 mb-21 text-[#707070]" id="reviews-content">
          <div className="w-full mt-24 flex justify-between text-[#707070]">
            <div className="w-[46%]">
              <h3 className="mb-13 text-xl">n Reviews for {product.title}</h3>
              <div className="w-full pt-6 pb-10 border-b border-[#707070]">
                <div className="flex items-center gap-x-4 mb-4">
                  <h4 className="inline-block text-xl">Scarlet withch</h4>
                  <span className="text-sm text-[#707070]">Date</span>
                </div>
                <div className="mb-6">
                  <img src="/images/stars.png" alt="starc" />
                </div>
                <p className="text-[#707070]">
                  Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed
                  diam nonummy nibh euismod tincidunt ut laoreet.
                </p>
              </div>
            </div>

            <div className="w-[46%]">
              <h3 className="mb-3 text-xl text-black">Add a Review</h3>
              <p className="mb-12 text-[13px]/[30px] text-[#707070]">
                Your email address will not be published. Required fields are
                marked *
              </p>
              <form className="text-sm text-[#707070]">
                <textarea
                  rows={3}
                  className="w-full mb-12 border-b border-[#707070]"
                  placeholder="Your Review*"
                  required
                />
                <div className="w-full">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    className="w-full mb-12 pb-4 border-b border-[#707070]"
                    placeholder="Enter your name*"
                  />
                </div>
                <div className="w-full">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    className="w-full mb-7 pb-4 border-b border-[#707070]"
                    placeholder="Enter your Email**"
                  />
                </div>
                <div className="w-full flex gap-x-2 mb-12">
                  <input type="checkbox" id="save" className="w-4 h-4" />
                  <label htmlFor="save">
                    Save my name, email, and website in this browser for the
                    next time I comment
                  </label>
                </div>
                <p className="mb-3">Your Rating*</p>
                <div className="mb-12">
                  <img src="/images/stars.png" alt="stars" />
                </div>
                <div className="w-[22%]">
                  <Button color="black" name="Submit" />
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <h2 className="mb-12 text-[26px]">Similar Items</h2>
      <div className="w-full flex flex-wrap gap-6">
        {loadingSimilar ? (
          <div className="text-gray-500">Loading similar items...</div>
        ) : similarError ? (
          <div className="text-red-500">{similarError}</div>
        ) : similar.length === 0 ? (
          <div className="text-gray-500">No similar items</div>
        ) : (
          similar.map((p) => (
            <div key={p.id} style={{ width: 380 }} className="min-w-55">
              <Card
                details={p}
                size={{ width: 380, height: 472, heightImg: 380 }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
