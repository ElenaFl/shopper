import React, { useState, useEffect, Suspense } from "react";
import { NavLink, useNavigate } from "react-router-dom";
// const SwiperComponent = lazy(
//   () => import("../components/ui/SwiperComponent/SwiperComponent.jsx"),
// );
import SwiperComponent from "../components/ui/SwiperComponent/SwiperComponent.jsx";
import { Card } from "../components/ui/Card/Card.jsx";
import { Search } from "../components/ui/Search/Search.jsx";
import { useDebounce } from "../hooks/useDebounce.js";
import { useAuth } from "../context/auth/useAuth";

const showAllTerms = ["all categories", "all", "все категории", "все"];

export const Home = () => {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 750);

  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 550);
    return () => clearTimeout(t);
  }, []);

  const [allShown, setAllShown] = useState(false); // whether we've expanded to all
  const navigate = useNavigate();

  // fetch for home (top 12 by popularity) or search
  useEffect(() => {
    const controller = new AbortController();

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        const q = (debouncedQuery || "").toLowerCase().trim();
        const isShowAll = q && showAllTerms.includes(q);

        if (!q || isShowAll) {
          // default home: top 12 by popularity
          params.append("per_page", "12");
          params.append("sort", "popular");
        } else {
          params.append("search", debouncedQuery);
          // keep default pagination for search (backend default)
        }

        const url = `http://shopper.local/api/products${params.toString() ? `?${params.toString()}` : ""}`;

        const res = await fetch(url, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Network response was not ok");

        const json = await res.json();
        const list = Array.isArray(json)
          ? json
          : json && Array.isArray(json.data)
            ? json.data
            : (json.data ?? []);
        setProducts(list);
        setAllShown(false); // reset expand when query changes
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("fetch error products", err);
          setError("Failed to load products");
          setProducts([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    return () => controller.abort();
  }, [debouncedQuery]);

  // handler to show all products in-place
  const handleViewAll = async () => {
    if (allShown) {
      // collapse back to top 12: re-fetch default home list (simple)
      setAllShown(false);
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.append("per_page", "12");
        params.append("sort", "popular");
        const res = await fetch(
          `http://shopper.local/api/products?${params.toString()}`,
          { credentials: "include" },
        );
        if (!res.ok) throw new Error("Network response was not ok");
        const json = await res.json();
        const list = Array.isArray(json)
          ? json
          : json && Array.isArray(json.data)
            ? json.data
            : (json.data ?? []);
        setProducts(list);
      } catch (err) {
        console.error("collapse error", err);
        setError("Failed to load products");
      } finally {
        setLoading(false);
      }
      return;
    }

    // expand: load all popular products (no per_page)
    setError(null);
    try {
      // use sort=popular, no per_page to get all (backend default)
      const res = await fetch(
        "http://shopper.local/api/products?sort=popular",
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Network response was not ok");
      const json = await res.json();
      const list = Array.isArray(json)
        ? json
        : json && Array.isArray(json.data)
          ? json.data
          : (json.data ?? []);
      // remove duplicates by id if somehow overlap
      const ids = new Set(products.map((p) => p.id));
      const merged = [...products];
      for (const item of list) {
        if (!ids.has(item.id)) {
          merged.push(item);
          ids.add(item.id);
        }
      }
      // if we started from top12, merged will be full set
      setProducts(merged);
      setAllShown(true);
    } catch (err) {
      console.error("load all error", err);
      setError("Failed to load all products");
    }
  };

  return (
    <>
      <Suspense
        fallback={
          <div className="w-full h-48 bg-gray-100" aria-hidden="true" />
        }
      >
        <SwiperComponent />
      </Suspense>

      <div className="mt-16 mb-10 w-full flex justify-between items-center">
        <h2 className="text-3xl font-medium">Shop The Latest</h2>
        <button
          type="button"
          onClick={handleViewAll}
          className="btn text-xl font-medium text-[#A18A68] hover:text-[#070707]"
        >
          {allShown ? "Show Less" : "View All"}
        </button>
      </div>

      <div className="mt-6 mb-6">
        <Search
          value={query}
          onChange={setQuery}
          onSubmit={(v) => setQuery(v)}
          onCancel={() => setQuery("")}
          wrapperClassName="w-full"
          inputClassName="w-full"
          placeholder="Search products or categories"
        />
      </div>

      <div className="mt-10 mb-62.5 flex justify-start flex-wrap gap-13">
        {loading ? (
          <div className="w-full text-center py-16 text-gray-500">
            Loading...
          </div>
        ) : error ? (
          <div className="w-full text-center py-16 text-red-500">{error}</div>
        ) : products && products.length > 0 ? (
          products.map((product, i) => (
            <div
              key={product.id}
              className={`card-wrapper ${mounted ? "show" : ""}`}
              style={{ transitionDelay: `${Math.min(i * 80)}ms` }}
            >
              <Card
                details={product}
                user={user}
                onOpenDetails={() => navigate(`/products/${product.id}`)}
                size={{ width: 380, height: 472, heightImg: 380 }}
              />
            </div>
          ))
        ) : (
          <div className="w-full text-center py-16 text-gray-500">
            No products found
          </div>
        )}
      </div>
    </>
  );
};

export default Home;
