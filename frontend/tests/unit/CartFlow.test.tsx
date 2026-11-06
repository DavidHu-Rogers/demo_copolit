import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import App from '../../src/App';
import { CART_STORAGE_KEY, cartReducer, emptyCart, serializeCart } from '../../src/context/cartState';
import { products } from '../fixtures/products';

function renderApp(path = '/products') {
  window.history.replaceState({}, '', path);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><App /></QueryClientProvider>);
  return { ...view, user: userEvent.setup() };
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(axios, 'get').mockResolvedValue({ data: products });
});
afterEach(() => vi.restoreAllMocks());

describe('shopping cart interactions', () => {
  it('uses the same rounded sale price in the catalog and cart', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [{ ...products[0], price: 1, discount: 0.145 }] });
    const { user } = renderApp();
    expect(await screen.findByText('$0.86')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Increase quantity of SmartFeeder One' }));
    await user.click(screen.getByRole('button', { name: 'Add 1 SmartFeeder One to cart' }));
    await user.click(screen.getByRole('link', { name: 'Shopping cart, 1 items' }));
    expect(await screen.findByTestId('grand-total')).toHaveTextContent('$10.86');
  });

  it('adds catalog selections, resets selection, merges and updates the badge across routing', async () => {
    const { user } = renderApp();
    const increase = await screen.findByRole('button', { name: 'Increase quantity of SmartFeeder One' });
    const add = screen.getByRole('button', { name: 'Add 0 SmartFeeder One to cart' });
    expect(add).toBeDisabled();
    await user.click(increase);
    await user.click(increase);
    await user.click(add);
    expect(screen.getByText('Added 2 SmartFeeder One to cart.')).toBeInTheDocument();
    expect(add).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Shopping cart, 2 items' })).toBeInTheDocument();
    await user.click(increase);
    await user.click(add);
    await user.click(screen.getByRole('link', { name: 'Shopping cart, 3 items' }));
    expect(await screen.findByRole('heading', { name: 'Shopping Cart' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Quantity of SmartFeeder One' })).toHaveValue(3);
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'My Cart' })).toHaveAttribute('href', '/cart');
  });

  it('preserves selected quantities on combined overflow and reports the error', async () => {
    localStorage.setItem(CART_STORAGE_KEY, serializeCart(cartReducer(emptyCart, { type: 'add', product: products[0], quantity: 999 })));
    const { user } = renderApp();
    await user.click(await screen.findByRole('button', { name: 'Increase quantity of SmartFeeder One' }));
    await user.click(screen.getByRole('button', { name: 'Add 1 SmartFeeder One to cart' }));
    expect(screen.getByRole('alert')).toHaveTextContent('exceed the limit');
    expect(screen.getByRole('button', { name: 'Add 1 SmartFeeder One to cart' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Shopping cart, 999 items' })).toBeInTheDocument();
  });

  it('stages edits, validates atomically, applies coupons and removes all lines', async () => {
    const state = products.reduce((cart, product) => cartReducer(cart, { type: 'add', product, quantity: 1 }), emptyCart);
    localStorage.setItem(CART_STORAGE_KEY, serializeCart(state));
    const { user } = renderApp('/cart');
    const first = await screen.findByRole('spinbutton', { name: 'Quantity of SmartFeeder One' });
    const second = screen.getByRole('spinbutton', { name: 'Quantity of Smart Fountain' });
    const update = screen.getByRole('button', { name: 'Update Cart' });
    expect(update).toBeDisabled();
    await user.clear(first);
    await user.type(first, '2');
    await user.clear(second);
    await user.type(second, '0');
    await user.click(update);
    expect(screen.getByRole('alert')).toHaveTextContent('whole-number');
    expect(screen.getByTestId('grand-total')).toHaveTextContent('$277.00');
    expect(screen.getByRole('link', { name: 'Shopping cart, 3 items' })).toBeInTheDocument();
    await user.clear(second);
    await user.type(second, '1');
    await user.click(update);
    expect(screen.getByRole('link', { name: 'Shopping cart, 4 items' })).toBeInTheDocument();
    await user.clear(first);
    await user.type(first, '1');
    await user.click(update);

    await user.type(screen.getByRole('textbox', { name: 'Coupon code' }), ' save5 ');
    await user.click(screen.getByRole('button', { name: 'Apply Coupon' }));
    expect(screen.getByTestId('grand-total')).toHaveTextContent('$263.65');
    const summary = screen.getByRole('complementary', { name: 'Order Summary' });
    expect(within(summary).getByText('-$13.35')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Proceed To Checkout (Demo)' })).toBeDisabled();
    await user.clear(screen.getByRole('textbox', { name: 'Coupon code' }));
    await user.type(screen.getByRole('textbox', { name: 'Coupon code' }), 'WRONG');
    await user.click(screen.getByRole('button', { name: 'Apply Coupon' }));
    expect(screen.getByRole('alert')).toHaveTextContent('valid coupon');
    expect(screen.getByTestId('grand-total')).toHaveTextContent('$263.65');
    await user.click(screen.getByRole('button', { name: 'Remove SAVE5 coupon' }));
    expect(screen.getByTestId('grand-total')).toHaveTextContent('$277.00');
    for (const product of products) {
      await user.click(screen.getByRole('button', { name: `Remove ${product.name} from cart` }));
    }
    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Shopping cart, 0 items' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse Products' })).toHaveAttribute('href', '/products');
  });

  it('discards draft edits on navigation and restores committed state on remount', async () => {
    localStorage.setItem(CART_STORAGE_KEY, serializeCart(cartReducer(emptyCart, { type: 'add', product: products[0], quantity: 2 })));
    const { user, unmount } = renderApp('/cart');
    const quantity = await screen.findByRole('spinbutton');
    await user.clear(quantity);
    await user.type(quantity, '5');
    await user.click(screen.getByRole('link', { name: 'Continue shopping' }));
    await user.click(screen.getByRole('link', { name: 'Shopping cart, 2 items' }));
    expect(await screen.findByRole('spinbutton')).toHaveValue(2);
    unmount();
    renderApp('/cart');
    expect(await screen.findByRole('spinbutton')).toHaveValue(2);
  });
});
