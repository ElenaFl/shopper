import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

/**
 * Blog — страница списка постов блога.
 *
 * Загружает посты с API (/api/blog/posts), отображает карточки постов и позволяет
 * фильтровать их по категориям (categories, fashion, style, accessories, season).
 * При клике на карточку или на "Read More" происходит навигация на страницу поста.
 *
 * Компонент хранит локальное состояние: posts (массив постов), loading (индикатор загрузки),
 * error (сообщение об ошибке) и activeTab (текущая выбранная категория).
 *
 * Функция fetchPosts(tag) делает запрос к API, поддерживает формат ответа массив или { data: [...] },
 * обновляет состояние и обрабатывает ошибки. При монтировании загружаются все посты,
 * при смене вкладки загружаются посты по соответствующему тегу.
 *
 * В UI слева — список категорий (кнопки), справа — сетка карточек постов с изображением, датой,
 * заголовком, отрывком и ссылкой для перехода. При отсутствии постов показывается сообщение "No posts found."
 * Во время загрузки отображается "Loading posts...", при ошибке — текст ошибки.
 */
export const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("categories"); // categories|fashion|style|accessories|season
  const navigate = useNavigate();

  const fetchPosts = async (tag = null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (tag && tag !== "categories") params.set("tag", tag);
      const url = `http://shopper.local/api/blog/posts${params.toString() ? "?" + params.toString() : ""}`;
      const res = await fetch(url, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Fetch error " + res.status);
      const json = await res.json();
      const items = Array.isArray(json) ? json : (json?.data ?? []);
      setPosts(items);
    } catch (e) {
      setError("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (activeTab === "categories") {
      fetchPosts();
    } else {
      fetchPosts(activeTab);
    }
  }, [activeTab]);

  const handleReadMore = (id) => {
    navigate(`/blog/${id}`);
  };

  if (loading) return <div className="mt-55">Loading posts...</div>;
  if (error) return <div className="mt-55 text-red-500">{error}</div>;

  return (
    <div className="mt-55 mb-62">
      <h1 className="text-[33px] font-medium mb-9">Blog</h1>
      <div className="flex justify-between gap-x-10">
        <div className="w-[21%]">
          <h3 className="text-xl mb-11">Categories</h3>
          <nav className="flex flex-col text-[#707070]">
            <button
              onClick={() => setActiveTab("categories")}
              className={`mb-2.5 text-left ${activeTab === "categories" ? "text-black font-medium" : ""}`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("fashion")}
              className={`mb-2.5 text-left ${activeTab === "fashion" ? "text-black font-medium" : ""}`}
            >
              Fashion
            </button>
            <button
              onClick={() => setActiveTab("style")}
              className={`mb-2.5 text-left ${activeTab === "style" ? "text-black font-medium" : ""}`}
            >
              Style
            </button>
            <button
              onClick={() => setActiveTab("accessories")}
              className={`mb-2.5 text-left ${activeTab === "accessories" ? "text-black font-medium" : ""}`}
            >
              Accessories
            </button>
            <button
              onClick={() => setActiveTab("season")}
              className={`text-left ${activeTab === "season" ? "text-black font-medium" : ""}`}
            >
              Season
            </button>
          </nav>
        </div>

        <div className="w-[76%] flex items-center justify-between flex-wrap gap-x-10 gap-y-16">
          {posts.length === 0 ? (
            <div className="w-full text-center text-[#707070]">
              No posts found.
            </div>
          ) : (
            posts.map((p) => (
              <div key={p.id} className="w-112.5">
                <div
                  className="w-full h-120 mb-6 cursor-pointer"
                  onClick={() => handleReadMore(p.id)}
                >
                  <img
                    className="w-full h-full object-cover"
                    src={p.img_url || p.img || "/images/placeholder.png"}
                    alt={p.title}
                  />
                </div>
                <div className="mb-1.5 text-sm text-[#707070]">
                  {p.published_at
                    ? new Date(p.published_at).toLocaleDateString()
                    : ""}
                </div>
                <h3 className="mb-4 text-xl">{p.title}</h3>
                <p className="mb-6 text-[#707070]">{p.excerpt}</p>
                <span
                  className="text-[#A18A68] font-bold cursor-pointer"
                  onClick={() => handleReadMore(p.id)}
                >
                  Read More
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Blog;
