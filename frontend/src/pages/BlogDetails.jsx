import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth/AuthContext.jsx";

export const BlogDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, fetchUser } = useContext(AuthContext);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  const loadPost = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://shopper.local/api/blog/posts/${id}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Post not found");
        throw new Error("Failed to load post: " + res.status);
      }
      const json = await res.json();
      const payload = json?.data ?? json;
      setPost(payload);
    } catch (e) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPost();
  }, [id]);

  const openImage = (src) => {
    setLightboxSrc(src);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };
  const closeImage = () => {
    setLightboxOpen(false);
    setLightboxSrc(null);
    document.body.style.overflow = "";
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to post a comment");
      return;
    }
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${process.env.VITE_API_BASE || ""}/sanctum/csrf-cookie`, {
        credentials: "include",
      }).catch(() => {});
      const raw = (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || "";
      const xsrf = raw ? decodeURIComponent(raw) : "";

      const res = await fetch(
        `http://shopper.local/api/blog/posts$/{id}/comments`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": xsrf,
            Accept: "application/json",
          },
          body: JSON.stringify({ body: commentText }),
        },
      );

      if (!res.ok) {
        if (res.status === 401) {
          await fetchUser?.();
          throw new Error("Unauthorized");
        }
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to submit comment");
      }

      const json = await res.json();
      const created = json?.data ?? json;
      setPost((p) => ({
        ...p,
        comments: Array.isArray(p.comments)
          ? [...p.comments, created]
          : [created],
      }));
      setCommentText("");
    } catch (e) {
      alert(e.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="mt-55">Loading...</div>;
  if (error) return <div className="mt-55 text-red-500">{error}</div>;
  if (!post) return <div className="mt-55">Post not found</div>;

  return (
    <div className="mt-55 mb-62">
      <h1 className="mb-4 text-[33px] text-center font-medium">{post.title}</h1>

      <p className="text-xl text-center mb-12 text-[#7F7F7F]">
        by{" "}
        <b>
          <span className="text-black">{post.author?.name ?? "Author"}</span>
        </b>{" "}
        -{" "}
        {post.published_at
          ? new Date(post.published_at).toLocaleDateString()
          : ""}
      </p>

      <div className="w-full h-auto mb-16">
        <img
          src={post.img_url || post.img || "/images/placeholder.png"}
          alt={post.title}
          className="w-full h-120 object-cover rounded-md cursor-zoom-in"
          onClick={() =>
            openImage(post.img_url || post.img || "/images/placeholder.png")
          }
        />
      </div>

      <div className="w-2xl m-auto">
        <div className="mb-6 text-[#707070] whitespace-pre-line">
          {post.body}
        </div>

        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="mb-8">
            <strong>Tags:</strong>{" "}
            {post.tags.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/blog?tag=${t.slug}`)}
                className="text-blue-600 mr-3"
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-[#D8D8D8] pt-12">
          <h2 className="text-[26px] mb-4">Leave a reply</h2>
          <p className="mb-6 text-[#707070]">
            Your email address will not be published. Required fields are marked
            *
          </p>

          {user ? (
            <form onSubmit={submitComment} className="mb-16">
              <textarea
                className="w-full mb-4 border-b border-[#D8D8D8]"
                rows={4}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Your Comment*"
                required
              />
              <div className="w-[22%]">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full h-12 font-semibold rounded-sm ${submitting ? "bg-gray-200 text-gray-400" : "bg-black text-white"}`}
                >
                  {submitting ? "Posting..." : "POST COMMENT"}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 border border-[#E5E7EB] rounded-sm">
              <p className="mb-4 text-[#707070]">
                Please log in to submit a comment for this post.
              </p>
              <a href="/account" className="text-blue-600">
                Go to login
              </a>
            </div>
          )}

          <h2 className="mb-11 text-[26px]">
            Comments ({post.comments?.length ?? 0})
          </h2>

          {Array.isArray(post.comments) && post.comments.length > 0 ? (
            post.comments.map((c) => (
              <div key={c.id} className="w-full mb-12">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-x-4">
                    <img
                      src={
                        c.user?.avatar_url || "/images/avatar-placeholder.png"
                      }
                      alt={c.user?.name || "User"}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="text-xl">
                        {c.user?.name || c.user_name || "User"}
                      </h3>
                      <span className="text-[#707070] text-sm">
                        {c.created_at
                          ? new Date(c.created_at).toLocaleString()
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[#707070]">{c.body}</p>
              </div>
            ))
          ) : (
            <div>No comments yet.</div>
          )}
        </div>
      </div>

      {lightboxOpen && (
        <div
          onClick={closeImage}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
        >
          <div className="relative max-w-[90%] max-h-[90%]">
            <button
              onClick={closeImage}
              className="absolute right-2 top-2 text-white text-2xl"
            >
              ×
            </button>
            <img
              src={lightboxSrc}
              alt="preview"
              className="w-full h-auto max-h-[90vh] object-contain rounded-md"
            />
          </div>
        </div>
      )}
    </div>
  );
};
