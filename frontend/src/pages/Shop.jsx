import React, { useState, useMemo, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card/Card.jsx";
import { Select } from "../components/ui/Select/Select.jsx";
import { Search } from "../components/ui/Search/Search.jsx";
import { Trackbar } from "../components/ui/Trackbar/Trackbar.jsx";
import { Toggle } from "../components/ui/Toggle/Toggle.jsx";
import { data } from "../../data.js";
import { categories } from "../../categories.js";
import { useDebounce } from "../hooks/useDebounce.js";
import { SearchContext } from "../context/search/SearchContext.jsx";

const SHOW_ALL_TERMS = ["all categories", "all", "все категории", "все"];

/**
 * Shop — страница каталога.
 *
 * Локальный поиск по CATEGORIES: находим категории по title,
 * затем показываем товары с соответствующим category_id.
 */
export const Shop = () => {
  const navigate = useNavigate();
  const { query, setQuery } = useContext(SearchContext);
  const debouncedQuery = useDebounce(query, 300);

  const [selected, setSelected] = useState("");

  const normalized = (s) => (s || "").toLowerCase().trim();

  const matchingCategoryIds = useMemo(() => {
    const q = normalized(debouncedQuery);
    if (!q) return null;
    if (SHOW_ALL_TERMS.includes(q)) return null;
    return categories
      .filter((c) => (c.title || "").toLowerCase().includes(q))
      .map((c) => c.id);
  }, [debouncedQuery]);

  const filtered = useMemo(() => {
    if (!matchingCategoryIds) return data;
    return data.filter((item) =>
      matchingCategoryIds.includes(item.category_id),
    );
  }, [matchingCategoryIds]);

  const categoryOptions = categories.map((c) => ({
    value: String(c.id),
    label: c.title,
  }));

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
              onChange={(v) => setSelected(v)}
              wrapperClassName="mb-4"
              className="w-full py-4 px-3 border border-[#D8D8D8] appearance-none rounded-sm cursor-pointer pr-10"
              arrowClassName="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
            />
            <Select
              wplaceholder="Select by category"
              options={categoryOptions}
              value={selected}
              onChange={(v) => setSelected(v)}
              wrapperClassName="mb-4"
              className="w-full py-4 px-3 border border-[#D8D8D8] appearance-none rounded-sm cursor-pointer pr-10"
              arrowClassName="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"
            />
            <Trackbar />
            <Toggle nameToggle={"On sale"} />
            <Toggle nameToggle={"On stock"} />
          </aside>

          <div className="flex-1 flex flex-wrap justify-start gap-8 mb-62">
            {filtered && filtered.length > 0 ? (
              filtered.map((product) => (
                <Card
                  details={product}
                  key={product?.id}
                  onOpenDetails={() => navigate(`/card-details/${product?.id}`)}
                  size={{
                    width: 300,
                    height: 392,
                    heightImg: 300,
                  }}
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
