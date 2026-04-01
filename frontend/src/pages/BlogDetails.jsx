import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth/AuthContext.jsx";

export const BlogDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, fetchUser } = useContext(AuthContext);

  const API_BASE = import.meta.env.VITE_API_BASE || "http://shopper.local";

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // comments UI
  const COMMENTS_PAGE_SIZE = 5;
  const [showAllComments, setShowAllComments] = useState(false);
  const [replyFor, setReplyFor] = useState(null); // comment id for which reply box is open
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const loadPost = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/blog/posts/${id}`, {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // relative time helper
  const timeAgo = (iso) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}d`;
    const month = Math.floor(day / 30);
    if (month < 12) return `${month}mo`;
    const year = Math.floor(month / 12);
    return `${year}y`;
  };

  const canDeleteComment = (c) => {
    if (!user) return false;
    if (c.user_id && user.id === c.user_id) return true;
    return Boolean(user.is_admin ?? false);
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
        credentials: "include",
      }).catch(() => {});
      const raw = (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || "";
      const xsrf = raw ? decodeURIComponent(raw) : "";

      const res = await fetch(`${API_BASE}/api/blog/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "X-XSRF-TOKEN": xsrf,
          "X-Requested-With": "XMLHttpRequest",
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          await fetchUser?.();
          throw new Error("Unauthorized");
        }
        throw new Error("Failed to delete comment");
      }

      // update local post.comments and comments_count
      setPost((p) => {
        const remaining = Array.isArray(p.comments)
          ? p.comments.filter((x) => x.id !== commentId)
          : [];
        const updated = { ...p, comments: remaining };
        if (typeof updated.comments_count !== "undefined")
          updated.comments_count = remaining.length;
        return updated;
      });
    } catch (err) {
      alert(err.message || "Error");
    }
  };

  const submitComment = async (e, parentId = null) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to post a comment");
      return;
    }
    const bodyText = parentId ? replyText.trim() : commentText.trim();
    if (!bodyText) return;
    if (parentId) setSubmittingReply(true);
    else setSubmitting(true);

    try {
      await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
        credentials: "include",
      }).catch(() => {});
      const raw = (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || "";
      const xsrf = raw ? decodeURIComponent(raw) : "";

      // include parent_id in body if replies supported on server (backend must handle parent_id)
      const payload = parentId
        ? { body: bodyText, parent_id: parentId }
        : { body: bodyText };

      const res = await fetch(`${API_BASE}/api/blog/posts/${id}/comments`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrf,
          "X-Requested-With": "XMLHttpRequest",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 401) {
          await fetchUser?.();
          throw new Error("Unauthorized");
        }
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to submit comment");
      }

      const json = await res.json().catch(() => null);

      // backend may return { post, comment } or comment
      if (json) {
        if (json.post) {
          const payloadPost = json.post?.data ?? json.post;
          setPost(payloadPost);
        } else if (json.comment) {
          const created = json.comment?.data ?? json.comment;
          setPost((p) => {
            const newComments = Array.isArray(p.comments)
              ? [...p.comments, created]
              : [created];
            return {
              ...p,
              comments: newComments,
              comments_count: newComments.length,
            };
          });
        } else {
          const created = json?.data ?? json;
          setPost((p) => {
            const newComments = Array.isArray(p.comments)
              ? [...p.comments, created]
              : [created];
            return {
              ...p,
              comments: newComments,
              comments_count: newComments.length,
            };
          });
        }
      }

      if (parentId) {
        setReplyText("");
        setReplyFor(null);
      } else {
        setCommentText("");
      }
    } catch (err) {
      alert(err.message || "Error");
    } finally {
      if (parentId) setSubmittingReply(false);
      else setSubmitting(false);
    }
  };

  // render helpers for avatars: map some names to avatar files, or fallback
  const avatarFor = (name) => {
    if (!name) return "/images/avatar-placeholder.png";
    const n = name.split(" ")[0] || name;
    if (n.toLowerCase().includes("elena")) return "/images/avatarElena.webp";
    if (n.toLowerCase().includes("anna")) return "/images/avatarAnna.webp";
    // add more mappings as needed
    return "/images/avatar-placeholder.png";
  };

  if (loading) return <div className="mt-55">Loading...</div>;
  if (error) return <div className="mt-55 text-red-500">{error}</div>;
  if (!post) return <div className="mt-55">Post not found</div>;

  // comments: show newest first, paginate client-side by showing last COMMENTS_PAGE_SIZE but render in reverse (newest at top)
  const allComments = Array.isArray(post.comments) ? post.comments : [];
  // ensure sorted by created_at ascending in data; for display newest first:
  const sortedComments = [...allComments].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );
  const displayComments = showAllComments
    ? sortedComments.slice().reverse()
    : sortedComments.slice(-COMMENTS_PAGE_SIZE).reverse();

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

      {/* Post image - kept as requested earlier; if you want to remove, delete this block */}
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
            <form onSubmit={(e) => submitComment(e, null)} className="mb-16">
              <textarea
                className="w-full mb-4 border-b border-[#D8D8D08]"
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
                  className={`w-full h-12 font-semibold rounded-sm ${submitting ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-black text-white"}`}
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

          {displayComments.length === 0 ? (
            <div>No comments yet.</div>
          ) : (
            displayComments.map((c) => (
              <div key={c.id} className="w-full mb-12">
                <div className="mb-4 flex items-start gap-x-4">
                  <img
                    src={
                      c.user?.avatar_url ||
                      avatarFor(c.user?.name) ||
                      "/images/avatar-placeholder.png"
                    }
                    alt={c.user?.name || "User"}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-x-3">
                        <h3 className="text-xl">
                          {c.user?.name || c.user_name || "User"}
                        </h3>
                        <span
                          className="text-sm text-[#707070]"
                          title={c.created_at || ""}
                        >
                          {timeAgo(c.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-x-2">
                        <button
                          onClick={() => setReplyFor(c.id)}
                          className="text-sm text-blue-600"
                        >
                          Reply
                        </button>
                        {canDeleteComment(c) && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-sm text-red-500 ml-3"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[#707070]">{c.body}</p>

                    {/* reply box for this comment */}
                    {replyFor === c.id && (
                      <form
                        onSubmit={(e) => submitComment(e, c.id)}
                        className="mt-4"
                      >
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="w-full mb-2 border-b border-[#D8D8D08]"
                          rows={3}
                          placeholder="Your reply..."
                          required
                        />
                        <div className="flex gap-x-2">
                          <button
                            type="submit"
                            disabled={submittingReply}
                            className={`px-4 py-2 text-white rounded ${submittingReply ? "bg-gray-300" : "bg-black"}`}
                          >
                            {submittingReply ? "Posting..." : "Post Reply"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyFor(null);
                              setReplyText("");
                            }}
                            className="px-4 py-2 border rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {!showAllComments && allComments.length > COMMENTS_PAGE_SIZE && (
            <div className="text-center mt-4">
              <button
                onClick={() => setShowAllComments(true)}
                className="text-md font-bold underline"
              >
                Show more ({allComments.length})
              </button>
            </div>
          )}

          {showAllComments && allComments.length > COMMENTS_PAGE_SIZE && (
            <div className="text-center mt-4">
              <button
                onClick={() => setShowAllComments(false)}
                className="text-md font-bold underline"
              >
                Show less
              </button>
            </div>
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
