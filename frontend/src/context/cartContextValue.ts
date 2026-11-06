import { createContext } from 'react';
import type { Dispatch } from 'react';
import type { CartAction, CartState } from './cartState';

export const CartContext = createContext<{
  state: CartState;
  dispatch: Dispatch<CartAction>;
  storageWarning: string | null;
} | null>(null);
