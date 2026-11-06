import { cartTotals, formatMoney } from '../../context/cartState';
import { useCart } from '../../context/useCart';

export default function OrderSummary() {
  const { state } = useCart();
  const totals = cartTotals(state);
  const rows = [
    ['Subtotal', totals.subtotal],
    ...(state.coupon ? [['Discount (5%)', -totals.discount] as const] : []),
    ['Shipping', totals.shipping],
    ['Grand Total', totals.total],
  ] as const;

  return (
    <aside aria-labelledby="order-summary-title" className="overflow-hidden rounded-xl border border-gray-300 bg-white dark:border-white/10 dark:bg-white/5">
      <h2 id="order-summary-title" className="p-4 text-center text-2xl font-bold">Order Summary</h2>
      <dl>
        {rows.map(([label, amount]) => (
          <div key={label} className="grid grid-cols-[1.6fr_1fr] border-t border-gray-300 bg-gray-50 text-center dark:border-white/10 dark:bg-white/5">
            <dt className="border-r border-gray-300 p-3 font-semibold dark:border-white/10">{label}</dt>
            <dd className="p-3" data-testid={label === 'Grand Total' ? 'grand-total' : undefined}>{formatMoney(amount)}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-3 p-4 pt-7">
        <button type="button" disabled aria-describedby="checkout-explanation"
          className="w-full cursor-not-allowed rounded-full bg-gradient-to-r from-[#438c28] to-[#a5bd34] px-4 py-3 font-semibold text-white">
          Proceed To Checkout (Demo)
        </button>
        <p id="checkout-explanation" className="text-center text-sm text-gray-600 dark:text-gray-300">
          Checkout is not available in this demo. No order or payment will be created.
        </p>
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">USD estimates, including product sale prices. No tax included.</p>
      </div>
    </aside>
  );
}
