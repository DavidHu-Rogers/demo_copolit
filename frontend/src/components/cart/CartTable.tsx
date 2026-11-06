import type { CartItem } from '../../context/cartState';
import { formatMoney, unitPrice } from '../../context/cartState';

interface Props {
  items: CartItem[];
  drafts: Record<number, string>;
  errors: Record<number, string>;
  onChange: (id: number, value: string) => void;
  onRemove: (id: number) => void;
}

export default function CartTable({ items, drafts, errors, onChange, onRemove }: Props) {
  return (
    <div role="region" aria-label="Shopping cart items" tabIndex={0}
      className="overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
      <table className="w-full min-w-[740px] border-collapse text-center">
        <caption className="sr-only">Shopping cart products and committed prices</caption>
        <thead className="bg-gray-100 dark:bg-black/15">
          <tr>
            {['S. No.', 'Product Image', 'Product Name', 'Unit Price', 'Quantity', 'Total', 'Remove'].map((title) => (
              <th key={title} scope="col" className="border-b border-r border-gray-300 p-3 text-sm font-bold last:border-r-0 dark:border-white/10">{title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(({ product, quantity }, index) => (
            <tr key={product.productId} className="border-b border-gray-300 dark:border-white/10">
              <td className="border-r border-gray-300 p-3 dark:border-white/10">{index + 1}</td>
              <td className="border-r border-gray-300 p-2 dark:border-white/10">
                <img src={`/${product.imgName}`} alt={product.name} width={96} height={88} className="mx-auto h-24 w-24 object-contain p-1" />
              </td>
              <th scope="row" className="border-r border-gray-300 p-3 dark:border-white/10">{product.name}</th>
              <td className="border-r border-gray-300 p-3 font-semibold dark:border-white/10">{formatMoney(unitPrice(product))}</td>
              <td className="w-28 border-r border-gray-300 p-3 dark:border-white/10">
                <input type="number" min={1} max={999} step={1}
                  aria-label={`Quantity of ${product.name}`}
                  aria-invalid={Boolean(errors[product.productId])}
                  aria-describedby={errors[product.productId] ? `quantity-error-${product.productId}` : undefined}
                  value={drafts[product.productId] ?? String(quantity)}
                  onChange={(event) => onChange(product.productId, event.target.value)}
                  className="w-20 rounded-xl border-2 border-gray-300 bg-transparent p-2 text-center focus:outline-primary dark:border-white/10" />
                {errors[product.productId] && (
                  <p id={`quantity-error-${product.productId}`} className="mt-1 text-xs text-red-700 dark:text-red-300">{errors[product.productId]}</p>
                )}
              </td>
              <td className="border-r border-gray-300 p-3 font-semibold dark:border-white/10">{formatMoney(unitPrice(product) * quantity)}</td>
              <td className="p-3">
                <button type="button" onClick={() => onRemove(product.productId)} aria-label={`Remove ${product.name} from cart`}
                  className="rounded p-2 text-green-700 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary dark:text-lime-400">
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
