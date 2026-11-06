import { useEffect, useReducer, useState } from 'react';
import type { ReactNode } from 'react';
import { CartContext } from './cartContextValue';
import { CART_STORAGE_KEY, cartReducer, emptyCart, parseCart, serializeCart } from './cartState';

function loadCart() {
  let raw: string | null;
  try {
    raw = localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return { state: emptyCart, warning: 'Cart storage is unavailable. Changes may not survive a refresh.' };
  }
  try {
    return { state: parseCart(raw), warning: null };
  } catch {
    return { state: emptyCart, warning: 'Your saved cart could not be read. An empty cart has been started.' };
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadCart);
  const [state, dispatch] = useReducer(cartReducer, initial.state);
  const [storageWarning, setStorageWarning] = useState(initial.warning);
  const { items, coupon } = state;

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, serializeCart({ items, coupon }));
    } catch {
      setStorageWarning('Your cart cannot be saved in this browser. You can keep shopping, but changes may be lost on refresh.');
    }
  }, [items, coupon]);

  return (
    <CartContext.Provider value={{ state, dispatch, storageWarning }}>
      {children}
    </CartContext.Provider>
  );
}
