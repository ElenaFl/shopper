import React from "react";

export const Pagination = ({ meta, onChange }) => {
  // meta: { current_page, per_page, total, last_page } OR { current_page, last_page }
  if (!meta) return null;

  const current = Number(meta.current_page || meta.currentPage || 1);
  const last = Number(meta.last_page || meta.lastPage || meta.last || 1);
  const perPage = Number(
    meta.per_page || meta.perPage || meta.per_page_value || 0,
  );
  const total = Number(meta.total || meta.total_items || meta.count || 0);

  // If we know total and perPage, hide pagination when everything fits on one page
  if (perPage > 0 && total > 0 && total <= perPage) return null;

  // Fallback: if last (pages count) is 1 or less, hide pagination
  if (!perPage && last <= 1) return null;

  const arr = [];

  // build window of pages around current
  const pushPage = (p) => arr.push(p);
  const addRange = (from, to) => {
    for (let i = from; i <= to; i++) pushPage(i);
  };

  if (last <= 7) {
    addRange(1, last);
  } else {
    // always show first, last, and window of 2 around current
    pushPage(1);
    let left = Math.max(2, current - 2);
    let right = Math.min(last - 1, current + 2);

    if (left > 2) pushPage("left-ellipsis");
    addRange(left, right);
    if (right < last - 1) pushPage("right-ellipsis");
    pushPage(last);
  }

  const onClickPage = (p) => {
    if (p === "left-ellipsis" || p === "right-ellipsis") return;
    if (p === current) return;
    onChange && onChange(Number(p));
  };

  return (
    <nav className="flex items-center gap-2" aria-label="Pagination">
      <button
        className="pagination-btn"
        onClick={() => current > 1 && onChange(current - 1)}
        disabled={current <= 1}
      >
        Prev
      </button>

      {arr.map((p, idx) =>
        p === "left-ellipsis" || p === "right-ellipsis" ? (
          <span key={p + idx} className="px-2">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onClickPage(p)}
            className={`px-3 py-1 border rounded ${p === current ? "font-bold bg-gray-200" : ""}`}
          >
            {p}
          </button>
        ),
      )}

      <button
        className="pagination-btn"
        onClick={() => current < last && onChange(current + 1)}
        disabled={current >= last}
      >
        Next
      </button>
    </nav>
  );
};
