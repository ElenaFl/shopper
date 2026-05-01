import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Tabs } from "../../components/ui/Tabs/Tabs.jsx";
import { Select } from "../../components/ui/Select/Select.jsx";
import { Button } from "../../components/ui/Button/Button.jsx";
import { useAuth } from "../../context/auth/useAuth.js";

//часть админа
// import { AdminLogoutButton } from "./AdminLogoutButton.jsx";
import { Pagination } from "../../components/ui/Pagination/Pagination.jsx";
import { Drawer } from "../../components/ui/Drawer/Drawer.jsx";
import "./Admin.css";

/**
 * Компонент Account - интерфейс для входа и регистрации пользователей, а также личный кабинет (Dashboard) для авторизованных пользователей: Orders, Downloads, Addresses, Account details, Logout.
 *
 * Работает с бэкендом (Laravel) через API: /api/login, /api/register, /api/orders и пр., используя cookie-based аутентификацию и CSRF.
 *  После успешного ответа обновляет контекст пользователя через fetchUser() и показывает приветствие.
 *
 * 
 * Админ-панель для управления товарами и отзывами (список, создание, редактирование, удаление).
 * Работает с Laravel API на API_BASE (по умолчанию http://shopper.local).
Управляет CRUD для /api/admin/products и отзывами /api/admin/reviews и /api/products/{id}/reviews.
 */

// часть админа
function getXsrf() {
  return decodeURIComponent(
    (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || "",
  );
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";

const CURRENCY_SYMBOLS = { $: "$", RUB: "₽", EUR: "€", GBP: "£" };

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
// завершение части админа

export const Account = () => {
  // 1. Tabs вкладка активна ("Sign in" / "Register")
  const [activeCategory, setActiveCategory] = useState("Sign in");
  // 2. Tabs вкладка активна ("Dashboard"...)
  const [activeDashboard, setActiveDashboard] = useState("Dashboard");
  // индикатор выполнения запроса
  const [loading, setLoading] = useState(false);
  // общее текстовое сообщение ошибки (показано сверху)
  const [error, setError] = useState(null);
  // объект полевых ошибок (из Laravel validation: errors → { field: [msg] })
  const [formErrors, setFormErrors] = useState({});

  // ф-я для перехода по ссылкам
  const navigate = useNavigate();

  // получаем API из контекста
  const { getCsrf, fetchUser, BACKEND, user, setUser, logout } = useAuth();

  // часть админа
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

  const [productsMeta, setProductsMeta] = useState(null);
  const [categories, setCategories] = useState([]);

  const [showDrawer, setShowDrawer] = useState(false);

  const base = "rounded-lg px-3 border-1 font-bold";
  const enabled = "cursor-pointer border-black";
  const disabled = "cursor-not-allowed bg-gray-200 text-gray-500 opacity-50";

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
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
    currency: "$",
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
      currency: "$",
      discount: "",
    });

  const openCreate = () => {
    resetCreateForm();
    setEditing(false);
    setEditMode(null);
    setShowDrawer(true);
  };

  const [editMode, setEditMode] = useState(null); // product id or null
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    id: null,
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
    currency: "$",
    discount: "",
  });

  const setEditField = (k, v) => setEditForm((s) => ({ ...s, [k]: v }));

  const origEditRef = useRef(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const orig = origEditRef.current;
    if (!orig) {
      setHasChanges(false);
      return;
    }
    const normalize = (v) => (v == null ? "" : String(v));
    const changed =
      normalize(orig.title) !== normalize(editForm.title) ||
      normalize(orig.category_id) !== normalize(editForm.category_id) ||
      normalize(orig.price) !== normalize(editForm.price) ||
      normalize(orig.sku) !== normalize(editForm.sku) ||
      normalize(orig.description) !== normalize(editForm.description) ||
      normalize(orig.weight) !== normalize(editForm.weight) ||
      normalize(orig.material) !== normalize(editForm.material) ||
      normalize(orig.colours) !== normalize(editForm.colours) ||
      String(orig.is_popular) !== String(editForm.is_popular) ||
      normalize(orig.currency) !== normalize(editForm.currency) ||
      normalize(orig.discount) !== normalize(editForm.discount);
    setHasChanges(Boolean(changed));
  }, [editForm]);

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

  useEffect(
    () => {
      let mounted = true;
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/api/user`, {
            credentials: "include",
            headers: { Accept: "application/json" },
          });
          if (!mounted) return;

          if (res.status === 401) {
            // неавторизованный — оставляем user в current context (AuthProvider сам управляет)
            return;
          }

          if (!res.ok) {
            console.warn("User fetch returned non-ok:", res.status);
            return;
          }

          const json = await res.json().catch(() => null);
          const fetchedUser = json && (json.data ?? json);

          // Если backend вернул пользователя, обновим контекст через setUser (если необходимо)
          // Но тут важно не перезаписывать состояние AuthProvider некорректно;
          // мы просто проверим, не-админ ли — тогда не показываем админ-вкладки.
          // Если хотите — можно вызвать fetchUser() из useAuth вместо этого запроса.
          if (!fetchedUser) return;

          if (!fetchedUser.is_admin) {
            // Если пользователь не админ — убедимся, что activeDashboard не админский
            setActiveDashboard("Dashboard");
          }
        } catch (err) {
          console.warn("Failed to fetch /api/user:", err);
        }
      })();
      return () => {
        mounted = false;
      };
    },
    [
      /* no navigate dependency */
    ],
  );

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
      const items = json.data ?? json;
      setAggReviews(Array.isArray(items) ? items : []);
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
            <tr className="text-left">
              <th>#</th>
              <th>Title</th>
              <th>Image</th>
              {/* <th>Image_path</th> */}
              <th>SKU</th>
              <th>Price</th>
              <th>Final Price</th>
              {/* <th>Currency</th> */}
              <th>Discount</th>
              <th>Weight</th>
              <th>Material</th>
              <th>Color</th>
              <th>Popularity</th>
              {/* <th>Category ID</th> */}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-[#e5e7eb]">
                <td>{p.id}.</td>
                <td
                  onDoubleClick={() => {
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
                      currency: p.currency ?? "$",
                      discount:
                        p.discount && p.discount.type === "percent"
                          ? p.discount.value
                          : "",
                    });
                    origEditRef.current = {
                      id: p.id,
                      title: p.title ?? "",
                      category_id: p.category_id ?? p.category?.id ?? "",
                      price: String(p.price ?? ""),
                      sku: p.sku ?? "",
                      description: p.description ?? "",
                      img_url: p.img_url ?? p.img ?? null,
                      weight: p.weight ?? "",
                      material: p.material ?? "",
                      colours: p.colours ?? "",
                      is_popular: !!p.is_popular,
                      currency: p.currency ?? "$",
                      discount:
                        p.discount && p.discount.type === "percent"
                          ? String(p.discount.value)
                          : "",
                    };
                    setHasChanges(false);
                    setEditMode(p.id);
                    setShowDrawer(true);
                  }}
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
                {/* <td>{p.img}</td> */}
                <td>{p.sku}</td>
                <td>
                  {typeof p.price === "number" ? p.price.toFixed(2) : p.price}
                  {(p.currency_symbol ?? currencySymbolFromCode(p.currency)) ||
                    "—"}
                </td>
                <td>
                  {p.final_price != null
                    ? typeof p.final_price === "number"
                      ? p.final_price.toFixed(2)
                      : p.final_price
                    : p.discount && p.discount.price_after != null
                      ? Number(p.discount.price_after).toFixed(2)
                      : typeof p.price === "number"
                        ? p.price.toFixed(2)
                        : p.price}
                  {(p.currency_symbol ?? currencySymbolFromCode(p.currency)) ||
                    "—"}
                </td>
                {/* <td> */}
                {/* {(p.currency_symbol ?? currencySymbolFromCode(p.currency)) ||
                    "—"} */}
                {/* </td> */}
                <td>
                  {(() => {
                    const d =
                      p.discount ??
                      (Array.isArray(p.discounts) && p.discounts[0]) ??
                      null;
                    if (!d) return "—";
                    if (d.type === "percent") {
                      return (
                        <span title={JSON.stringify(d)}>
                          {Number(d.value).toFixed(0)}%
                        </span>
                      );
                    }
                    if (d.type === "fixed") {
                      return (
                        <span title={JSON.stringify(d)}>
                          {Number(d.value).toFixed(2)}{" "}
                          {d.currency ?? p.currency ?? ""}
                        </span>
                      );
                    }
                    if (d.price_after != null && typeof p.price === "number") {
                      const diff = Number(p.price) - Number(d.price_after);
                      return (
                        <span title={JSON.stringify(d)}>
                          {diff > 0
                            ? `-${diff.toFixed(2)} ${d.currency ?? p.currency ?? ""}`
                            : "—"}
                        </span>
                      );
                    }
                    return <span title={JSON.stringify(d)}>raw</span>;
                  })()}
                </td>
                <td>{p.weight ?? "—"}</td>
                <td>{p.material ?? "—"}</td>
                <td>{p.colours ?? "—"}</td>
                <td>{p.is_popular ?? "—"}</td>
                {/* <td>{p.category_id ?? p.category?.id ?? "—"}</td> */}
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
      formData.append("currency", createForm.currency || "$");
      if (createForm.img) formData.append("img", createForm.img);
      formData.append("discount", createForm.discount ?? "");
      formData.append("discount_currency", createForm.currency ?? "$");

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
            product_id: created?.id ?? null,
            sku: (created?.sku || createForm.sku || "").toString(),
            type: "percent",
            value: Number(createForm.discount),
            currency: createForm.currency || "$",
            active: true,
            starts_at: null,
            ends_at: null,
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
    if (!hasChanges) {
      alert("Внесите изменения перед обновлением");
      return;
    }
    setEditing(true);
    try {
      try {
        await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
          credentials: "include",
        });
      } catch (e) {
        //
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
      formData.append("currency", editForm.currency || "$");
      if (editForm.img instanceof File) formData.append("img", editForm.img);
      formData.append("discount", editForm.discount ?? "");
      formData.append("discount_currency", editForm.currency || "$");

      formData.append("_method", "PUT");

      const res = await fetch(`${API_BASE}/api/admin/products/${editForm.id}`, {
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

      try {
        if (editForm.discount && Number(editForm.discount) > 0) {
          await fetch(`${API_BASE}/api/admin/discounts`, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-XSRF-TOKEN": getXsrf(),
              Accept: "application/json",
            },
            body: JSON.stringify({
              product_id: editForm.id,
              type: "percent",
              value: Number(editForm.discount),
              currency: editForm.currency || "$",
              active: true,
            }),
          });
        } else {
          await fetch(
            `${API_BASE}/api/admin/discounts?product_id=${editForm.id}`,
            {
              method: "DELETE",
              credentials: "include",
              headers: {
                "X-XSRF-TOKEN": getXsrf(),
                Accept: "application/json",
              },
            },
          );
        }
      } catch (err) {
        console.warn("Discount upsert/delete failed", err);
      }

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

  async function handleDelete() {
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
  }

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

  //завершение части админа

  // ф-я очистки поля с текстом ошибки
  const clearErrorOnInput = (e) => {
    const name = e.target.name;
    setError(null);
    if (formErrors && formErrors[name]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // вспомогательная функция; берёт cookie по имени (используется для XSRF-TOKEN)
  const getCookie = (name) => {
    const match = document.cookie.match(
      new RegExp("(^| )" + name + "=([^;]+)"),
    );
    return match ? decodeURIComponent(match[2]) : null;
  };

  // валидация на клиенте
  const isValidName = (name) => {
    if (!name) return false;
    const trimmed = name.trim();
    return /^[A-Za-zА-Яа-яЁё\s]{2,}$/.test(trimmed);
  };

  const isValidEmail = (email) => {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPassword = (password) => {
    return typeof password === "string" && password.length >= 6;
  };

  // для полей форм входа и регистрации
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  // вычисляемые флаги:
  const canSubmitLogin =
    isValidEmail(loginEmail) && isValidPassword(loginPassword) && !loading;
  const canSubmitRegister =
    isValidName(regName) &&
    isValidEmail(regEmail) &&
    isValidPassword(regPassword) &&
    regPassword === regConfirmPassword &&
    !loading;

  // вспомогательная функция для обработки ошибок ответа сервера (формат Laravel)
  const handleResponseErrors = async (res) => {
    const data = await res.json().catch(() => ({}));
    if (data.errors && typeof data.errors === "object") {
      const flat = {};
      Object.entries(data.errors).forEach(([k, v]) => {
        flat[k] = Array.isArray(v) ? v[0] : String(v);
      });
      setFormErrors(flat);
      setError(
        flat[Object.keys(flat)[0]] || data.message || "Validation error",
      );
      return true;
    }
    if (data.message) {
      setError(data.message);
      return true;
    }
    return false;
  };

  const [orders, setOrders] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      await getCsrf();
      const res = await fetch(`${BACKEND}/api/orders`, {
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
        },
      });
      if (res.status === 401) {
        await fetchUser();
        setOrders([]);
        return;
      }
      if (!res.ok) throw new Error("Failed to load orders");
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : json;
      setOrders(list);
    } catch (err) {
      console.error("Load orders failed", err);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  // логика входа
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFormErrors({});

    const form = e.target;
    const email = form.email.value.trim();
    const password = form.password.value;

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("Password should be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await getCsrf();
      const res = await fetch(`${BACKEND}/api/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const handled = await handleResponseErrors(res);
        if (handled) return;
        throw new Error("Login failed");
      }

      const serverUser = await fetchUser();
      if (serverUser) {
        setUser(serverUser);
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Login error");
    } finally {
      setLoading(false);
    }
  };

  // регистрация
  const handleSubmitReg = async (e) => {
    e.preventDefault();
    setError(null);
    setFormErrors({});

    const form = e.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const password_confirmation = form.confirmPassword.value;

    if (!isValidName(name)) {
      setError(
        "Name should be at least 2 letters and contain only letters and spaces.",
      );
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("Password should be at least 6 characters.");
      return;
    }
    if (password !== password_confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await getCsrf();
      const res = await fetch(`${BACKEND}/api/register`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
        },
        body: JSON.stringify({ name, email, password, password_confirmation }),
      });

      if (!res.ok) {
        const handled = await handleResponseErrors(res);
        if (handled) return;
        throw new Error("Registration failed");
      }

      const serverUser = await fetchUser();
      if (serverUser) {
        setUser(serverUser);
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Registration error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeDashboard === "Orders") {
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDashboard]);

  useEffect(() => {
    if (activeDashboard === "Products") {
      loadProductsPage(1, true);
      return;
    }
    if (activeDashboard === "Reviews") {
      loadAdminReviews(1);
      return;
    }
  }, [activeDashboard]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="my-62 mb-72">
      <div className="max-w-125 mx-auto">
        {user && user.is_admin ? (
          <div className="account-header">
            {" "}
            <h1 className="admin-banner admin-banner--large">
              Админ панель
            </h1>{" "}
          </div>
        ) : (
          <h1 className="text-[33px] font-medium text-center mb-6">
            My account
          </h1>
        )}
        {/* GitHub OAuth button */}
        {!user && (
          <div className="max-w-125 mx-auto mb-10">
            {" "}
            <button
              type="button"
              onClick={() => {
                const backend =
                  typeof BACKEND !== "undefined" && BACKEND
                    ? BACKEND.replace(/\/$/, "")
                    : "http://shopper.local";
                window.location.href = `${backend}/auth/github`;
              }}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 font-medium border rounded-sm bg-white hover:bg-[#EFEFEF] text-black cursor-pointer"
              aria-label="Sign in with GitHub"
            >
              {" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                {" "}
                <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.9 3.19 9.06 7.61 10.53.56.1.76-.24.76-.53 0-.26-.01-1-.02-1.95-3.09.67-3.74-1.49-3.74-1.49-.5-1.28-1.22-1.62-1.22-1.62-.99-.68.08-.67.08-.67 1.1.08 1.68 1.13 1.68 1.13.97 1.66 2.54 1.18 3.15.9.1-.7.38-1.18.69-1.45-2.47-.28-5.07-1.24-5.07-5.53 0-1.22.44-2.22 1.16-3-.12-.28-.5-1.42.11-2.96 0 0 .95-.3 3.12 1.15a10.8 10.8 0 012.84-.38c.96.01 1.93.13 2.84.38 2.16-1.45 3.11-1.15 3.11-1.15.62 1.54.24 2.68.12 2.96.72.78 1.16 1.78 1.16 3 0 4.29-2.61 5.24-5.09 5.52.39.34.73 1.02.73 2.06 0 1.49-.01 2.69-.01 3.06 0 .3.2.64.77.53 4.42-1.47 7.61-5.63 7.61-10.53C23.25 5.48 18.27.5 12 .5z" />{" "}
              </svg>
              <span>Log in through the GitHub</span>
            </button>
          </div>
        )}
      </div>

      {error && <div className="text-red-500 mb-4 text-center">{error}</div>}
      <div className=" mb-4 text-center">
        {loading ? <div>Loading...</div> : null}
      </div>

      {user ? (
        <div className="w-full">
          <Tabs
            categories={
              user && user.is_admin
                ? ["Products", "Reviews", "Logout"]
                : [
                    "Dashboard",
                    "Orders",
                    "Downloads",
                    "Addresses",
                    "Account details",
                    "Logout",
                  ]
            }
            activeCategory={activeDashboard}
            onCategoryChange={(category) => setActiveDashboard(category)}
            tabClassName="flex list-none gap-12 justify-start border-b border-[#D8D8D08]"
            tabItemClassName="inline-flex pl-0 items-center justify-center px-4 py-2 text-lg cursor-pointer"
            activeClassName="text-black border-b-2 border-black"
            inactiveClassName="text-gray-500"
          />

          {activeDashboard === "Products" && (
            <section>
              <div className="pt-2 flex items-center justify-between mb-4">
                {" "}
                <button
                  type="button"
                  onClick={() => {
                    // очистим форму создания и откроем Drawer в режиме создания
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
                      currency: "$",
                      discount: "",
                    });
                    setEditMode(null);
                    setShowDrawer(true);
                  }}
                  className="py-2 px-3 rounded bg-black text-white hover:bg-gray-700 cursor-pointer hover:text-white"
                >
                  {" "}
                  Create product{" "}
                </button>{" "}
              </div>
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
          {activeDashboard === "Reviews" && (
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
                              <strong>
                                {r.name ?? r.user?.name ?? "User"}
                              </strong>
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

          {activeDashboard === "Dashboard" && (
            <div className="mt-10 mb-51">
              <p>
                From your account dashboard you can view your{" "}
                <span className="text-[#A18A68]">recent orders</span>, manage
                your
                <span className="text-[#A18A68]">
                  Lshipping and billing addresses
                </span>
                , and edit your{" "}
                <span className="text-[#A18A68]">
                  password and account details
                </span>
                .
              </p>
            </div>
          )}

          {activeDashboard === "Orders" && (
            <div className="mt-10 mb-50">
              {" "}
              {ordersLoading ? (
                <div>Loading orders…</div>
              ) : !orders || orders.length === 0 ? (
                <div className="text-[#707070]">No orders yet</div>
              ) : (
                <table className="w-full">
                  {" "}
                  <thead>
                    {" "}
                    <tr className="pb-4 border-b">
                      {" "}
                      <th className="pb-4 pr-35 text-left">
                        ORDER NUMBER
                      </th>{" "}
                      <th className="pb-4 pr-35 text-left">DATE</th>{" "}
                      <th className="pb-4 pr-35 text-left">STATUS</th>{" "}
                      <th className="pb-4 pr-35 text-left">TOTAL</th>{" "}
                      <th className="pb-4 pr-35 text-left">ACTIONS</th>{" "}
                    </tr>{" "}
                  </thead>{" "}
                  <tbody>
                    {" "}
                    {orders.map((o) => (
                      <tr
                        key={o.id}
                        className="border-b border-[#D8D8D8] text-[#707070]"
                      >
                        {" "}
                        <td className="py-6 text-left">{o.number}</td>{" "}
                        <td className="py-6 text-left">
                          {" "}
                          {o.created_at
                            ? new Date(o.created_at).toLocaleString()
                            : "-"}{" "}
                        </td>{" "}
                        <td className="py-6 text-left">{o.status}</td>{" "}
                        <td className="py-6 text-left">
                          ${((o.totals && o.totals.total) || 0).toFixed(2)}
                        </td>{" "}
                        <td className="py-6 text-left">
                          {" "}
                          <button
                            onClick={() => navigate(`/orderDetails/${o.id}`)}
                            className="text-blue-600 underline"
                          >
                            {" "}
                            View{" "}
                          </button>{" "}
                        </td>{" "}
                      </tr>
                    ))}{" "}
                  </tbody>{" "}
                </table>
              )}{" "}
            </div>
          )}

          {activeDashboard === "Downloads" && (
            <div className="mt-10 mb-50">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-4 pr-35">ORDER NUMBER</th>
                    <th className="pb-4 pr-35">DATE</th>
                    <th className="pb-4 pr-35">STATUS</th>
                    <th className="pb-4 pr-35">TOTAL</th>
                    <th className="pb-4 pr-35">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#D8D8D8] text-[#707070] text-left">
                    <td className="py-6">text</td>
                    <td className="py-6">text</td>
                    <td className="py-6">text</td>
                    <td className="py-6">text</td>
                    <td className="py-6">text</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeDashboard === "Addresses" && (
            <div className="mt-10 mb-50">
              <div className="w-full flex justify-between text-[#707070] mb-62">
                <div className="w-[46%]">
                  <h2 className="text-2xl text-black">Billing Details</h2>
                  <form className="mb-16">
                    <div className="w-full flex justify-between items-center border-b border-[#D8D8D8]">
                      <div className="w-[46%] pt-7 pb-3">
                        <input
                          type="text"
                          name="first"
                          placeholder="First name *"
                        />
                      </div>
                      <div className="w-[46%] pt-7 pb-3">
                        <input
                          type="text"
                          name="last"
                          placeholder="Last name *"
                        />
                      </div>
                    </div>
                    <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
                      <input
                        type="text"
                        name="company"
                        placeholder="Company Name"
                      />
                    </div>
                    <Select
                      className="w-full pt-7 pb-3 border-b border-[#D8D8D8] text-[#c6c2c2]  appearance-none"
                      arrowClassName="w-[16px] h-[16px] absolute top-[32px] right-3 pointer-events-none"
                    />
                    <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
                      <input
                        type="text"
                        name="street"
                        placeholder="Street Address *"
                      />
                    </div>
                    <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
                      <input
                        type="text"
                        name="postCode"
                        placeholder="Postcode / ZIP *"
                      />
                    </div>
                    <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
                      <input
                        type="text"
                        name="city"
                        placeholder="Town / City *"
                      />
                    </div>
                    <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
                      <input type="text" name="phone" placeholder="Phone *" />
                    </div>
                    <div className="pt-7 pb-3 border-b border-[#D8D8D8]">
                      <input type="email" name="email" placeholder="Email *" />
                    </div>
                  </form>
                  <div className="w-1/2">
                    <Button color="black" name="SAVE ADDRESS" />
                  </div>
                </div>

                <div className="w-[46%]">
                  <h2 className="text-2xl text-black pb-7">Shipping Address</h2>
                  <p className="mb-4 font-bold text-[#A18A68]">ADD</p>
                  <p className="text-[Y#707070]">
                    You have not set up this type of address yet.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeDashboard === "Account details" && (
            <div className="mt-10 mb-50">
              <form className="max-w-lg">
                <label className="block mb-4">
                  <span className="text-sm text-gray-700">Full name</span>
                  <input
                    type="text"
                    name="name"
                    className="w-full border-b py-2 mt-2 focus:outline-none"
                    placeholder="Your name"
                    autoComplete="name"
                    required
                  />
                </label>

                <label className="block mb-4">
                  <span className="text-sm text-gray-700">Email</span>
                  <input
                    type="email"
                    name="email"
                    className="w-full border-b py-2 mt-2 focus:outline-none"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="block mb-4">
                  <span className="text-sm text-gray-700">
                    Password (leave blank to keep)
                  </span>
                  <input
                    type="password"
                    name="password"
                    className="w-full border-b py-2 mt-2 focus:outline-none"
                    placeholder="New password"
                    autoComplete="new-password"
                  />
                </label>
                <div className="w-1/2 mt-10 mb-62">
                  <Button type="submit" color="black" name="SAVE ADDRESS" />
                </div>
              </form>
            </div>
          )}

          {activeDashboard === "Logout" && (
            <div className="mt-10 mb-50">
              <p className="inline-block text-xl font-medium mb-4 mr-10">
                <span className="text-[#A18A68]">Log out</span> of your account
              </p>
              <div className="inline-block w-34">
                <Button
                  color="black"
                  name="Confirm logout"
                  onClick={async () => {
                    try {
                      await logout(); // разлогин (AuthProvider.logout) — уже не делает redirect
                      navigate("/", { replace: true }); // внутри SPA — плавный переход на главную
                    } catch (err) {
                      console.error("Logout failed", err);
                      // при необходимости показать ошибку пользователю
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-51 max-w-125 mx-auto">
          <div className=" w-full p-1 bg-[#EFEFEF] mb-12 rounded-sm">
            <Tabs
              categories={["Sign in", "Register"]}
              activeCategory={activeCategory}
              onCategoryChange={(category) => setActiveCategory(category)}
              tabClassName="flex w-full bg-[#EFEFEF] p-1 rounded-sm"
              tabItemClassName="flex-1 text-center py-4 font-medium rounded-sm"
              activeClassName="bg-white text-black cursor-pointer"
              inactiveClassName="bg-transparent text-[#707070] cursor-pointer"
            />
          </div>

          {activeCategory === "Sign in" && (
            <div className="text-[#707070]" id="sign-content">
              {" "}
              <form
                onSubmit={handleSubmit}
                noValidate
                className="w-full mx-auto"
              >
                {" "}
                <div className="mb-4">
                  {" "}
                  <label
                    htmlFor="login-email"
                    className="block mb-1 text-sm text-gray-700"
                  >
                    {" "}
                    Email{" "}
                  </label>{" "}
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    value={loginEmail}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLoginEmail(v);
                      clearErrorOnInput(e);
                      // live validation
                      if (!isValidEmail(v.trim())) {
                        setFormErrors((prev) => ({
                          ...prev,
                          email: "Введите корректный email",
                        }));
                      } else {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.email;
                          return n;
                        });
                      }
                    }}
                    className="w-full pb-3 border-b border-[#D8D8D8] mb-2"
                    placeholder="Email*"
                    required
                  />{" "}
                  {formErrors.email && (
                    <div className="text-red-500 text-sm mb-2">
                      {formErrors.email}
                    </div>
                  )}{" "}
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="login-password"
                    className="block mb-1 text-sm text-gray-700"
                  >
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    name="password"
                    value={loginPassword}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLoginPassword(v);
                      clearErrorOnInput(e);
                      // live validation
                      if (!isValidPassword(v)) {
                        setFormErrors((prev) => ({
                          ...prev,
                          password:
                            "Пароль должен содержать минимум 6 символов",
                        }));
                      } else {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.password;
                          return n;
                        });
                      }
                    }}
                    className="w-full pb-3 border-b border-[#D8D8D8] mb-2"
                    placeholder="Password*"
                    required
                  />
                  {formErrors.password && (
                    <div className="text-red-500 text-sm mb-2">
                      {formErrors.password}
                    </div>
                  )}
                </div>
                <div className="w-[27%] flex items-center justify-between gap-x-2 mb-6">
                  <input type="checkbox" id="rememberMe" className="w-4 h-4" />
                  <label htmlFor="rememberMe" className="text-sm">
                    Remember me
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={
                    !isValidEmail(loginEmail.trim()) ||
                    !isValidPassword(loginPassword) ||
                    loading
                  }
                  className={`block w-full text-center mb-3 mx-auto py-4 font-bold border rounded-sm ${!isValidEmail(loginEmail.trim()) || !isValidPassword(loginPassword) || loading ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-black text-white hover:bg-white hover:text-black"}`}
                >
                  {loading ? "Signing..." : "Sign in"}
                </button>
                <Link
                  to="#"
                  className="block w-full py-4 px-10 text-center hover:border rounded-sm cursor-pointer bg-white text-black"
                >
                  Have you forgotten your password?
                </Link>
              </form>
            </div>
          )}

          {activeCategory === "Register" && (
            <form
              onSubmit={handleSubmitReg}
              noValidate
              className="w-full mx-auto"
            >
              {" "}
              <div className="text-[#707070]" id="additional-information">
                {" "}
                <div className="mb-4">
                  {" "}
                  <label
                    htmlFor="reg-name"
                    className="block mb-1 text-sm text-gray-700"
                  >
                    {" "}
                    Name{" "}
                  </label>{" "}
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    value={regName}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRegName(v);
                      clearErrorOnInput(e);
                      // live validation
                      if (!isValidName(v)) {
                        setFormErrors((prev) => ({
                          ...prev,
                          name: "Имя минимум 2 буквы",
                        }));
                      } else {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.name;
                          return n;
                        });
                      }
                    }}
                    className="w-full pb-3 border-b border-[#D8D8D8] mb-2"
                    placeholder="Name*"
                    required
                  />{" "}
                  {formErrors.name && (
                    <div className="text-red-500 text-sm mb-2">
                      {formErrors.name}
                    </div>
                  )}{" "}
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="reg-email"
                    className="block mb-1 text-sm text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRegEmail(v);
                      clearErrorOnInput(e);
                      // live validation
                      if (!isValidEmail(v.trim())) {
                        setFormErrors((prev) => ({
                          ...prev,
                          email: "Введите корректный email",
                        }));
                      } else {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.email;
                          return n;
                        });
                      }
                    }}
                    className="w-full pb-3 border-b border-[#D8D8D8] mb-2"
                    placeholder="Email*"
                    required
                  />
                  {formErrors.email && (
                    <div className="text-red-500 text-sm mb-2">
                      {formErrors.email}
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="reg-password"
                    className="block mb-1 text-sm text-gray-700"
                  >
                    Password
                  </label>
                  <input
                    id="reg-password"
                    name="password"
                    type="password"
                    value={regPassword}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRegPassword(v);
                      clearErrorOnInput(e);
                      // live validation
                      if (!isValidPassword(v)) {
                        setFormErrors((prev) => ({
                          ...prev,
                          password:
                            "Пароль должен содержать минимум 6 символов",
                        }));
                      } else {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.password;
                          return n;
                        });
                      }
                      // also validate confirm if present
                      if (regConfirmPassword && v !== regConfirmPassword) {
                        setFormErrors((prev) => ({
                          ...prev,
                          password_confirmation: "Пароли не совпадают",
                        }));
                      } else if (regConfirmPassword) {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.password_confirmation;
                          return n;
                        });
                      }
                    }}
                    className="w-full pb-3 border-b border-[#D8D8D8] mb-2"
                    placeholder="Password*"
                    required
                  />
                  {formErrors.password && (
                    <div className="text-red-500 text-sm mb-2">
                      {formErrors.password}
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <label
                    htmlFor="reg-confirm"
                    className="block mb-1 text-sm text-gray-700"
                  >
                    Confirm password
                  </label>
                  <input
                    id="reg-confirm"
                    name="confirmPassword"
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRegConfirmPassword(v);
                      clearErrorOnInput(e);
                      if (v !== regPassword) {
                        setFormErrors((prev) => ({
                          ...prev,
                          password_confirmation: "Пароли не совпадают",
                        }));
                      } else {
                        setFormErrors((prev) => {
                          const n = { ...prev };
                          delete n.password_confirmation;
                          return n;
                        });
                      }
                    }}
                    className="w-full pb-3 border-b border-[#D8D8D8] mb-2"
                    placeholder="Confirm password*"
                    required
                  />
                  {formErrors.password_confirmation && (
                    <div className="text-red-500 text-sm mb-2">
                      {formErrors.password_confirmation}
                    </div>
                  )}
                </div>
                <div className="w-[32%] flex items-center justify-between gap-x-2 mb-4">
                  <input type="checkbox" id="registerMe" className="w-4 h-4" />
                  <label htmlFor="registerMe">I agree to Terms</label>
                </div>
                <button
                  type="submit"
                  disabled={
                    !isValidName(regName) ||
                    !isValidEmail(regEmail.trim()) ||
                    !isValidPassword(regPassword) ||
                    regPassword !== regConfirmPassword ||
                    loading
                  }
                  className={`block w-full text-center mb-3 mx-auto py-4 font-bold border rounded-sm ${!isValidName(regName) || !isValidEmail(regEmail.trim()) || !isValidPassword(regPassword) || regPassword !== regConfirmPassword || loading ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-black text-white hover:bg-white hover:text-black"}`}
                >
                  {loading ? "Registering..." : "Register"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
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
        {/* form */}
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
                <option value="$">$</option>
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
              className="form-textarea resize-none overflow-auto"
              rows={5}
              maxLength={500}
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
            {/* preview */}
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

          <div className="form-actions">
            {editMode ? (
              <>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={async () => {
                    await handleDelete();
                  }}
                  disabled={editing}
                >
                  {editing ? "Deleting..." : "Delete"}
                </button>

                <button
                  type="submit"
                  disabled={!hasChanges}
                  className={`${base} ${!hasChanges ? disabled : enabled}`}
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

export default Account;
