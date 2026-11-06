import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/useCart';
import { quantityError, validQuantity } from '../../context/cartState';
import CartTable from './CartTable';
import CartFeedback from './CartFeedback';
import OrderSummary from './OrderSummary';

const buttonClass = 'rounded-full bg-gradient-to-r from-[#438c28] to-[#a5bd34] px-6 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50';

export default function Cart() {
  const { state, dispatch } = useCart();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [coupon, setCoupon] = useState('');
  const changed = state.items.some(({ product, quantity }) =>
    drafts[product.productId] !== undefined && drafts[product.productId] !== String(quantity));

  function updateCart() {
    const quantities: Record<number, number> = {};
    const nextErrors: Record<number, string> = {};
    for (const { product, quantity } of state.items) {
      const value = Number(drafts[product.productId] ?? quantity);
      quantities[product.productId] = value;
      if (!validQuantity(value)) {
        nextErrors[product.productId] = quantityError;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }
    dispatch({ type: 'update', quantities });
    setDrafts({});
  }

  function removeItem(productId: number) {
    dispatch({ type: 'remove', productId });
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[productId];
      return next;
    });
    setErrors((previous) => {
      const next = { ...previous };
      delete next[productId];
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 pb-16 pt-24 text-gray-800 dark:bg-[radial-gradient(ellipse_at_top_right,#192010,#080e0f_70%)] dark:text-light">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Shopping Cart</h1>
          <Link to="/products" className="rounded underline underline-offset-4 focus-visible:outline focus-visible:outline-primary">Continue shopping</Link>
        </div>
        <CartFeedback />
        {!state.items.length ? (
          <section aria-label="Empty cart" className="rounded-xl border border-gray-300 bg-white p-10 text-center dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-3 text-xl font-semibold">Your cart is empty</h2>
            <p className="mb-6">Explore our products to start shopping.</p>
            <Link to="/products" className={buttonClass}>Browse Products</Link>
          </section>
        ) : (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3.15fr)_minmax(290px,1fr)]">
            <section aria-label="Cart details" className="min-w-0 overflow-hidden rounded-xl border border-gray-300 bg-white dark:border-white/10 dark:bg-white/10">
              <CartTable items={state.items} drafts={drafts} errors={errors}
                onChange={(id, value) => {
                  setDrafts((previous) => ({ ...previous, [id]: value }));
                  setErrors((previous) => ({ ...previous, [id]: '' }));
                }} onRemove={removeItem} />
              <div className="flex flex-wrap items-start justify-between gap-4 p-3">
                <div className="w-full min-w-0 max-w-[580px] sm:w-auto sm:flex-1">
                  <form aria-label="Apply coupon" className="flex" onSubmit={(event) => {
                    event.preventDefault();
                    dispatch({ type: 'coupon', code: coupon });
                  }}>
                    <label className="sr-only" htmlFor="coupon-code">Coupon code</label>
                    <input id="coupon-code" value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Coupon Code"
                      className="min-w-0 flex-1 rounded-l-full border border-r-0 border-gray-300 bg-transparent px-4 py-3 focus:outline-primary dark:border-white/10" />
                    <button className="shrink-0 rounded-r-full bg-gradient-to-r from-[#438c28] to-[#a5bd34] px-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" type="submit">Apply Coupon</button>
                  </form>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">Try SAVE5 for an additional 5% off.</p>
                  {state.coupon && (
                    <button type="button" onClick={() => dispatch({ type: 'removeCoupon' })}
                      className="mt-2 rounded text-sm underline focus-visible:outline focus-visible:outline-primary">Remove SAVE5 coupon</button>
                  )}
                </div>
                <button type="button" disabled={!changed} onClick={updateCart} className={buttonClass}>Update Cart</button>
              </div>
              <p role={Object.values(errors).some(Boolean) ? 'alert' : undefined} className="px-4 pb-3 text-sm text-gray-600 dark:text-gray-300">
                {Object.values(errors).some(Boolean) ? quantityError : 'Quantity edits apply only when you select Update Cart.'}
              </p>
            </section>
            <OrderSummary />
          </div>
        )}
      </div>
    </div>
  );
}
