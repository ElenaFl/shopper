import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/auth/AuthContext.jsx";

const API_BASE_DEFAULT = "http://shopper.local";

const normalizeAvatar = (v, apiBase) => {
  if (!v) return null;
  if (v.startsWith("http") || v.startsWith("//")) return v;
  const base = (apiBase || "").replace(/\/$/, "");
  return base ? `${base}${v}` : v;
};

export const BlogDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, fetchUser } = useContext(AuthContext);

  const API_BASE = import.meta.env.VITE_API_BASE || API_BASE_DEFAULT;

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

  // Load post with comments
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

  // Helpers
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

  const avatarFor = (name) => {
    if (!name) return "/images/avatar-placeholder.webp";
    const n = (name.split(" ")[0] || name).toLowerCase();
    if (n.includes("elena")) return "/images/avatarElena.webp";
    if (n.includes("anna")) return "/images/avatarAnna.webp";
    if (n.includes("ivan")) return "/images/avatarIvan.webp";
    return "/images/avatar-placeholder.webp";
  };

  // Build tree from flat comments if needed
  const buildTree = (comments = []) => {
    const map = new Map();
    comments.forEach((c) =>
      map.set(c.id, {
        ...c,
        children: Array.isArray(c.children) ? [...c.children] : [],
      }),
    );

    const hasChildrenField = comments.some((c) => Array.isArray(c.children));
    if (hasChildrenField) {
      return comments.filter((c) => !c.parent_id).map((c) => map.get(c.id));
    }

    const roots = [];
    map.forEach((node) => {
      if (node.parent_id) {
        const parent = map.get(node.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    const sortRec = (arr) => {
      arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      arr.forEach((n) => {
        if (Array.isArray(n.children) && n.children.length) sortRec(n.children);
      });
    };
    sortRec(roots);
    return roots;
  };

  const removeCommentAndChildren = (comments, idToRemove) => {
    const toRemove = new Set();
    const map = new Map();
    comments.forEach((c) =>
      map.set(c.id, {
        ...c,
        children: Array.isArray(c.children) ? c.children : [],
      }),
    );

    const stack = [idToRemove];
    while (stack.length) {
      const cur = stack.pop();
      if (toRemove.has(cur)) continue;
      toRemove.add(cur);
      map.forEach((c) => {
        if (c.parent_id === cur) stack.push(c.id);
      });
    }

    return comments.filter((c) => !toRemove.has(c.id));
  };

  // Handlers
  const handleDeleteComment = async (commentId) => {
    if (!confirm("Delete this comment?")) return;

    // helper to find comment and its parent id in nested tree
    const findWithParent = (list, id, parent = null) => {
      for (const c of list || []) {
        if (c.id === id) return { comment: c, parent };
        if (Array.isArray(c.children) && c.children.length) {
          const found = findWithParent(c.children, id, c);
          if (found) return found;
        }
      }
      return null;
    };

    const found = findWithParent(post?.comments || [], commentId);
    const target = found?.comment ?? null;
    const parent = found?.parent ?? null;
    const isReply = target && target.parent_id != null;

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

      // update local state
      setPost((p) => {
        if (!p || !Array.isArray(p.comments)) return p;

        // Remove single reply from anywhere in the tree
        const removeSingle = (list, idToRemove) =>
          list
            .map((c) => {
              if (c.id === idToRemove) return null;
              if (Array.isArray(c.children) && c.children.length) {
                return {
                  ...c,
                  children: removeSingle(c.children, idToRemove).filter(
                    Boolean,
                  ),
                };
              }
              return c;
            })
            .filter(Boolean);

        // Helper: find and update parent node after removing a child
        const markParentIfNowEmptyAndDeleted = (list, parentId) =>
          list
            .map((c) => {
              if (c.id === parentId) {
                const newChildren = (
                  Array.isArray(c.children) ? c.children : []
                ).filter((ch) => ch.id !== commentId);
                // If parent is soft-deleted and now has no children -> remove parent (return null)
                if (
                  (c.is_deleted || c.deleted_at) &&
                  newChildren.length === 0
                ) {
                  return null;
                }
                return { ...c, children: newChildren };
              }
              if (Array.isArray(c.children) && c.children.length) {
                const updatedChild = markParentIfNowEmptyAndDeleted(
                  c.children,
                  parentId,
                ).filter(Boolean);
                return { ...c, children: updatedChild };
              }
              return c;
            })
            .filter(Boolean);

        let newComments;
        if (isReply) {
          newComments = removeSingle(p.comments, commentId);

          // If a parent existed, and it is soft-deleted and now children array became empty, remove that parent as well
          if (parent && (parent.is_deleted || parent.deleted_at)) {
            newComments = markParentIfNowEmptyAndDeleted(
              newComments,
              parent.id,
            );
          }
        } else {
          // Root comment deleted: mark as soft-deleted (server already did), keep children.
          // If server soft-deleted root but it has no children now, remove it.
          const markRootDeleted = (list) =>
            list
              .map((c) => {
                if (c.id === commentId) {
                  const hasChildren =
                    Array.isArray(c.children) && c.children.length > 0;
                  if (!hasChildren) return null; // remove entirely if no children
                  return { ...c, is_deleted: true }; // keep and show "Комментарий удалён" if has children
                }
                if (Array.isArray(c.children) && c.children.length) {
                  return {
                    ...c,
                    children: markRootDeleted(c.children).filter(Boolean),
                  };
                }
                return c;
              })
              .filter(Boolean);

          newComments = markRootDeleted(p.comments);
        }

        return {
          ...p,
          comments: newComments,
          comments_count:
            typeof p.comments_count !== "undefined"
              ? newComments.length
              : p.comments_count,
        };
      });
    } catch (err) {
      alert(err.message || "Error");
    }
  };

  const insertCommentIntoState = (created) => {
    if (!created || !created.id) return;
    setPost((p) => {
      const prevComments = Array.isArray(p.comments) ? p.comments.slice() : [];

      if (!created.parent_id) {
        prevComments.push(created);
      } else {
        let attached = false;
        const newComments = prevComments.map((c) => {
          if (c.id === created.parent_id) {
            const children = Array.isArray(c.children)
              ? c.children.slice()
              : [];
            children.push(created);
            attached = true;
            return { ...c, children };
          }
          return c;
        });

        if (attached) {
          return {
            ...p,
            comments: newComments,
            comments_count:
              typeof p.comments_count !== "undefined"
                ? newComments.length
                : p.comments_count,
          };
        }

        prevComments.push(created);
      }

      const updated = { ...p, comments: prevComments };
      if (typeof updated.comments_count !== "undefined")
        updated.comments_count = prevComments.length;
      return updated;
    });
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
      const created = json?.comment ?? json?.data ?? json ?? null;

      if (created && created.id) {
        insertCommentIntoState(created);
      } else {
        const scrollY = window.scrollY || window.pageYOffset;
        await loadPost();
        window.scrollTo({ top: scrollY, behavior: "auto" });
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

  // Renderer for a single comment (recursive)
  // Replace your current renderComment with this function
  // Renderer for a single comment (recursive)
  const renderComment = (c, level = 0) => {
    const indentClass = level > 0 ? "ml-12 mt-4" : "";
    const isDeleted = Boolean(c.is_deleted || c.deleted_at);
    const hasChildren = Array.isArray(c.children) && c.children.length > 0;

    const deletedWithChildren = isDeleted && hasChildren;
    const deletedNoChildren = isDeleted && !hasChildren;

    const placeholder = "/images/avatar-placeholder.webp";

    // Use placeholder for both deletedWithChildren and deletedNoChildren
    const absPlaceholder = `${API_BASE.replace(/\/$/, "")}${placeholder}`;

    const avatarSrc =
      deletedWithChildren || deletedNoChildren
        ? absPlaceholder
        : normalizeAvatar(c.user?.avatar, API_BASE) ||
          normalizeAvatar(c.user?.avatar_url, API_BASE) ||
          normalizeAvatar(avatarFor(c.user?.name), API_BASE) ||
          absPlaceholder;

    return (
      <div key={c.id} className={`w-full mb-6 ${indentClass}`}>
        <div className="mb-4 flex items-start gap-x-4">
          <img
            src={avatarSrc}
            alt={
              deletedNoChildren || deletedWithChildren
                ? "Deleted"
                : c.user?.name || "User"
            }
            className="w-12 h-12 rounded-full object-cover shrink-0"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-x-3">
                <h3 className="text-xl">
                  {!isDeleted ? c.user?.name || c.user_name || "User" : ""}
                </h3>
                <span
                  className="text-sm text-[#707070]"
                  title={c.created_at || ""}
                >
                  {timeAgo(c.created_at)}
                </span>
              </div>

              <div className="flex items-center gap-x-2">
                {!isDeleted && !c.parent_id && user && (
                  <button
                    onClick={() => setReplyFor(c.id)}
                    className="text-sm text-blue-600"
                  >
                    Reply
                  </button>
                )}

                {canDeleteComment(c) && !isDeleted && (
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="text-sm text-red-500 ml-3"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {deletedWithChildren ? (
              <p className="text-[#707070] italic text-gray-500">
                Комментарий удалён
              </p>
            ) : deletedNoChildren ? null : (
              <p className="text-[#707070]">{c.body}</p>
            )}

            {replyFor === c.id && !isDeleted && !c.parent_id && (
              <form onSubmit={(e) => submitComment(e, c.id)} className="mt-4">
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

            {Array.isArray(c.children) && c.children.length > 0 && (
              <div className="mt-4">
                {c.children.map((ch) => renderComment(ch, level + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  if (loading) return <div className="mt-55">Loading...</div>;
  if (error) return <div className="mt-55 text-red-500">{error}</div>;
  if (!post) return <div className="mt-55">Post not found</div>;

  const allComments = Array.isArray(post.comments) ? post.comments : [];
  const sortedComments = [...allComments].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at),
  );
  const roots = buildTree(sortedComments);
  const visibleRoots = showAllComments
    ? roots.slice().reverse()
    : roots.slice(-COMMENTS_PAGE_SIZE).reverse();

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

      {/* Post image */}
      <div className="w-full h-auto mb-16">
        <img
          src={post.img_url || post.img || "/images/placeholder.webp"}
          alt={post.title}
          className="w-full h-120 object-cover rounded-md cursor-zoom-in"
          onClick={() =>
            openImage(post.img_url || post.img || "/images/placeholder.webp")
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
                  disabled={!commentText.trim() || submitting}
                  className={`w-full h-12 font-semibold rounded-sm ${!commentText.trim() || submitting ? "bg-gray-200 text-gray-400 cursor-default" : "bg-black text-white"}`}
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

          {visibleRoots.length === 0 ? (
            <div>No comments yet.</div>
          ) : (
            visibleRoots.map((c) => renderComment(c))
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

export default BlogDetails;
