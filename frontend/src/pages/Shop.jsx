import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "../components/ui/Card/Card.jsx";
import { Select } from "../components/ui/Select/Select.jsx";
import { Search } from "../components/ui/Search/Search.jsx";
import { Trackbar } from "../components/ui/Trackbar/Trackbar.jsx";
import { Toggle } from "../components/ui/Toggle/Toggle.jsx";
// import { data } from "../../data.js";
// import { categories } from "../../categories.js";
import { useDebounce } from "../hooks/useDebounce.js";

const SHOW_ALL_TERMS = ["all categories", "all", "все категории", "все"];

/**
 * Shop — страница каталога.
 *
 * Локальный поиск по CATEGORIES: находим категории по title,
 * затем показываем товары с соответствующим category_id.
 */
export const Shop = () => {
  const navigate = useNavigate();
  // локальный state для поиска (перенесли из контекста)
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const [searchParams, setSearchParams] = useSearchParams();

  // debug wrapper for setSearchParams — temporary for tracing
  const debugSetSearchParams = (params, options) => {
    // простой лог — без лишних try/catch
    console.log(
      "[DEBUG] setSearchParams called. params:",
      params,
      "options:",
      options,
      "currentURL:",
      window.location.href,
    );
    return setSearchParams(params, options);
  };

  const initialCategory = searchParams.get("category_id") || "";
  const initialSort = searchParams.get("sort") || "";
  const [selected, setSelected] = useState(initialCategory);

  const [sort, setSort] = useState(initialSort);
  const [products, setProducts] = useState([]); // данные с бекэнда
  const [categories, setCategories] = useState([]); // данные с бекэнда
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const normalized = (s) => (s || "").toLowerCase().trim();

  // загрузка категорий — безопасный вариант с AbortController и нормализацией ответа
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch("http://shopper.local/api/categories", {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        // DEBUG: временно раскомментируйте при необходимости
        // console.log("categories response:", json);
        const items = Array.isArray(json)
          ? json
          : (json?.data ?? json?.items ?? []);
        setCategories(items);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("fetch error categories", err);
        setCategories([]);
      }
    };
    load();
    return () => controller.abort();
  }, []);

  // функция для загрузки продуктов с учетом фильтров и сортировки
  // теперь с нормализацией ответа и delayed loading spinner (250ms)
  const fetchProducts = async () => {
    setError(null);
    let loadingTimer = null;
    const controller = new AbortController();
    try {
      // покажем спиннер только если запрос длится >250ms
      loadingTimer = setTimeout(() => setLoading(true), 250);

      const params = new URLSearchParams();
      if (selected) params.append("category_id", selected);
      if (sort) params.append("sort", sort);
      // NOTE: не передаём debouncedQuery как 'search' параметр, чтобы backend не фильтровал по title продукта
      const url =
        "http://shopper.local/api/products" +
        (params.toString() ? `?${params.toString()}` : "");
      console.log("fetchProducts ->", url);

      const res = await fetch(url, {
        credentials: "include",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = Array.isArray(json)
        ? json
        : (json?.data ?? json?.items ?? []);
      setProducts(items);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("fetch error products", err);
      setError("Failed to load products");
      // Не очищаем products при ошибке чтобы избежать мерцания UI
      // setProducts([]);
    } finally {
      clearTimeout(loadingTimer);
      setLoading(false);
      // abort controller not strictly necessary here, but left for symmetry
      try {
        controller.abort();
      } catch (e) {
        /* ignore */
      }
    }
  };

  // рефетч при изменении фильтров/сортировки/поиска (debouncedQuery влияет на client-side фильтрацию)
  useEffect(() => {
    console.log(
      "[Shop] fetch effect triggered, selected=",
      selected,
      "sort=",
      sort,
      "q=",
      debouncedQuery,
    );
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, sort, debouncedQuery]);

  const matchingCategoryIds = useMemo(() => {
    const q = normalized(debouncedQuery);
    if (!q) return null;
    if (SHOW_ALL_TERMS.includes(q)) return null;
    // защитимся на случай, если categories не массив
    const cats = Array.isArray(categories) ? categories : [];
    return cats
      .filter((c) => (c.title || "").toLowerCase().includes(q))
      .map((c) => c.id);
  }, [debouncedQuery, categories]);

  const filtered = useMemo(() => {
    // если backend вернул данные — используем их
    const source = Array.isArray(products) ? products : [];
    if (!matchingCategoryIds) return source;
    return source.filter((item) =>
      matchingCategoryIds.includes(item.category_id),
    );
  }, [matchingCategoryIds, products]);

  const categoryOptions = (Array.isArray(categories) ? categories : []).map(
    (c) => ({
      value: String(c.id),
      label: c.title,
    }),
  );

  const sortOptions = [
    { value: "", label: "Sort by" },
    { value: "newest", label: "Newest" },
  ];

  const onSelectCategory = (v) => {
    if (!v) {
      console.log("[Shop] ignored empty category select");
      return;
    }
    setSelected(v);
    const params = {};
    if (v) params.category_id = v;
    if (sort) params.sort = sort;
    // не сохраняем query в URL
    debugSetSearchParams(params);
  };

  const onChangeSort = (v) => {
    setSort(v);
    const params = {};
    if (selected) params.category_id = selected;
    if (v) params.sort = v;
    // не сохраняем query в URL
    debugSetSearchParams(params);
  };

  useEffect(() => {
    console.log("[Shop] searchParams changed:", searchParams.toString());
    const c = searchParams.get("category_id") || "";
    if (c !== selected) setSelected(c);
    const s = searchParams.get("sort") || "";
    if (s !== sort) setSort(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  return (
    <>
      <div className="mt-31 pt-24 border-t" style={{ border: "#D8D8D8" }}>
        <h2 className="text-4xl font-medium mb-10">Shop The Latest</h2>
        <div className="flex">
          <aside className="w-65 mr-6">
            <div className="mb-4">
              <Search
                value={query}
                onChange={setQuery}
                onSubmit={(v) => setQuery(v)}
                onCancel={() => setQuery("")}
                wrapperClassName="w-full"
                inputClassName="w-full"
                placeholder="Search categories (e.g. earrings)"
              />
            </div>

            <Select
              placeholder="Select by category"
              options={categoryOptions}
              value={selected}
              onChange={(v) => onSelectCategory(v)}
              wrapperClassName="mb-4"
              className="w-full py-4 px-3 border border-[#D8D8D8] appearance-none rounded-sm cursor-pointer pr-10"
              arrowClassName="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
            />
            <Select
              placeholder="Sort by"
              options={sortOptions}
              value={sort}
              onChange={(v) => onChangeSort(v)}
              wrapperClassName="mb-4"
              className="w-full py-4 px-3 border border-[#D8D8D8] appearance-none rounded-sm cursor-pointer pr-10"
              arrowClassName="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
            />
            <Trackbar />
            <Toggle nameToggle={"On sale"} />
            <Toggle nameToggle={"On stock"} />
          </aside>

          <div className="flex-1 flex flex-wrap justify-start gap-8 mb-62">
            {loading ? (
              <div className="w-full text-center py-16 text-gray-500">
                Loading...
              </div>
            ) : error ? (
              <div className="w-full text-center py-16 text-red-500">
                {error}
              </div>
            ) : filtered && filtered.length > 0 ? (
              filtered.map((product) => (
                <Card
                  details={product}
                  key={product?.id}
                  onOpenDetails={() => {
                    console.log(
                      "[Navigate] go to product",
                      product?.id,
                      "from",
                      window.location.href,
                    );
                    navigate(`/products/${product?.id}`);
                  }}
                  size={{ width: 300, height: 392, heightImg: 300 }}
                />
              ))
            ) : (
              <div className="w-full text-center py-16 text-gray-500">
                No category found
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
