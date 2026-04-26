import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "../components/ui/Card/Card.jsx";
import { Select } from "../components/ui/Select/Select.jsx";
import { Search } from "../components/ui/Search/Search.jsx";
import { Trackbar } from "../components/ui/Trackbar/Trackbar.jsx";
import { Toggle } from "../components/ui/Toggle/Toggle.jsx";
import { Pagination } from "../components/ui/Pagination/Pagination.jsx";
import { useDebounce } from "../hooks/useDebounce.js";

/**
 *
 * Shop  - страница каталога товаров: поиск, фильтрация, сортировка, фильтр по цене/скидкам/наличию, категория, постраничная навигация и отображение сетки карточек товаров.
 * Управляет URL-параметрами (search params) для сохранения состояния фильтров в адресной строке и поддерживает навигацию назад/вперёд.
 *
 * Ключевые состояния (useState / useEffect):
 *
 * query: контролируемый ввод поиска; debouncedQuery — задержанное значение (300ms).
 * selected: выбранная категория (category_id) ("" означает все).
 * sort: сортировка (например, price_asc / price_desc).
 * priceMax: максимальная цена (с дебаунсом debouncedPriceMax).
 * onlyOnSale, onlyInStock: булевы фильтры.
 * page: текущая страница пагинации (PER_PAGE = 6).
 * products: ответ от API — либо массив, либо paginator { data, meta }.
 * categories: список категорий для селекта.
 * loading, error: состояния загрузки/ошибки. *
 */

export const Shop = () => {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const [searchParams, setSearchParams] = useSearchParams();
  const debugSetSearchParams = (params, options) => {
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
  const initialPriceMax = Number(searchParams.get("price_max") || 1000);
  const initialOnlyOnSale = searchParams.get("on_sale") ? true : false;
  const initialPage = Number(searchParams.get("page") || 1);

  const [selected, setSelected] = useState(initialCategory);
  const [sort, setSort] = useState(initialSort);
  const [priceMax, setPriceMax] = useState(initialPriceMax);
  const [onlyOnSale, setOnlyOnSale] = useState(initialOnlyOnSale);
  const debouncedPriceMax = useDebounce(priceMax, 400);
  const [onlyInStock, setOnlyInStock] = useState(false);

  const [page, setPage] = useState(initialPage);
  const PER_PAGE = 6;

  const [products, setProducts] = useState(null); // can be paginator or array
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const applyParams = (params) => {
    debugSetSearchParams(params);
    if (params.category_id && params.category_id !== "all")
      setSelected(String(params.category_id));
    else setSelected("");
    setSort(params.sort || "");
    if (params.price_max != null) {
      const pm = Number(params.price_max);
      if (!Number.isNaN(pm)) setPriceMax(pm);
    }
    if (params.on_sale != null) {
      setOnlyOnSale(
        params.on_sale === "1" ||
          params.on_sale === "true" ||
          params.on_sale === true,
      );
    } else {
      setOnlyOnSale(false);
    }
    if (params.page != null) {
      const p = Number(params.page);
      if (!Number.isNaN(p) && p > 0) setPage(p);
    } else {
      setPage(1);
    }
  };

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

  const fetchProducts = async () => {
    setError(null);
    let loadingTimer = null;
    const controller = new AbortController();
    try {
      loadingTimer = setTimeout(() => setLoading(true), 250);

      const params = new URLSearchParams();
      params.append("per_page", String(PER_PAGE));
      if (page && Number(page) > 1) params.append("page", String(page));
      if (selected) params.append("category_id", selected);
      if (sort) params.append("sort", sort);
      const q = (debouncedQuery || "").trim();
      if (q !== "") params.append("search", q);
      if (!Number.isNaN(debouncedPriceMax) && debouncedPriceMax > 0)
        params.append("price_max", String(debouncedPriceMax));
      // add on_sale param when controlled toggle is true
      if (onlyOnSale) params.append("on_sale", "1");

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
      const serverMeta =
        json?.meta ??
        (json && json.current_page
          ? {
              current_page: json.current_page,
              last_page: json.last_page,
              per_page: json.per_page,
              total: json.total,
            }
          : null);

      if (
        serverMeta &&
        serverMeta.current_page &&
        serverMeta.last_page &&
        serverMeta.current_page > serverMeta.last_page
      ) {
        setPage(1);
        return;
      }
      if (json && Array.isArray(json.data)) {
        setProducts(json);
      } else if (Array.isArray(json)) {
        setProducts({
          data: json,
          meta: {
            current_page: 1,
            last_page: 1,
            per_page: PER_PAGE,
            total: json.length,
          },
        });
      } else {
        const items = json?.data ?? json?.items ?? [];
        setProducts(
          Array.isArray(items)
            ? {
                data: items,
                meta: {
                  current_page: 1,
                  last_page: 1,
                  per_page: PER_PAGE,
                  total: items.length,
                },
              }
            : items,
        );
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      setError("Failed to load products");
    } finally {
      clearTimeout(loadingTimer);
      setLoading(false);
      try {
        controller.abort();
      } catch {}
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, sort, debouncedQuery, debouncedPriceMax, onlyOnSale, page]);

  const categoryOptions = [
    { value: "all", label: "Sort by category" },
    ...(Array.isArray(categories)
      ? categories.map((c) => ({ value: String(c.id), label: c.title }))
      : []),
  ];

  const sortOptions = [
    { value: "", label: "Sort by" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
  ];

  useEffect(() => {
    const q = (debouncedQuery || "").trim();
    if (q !== "") {
      const params = {};
      if (sort) params.sort = sort;
      if (priceMax != null && Number(priceMax) > 0)
        params.price_max = String(priceMax);
      params.search = q;
      if (onlyOnSale) params.on_sale = "1";
      params.page = 1;
      applyParams(params);
    } else {
      const params = {};
      if (selected) params.category_id = selected;
      if (sort) params.sort = sort;
      if (priceMax != null && Number(priceMax) > 0)
        params.price_max = String(priceMax);
      if (onlyOnSale) params.on_sale = "1";
      params.page = 1;
      applyParams(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const onSelectCategory = (v) => {
    setPage(1);

    if (v === "all" || v === "" || v == null) {
      const params = {};
      if (sort) params.sort = sort;
      if (priceMax != null && Number(priceMax) > 0)
        params.price_max = String(priceMax);
      if (onlyOnSale) params.on_sale = "1";
      params.page = 1;
      applyParams(params);
      setQuery("");
      return;
    }
    setQuery("");
    const params = { category_id: v, page: 1 };
    if (sort) params.sort = sort;
    if (priceMax != null && Number(priceMax) > 0)
      params.price_max = String(priceMax);
    if (onlyOnSale) params.on_sale = "1";
    applyParams(params);
  };

  const onChangeSort = (v) => {
    setPage(1);

    const params = {};
    if (selected) params.category_id = selected;
    if (v) params.sort = v;
    if (priceMax != null && Number(priceMax) > 0)
      params.price_max = String(priceMax);
    const q = (debouncedQuery || "").trim();
    if (q !== "") params.search = q;
    if (onlyOnSale) params.on_sale = "1";
    params.page = 1;
    applyParams(params);
  };

  const onTrackFilter = (value) => {
    setPriceMax(value);
    setPage(1);

    const params = {};
    if (selected) params.category_id = selected;
    if (value != null && Number(value) > 0) params.price_max = String(value);
    if (onlyOnSale) params.on_sale = "1";
    params.page = 1;
    applyParams(params);

    setSort("");
    setQuery("");
  };

  useEffect(() => {
    const c = searchParams.get("category_id") || "";
    if (c !== selected) setSelected(c);
    const s = searchParams.get("sort") || "";
    if (s !== sort) setSort(s);
    const pmx = Number(searchParams.get("price_max") || 1000);
    if (pmx !== priceMax) setPriceMax(pmx);
    const sq = searchParams.get("search") || "";
    if (sq !== query) setQuery(sq);
    const os = searchParams.get("on_sale");
    const osBool = os ? true : false;
    if (osBool !== onlyOnSale) setOnlyOnSale(osBool);
    const p = Number(searchParams.get("page") || 1);
    if (!Number.isNaN(p) && p !== page) setPage(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const displayed =
    products && Array.isArray(products.data) ? products.data : [];
  const paginationMeta =
    products && products.meta
      ? products.meta
      : products && products.current_page
        ? {
            current_page: products.current_page,
            last_page: products.last_page,
            per_page: products.per_page || PER_PAGE,
            total:
              products.total ||
              (Array.isArray(products.data) ? products.data.length : 0),
          }
        : null;

  const totalItems = Number(paginationMeta?.total ?? 0);
  const perPageMeta = Number(
    paginationMeta?.per_page ?? paginationMeta?.perPage ?? PER_PAGE,
  );
  const lastPageMeta = Number(
    paginationMeta?.last_page ?? paginationMeta?.lastPage ?? 1,
  );

  const showPagination =
    totalItems > 0 && (lastPageMeta > 1 || totalItems > perPageMeta);

  const valueForSelect = selected === "" ? "all" : selected;

  const onToggleOnlyOnSale = (v) => {
    setOnlyOnSale(Boolean(v));
    setPage(1);

    const params = {};
    if (selected) params.category_id = selected;
    if (sort) params.sort = sort;
    if (priceMax != null && Number(priceMax) > 0)
      params.price_max = String(priceMax);
    const q = (debouncedQuery || "").trim();
    if (q !== "") params.search = q;
    if (v) params.on_sale = "1";
    params.page = 1;
    applyParams(params);
  };

  const onChangePage = (p) => {
    if (!p || p === page) return;
    const params = {};
    if (selected) params.category_id = selected;
    if (sort) params.sort = sort;
    if (priceMax != null && Number(priceMax) > 0)
      params.price_max = String(priceMax);
    const q = (debouncedQuery || "").trim();
    if (q !== "") params.search = q;
    if (onlyOnSale) params.on_sale = "1";
    params.page = String(p);
    applyParams(params);
  };

  return (
    <>
      <div className="mt-31 pt-24 border-t" style={{ border: "#D8D8D8" }}>
        <h2 className="text-4xl font-medium mb-10">Shop The Latest</h2>
        <div className="flex">
          <aside className="w-65 mr-6">
            <div className="mb-4">
              <Search
                value={query}
                onChange={(v) => setQuery(v)}
                onSubmit={(v) => {
                  setQuery(v);
                  setPage(1);
                  const params = {};
                  if (sort) params.sort = sort;
                  if (priceMax != null && Number(priceMax) > 0)
                    params.price_max = String(priceMax);
                  params.search = (v || "").trim();
                  params.page = 1;
                  applyParams(params);
                }}
                onCancel={() => {
                  setQuery("");
                  const params = {};
                  if (selected) params.category_id = selected;
                  if (sort) params.sort = sort;
                  if (priceMax != null && Number(priceMax) > 0)
                    params.price_max = String(priceMax);
                  params.page = 1;
                  applyParams(params);
                }}
                wrapperClassName="w-full"
                inputClassName="w-full"
                placeholder="Search products by title"
              />
            </div>

            <Select
              placeholder="Select by category"
              options={categoryOptions}
              value={valueForSelect}
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

            <Trackbar
              min={0}
              max={1000}
              value={priceMax}
              onChange={(v) => setPriceMax(v)} // live UI only; requests use debouncedPriceMax
              onFilter={(v) => onTrackFilter(v)}
            />

            <Toggle
              nameToggle={"On sale"}
              value={onlyOnSale}
              onChange={onToggleOnlyOnSale}
            />
            <Toggle
              nameToggle={"On stock"}
              value={onlyInStock}
              onChange={(v) => setOnlyInStock(Boolean(v))}
            />
          </aside>

          <div className="flex-1">
            <div className="flex flex-wrap justify-start gap-8 mb-6">
              {loading ? (
                <div className="w-full text-center py-16 text-gray-500">
                  Loading...
                </div>
              ) : error ? (
                <div className="w-full text-center py-16 text-red-500">
                  {error}
                </div>
              ) : displayed && displayed.length > 0 ? (
                displayed.map((product) => (
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
                  No products
                </div>
              )}
            </div>
            <div className="mt-12 mb-24 flex justify-center">
              {/* pagination */}
              {showPagination ? (
                <Pagination meta={paginationMeta} onChange={onChangePage} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Shop;
