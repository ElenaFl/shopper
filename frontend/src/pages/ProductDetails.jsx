import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Counter } from "../components/ui/Counter/Counter.jsx";
import { Tabs } from "../components/ui/Tabs/Tabs.jsx";
import { useSavedItems } from "../hooks/useSavedItems.js";

/*
  Lazy-load Swiper:
  - dynamically import 'swiper/react' and 'swiper/modules'
  - dynamically import CSS ('swiper/css', 'swiper/css/pagination')
  - until loaded, render images list fallback
*/
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

  const [categoryTitle, setCategoryTitle] = useState("");
  const [activeCategory, setActiveCategory] = useState("Description");

  const [showAllReviews, setShowAllReviews] = useState(false);

  // derive from cart
  const existing = cart.find((i) => Number(i.id) === productId);
  const derivedCount = existing ? Number(existing.quantity) : 1;
  const [local, setLocal] = useState(() => ({
    count: derivedCount,
    isAdded: Boolean(existing),
  }));

  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewName, setReviewName] = useState("");
  const [reviewEmail, setReviewEmail] = useState("");

  const [loadingSliderItems, setLoadingSliderItems] = useState(false);
  const [rating, setRating] = useState(null);

  const [needLoginMessage, setNeedLoginMessage] = useState("");

  const canSubmit = Boolean(reviewComment && reviewRating && !submittingReview);

  // One-time highlight storage (persisted so it won't re-highlight)
  const HIGHLIGHTED_REVIEWS_KEY = "highlighted_reviews_v1";
  const [highlightedReviews, setHighlightedReviews] = useState(() => {
    try {
      const raw = localStorage.getItem(HIGHLIGHTED_REVIEWS_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  // transient id of review that was just created — used to show sparkle once
  const [recentlyCreatedReviewId, setRecentlyCreatedReviewId] = useState(null);

  const { items: savedItems = [], save, remove } = useSavedItems();

  const isSaved = React.useMemo(() => {
    if (!productId) return false;
    return (savedItems || []).some(
      (s) => String(s.product_id ?? s.product?.id) === String(productId),
    );
  }, [savedItems, productId]);

  const [savingToggle, setSavingToggle] = React.useState(false);

  function persistHighlightedReviews(setObj) {
    try {
      localStorage.setItem(
        HIGHLIGHTED_REVIEWS_KEY,
        JSON.stringify(Array.from(setObj)),
      );
    } catch (e) {
      // ignore storage errors
    }
  }

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

    // IMPORTANT: do not compute final_price or discount here — server is authoritative.
    return { ...p, colours, weight, description };
  };

  // Use Intl.NumberFormat when possible
  function formatMoney(val, currencyLabel) {
    if (val == null) return "";
    const n = Number(val);
    if (!Number.isFinite(n)) return String(val);
    // If currency looks like an ISO code (3 letters), prefer Intl currency formatting
    if (
      currencyLabel &&
      typeof currencyLabel === "string" &&
      currencyLabel.length === 3
    ) {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: currencyLabel,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(n);
      } catch (e) {
        // fallback to numeric format
      }
    }
    return n.toFixed(2) + (currencyLabel ? " " + currencyLabel : "");
  }

  // Simplified price display: trust server final_price first, then discount.price_after, then local fallback (display only)
  function getPriceDisplay(product) {
    const price = Number(product?.price ?? 0);
    const serverFinal =
      product?.final_price != null ? Number(product.final_price) : null;

    // discount object from server (or null)
    const discount = product?.discount ?? null;

    // determine priceAfter to use for UI:
    let priceAfter = null;
    if (serverFinal != null && Number.isFinite(serverFinal)) {
      priceAfter = serverFinal;
    } else if (
      discount &&
      discount.price_after != null &&
      Number.isFinite(Number(discount.price_after))
    ) {
      priceAfter = Number(discount.price_after);
    } else if (
      discount &&
      discount.type === "percent" &&
      discount.value != null &&
      !Number.isNaN(Number(discount.value))
    ) {
      // non-authoritative client-side computation only for display
      const pct = Number(discount.value) / 100;
      priceAfter = Math.max(0, Number((price * (1 - pct)).toFixed(2)));
    } else if (
      discount &&
      discount.type === "fixed" &&
      discount.value != null &&
      !Number.isNaN(Number(discount.value))
    ) {
      priceAfter = Math.max(
        0,
        Number((price - Number(discount.value)).toFixed(2)),
      );
    } else {
      priceAfter = price;
    }

    const hasDiscount = Number(price) > Number(priceAfter);

    // displayPercent: prefer server-provided percent value if present
    let displayPercent = null;
    if (discount && discount.type === "percent" && discount.value != null) {
      displayPercent = `-${Math.round(Number(discount.value))}%`;
    } else if (hasDiscount && price > 0) {
      displayPercent = `-${Math.round(((price - priceAfter) / price) * 100)}%`;
    }

    return {
      original: price,
      final: priceAfter,
      hasDiscount,
      displayPercent,
      discount,
    };
  }

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
        // distinguish common cases
        if (res.status === 404) {
          setProductError(`Product not found (404)`);
        } else if (res.status === 401) {
          // unauthenticated — don't treat as fatal for product loading
          console.warn("loadProduct: unauthenticated when fetching product");
          setProductError(null);
        } else {
          setProductError(
            `Failed to load product: ${res.status} ${res.statusText} ${text || ""}`,
          );
        }
        return;
      }

      const json = await res.json().catch(() => null);
      const payload = json && json.data ? json.data : json;
      const normalized = normalizeProduct(payload);

      // debug log (remove in production)
      console.log("loadProduct: fetched payload =", payload);

      // clear previous product error now that we have fresh data
      setProductError(null);

      // preserve server-provided final_price and discount; do not override
      if (payload && payload.final_price != null) {
        normalized.final_price = payload.final_price;
      }
      if (payload && payload.discount != null) {
        normalized.discount = payload.discount;
      }

      setProduct(normalized);

      // optional: set rating safely if fields exist
      if (normalized.user_rating) setRating(Number(normalized.user_rating));
      else if (normalized.rating) setRating(Math.round(normalized.rating));

      if (normalized && normalized.category && normalized.category.title)
        setCategoryTitle(normalized.category.title);
      else if (payload && payload.category_id) setCategoryTitle("");

      // fetch related data but do not block the main flow
      fetchAllForSlider().catch(() => {});
      try {
        const catId =
          normalized?.category_id ??
          payload?.category_id ??
          normalized?.category?.id;
        if (catId) fetchSimilar(catId).catch(() => {});
      } catch (e) {
        // ignore
      }
    } catch (err) {
      if (err && err.name === "AbortError") {
        // aborted by cleanup — ignore
        return;
      }
      console.error("loadProduct error:", err);
      setProductError("Failed to load product (network error)");
    } finally {
      setLoadingProduct(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadProduct(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.category_id]);

  useEffect(() => {
    // load slider items on mount as well (fallback)
    const controller = new AbortController();
    fetchAllForSlider(controller.signal).catch(() => {});
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!recentlyCreatedReviewId) return;
    const t = setTimeout(() => {
      setHighlightedReviews((prev) => {
        const next = new Set(prev);
        next.add(String(recentlyCreatedReviewId));
        persistHighlightedReviews(next);
        return next;
      });
      setRecentlyCreatedReviewId(null);
    }, 1600); // a bit shorter than CSS animation to ensure user sees it
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentlyCreatedReviewId]);

  useEffect(() => {
    try {
      persistHighlightedReviews(highlightedReviews);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedReviews]);

  useEffect(() => {
    // cleanup: when productId changes (navigate to other product), we reset recentlyCreatedReviewId
    return () => {
      setRecentlyCreatedReviewId(null);
    };
  }, [productId]);

  // -----------------------
  // Lazy Swiper loading state
  // -----------------------
  const [swiperLoaded, setSwiperLoaded] = useState(false);
  const [SwiperComponents, setSwiperComponents] = useState({
    Swiper: null,
    SwiperSlide: null,
    modules: [],
  });

  useEffect(() => {
    // load Swiper only on this product page (deferred)
    let mounted = true;
    // we only start loading Swiper when the component is mounted and product is available
    // you can change condition to e.g. when slider visible or on user interaction
    if (!mounted) return;
    // Start dynamic import but don't block rendering
    (async () => {
      try {
        const mod = await import("swiper/react");
        // load CSS separately
        // dynamic import of CSS works with Vite and will create a separate CSS request
        await Promise.all([
          import("swiper/css"),
          import("swiper/css/pagination"),
          import("swiper/modules"),
        ]);
        const modulesMod = await import("swiper/modules");
        const Pagination = modulesMod?.Pagination;
        const Autoplay = modulesMod?.Autoplay;
        if (mounted) {
          setSwiperComponents({
            Swiper: mod?.Swiper ?? null,
            SwiperSlide: mod?.SwiperSlide ?? null,
            modules: [Pagination, Autoplay].filter(Boolean),
          });
          setSwiperLoaded(true);
        }
      } catch (err) {
        // fail silently — keep fallback UI
        console.warn("Swiper dynamic import failed", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []); // load once on mount

  // -----------------------
  // add/update processing
  // -----------------------
  const [isProcessingAdd, setIsProcessingAdd] = useState(false);

  const handleCounterChange = (arg) => {
    // support both signature: onChange(newCount) or onChange(updater)
    let newCount;
    if (typeof arg === "function") {
      newCount = arg(local.count);
    } else {
      newCount = Number(arg) || 0;
    }
    setLocal((prev) => ({ ...prev, count: newCount }));
    if (newCount <= 0) {
      updateQuantity(productId, 0);
      setLocal((prev) => ({ ...prev, isAdded: false }));
    }
  };

  const handleAddOrUpdate = async () => {
    if (!product) return;
    const qty = Number(local.count) > 0 ? Number(local.count) : 1;
    setIsProcessingAdd(true);
    try {
      if (local.isAdded) {
        // update existing quantity
        await updateQuantity(productId, qty);
      } else {
        // add new item with final price
        const itemPrice = Number(priceInfo?.final ?? product.price ?? 0);
        await addToCart({
          id: Number(product.id ?? product.product_id),
          title: product.title ?? product.name ?? "",
          price: itemPrice,
          img: product.img ?? product.img_url ?? null,
          quantity: qty,
          sku: product.sku ?? product.SKU ?? null,
        });
        setLocal((prev) => ({ ...prev, isAdded: true }));
      }
    } catch (e) {
      console.error("add/update cart error", e);
    } finally {
      setIsProcessingAdd(false);
    }
  };

  const addButtonClassBase =
    "w-90 h-13 font-semibold border rounded-sm flex justify-center items-center text-center";
  const addButtonClass = `${addButtonClassBase} bg-black text-white hover:bg-black hover:text-white`;

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

    {
      needLoginMessage && (
        <div className="mt-3 text-red-500">{needLoginMessage}</div>
      );
    }

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
      let createdId = null;

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

          if (
            Array.isArray(json.product.reviews) &&
            json.product.reviews.length
          ) {
            const prevIds = new Set(
              (product?.reviews ?? []).map((x) => String(x.id)),
            );
            const found = json.product.reviews.find(
              (rv) => !prevIds.has(String(rv.id)),
            );
            createdId = String(found?.id ?? json.product.reviews[0]?.id ?? "");
          }
        } else if (json.review) {
          createdId = String(json.review.id ?? "");
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

      // Set recentlyCreatedReviewId ONLY for 5★ reviews
      if (createdId && Number(reviewRating || 0) === 5) {
        setRecentlyCreatedReviewId(String(createdId));
        console.log(
          "DEBUG submitReview: setRecentlyCreatedReviewId (5★)",
          createdId,
        );
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
      console.error("submitReview error", err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const priceInfo = getPriceDisplay(product);

  return (
    <div className="mt-60 mb-62">
      <div className="flex justify-between items-center gap-x-9px mb-10">
        <div className="w-30">
          <div className="relative">
            {/* Render Swiper when loaded; otherwise simple vertical list / placeholder */}
            {swiperLoaded &&
            SwiperComponents.Swiper &&
            SwiperComponents.SwiperSlide ? (
              <SwiperComponents.Swiper
                className="w-30 h-150 cursor-pointer absolute top-2 left-0"
                modules={SwiperComponents.modules}
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
                  <SwiperComponents.SwiperSlide key={item.id}>
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
                  </SwiperComponents.SwiperSlide>
                ))}
              </SwiperComponents.Swiper>
            ) : (
              /* Fallback: simple vertical stack of thumbnails (no JS heavy lib) */
              <div className="absolute top-2 left-0">
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
                )
                  .slice(0, 4)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="w-30 h-30 mb-2 cursor-pointer"
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
                  ))}
              </div>
            )}
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
              {priceInfo.hasDiscount ? (
                <>
                  {" "}
                  <span className="text-[#A0A0A0] line-through mr-2">
                    {" "}
                    {formatMoney(priceInfo.original, product.currency)}{" "}
                  </span>{" "}
                  <span className="text-black font-semibold">
                    {" "}
                    <span style={{ color: "red", fontWeight: 700 }}>
                      {formatMoney(priceInfo.final, product.currency)}{" "}
                    </span>
                  </span>{" "}
                  {priceInfo.displayPercent && (
                    <span className="ml-3 text-green-700 text-[#A18A68]">
                      {" "}
                      {priceInfo.displayPercent}{" "}
                    </span>
                  )}{" "}
                </>
              ) : (
                <span className="text-black font-semibold">
                  {" "}
                  {formatMoney(priceInfo.final, product.currency)}{" "}
                </span>
              )}
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
                onClick={handleAddOrUpdate}
                disabled={isProcessingAdd}
                className={
                  addButtonClass +
                  (isProcessingAdd ? " opacity-50 cursor-not-allowed" : "")
                }
              >
                {isProcessingAdd ? "Processing..." : "TO CART"}
              </button>
            </div>

            <div className="w-60 h-4.5 mb-9 flex justify-between items-center ">
              <button
                type="button"
                onClick={async () => {
                  if (!productId || !product) return;
                  setSavingToggle(true);
                  try {
                    if (isSaved) {
                      const entry = (savedItems || []).find(
                        (s) =>
                          String(s.product_id ?? s.product?.id) ===
                          String(productId),
                      );
                      await remove({ savedId: entry?.id ?? null, productId });
                    } else {
                      await save(productId, product);
                    }
                  } catch (err) {
                    console.error("toggle save error", err);
                  } finally {
                    setSavingToggle(false);
                  }
                }}
                aria-pressed={isSaved}
                disabled={savingToggle}
                className="cursor-pointer"
              >
                <img
                  src={isSaved ? "/images/heard-fill.svg" : "/images/heart.svg"}
                  alt={isSaved ? "Unsave" : "Save"}
                />{" "}
              </button>
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
                  ).map((r) => {
                    const isFiveStar = Number(r.rating || 0) === 5;
                    const isAlreadyHighlighted = highlightedReviews.has(
                      String(r.id),
                    );
                    const isGold =
                      isFiveStar &&
                      !isAlreadyHighlighted &&
                      String(r.id) === String(recentlyCreatedReviewId);

                    return (
                      <div
                        key={r.id}
                        className="w-full pb-4 border-b border-[#E5E7EB]"
                      >
                        {isGold && (
                          <div className="highlight-pulse" aria-hidden="true" />
                        )}
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
                        {isGold && (
                          <div
                            className="highlight-pulse highlight-pulse--bottom"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    );
                  })}
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
                      {needLoginMessage && (
                        <div className="mt-3 text-red-500">
                          {needLoginMessage}
                        </div>
                      )}
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

export default ProductDetails;
