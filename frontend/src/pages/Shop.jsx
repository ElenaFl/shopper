import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "../components/ui/Card/Card.jsx";
import { Select } from "../components/ui/Select/Select.jsx";
import { Search } from "../components/ui/Search/Search.jsx";
import { Trackbar } from "../components/ui/Trackbar/Trackbar.jsx";
import { Toggle } from "../components/ui/Toggle/Toggle.jsx";
import { Pagination } from "../components/ui/Pagination/Pagination.jsx";
import { useDebounce } from "../hooks/useDebounce.js";

export const Shop = () => {
  const navigate = useNavigate();

  // Search input and debounce
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  // URL search params wrapper
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

  // initial values from URL
  const initialCategory = searchParams.get("category_id") || "";
  const initialSort = searchParams.get("sort") || "";
  const initialPriceMax = Number(searchParams.get("price_max") || 1000);
  const initialOnlyOnSale = searchParams.get("on_sale") ? true : false;
  const initialPage = Number(searchParams.get("page") || 1);

  // local state
  const [selected, setSelected] = useState(initialCategory);
  // "" means all
  const [sort, setSort] = useState(initialSort);
  const [priceMax, setPriceMax] = useState(initialPriceMax);
  // single slider => max limit
  const [onlyOnSale, setOnlyOnSale] = useState(initialOnlyOnSale);
  const debouncedPriceMax = useDebounce(priceMax, 400); // debounce to avoid rapid requests
  const [onlyInStock, setOnlyInStock] = useState(false);

  // pagination
  const [page, setPage] = useState(initialPage);
  const PER_PAGE = 6;

  const [products, setProducts] = useState(null); // can be paginator or array
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // helper: apply params to URL and immediately sync local state
  const applyParams = (params) => {
    debugSetSearchParams(params);
    // sync selected: absent or 'all' -> ""
    if (params.category_id && params.category_id !== "all")
      setSelected(String(params.category_id));
    else setSelected("");
    // sync sort
    setSort(params.sort || "");
    // sync priceMax if present
    if (params.price_max != null) {
      const pm = Number(params.price_max);
      if (!Number.isNaN(pm)) setPriceMax(pm);
    }
    // sync on_sale
    if (params.on_sale != null) {
      setOnlyOnSale(
        params.on_sale === "1" ||
          params.on_sale === "true" ||
          params.on_sale === true,
      );
    } else {
      // if absent in params, default to false
      setOnlyOnSale(false);
    }
    // sync page
    if (params.page != null) {
      const p = Number(params.page);
      if (!Number.isNaN(p) && p > 0) setPage(p);
    } else {
      setPage(1);
    }
  };

  // load categories
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

  // fetch products (uses debouncedPriceMax, debouncedQuery, page)
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
        // set page to 1 and schedule a re-fetch (fetchProducts will be triggered by effect watching page)
        setPage(1);
        return;
      }
      // if backend returns paginator structure { data: [...], meta: {...} }
      if (json && Array.isArray(json.data)) {
        setProducts(json);
      } else if (Array.isArray(json)) {
        // fallback: raw array
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
        // try items wrapper
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
      console.error("fetch error products", err);
      setError("Failed to load products");
    } finally {
      clearTimeout(loadingTimer);
      setLoading(false);
      try {
        controller.abort();
      } catch {}
    }
  };

  // refetch when category, sort, debouncedQuery, debouncedPriceMax, onlyOnSale or page change
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, sort, debouncedQuery, debouncedPriceMax, onlyOnSale, page]);

  // options
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

  // handlers

  // When user types and debouncedQuery stabilizes we clear category and apply search
  useEffect(() => {
    const q = (debouncedQuery || "").trim();
    if (q !== "") {
      const params = {};
      // do NOT include category_id — search overrides category
      if (sort) params.sort = sort;
      if (priceMax != null && Number(priceMax) > 0)
        params.price_max = String(priceMax);
      params.search = q;
      // include on_sale state in URL when searching
      if (onlyOnSale) params.on_sale = "1";
      params.page = 1; // reset page on new search
      applyParams(params);
      // will set selected = ""
    } else {
      // search cleared — restore category if present
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
    // reset to first page immediately
    setPage(1);

    if (v === "all" || v === "" || v == null) {
      const params = {};
      if (sort) params.sort = sort;
      if (priceMax != null && Number(priceMax) > 0)
        params.price_max = String(priceMax);
      if (onlyOnSale) params.on_sale = "1";
      params.page = 1;
      // clear search
      applyParams(params);
      // sets selected = ""
      setQuery("");
      return;
    }
    // selecting category cancels search
    setQuery("");
    const params = { category_id: v, page: 1 };
    if (sort) params.sort = sort;
    if (priceMax != null && Number(priceMax) > 0)
      params.price_max = String(priceMax);
    if (onlyOnSale) params.on_sale = "1";
    applyParams(params);
  };

  const onChangeSort = (v) => {
    // reset page
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

  // when user presses Filter on Trackbar: apply price filter, KEEP category, RESET sort, cancel search
  const onTrackFilter = (value) => {
    setPriceMax(value);
    // immediately reset page to 1 to avoid fetching stale page
    setPage(1);

    const params = {};
    if (selected) params.category_id = selected; // keep category
    // DO NOT include sort -> this resets second Select to default
    if (value != null && Number(value) > 0) params.price_max = String(value);
    if (onlyOnSale) params.on_sale = "1";
    // cancel search (price filter takes precedence)
    // no params.search
    params.page = 1;
    applyParams(params);

    setSort("");
    setQuery("");
  };

  // sync search params -> state (fallback when user navigates/back)
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
    if (!Number.isNaN(p) && p !== page) setPage(p); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  // derive displayed items and pagination meta
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

  // VSTAVIT: compute whether to show pagination
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
    // v — новое boolean value
    setOnlyOnSale(Boolean(v));
    // reset page synchronously
    setPage(1);

    // build params preserving current filters
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
    // applyParams will setPage; fetch triggered by effect
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
                  applyParams(params); // clears category
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
