import type { Product } from '../types/product';

export const CART_STORAGE_KEY = 'octocat-cart';
export const MAX_QUANTITY = 999;
export type CartProduct = Pick<Product, 'productId' | 'name' | 'imgName' | 'price' | 'discount'>;
export interface CartItem {
  product: CartProduct;
  quantity: number;
}
export interface CartState {
  items: CartItem[];
  coupon: 'SAVE5' | null;
  feedback: { message: string; error: boolean } | null;
}
export type CartAction =
  | { type: 'add'; product: CartProduct; quantity: number }
  | { type: 'remove'; productId: number }
  | { type: 'update'; quantities: Record<number, number> }
  | { type: 'coupon'; code: string }
  | { type: 'removeCoupon' };

export const emptyCart: CartState = { items: [], coupon: null, feedback: null };
export const quantityError = 'Use a whole-number quantity from 1 to 999 for each product.';

export function validQuantity(quantity: number) {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validProduct(value: unknown): value is CartProduct {
  return isRecord(value) &&
    typeof value.productId === 'number' && Number.isSafeInteger(value.productId) && value.productId > 0 &&
    typeof value.name === 'string' && value.name.trim().length > 0 &&
    typeof value.imgName === 'string' && value.imgName.trim().length > 0 &&
    typeof value.price === 'number' && Number.isFinite(value.price) && value.price >= 0 &&
    Number.isSafeInteger(Math.round(value.price * 100) * MAX_QUANTITY) &&
    (value.discount === undefined ||
      (typeof value.discount === 'number' && Number.isFinite(value.discount) &&
        value.discount >= 0 && value.discount <= 1));
}

export function additionError(items: CartItem[], product: CartProduct, quantity: number): string | null {
  if (!validProduct(product)) {
    return 'This product has invalid pricing or details and cannot be added.';
  }
  const existing = items.find((item) => item.product.productId === product.productId);
  if (!validQuantity(quantity) || !validQuantity((existing?.quantity ?? 0) + quantity)) {
    return `${quantityError} Adding this selection would exceed the limit or use an invalid quantity.`;
  }
  return null;
}

export function unitPrice(product: CartProduct) {
  const cents = Math.round(product.price * 100);
  return Math.round(cents * (1 - (product.discount ?? 0)));
}

export function cartTotals(state: Pick<CartState, 'items' | 'coupon'>) {
  const subtotal = state.items.reduce((sum, item) => sum + unitPrice(item.product) * item.quantity, 0);
  const discount = state.coupon === 'SAVE5' ? Math.round(subtotal * 5 / 100) : 0;
  const shipping = state.items.length ? 1000 : 0;
  const count = state.items.reduce((sum, item) => sum + item.quantity, 0);
  return { subtotal, discount, shipping, total: subtotal - discount + shipping, count };
}

export const formatMoney = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

function result(state: CartState, message: string, error = false): CartState {
  return { ...state, feedback: { message, error } };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const error = additionError(state.items, action.product, action.quantity);
      if (error) {
        return result(state, error, true);
      }
      const previous = state.items.find((item) => item.product.productId === action.product.productId);
      const { productId, name, imgName, price, discount } = action.product;
      const item = {
        product: { productId, name, imgName, price, discount },
        quantity: (previous?.quantity ?? 0) + action.quantity,
      };
      return result({
        ...state,
        items: previous
          ? state.items.map((entry) => entry.product.productId === productId ? item : entry)
          : [...state.items, item],
      }, `Added ${action.quantity} ${name} to cart.`);
    }
    case 'remove': {
      const item = state.items.find((entry) => entry.product.productId === action.productId);
      if (!item) {
        return result(state, 'This product is no longer in the cart.', true);
      }
      const items = state.items.filter((entry) => entry !== item);
      return result({ ...state, items, coupon: items.length ? state.coupon : null },
        `Removed ${item.product.name} from cart.`);
    }
    case 'update': {
      if (state.items.some((item) => !validQuantity(action.quantities[item.product.productId]))) {
        return result(state, quantityError, true);
      }
      return result({
        ...state,
        items: state.items.map((item) => ({ ...item, quantity: action.quantities[item.product.productId] })),
      }, 'Cart updated.');
    }
    case 'coupon':
      if (!state.items.length) {
        return result(state, 'Add a product before applying a coupon.', true);
      }
      if (action.code.trim().toUpperCase() !== 'SAVE5') {
        return result(state, 'Enter a valid coupon code. Try SAVE5 for 5% off.', true);
      }
      return result({ ...state, coupon: 'SAVE5' }, 'SAVE5 applied: 5% off your subtotal.');
    case 'removeCoupon':
      return result({ ...state, coupon: null }, 'Coupon removed.');
  }
}

export function serializeCart(state: Pick<CartState, 'items' | 'coupon'>) {
  return JSON.stringify({ version: 1, items: state.items, coupon: state.coupon });
}

export function parseCart(raw: string | null): CartState {
  if (raw === null) {
    return emptyCart;
  }
  const data: unknown = JSON.parse(raw);
  if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.items) ||
      (data.coupon !== null && data.coupon !== 'SAVE5')) {
    throw new Error('Unsupported cart snapshot');
  }
  const ids = new Set<number>();
  const items: CartItem[] = data.items.map((item: unknown) => {
    if (!isRecord(item) || !validProduct(item.product) ||
        typeof item.quantity !== 'number' || !validQuantity(item.quantity) ||
        ids.has(item.product.productId)) {
      throw new Error('Invalid saved cart item');
    }
    ids.add(item.product.productId);
    const { productId, name, imgName, price, discount } = item.product;
    return { product: { productId, name, imgName, price, discount }, quantity: item.quantity };
  });
  return { items, coupon: items.length ? data.coupon : null, feedback: null };
}
