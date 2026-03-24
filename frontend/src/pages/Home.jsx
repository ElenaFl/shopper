import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { SwiperComponent } from "../components/ui/SwiperComponent/SwiperComponent.jsx";
import { Card } from "../components/ui/Card/Card.jsx";
import { Search } from "../components/ui/Search/Search.jsx";
//статический массив продуктов из data.js
// import { data } from "../../data.js";
//статический массив категорий из categories.js
// import { categories } from "../../categories.js";
import { useDebounce } from "../hooks/useDebounce.js";

// массив строк, при вводе которых в поисковую строку отображаются все продукты
const showAllTerms = ["all categories", "all", "все категории", "все"];

/**
 * Страница Home.
 *
 * Поисковая строка  отправляет запрос на бэкенд (search), фильтрация по категориям/title на бэке.
 */

export const Home = () => {
  // локальный state для поиска
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 750);

  // состояния
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 550);
    return () => clearTimeout(t);
  }, []);

  const navigate = useNavigate();

  // загрузка продуктов — учитывает debouncedQuery и запрашивает бэкенд с search
  useEffect(() => {
    const abortController = new AbortController();
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        // если введён поисковый запрос и он не является "show all"
        const q = (debouncedQuery || "").toLowerCase().trim();
        if (q && !showAllTerms.includes(q)) {
          params.append("search", debouncedQuery);
        }

        const url =
          "http://shopper.local/api/products" +
          (params.toString() ? `?${params.toString()}` : "");
        const res = await fetch(url, {
          credentials: "include",
          signal: abortController.signal,
        });
        if (!res.ok) throw new Error("Network response was not ok");
        const json = await res.json();
        if (Array.isArray(json)) {
          setProducts(json);
        } else if (json && Array.isArray(json.data)) {
          setProducts(json.data);
        } else {
          setProducts(json.data || []);
        }
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
    return () => {
      abortController.abort();
    };
  }, [debouncedQuery]);

  return (
    <>
      <SwiperComponent />

      <div className="mt-16 mb-10 w-full flex justify-between items-center">
        <h2 className="text-3xl font-medium">Shop The Latest</h2>
        <NavLink
          to="/shop"
          className="btn text-xl font-medium text-[#A18A68] hover:text-[#070707]"
        >
          View All
        </NavLink>
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
              style={{
                transitionDelay: `${Math.min(i * 80)}ms`,
              }}
            >
              <Card
                details={product}
                onOpenDetails={() => navigate(`/products/${product.id}`)}
                size={{ width: 380, height: 472, heightImg: 380 }}
              />
            </div>
          ))
        ) : (
          <div className="w-full текст-center py-16 text-gray-500">
            No products found
          </div>
        )}
      </div>
    </>
  );
};
