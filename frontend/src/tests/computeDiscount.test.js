// src/tests/computeDiscount.test.js
/* eslint-env jest */
import { computeDiscount } from '../utils/coupons';

describe('computeDiscount', () => {
  test('percent discount: 10% of subtotal', () => {
    const coupon = { type: 'percent', value: 10 };
    expect(computeDiscount(coupon, 200)).toBeCloseTo(20);
  });

  test('percent discount capped by subtotal (150% -> subtotal)', () => {
    const coupon = { type: 'percent', value: 150 };
    expect(computeDiscount(coupon, 80)).toBeCloseTo(80);
  });

  test('fixed discount smaller than subtotal', () => {
    const coupon = { type: 'fixed', value: 5 };
    expect(computeDiscount(coupon, 20)).toBe(5);
  });

  test('fixed discount larger than subtotal -> capped to subtotal', () => {
    const coupon = { type: 'fixed', value: 50 };
    expect(computeDiscount(coupon, 30)).toBe(30);
  });

  test('no coupon returns 0', () => {
    expect(computeDiscount(null, 100)).toBe(0);
    expect(computeDiscount(undefined, 100)).toBe(0);
  });
});