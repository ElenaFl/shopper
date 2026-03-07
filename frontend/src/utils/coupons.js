/**
 * computeDiscount: вычисляет величину скидки для купона и текущего subtotal.
 * Поведение полностью совпадает с прежней реализацией в компоненте:
 * - percent: (subtotal * value / 100), ограниченная сверху subtotal
 * - fixed: min(subtotal, value)
 */
export const computeDiscount = (coupon, currentSubtotal) => {
  if (!coupon) return 0;
  if (coupon.type === "percent") {
    return Math.min(
      currentSubtotal,
      (currentSubtotal * (Number(coupon.value) || 0)) / 100,
    );
  }
  // fixed
  return Math.min(currentSubtotal, Number(coupon.value) || 0);
};
