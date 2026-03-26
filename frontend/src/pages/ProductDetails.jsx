import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Counter } from "../components/ui/Counter/Counter.jsx";
import { Tabs } from "../components/ui/Tabs/Tabs.jsx";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { Pagination, Autoplay } from "swiper/modules";
import { CartContext } from "../context/cart/CartContext.jsx";
import { Card } from "../components/ui/Card/Card.jsx";
import { Button } from "../components/ui/Button/Button.jsx";
import { AuthContext } from "../context/auth/AuthContext.jsx";

const safeSrc = (img, img_url) => {
  if (img_url && typeof img_url === "string" && img_url.startsWith("http")) {
    return img_url;
  }
  if (!img) return "/images/placeholder.png";
  const base = window.location.origin.replace(/\/$/, "");
  return img.startsWith("/") ? base + img : base + "/" + img;
};

export const ProductDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { cart, addToCart, updateQuantity } = useContext(CartContext);
  const { user, getCsrf, fetchUser } = useContext(AuthContext);

  const productId = Number(id);
  const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";

  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [productError, setProductError] = useState(null);

  const [similar, setSimilar] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarError, setSimilarError] = useState(null);

  // NEW: sliderItems holds "all products" for the left Swiper
  const [sliderItems, setSliderItems] = useState([]);
  const [loadingSliderItems, setLoadingSliderItems] = useState(false);

  const [categoryTitle, setCategoryTitle] = useState("");
  const [activeCategory, setActiveCategory] = useState("Description");

  const [showAllReviews, setShowAllReviews] = useState(false);

  const existing = cart.find((i) => Number(i.id) === productId);
  const derivedCount = existing ? Number(existing.quantity) : 1;
  const [local, setLocal] = useState(() => ({
    count: derivedCount,
    isAdded: Boolean(existing),
  }));

  const [rating, setRating] = useState(0);

  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewName, setReviewName] = useState("");
  const [reviewEmail, setReviewEmail] = useState("");
  const [needLoginMessage, setNeedLoginMessage] = useState("");

  const canSubmit = Boolean(reviewComment && reviewRating && !submittingReview);

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

  // helper: fetch similar by category id
  const fetchSimilar = async (categoryId, signal = null) => {
    if (!categoryId) {
      setSimilar([]);
      return [];
    }
    setLoadingSimilar(true);
    setSimilarError(null);
    try {
      const params = new URLSearchParams();
      params.append("category_id", String(categoryId));
      params.append("per_page", "12");
      const res = await fetch(`${API_BASE}/api/products?${params.toString()}`, {
        credentials: "include",
        signal,
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const j = await res.json();
      const items = Array.isArray(j) ? j : (j?.data ?? j?.items ?? []);
      const allItems = Array.isArray(items) ? items : [];
      setSimilar(allItems);
      return allItems;
    } catch (err) {
      if (err.name !== "AbortError") {
        setSimilarError("Failed to load similar products");
        setSimilar([]);
      }
      return [];
    } finally {
      setLoadingSimilar(false);
    }
  };

  // NEW: fetch items for slider (all products, per_page)
  const fetchAllForSlider = async (signal = null) => {
    setLoadingSliderItems(true);
    try {
      const params = new URLSearchParams();
      params.append("per_page", "12");
      const res = await fetch(`${API_BASE}/api/products?${params.toString()}`, {
        credentials: "include",
        signal,
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const j = await res.json();
      const items = Array.isArray(j) ? j : (j?.data ?? j?.items ?? []);
      setSliderItems(Array.isArray(items) ? items : []);
      return items;
    } catch (err) {
      setSliderItems([]);
      return [];
    } finally {
      setLoadingSliderItems(false);
    }
  };

  const loadProduct = async (signal) => {
    setLoadingProduct(true);
    setProductError(null);
    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}`, {
        credentials: "include",
        signal,
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => null);
        setProductError(
          `Failed to load product: ${res.status} ${res.statusText} ${text || ""}`,
        );
        return;
      }

      const json = await res.json().catch(() => null);
      const payload = json && json.data ? json.data : json;
      const normalized = normalizeProduct(payload);

      if (
        !normalized.category_id &&
        payload &&
        payload.category &&
        payload.category.id
      ) {
        normalized.category_id = payload.category.id;
      }

      if (!normalized.category || !normalized.category.title) {
        if (payload && payload.category && payload.category.title) {
          normalized.category = normalized.category || {};
          normalized.category.title = payload.category.title;
        }
      }

      setProduct(normalized);

      if (normalized.user_rating) setRating(Number(normalized.user_rating));
      else if (normalized.rating) setRating(Math.round(normalized.rating));

      if (normalized && normalized.category && normalized.category.title)
        setCategoryTitle(normalized.category.title);
      else if (payload && payload.category_id) setCategoryTitle("");

      // ensure slider items are available (fetch all products for slider)
      try {
        fetchAllForSlider().catch(() => {});
      } catch (e) {
        // ignore
      }

      // immediately fetch similar for category (fire-and-forget)
      try {
        const catId =
          normalized?.category_id ??
          payload?.category_id ??
          normalized?.category?.id;
        if (catId) {
          fetchSimilar(catId).catch(() => {});
        }
      } catch (e) {
        // ignore
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      setProductError("Failed to load product (network error)");
    } finally {
      setLoadingProduct(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadProduct(controller.signal);
    return () => controller.abort();
  }, [API_BASE, productId]);

  useEffect(() => {
    // if category changes later, reload similar
    if (!product) {
      setSimilar([]);
      return;
    }
    const controller = new AbortController();
    if (product.category_id) {
      fetchSimilar(product.category_id, controller.signal);
    }
    return () => controller.abort();
  }, [product?.category_id]);

  useEffect(() => {
    // load slider items on mount as well (fallback)
    const controller = new AbortController();
    fetchAllForSlider(controller.signal).catch(() => {});
    return () => controller.abort();
  }, [API_BASE]);

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

  useEffect(() => {
    if (user) {
      setReviewName(user.name ?? "");
      setReviewEmail(user.email ?? "");
      setNeedLoginMessage("");
    }
  }, [user]);

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

  const filteredSimilar =
    Array.isArray(similar) && similar.length > 0
      ? similar.filter((p) => Number(p.id) !== Number(productId)).slice(0, 3)
      : [];

  const allReviews = Array.isArray(product?.reviews) ? product.reviews : [];
  const latestReviewId = allReviews.length
    ? allReviews[allReviews.length - 1]?.id
    : null;

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

  const reviewsCount =
    product?.reviews_count ??
    (Array.isArray(product?.reviews) ? product.reviews.length : 0);

  const tabs = [
    "Description",
    "Additional information",
    `Reviews (${reviewsCount})`,
  ];

  const viewsValue =
    product?.views ??
    product?.views_count ??
    product?.viewsCount ??
    product?.views_total ??
    product?.views_count_total ??
    0;

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      setNeedLoginMessage("Please login to submit a review");
      return;
    }
    setSubmittingReview(true);
    setReviewError(null);
    try {
      await getCsrf?.();
      await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
        credentials: "include",
      });

      const raw = (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || "";
      const xsrf = raw ? decodeURIComponent(raw) : "";

      const res = await fetch(`${API_BASE}/api/products/${productId}/reviews`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrf,
          "X-Requested-With": "XMLHttpRequest",
          Accept: "application/json",
        },
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment,
          name: reviewName,
          email: reviewEmail,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          await fetchUser?.();
          throw new Error("Unauthorized");
        }
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to submit review");
      }

      const json = await res.json().catch(() => null);

      let normalized = null;

      if (json) {
        if (json.product) {
          normalized = normalizeProduct(json.product);
          normalized.reviews = Array.isArray(json.product.reviews)
            ? json.product.reviews
            : Array.isArray(product?.reviews)
              ? product.reviews.slice()
              : [];
          normalized.reviews_count =
            json.product.reviews_count ??
            normalized.reviews?.length ??
            product?.reviews_count ??
            0;
          setProduct(normalized);
        } else if (json.review) {
          setProduct((prev) => {
            const prevReviews = Array.isArray(prev?.reviews)
              ? prev.reviews.slice()
              : [];
            const exists = prevReviews.some((r) => r.id === json.review.id);
            if (!exists) prevReviews.unshift(json.review);
            return {
              ...prev,
              reviews: prevReviews,
              reviews_count: (prev?.reviews_count || 0) + (exists ? 0 : 1),
            };
          });
        } else {
          setProduct((prev) => ({
            ...prev,
            reviews_count: (prev?.reviews_count || 0) + 1,
          }));
        }
      } else {
        setProduct((prev) => ({
          ...prev,
          reviews_count: (prev?.reviews_count || 0) + 1,
        }));
      }

      // refresh similar after review submit
      try {
        const catId = normalized?.category_id ?? product?.category_id;
        if (catId) {
          await fetchSimilar(catId).catch(() => {});
        }
      } catch (e) {
        // ignore
      }

      setReviewComment("");
      setReviewRating(5);
    } catch (err) {
      setReviewError(err.message || "Error");
    } finally {
      setSubmittingReview(false);
    }
  };

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
              slidesPerView={Math.min(
                4,
                Array.isArray(sliderItems) && sliderItems.length > 0
                  ? sliderItems.length
                  : Array.isArray(product.images)
                    ? product.images.length
                    : 1,
              )}
              centeredSlides={false}
              loop={
                Array.isArray(sliderItems) &&
                sliderItems.length >
                  Math.min(
                    4,
                    Array.isArray(sliderItems) && sliderItems.length > 0
                      ? sliderItems.length
                      : Array.isArray(product.images)
                        ? product.images.length
                        : 1,
                  )
              }
              autoplay={{ delay: 4000 }}
              spaceBetween={10}
              speed={600}
              touchRatio={1}
            >
              {(Array.isArray(sliderItems) && sliderItems.length > 0
                ? sliderItems
                : Array.isArray(product.images) && product.images.length > 0
                  ? product.images.map((img, idx) => ({
                      id: `img-${idx}`,
                      img,
                      img_url: product.img_url,
                      title: product.title,
                    }))
                  : [
                      {
                        id: product.id,
                        img: product.img,
                        img_url: product.img_url,
                        title: product.title,
                      },
                    ]
              ).map((item) => (
                <SwiperSlide key={item.id}>
                  <div
                    className="w-30 h-30 relative cursor-pointer"
                    onClick={() => {
                      if (item.id && String(item.id) !== String(productId)) {
                        navigate(`/products/${item.id}`);
                      }
                    }}
                  >
                    <img
                      src={safeSrc(item.img, item.img_url)}
                      alt={item.title ?? ""}
                      className="w-full h-full rounded-sm object-cover"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>

        <div className="w-272 flex justify-between items-center gap-x-12px">
          <div className="w-135 h-145 border-light p-1">
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

            <div className="flex items-center gap-x-3 mb-4">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <img
                    key={n}
                    src={
                      n <= Math.round(product.rating || 0)
                        ? "/images/star-filled.svg"
                        : "/images/star.svg"
                    }
                    alt="star"
                    className="w-4 h-4 mr-1"
                  />
                ))}
                <span className="text-[#707070] ml-2">{viewsValue} views</span>
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
          categories={tabs}
          activeCategory={activeCategory}
          onCategoryChange={(category) => setActiveCategory(category)}
          tabClassName="flex list-none gap-25 justify-start border-b border-[#D8D8D08]"
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

      {activeCategory.startsWith("Reviews") && (
        <div className="w-full mt-10 mb-21 text-[#707070]" id="reviews-content">
          <div className="w-full mt-24 flex justify-between text-[#707070]">
            <div className="w-[46%]">
              <h3 className="mb-8 text-xl">Reviews for {product.title}</h3>
              {Array.isArray(product.reviews) && product.reviews.length > 0 ? (
                <div className="space-y-6">
                  {(showAllReviews
                    ? product.reviews.slice().reverse()
                    : product.reviews.slice(-5).reverse()
                  ).map((r) => (
                    <div
                      key={r.id}
                      className={`w-full pb-4 border-b border-[#E5E7EB] ${r.id === latestReviewId ? "highlight-pulse" : ""}`}
                    >
                      <div className="star-layer" aria-hidden="true" />
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-x-3">
                          <strong className="text-lg">
                            {r.name ?? r.user?.name ?? "User"}
                          </strong>
                          <div className="text-sm text-[#707070]">
                            {new Date(r.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <img
                              key={n}
                              src={
                                n <= (r.rating || 0)
                                  ? "/images/star-filled.svg"
                                  : "/images/star.svg"
                              }
                              alt="star"
                              className="w-4 h-4 mr-1"
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-[#707070]">{r.comment}</p>
                    </div>
                  ))}
                  {product.reviews.length > 5 && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setShowAllReviews((v) => !v)}
                        className="text-md font-bold underline"
                      >
                        {showAllReviews
                          ? "Show less"
                          : `Show all reviews (${product.reviews.length})`}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[#707070]">No reviews yet.</div>
              )}
            </div>

            <div className="w-[46%]">
              <h3 className="mb-3 text-xl text-black">Add a Review</h3>
              <p className="mb-12 text-[13px]/[30px] text-[#707070]">
                Your email address will not be published. Required fields are
                marked *
              </p>
              {!user ? (
                <div className="p-6 border border-[#E5E7EB] rounded-sm">
                  <p className="mb-4 text-[#707070]">
                    Please log in to submit a review for this product.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-[30%]">
                      <Button
                        type="button"
                        onClick={() => navigate("/account")}
                        className="w-full"
                        name="Log in"
                      />
                    </div>
                    <span className="text-sm">Going to the account page </span>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={submitReview}
                  className="text-sm text-[#707070]"
                >
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={4}
                    className="w-full mb-4 border-b border-[#707070]"
                    placeholder="Your review"
                    required
                  />
                  <div className="w-full mb-4">
                    <input
                      type="text"
                      name="name"
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      className="w-full mb-4 pb-4 border-b border-[#707070]"
                      placeholder="Enter your name*"
                      required
                    />
                  </div>
                  <div className="w-full mb-4">
                    <input
                      type="email"
                      name="email"
                      value={reviewEmail}
                      onChange={(e) => setReviewEmail(e.target.value)}
                      className="w-full mb-4 pb-4 border-b border-[#707070]"
                      placeholder="Enter your Email**"
                      required
                    />
                  </div>
                  <div className="w-full flex gap-x-2 mb-4">
                    <input type="checkbox" id="save" className="w-4 h-4" />
                    <label htmlFor="save">
                      Save my name, email, and website in this browser for the
                      next time I comment
                    </label>
                  </div>
                  <p className="mb-3">Your Rating*</p>
                  <div className="mb-6">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        className={`mr-3 ${reviewRating >= n ? "text-yellow-500" : "text-gray-400"} text-2xl`}
                        aria-label={`Rate ${n}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  {reviewError && (
                    <div className="text-red-500 mb-2">{reviewError}</div>
                  )}
                  <div className="w-[22%]">
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className={`w-full h-12 font-semibold rounded-sm ${canSubmit ? "bg-black text-white hover:bg-gray-900 cursor-pointer" : "bg-gray-200 text-gray-400 cursor-default"}`}
                    >
                      {submittingReview ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </form>
              )}
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
        ) : filteredSimilar.length === 0 ? (
          <div className="text-gray-500">No similar items</div>
        ) : (
          filteredSimilar.map((p) => (
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
