import { describe, expect, it } from 'vitest';
import { products } from '../fixtures/products';
import {
  additionError, cartReducer, cartTotals, emptyCart, formatMoney,
  parseCart, serializeCart, unitPrice, validQuantity,
} from '../../src/context/cartState';

const add = (quantity = 1) => cartReducer(emptyCart, { type: 'add', product: products[0], quantity });

describe('cart state and pricing', () => {
  it('adds and merges using the latest product snapshot without mutating earlier state', () => {
    const first = add(2);
    const second = cartReducer(first, { type: 'add', product: { ...products[0], price: 80 }, quantity: 3 });
    expect(first.items[0].quantity).toBe(2);
    expect(second.items).toHaveLength(1);
    expect(second.items[0]).toMatchObject({ quantity: 5, product: { price: 80 } });
    expect(cartTotals(second).count).toBe(5);
    expect(emptyCart.items).toEqual([]);
  });

  it.each([0, -1, 1.5, 1000, NaN, Infinity])('rejects invalid quantity %s with feedback', (quantity) => {
    const state = add(quantity);
    expect(state.items).toEqual([]);
    expect(state.feedback?.error).toBe(true);
    expect(validQuantity(quantity)).toBe(false);
  });

  it('accepts 1 and 999 and rejects combined overflow without losing items', () => {
    expect(validQuantity(1)).toBe(true);
    expect(validQuantity(999)).toBe(true);
    const state = add(999);
    const next = cartReducer(state, { type: 'add', product: products[0], quantity: 1 });
    expect(next.items).toBe(state.items);
    expect(next.feedback?.message).toContain('limit');
    expect(additionError(state.items, products[0], 1)).not.toBeNull();
  });

  it.each([-1, NaN, Infinity])('rejects invalid product price %s', (price) => {
    const next = cartReducer(emptyCart, { type: 'add', product: { ...products[0], price }, quantity: 1 });
    expect(next.feedback?.error).toBe(true);
    expect(next.items).toHaveLength(0);
  });

  it('commits updates atomically and reports incomplete or invalid actions', () => {
    const state = cartReducer(add(), { type: 'add', product: products[1], quantity: 1 });
    const invalid = cartReducer(state, { type: 'update', quantities: { 1: 2, 2: 0 } });
    expect(invalid.items).toBe(state.items);
    expect(invalid.feedback?.error).toBe(true);
    expect(cartReducer(state, { type: 'update', quantities: { 1: 2 } }).feedback?.error).toBe(true);
    const next = cartReducer(state, { type: 'update', quantities: { 1: 2, 2: 3 } });
    expect(cartTotals(next).count).toBe(5);
  });

  it('matches the reference totals exactly', () => {
    const state = products.reduce((cart, product) =>
      cartReducer(cart, { type: 'add', product, quantity: 1 }), emptyCart);
    const discounted = cartReducer(state, { type: 'coupon', code: ' save5 ' });
    expect(cartTotals(discounted)).toEqual({ subtotal: 26700, discount: 1335, shipping: 1000, total: 26365, count: 3 });
    expect(formatMoney(26365)).toBe('$263.65');
  });

  it('rounds sale prices in cents before line multiplication and rounds coupon once', () => {
    expect(unitPrice({ ...products[0], price: 19.99, discount: 0.15 })).toBe(1699);
    const state = cartReducer(emptyCart, { type: 'add', product: { ...products[0], price: 0.1 }, quantity: 3 });
    expect(cartTotals({ ...state, coupon: 'SAVE5' })).toMatchObject({ subtotal: 30, discount: 2, total: 1028 });
  });

  it('does not stack coupons, preserves valid coupons on invalid attempts, and removes coupons', () => {
    const state = cartReducer(add(), { type: 'coupon', code: 'SAVE5' });
    expect(cartReducer(state, { type: 'coupon', code: 'save5' }).coupon).toBe('SAVE5');
    const invalid = cartReducer(state, { type: 'coupon', code: 'WRONG' });
    expect(invalid.coupon).toBe('SAVE5');
    expect(invalid.feedback?.error).toBe(true);
    expect(cartReducer(state, { type: 'coupon', code: '' }).feedback?.error).toBe(true);
    expect(cartReducer(state, { type: 'removeCoupon' }).coupon).toBeNull();
    expect(cartReducer(emptyCart, { type: 'coupon', code: 'SAVE5' }).feedback?.error).toBe(true);
  });

  it('removes items and clears coupon and shipping when empty', () => {
    const state = cartReducer(add(), { type: 'coupon', code: 'SAVE5' });
    const next = cartReducer(state, { type: 'remove', productId: 1 });
    expect(next.items).toHaveLength(0);
    expect(next.coupon).toBeNull();
    expect(cartTotals(next)).toEqual({ count: 0, subtotal: 0, shipping: 0, discount: 0, total: 0 });
    expect(cartReducer(next, { type: 'remove', productId: 1 }).feedback?.error).toBe(true);
  });
});

describe('cart snapshot validation', () => {
  it('round trips committed items and coupon without persisting feedback or totals', () => {
    const state = cartReducer(add(2), { type: 'coupon', code: 'SAVE5' });
    expect(parseCart(serializeCart(state))).toEqual({ ...state, feedback: null });
    expect(JSON.parse(serializeCart(state))).not.toHaveProperty('feedback');
    expect(parseCart(null)).toEqual(emptyCart);
  });

  it.each([
    '{', 'null', '[]',
    JSON.stringify({ version: 2, items: [], coupon: null }),
    JSON.stringify({ version: 1, items: [], coupon: 'NOPE' }),
    JSON.stringify({ version: 1, items: [{ product: products[0], quantity: 0 }], coupon: null }),
    JSON.stringify({ version: 1, items: [{ product: { ...products[0], discount: 2 }, quantity: 1 }], coupon: null }),
    JSON.stringify({ version: 1, items: [{ product: products[0], quantity: 1 }, { product: products[0], quantity: 1 }], coupon: null }),
  ])('rejects malformed or unsupported snapshots: %s', (raw) => {
    expect(() => parseCart(raw)).toThrow();
  });
});
