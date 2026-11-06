# React + TypeScript + Vite

## Shopping cart

Open `/products`, select a quantity, and choose **Add to Cart**. The navbar cart
badge counts total units; open it to visit `/cart`.

- The guest cart uses a typed React context/reducer and is saved in this browser's
  localStorage (`octocat-cart`). It is independent of login/logout; it does not
  synchronize between accounts, devices, or open tabs. Storage failures display
  a warning while allowing in-memory shopping.
- Repeated additions merge by product ID, using the latest catalog details.
  Quantities must be whole numbers from 1 to 999 per product. Cart quantity edits
  remain drafts until **Update Cart**; navigating away discards uncommitted edits.
  The trash control removes a line immediately.
- Prices are USD estimates using catalog sale prices, rounded to cents per unit.
  **SAVE5** applies another 5% discount to the subtotal, rounded once; coupons do
  not stack. Shipping is $10 for nonempty carts and $0 for empty carts. No tax is
  included. For example, three $89 products with SAVE5 total **$263.65**.
- The cart supports both themes and stacks the summary below the scrollable
  product table on smaller screens.
- Checkout is explicitly unavailable: no orders or payments are created. A real
  checkout must validate inventory, prices, and coupons on the server.

Run from this directory:

```sh
npm test
npm run build
# With a frontend dev server already running on port 5137:
PLAYWRIGHT_WEB_SERVER=false npm run test:e2e -- shopping-cart.spec.ts --project=chromium
```

Cart browser tests intercept catalog responses and do not require the API.
They cover cart interactions and both themes at 375, 640, 768, 1024, and 1517px,
including contained table scrolling and keyboard quantity updates.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
