import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLogoutButton } from "./AdminLogoutButton.jsx";
import { Pagination } from "../../components/ui/Pagination/Pagination.jsx";
import { Drawer } from "../../components/ui/Drawer/Drawer.jsx";
import "./Admin.css";

function getXsrf() {
  return decodeURIComponent(
    (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || "",
  );
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";

const CURRENCY_SYMBOLS = { USD: "$", RUB: "₽", EUR: "€", GBP: "£" };
function currencySymbolFromCode(code) {
  if (!code) return null;
  return CURRENCY_SYMBOLS[String(code).toUpperCase()] || code;
}

function resolveImgUrl(p) {
  if (!p) return null;
  if (p.img_url) return p.img_url;
  if (!p.img) return null;
  const img = String(p.img).replace(/^\/+/, "");
  if (img.startsWith("images/")) {
    return `${window.location.origin}/${img}`;
  }
  return `${window.location.origin}/storage/${img}`;
}

function apiFetch(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = {
    Accept: "application/json",
    "X-XSRF-TOKEN": getXsrf(),
    ...(opts.headers || {}),
  };

  const fetchOpts = {
    credentials: "include",
    ...opts,
    headers,
  };

  if (opts.signal) fetchOpts.signal = opts.signal;
  return fetch(url, fetchOpts);
}

export const Admin = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("products");

  const [products, setProducts] = useState([]);
  const [productsPage, setProductsPage] = useState(1);
  const [productsPerPage] = useState(6);
  const [pLoading, setPLoading] = useState(false);
  const [pError, setPError] = useState(null);

  // eslint-disable-next-line no-unused-vars
  const [productReviews, setProductReviews] = useState({});
  const [aggReviews, setAggReviews] = useState([]);
  const [rLoading, setRLoading] = useState(false);
  const [rError, setRError] = useState(null);
  const aggLoadedProducts = useRef(new Set());

  const [productsMeta, setProductsMeta] = useState(null);
  const [categories, setCategories] = useState([]);

  // Create form state (use currency codes)
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    category_id: "",
    price: "",
    sku: "",
    description: "",
    img: null,
    weight: "",
    material: "",
    colours: "",
    is_popular: false,
    currency: "USD",
    discount: "",
  });

  const setCreateField = (k, v) => setCreateForm((s) => ({ ...s, [k]: v }));
  const resetCreateForm = () =>
    setCreateForm({
      title: "",
      category_id: "",
      price: "",
      sku: "",
      description: "",
      img: null,
      weight: "",
      material: "",
      colours: "",
      is_popular: false,
      currency: "USD",
      discount: "",
    });
  const openCreate = () => {
    resetCreateForm();
    setShowCreate(true);
  };

  // load categories for select
  useEffect(() => {
    const c = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`, {
          credentials: "include",
          signal: c.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Categories fetch error " + res.status);
        const json = await res.json();
        const items = Array.isArray(json) ? json : (json?.data ?? []);
        setCategories(items);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Categories load failed", err);
        setCategories([]);
      }
    })();
    return () => c.abort();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/user`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (!mounted) return;
        if (!res.ok) {
          navigate("/account");
          return;
        }
        const json = await res.json().catch(() => null);
        const user = json && (json.data ?? json);
        if (!user || !user.is_admin) {
          navigate("/account");
        }
      } catch {
        if (mounted) navigate("/account");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (tab === "products") loadProductsPage(1, true);
    if (tab === "reviews") initAggregateReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function loadProductsPage(page = 1) {
    setPLoading(true);
    setPError(null);
    try {
      const res = await apiFetch(
        `/api/products?per_page=${productsPerPage}&page=${page}`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) throw new Error("Fetch error: " + res.status);
      const json = await res.json();
      const items = json.data ?? json;
      const meta =
        json.meta ??
        (json && json.current_page
          ? {
              current_page: json.current_page,
              last_page: json.last_page,
              per_page: json.per_page,
              total: json.total,
            }
          : null);

      setProducts(Array.isArray(items) ? items : []);
      if (meta) {
        setProductsMeta(meta);
        setProductsPage(meta.current_page ?? page);
      } else {
        setProductsMeta({
          current_page: page,
          last_page: Array.isArray(items) ? 1 : 1,
          per_page: productsPerPage,
          total: Array.isArray(items) ? items.length : 0,
        });
        setProductsPage(page);
      }
    } catch (e) {
      setPError(e.message);
    } finally {
      setPLoading(false);
    }
  }

  async function loadReviewsForProduct(productId) {
    setProductReviews((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), loading: true, error: null },
    }));
    try {
      const res = await apiFetch(`/api/products/${productId}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Fetch error: " + res.status);
      const json = await res.json();
      const product = json.data ?? json;
      const reviews = Array.isArray(product?.reviews) ? product.reviews : [];
      setProductReviews((prev) => ({
        ...prev,
        [productId]: { ...(prev[productId] || {}), loading: false, reviews },
      }));
      aggLoadedProducts.current.add(productId);
      return reviews;
    } catch (err) {
      setProductReviews((prev) => ({
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          loading: false,
          error: err.message || "Error",
          reviews: [],
        },
      }));
      return [];
    }
  }

  async function initAggregateReviews() {
    setAggReviews([]);
    setRLoading(true);
    setRError(null);
    aggLoadedProducts.current = new Set();
    try {
      const initialPagesToLoad = 2;
      let page = 1;
      const collected = [];
      while (page <= initialPagesToLoad) {
        const res = await apiFetch(
          `/api/products?per_page=${productsPerPage}&page=${page}`,
          { headers: { Accept: "application/json" } },
        );
        if (!res.ok) throw new Error("Fetch error: " + res.status);
        const json = await res.json();
        const items = json.data ?? json;
        for (const prod of items) {
          const reviews = await loadReviewsForProduct(prod.id);
          for (const r of reviews)
            collected.push({
              ...r,
              product: { id: prod.id, title: prod.title },
            });
        }
        if (!Array.isArray(items) || items.length === 0) break;
        page++;
      }
      collected.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setAggReviews(collected);
    } catch (e) {
      setRError(e.message);
    } finally {
      setRLoading(false);
    }
  }

  async function loadMoreProductsForReviews() {
    try {
      const nextPage = productsPage + 1;
      await loadProductsPage(nextPage);
      const start = (nextPage - 1) * productsPerPage;
      const newProducts = products.slice(start, start + productsPerPage);
      const collected = [];
      for (const prod of newProducts) {
        if (aggLoadedProducts.current.has(prod.id)) continue;
        const reviews = await loadReviewsForProduct(prod.id);
        for (const r of reviews)
          collected.push({ ...r, product: { id: prod.id, title: prod.title } });
      }
      if (collected.length) {
        setAggReviews((prev) =>
          [...collected, ...prev].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at),
          ),
        );
      }
    } catch {
      // ignore
    }
  }

  function renderProductsTable() {
    return (
      <div className="admin-table-wrapper">
        <table className="min-w-full">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Image</th>
              <th>Image_path</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Currency</th>
              <th>Discount</th>
              <th>Weight</th>
              <th>Material</th>
              <th>Color</th>
              <th>Popularity</th>
              <th>Category ID</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-[#e5e7eb]">
                <td>{p.id}</td>
                <td>{p.title}</td>
                <td>
                  {resolveImgUrl(p) ? (
                    <img
                      src={resolveImgUrl(p)}
                      alt={p.title}
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: "cover",
                        borderRadius: 4,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        background: "#f0f0f0",
                        borderRadius: 4,
                      }}
                    />
                  )}
                </td>
                <td>{p.img}</td>
                <td>{p.sku}</td>
                <td>
                  {typeof p.price === "number" ? p.price.toFixed(2) : p.price}
                </td>
                <td>
                  {(p.currency_symbol ?? currencySymbolFromCode(p.currency)) ||
                    "—"}
                </td>
                <td>
                  {p.discount
                    ? p.discount.type === "percent"
                      ? `${p.discount.value}%`
                      : `${p.discount.value} ${p.discount.currency}`
                    : "—"}
                </td>
                <td>{p.weight ?? "—"}</td>
                <td>{p.material ?? "—"}</td>
                <td>{p.colours ?? "—"}</td>
                <td>{p.is_popular ?? "—"}</td>
                <td>{p.category_id ?? p.category?.id ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const handleCreateSubmit = async () => {
    if (!createForm.title || !createForm.price || !createForm.category_id) {
      alert("Заполните обязательные поля: title, price, category");
      return;
    }
    setCreating(true);
    try {
      // Ensure CSRF cookie is present (important for session-based auth)
      try {
        await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
          credentials: "include",
        });
      } catch (e) {
        console.warn("Failed to fetch CSRF cookie", e);
      }

      const formData = new FormData();
      formData.append("title", createForm.title);
      formData.append("category_id", String(createForm.category_id));
      formData.append("price", String(createForm.price));
      if (createForm.sku) formData.append("sku", createForm.sku);
      formData.append("description", createForm.description || "");
      if (createForm.weight) formData.append("weight", createForm.weight);
      if (createForm.material) formData.append("material", createForm.material);
      if (createForm.colours) formData.append("colours", createForm.colours);
      formData.append("is_popular", createForm.is_popular ? "1" : "0");
      formData.append("currency", createForm.currency || "USD");
      if (createForm.img) formData.append("img", createForm.img);

      const res = await fetch(`${API_BASE}/api/admin/products`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": getXsrf(),
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Create failed", res.status, data);
        if (res.status === 422 && data && data.errors) {
          const messages = Object.values(data.errors).flat().join("\n");
          alert("Validation errors:\n" + messages);
        } else if (res.status === 403) {
          alert("Forbidden: you don't have permission to create products.");
        } else if (res.status === 401) {
          alert("Unauthorized: please login as admin.");
          navigate("/account");
        } else {
          alert(data?.message || `Create failed: ${res.status}`);
        }
        return;
      }

      const createdJson = await res.json().catch(() => null);
      const created = createdJson?.data ?? createdJson ?? null;

      // If API returns img_url / img_thumb_url, you may use them when refreshing UI
      if (created) {
        // Optionally insert created item into products list for immediate feedback
        // setProducts(prev => [created, ...prev]); // if desired
      }

      // If discount specified - create discount (best-effort)
      if (createForm.discount && Number(createForm.discount) > 0) {
        try {
          const discountPayload = {
            sku: (created?.sku || createForm.sku || "").toString(),
            type: "percent",
            value: Number(createForm.discount),
            currency: createForm.currency || "USD",
            active: true,
          };
          const dRes = await fetch(`${API_BASE}/api/admin/discounts`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-XSRF-TOKEN": getXsrf(),
              Accept: "application/json",
            },
            body: JSON.stringify(discountPayload),
          });
          if (!dRes.ok) {
            console.warn("Discount create failed", dRes.status);
          }
        } catch (err) {
          console.error("Discount create error", err);
        }
      }

      setShowCreate(false);
      await loadProductsPage(1, true);
    } catch (err) {
      console.error(err);
      alert("Ошибка при создании товара");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="admin-root">
      <header className="admin-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1>Admin panel</h1>
          <button
            type="button"
            onClick={openCreate}
            style={{
              padding: "8px 12px",
              background: "#111827",
              color: "#fff",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
            }}
          >
            Create
          </button>
        </div>

        <div className="flex items-center tabs">
          <button
            className={tab === "products" ? "active" : ""}
            onClick={() => setTab("products")}
          >
            Products
          </button>
          <button
            className={tab === "reviews" ? "active" : ""}
            onClick={() => setTab("reviews")}
          >
            Reviews
          </button>
          <AdminLogoutButton />
        </div>
      </header>

      <main className="admin-main">
        {tab === "products" && (
          <section>
            <h2>Products</h2>
            {pLoading ? (
              <div>Loading…</div>
            ) : pError ? (
              <div className="text-red-600">Error: {pError}</div>
            ) : (
              <>
                {renderProductsTable()}
                <div className="mt-4 flex items-center justify-center">
                  <Pagination
                    meta={productsMeta}
                    onChange={(p) => {
                      if (!p || p === productsPage) return;
                      loadProductsPage(p, true);
                    }}
                  />
                </div>
              </>
            )}
          </section>
        )}

        {tab === "reviews" && (
          <section>
            <h2>All Reviews</h2>
            {rLoading ? (
              <div>Loading reviews…</div>
            ) : rError ? (
              <div className="text-red-600">Error: {rError}</div>
            ) : aggReviews.length === 0 ? (
              <div>No reviews found</div>
            ) : (
              <ul className="admin-reviews-list">
                {aggReviews.map((r) => (
                  <li key={`${r.id}-${r.product?.id}`}>
                    <strong>{r.name ?? r.user?.name ?? "User"}</strong>
                    <span style={{ marginLeft: 8, color: "#777" }}>
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                    <div style={{ fontSize: 13, color: "#333" }}>
                      {r.comment}
                    </div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                      Product: {r.product?.title ?? r.product_id}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: 12 }}>
              <button onClick={loadMoreProductsForReviews}>
                Load more products → load their reviews
              </button>
            </div>
          </section>
        )}
      </main>

      {/* CREATE Drawer */}
      <Drawer
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create"
        align="right"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await handleCreateSubmit();
          }}
        >
          <div className="form-row">
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              value={createForm.title}
              onChange={(e) => setCreateField("title", e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <label className="form-label">Category *</label>
            <select
              className="form-select"
              value={createForm.category_id}
              onChange={(e) => setCreateField("category_id", e.target.value)}
              required
            >
              <option value="">— Select a category —</option>
              {Array.isArray(categories) &&
                categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-row" style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Price *</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                value={createForm.price}
                onChange={(e) => setCreateField("price", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Discount row (процент) */}
          <div
            className="form-row"
            style={{ display: "flex", gap: 8, marginTop: 12 }}
          >
            <div style={{ flex: 1 }}>
              <label className="form-label">Discount (%)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={createForm.discount ?? ""}
                onChange={(e) => setCreateField("discount", e.target.value)}
                placeholder="0"
              />
            </div>

            <div style={{ width: 140 }}>
              <label className="form-label">Currency*</label>
              <select
                className="form-select"
                value={createForm.currency}
                onChange={(e) => setCreateField("currency", e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="RUB">RUB</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {/* SKU */}
          <div className="form-row">
            <label className="form-label">SKU</label>
            <input
              className="form-input"
              value={createForm.sku}
              onChange={(e) => setCreateField("sku", e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="form-row">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={createForm.description}
              onChange={(e) => setCreateField("description", e.target.value)}
            />
          </div>

          {/* Weight / Material */}
          <div className="form-row h-flex">
            <div className="form-col">
              <label className="form-label">Weight</label>
              <input
                className="form-input"
                value={createForm.weight}
                onChange={(e) => setCreateField("weight", e.target.value)}
                placeholder="e.g. 1.2 kg"
              />
            </div>
            <div className="form-col">
              <label className="form-label">Material</label>
              <input
                className="form-input"
                value={createForm.material}
                onChange={(e) => setCreateField("material", e.target.value)}
                placeholder="e.g. Cotton"
              />
            </div>
          </div>

          {/* Colours */}
          <div className="form-row">
            <label className="form-label">Colours</label>
            <input
              className="form-input"
              value={createForm.colours}
              onChange={(e) => setCreateField("colours", e.target.value)}
              placeholder="e.g. red, blue"
            />
          </div>

          {/* Popular */}
          <div
            className="form-row"
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={createForm.is_popular}
                onChange={(e) => setCreateField("is_popular", e.target.checked)}
              />
              <span>Popular</span>
            </label>
          </div>

          {/* Image */}
          <div className="form-row" style={{ marginTop: 12 }}>
            <label className="form-label">Image (img)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                setCreateField("img", f);
              }}
            />
            {createForm.img ? (
              <img
                alt="preview"
                src={URL.createObjectURL(createForm.img)}
                className="create-image-preview"
                style={{ marginTop: 8 }}
              />
            ) : null}
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => {
                setShowCreate(false);
              }}
              disabled={creating}
            >
              Cancel
            </button>

            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};
