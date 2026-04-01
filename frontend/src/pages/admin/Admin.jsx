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

function mergeAndDedupeReviews(existing = [], incoming = []) {
  const seen = new Set();
  const out = [];
  const push = (r) => {
    const key = `${r.id}-${r.product?.id ?? r.product_id}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  };
  incoming.forEach(push);
  existing.forEach(push);
  out.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return out;
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

  const fetchOpts = { credentials: "include", ...opts, headers };

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

  // reviews aggregation
  const [productReviews, setProductReviews] = useState({});
  const [aggReviews, setAggReviews] = useState([]);
  const [rLoading, setRLoading] = useState(false);
  const [rError, setRError] = useState(null);
  const aggLoadedProducts = useRef(new Set());

  const [productsMeta, setProductsMeta] = useState(null);
  const [categories, setCategories] = useState([]);

  // Drawer visibility (used for both create and edit)
  const [showDrawer, setShowDrawer] = useState(false);

  // Create form state
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    category_id: "",
    price: "",
    sku: "",
    description: "",
    img: null, // File
    img_url: null, // preview for already uploaded
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
      img_url: null,
      weight: "",
      material: "",
      colours: "",
      is_popular: false,
      currency: "USD",
      discount: "",
    });

  const openCreate = () => {
    resetCreateForm();
    setEditing(false);
    setEditMode(null);
    setShowDrawer(true);
  };

  // Edit state
  const [editMode, setEditMode] = useState(null); // product id or null
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
    title: "",
    category_id: "",
    price: "",
    sku: "",
    description: "",
    img: null, // File if changed
    img_url: null, // existing image url for preview
    weight: "",
    material: "",
    colours: "",
    is_popular: false,
    currency: "USD",
    discount: "",
  });

  const setEditField = (k, v) => setEditForm((s) => ({ ...s, [k]: v }));

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
    if (tab === "reviews") loadAdminReviews(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function loadProductsPage(page = 1) {
    setPLoading(true);
    setPError(null);
    try {
      const res = await apiFetch(
        `/api/admin/products?per_page=${productsPerPage}&page=${page}`,
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
      const json = await res.json().catch(() => null);
      const product = json.data ?? json;
      const reviews = Array.isArray(product?.reviews) ? product.reviews : [];
      setProductReviews((prev) => ({
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          loading: false,
          reviews,
          reviews_count: product?.reviews_count ?? reviews.length,
        },
      }));
      aggLoadedProducts.current.add(productId);
      return reviews;
    } catch (err) {
      console.error("loadReviewsForProduct error", productId, err);
      setProductReviews((prev) => ({
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          loading: false,
          error: err.message || "Error",
          reviews: [],
          reviews_count: 0,
        },
      }));
      return [];
    }
  }

  async function loadAdminReviews(page = 1, perPage = 20) {
    setRLoading(true);
    setRError(null);
    try {
      const res = await apiFetch(
        `/api/admin/reviews?per_page=${perPage}&page=${page}`,
        { headers: { Accept: "application/json" } },
      );
      if (!res.ok) throw new Error("Fetch error: " + res.status);
      const json = await res.json();
      // json.data expected (resource collection)
      const items = json.data ?? json;
      setAggReviews(Array.isArray(items) ? items : []);
      // keep pagination
      if (json.meta) {
        setProductsMeta(json.meta);
        setProductsPage(json.meta.current_page ?? page);
      }
    } catch (err) {
      console.error("loadAdminReviews error", err);
      setRError(err.message || "Error");
    } finally {
      setRLoading(false);
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
                <td
                  onDoubleClick={() => {
                    // open edit drawer and populate editForm
                    setEditForm({
                      id: p.id,
                      title: p.title ?? "",
                      category_id: p.category_id ?? p.category?.id ?? "",
                      price: p.price ?? "",
                      sku: p.sku ?? "",
                      description: p.description ?? "",
                      img: null,
                      img_url: p.img_url ?? p.img ?? null,
                      weight: p.weight ?? "",
                      material: p.material ?? "",
                      colours: p.colours ?? "",
                      is_popular: !!p.is_popular,
                      currency: p.currency ?? "USD",
                      discount: p.discount
                        ? p.discount.type === "percent"
                          ? p.discount.value
                          : ""
                        : "",
                    });
                    setEditMode(p.id);
                    setShowDrawer(true);
                  }}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  {p.title}
                </td>
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

      setShowDrawer(false);
      await loadProductsPage(1, true);
    } catch (err) {
      console.error(err);
      alert("Ошибка при создании товара");
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!editForm.id) return;
    if (!editForm.title || !editForm.price || !editForm.category_id) {
      alert("Заполните обязательные поля: title, price, category");
      return;
    }
    setEditing(true);
    try {
      try {
        await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
          credentials: "include",
        });
      } catch (e) {
        // ignore CSRF fetch errors here (we'll still try)
      }

      const formData = new FormData();
      formData.append("title", editForm.title);
      formData.append("category_id", String(editForm.category_id));
      formData.append("price", String(editForm.price));
      if (editForm.sku) formData.append("sku", editForm.sku);
      formData.append("description", editForm.description || "");
      if (editForm.weight) formData.append("weight", editForm.weight);
      if (editForm.material) formData.append("material", editForm.material);
      if (editForm.colours) formData.append("colours", editForm.colours);
      formData.append("is_popular", editForm.is_popular ? "1" : "0");
      formData.append("currency", editForm.currency || "USD");
      // only append file if user selected a new one
      if (editForm.img instanceof File) formData.append("img", editForm.img);

      // Laravel expects PUT/PATCH — use _method override when sending multipart/form-data
      formData.append("_method", "PUT");

      const res = await fetch(`${API_BASE}/api/admin/products/${editForm.id}`, {
        method: "POST", // using POST + _method override
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
        console.error("Update failed", res.status, data);
        if (res.status === 422 && data && data.errors) {
          const messages = Object.values(data.errors).flat().join("\n");
          alert("Validation errors:\n" + messages);
        } else if (res.status === 401) {
          alert("Unauthorized — please login as admin.");
          navigate("/account");
        } else {
          alert(data?.message || `Update failed: ${res.status}`);
        }
        return;
      }

      // success — refresh list and close drawer
      setShowDrawer(false);
      setEditMode(null);
      await loadProductsPage(1, true);
    } catch (err) {
      console.error(err);
      alert("Ошибка при обновлении товара");
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!editForm.id) return;
    if (!confirm("Удалить этот товар?")) return;
    setEditing(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/products/${editForm.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-XSRF-TOKEN": getXsrf(),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `Delete failed: ${res.status}`);
      }
      setShowDrawer(false);
      setEditMode(null);
      await loadProductsPage(1, true);
    } catch (err) {
      console.error(err);
      alert(err.message || "Ошибка при удалении");
    } finally {
      setEditing(false);
    }
  };

  // Delete a review/comment by id (admin)
  async function handleDeleteReview(reviewId, productId) {
    if (!reviewId) return;
    if (!confirm("Удалить этот отзыв?")) return;

    try {
      await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
        credentials: "include",
      }).catch(() => {});
      const res = await fetch(
        `${API_BASE}/api/products/${productId}/reviews/${reviewId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { Accept: "application/json", "X-XSRF-TOKEN": getXsrf() },
        },
      );

      const data = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(data?.message || `Delete failed: ${res.status}`);

      setAggReviews((prev) =>
        prev.filter(
          (r) =>
            !(
              r.id === reviewId && (r.product?.id ?? r.product_id) === productId
            ),
        ),
      );

      setProductReviews((prev) => {
        const item = prev[productId];
        if (!item || !Array.isArray(item.reviews)) return prev;
        const newReviews = item.reviews.filter((r) => r.id !== reviewId);
        return {
          ...prev,
          [productId]: {
            ...item,
            reviews: newReviews,
            reviews_count: Math.max(
              0,
              (item.reviews_count || item.reviews.length) - 1,
            ),
          },
        };
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, reviews_count: Math.max(0, (p.reviews_count || 0) - 1) }
            : p,
        ),
      );

      alert(data?.message ?? "Review deleted");
    } catch (err) {
      console.error("handleDeleteReview error", err);
      alert(err.message || "Error deleting review");
    }
  }

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
              <div className="text-red-600">{rError}</div>
            ) : aggReviews.length === 0 ? (
              <div>No reviews found</div>
            ) : (
              <ul className="admin-reviews-list">
                {aggReviews.map((r) => {
                  const prodId = r.product?.id ?? r.product_id;
                  return (
                    <li
                      key={`${r.id}-${prodId}`}
                      style={{
                        position: "relative",
                        paddingRight: 44,
                        borderBottom: "1px solid #eee",
                        paddingTop: 12,
                        paddingBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <strong>{r.name ?? r.user?.name ?? "User"}</strong>
                            <span style={{ color: "#777", fontSize: 13 }}>
                              {new Date(r.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 13,
                              color: "#333",
                            }}
                          >
                            {r.comment}
                          </div>
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 12,
                              color: "#666",
                            }}
                          >
                            Product: {r.product?.title ?? prodId}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 8,
                          }}
                        >
                          <button
                            type="button"
                            title="Delete review"
                            onClick={() => {
                              console.log("click delete", r.id, prodId);
                              handleDeleteReview(r.id, prodId);
                            }}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "#dc2626",
                              fontSize: 18,
                              cursor: "pointer",
                              padding: 6,
                            }}
                          >
                            ✖
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div style={{ marginTop: 12 }}></div>
          </section>
        )}
      </main>

      {/* Drawer (create / edit) */}
      <Drawer
        isOpen={showDrawer}
        onClose={() => {
          setShowDrawer(false);
          setEditMode(null);
          setEditing(false);
        }}
        title={editMode ? "Edit product" : "Create"}
        align="right"
      >
        {/* form: if editMode use editForm else createForm */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (editMode) {
              await handleEditSubmit();
            } else {
              await handleCreateSubmit();
            }
          }}
        >
          <div className="form-row">
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              value={editMode ? editForm.title : createForm.title}
              onChange={(e) =>
                editMode
                  ? setEditField("title", e.target.value)
                  : setCreateField("title", e.target.value)
              }
              required
            />
          </div>

          <div className="form-row">
            <label className="form-label">Category *</label>
            <select
              className="form-select"
              value={editMode ? editForm.category_id : createForm.category_id}
              onChange={(e) =>
                editMode
                  ? setEditField("category_id", e.target.value)
                  : setCreateField("category_id", e.target.value)
              }
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
                value={editMode ? editForm.price : createForm.price}
                onChange={(e) =>
                  editMode
                    ? setEditField("price", e.target.value)
                    : setCreateField("price", e.target.value)
                }
                required
              />
            </div>
          </div>

          {/* Discount row */}
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
                value={
                  editMode
                    ? (editForm.discount ?? "")
                    : (createForm.discount ?? "")
                }
                onChange={(e) =>
                  editMode
                    ? setEditField("discount", e.target.value)
                    : setCreateField("discount", e.target.value)
                }
                placeholder="0"
              />
            </div>

            <div style={{ width: 140 }}>
              <label className="form-label">Currency*</label>
              <select
                className="form-select"
                value={editMode ? editForm.currency : createForm.currency}
                onChange={(e) =>
                  editMode
                    ? setEditField("currency", e.target.value)
                    : setCreateField("currency", e.target.value)
                }
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
              value={editMode ? editForm.sku : createForm.sku}
              onChange={(e) =>
                editMode
                  ? setEditField("sku", e.target.value)
                  : setCreateField("sku", e.target.value)
              }
            />
          </div>

          {/* Description */}
          <div className="form-row">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={editMode ? editForm.description : createForm.description}
              onChange={(e) =>
                editMode
                  ? setEditField("description", e.target.value)
                  : setCreateField("description", e.target.value)
              }
            />
          </div>

          {/* Weight / Material */}
          <div className="form-row h-flex">
            <div className="form-col">
              <label className="form-label">Weight</label>
              <input
                className="form-input"
                value={editMode ? editForm.weight : createForm.weight}
                onChange={(e) =>
                  editMode
                    ? setEditField("weight", e.target.value)
                    : setCreateField("weight", e.target.value)
                }
                placeholder="e.g. 1.2 kg"
              />
            </div>
            <div className="form-col">
              <label className="form-label">Material</label>
              <input
                className="form-input"
                value={editMode ? editForm.material : createForm.material}
                onChange={(e) =>
                  editMode
                    ? setEditField("material", e.target.value)
                    : setCreateField("material", e.target.value)
                }
                placeholder="e.g. Cotton"
              />
            </div>
          </div>

          {/* Colours */}
          <div className="form-row">
            <label className="form-label">Colours</label>
            <input
              className="form-input"
              value={editMode ? editForm.colours : createForm.colours}
              onChange={(e) =>
                editMode
                  ? setEditField("colours", e.target.value)
                  : setCreateField("colours", e.target.value)
              }
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
                checked={editMode ? editForm.is_popular : createForm.is_popular}
                onChange={(e) =>
                  editMode
                    ? setEditField("is_popular", e.target.checked)
                    : setCreateField("is_popular", e.target.checked)
                }
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
                if (editMode) {
                  setEditField("img", f);
                } else {
                  setCreateField("img", f);
                }
              }}
            />
            {/* preview: if file chosen show it, else show existing img_url */}
            {editMode ? (
              editForm.img ? (
                <img
                  alt="preview"
                  src={URL.createObjectURL(editForm.img)}
                  className="create-image-preview"
                  style={{ marginTop: 8 }}
                />
              ) : editForm.img_url ? (
                <img
                  alt="preview"
                  src={editForm.img_url}
                  className="create-image-preview"
                  style={{ marginTop: 8 }}
                />
              ) : null
            ) : createForm.img ? (
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
            {editMode ? (
              <>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={async () => {
                    // Delete action
                    await handleDelete();
                  }}
                  disabled={editing}
                >
                  {editing ? "Deleting..." : "Delete"}
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={editing}
                >
                  {editing ? "Updating..." : "Update"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowDrawer(false);
                  }}
                  disabled={creating}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={creating}
                >
                  {creating ? "Saving..." : "Save"}
                </button>
              </>
            )}
          </div>
        </form>
      </Drawer>
    </div>
  );
};
