import { StrictMode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { CartProvider } from '../../src/context/CartContext';
import { useCart } from '../../src/context/useCart';
import { CART_STORAGE_KEY, cartReducer, emptyCart, serializeCart } from '../../src/context/cartState';
import { products } from '../fixtures/products';

function Probe() {
  const { state, dispatch, storageWarning } = useCart();
  return <>
    <p>{state.items[0]?.quantity ?? 0} units</p>
    {storageWarning && <p role="alert">{storageWarning}</p>}
    <button onClick={() => dispatch({ type: 'add', product: products[0], quantity: 1 })}>Add</button>
  </>;
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('CartProvider', () => {
  it('requires a provider', () => {
    const expectedError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handleError = (event: ErrorEvent) => {
      if (event.error instanceof Error && event.error.message === 'useCart must be used within a CartProvider') {
        event.preventDefault();
      }
    };
    window.addEventListener('error', handleError);
    try {
      expect(() => render(<Probe />)).toThrow('useCart must be used within a CartProvider');
    } finally {
      window.removeEventListener('error', handleError);
    }
    expect(expectedError).toHaveBeenCalled();
  });

  it('restores persisted state once in StrictMode and saves committed actions', () => {
    localStorage.setItem(CART_STORAGE_KEY, serializeCart(cartReducer(emptyCart, { type: 'add', product: products[0], quantity: 2 })));
    render(<StrictMode><CartProvider><Probe /></CartProvider></StrictMode>);
    expect(screen.getByText('2 units')).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'Add' }).click());
    expect(screen.getByText('3 units')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!).items[0].quantity).toBe(3);
  });

  it('shows a warning and recovers from malformed storage', () => {
    localStorage.setItem(CART_STORAGE_KEY, 'broken');
    render(<CartProvider><Probe /></CartProvider>);
    expect(screen.getByRole('alert')).toHaveTextContent('saved cart could not be read');
    expect(screen.getByText('0 units')).toBeInTheDocument();
  });

  it('keeps shopping functional when storage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
    render(<CartProvider><Probe /></CartProvider>);
    expect(screen.getByRole('alert')).toHaveTextContent('cannot be saved');
    act(() => screen.getByRole('button', { name: 'Add' }).click());
    expect(screen.getByText('1 units')).toBeInTheDocument();
  });

  it('shows a warning when storage reads fail', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
    render(<CartProvider><Probe /></CartProvider>);
    expect(screen.getByRole('alert')).toHaveTextContent('storage is unavailable');
  });
});
