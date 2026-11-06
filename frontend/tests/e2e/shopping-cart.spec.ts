import { test, expect } from '@playwright/test';
import { products } from '../fixtures/products';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/products', (route) => route.fulfill({ json: products }));
});

test('existing home navigation and catalog search remain functional', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Products', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search products', exact: true }).fill('SmartFeeder');
  await expect(page.getByRole('heading', { name: 'SmartFeeder One', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Smart Fountain', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Search products', exact: true }).fill('Space Tuna');
  await expect(page.getByRole('status').filter({ hasText: 'No products found' })).toBeVisible();
  await page.getByRole('link', { name: 'My Cart', exact: true }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole('heading', { name: 'Your cart is empty', exact: true })).toBeVisible();
});

test('catalog additions, staged updates, coupon, persistence, and removal', async ({ page }) => {
  await page.goto('/products');
  for (const product of products) {
    await page.getByRole('button', { name: `Increase quantity of ${product.name}`, exact: true }).click();
    await page.getByRole('button', { name: `Add 1 ${product.name} to cart`, exact: true }).click();
  }
  await page.getByRole('link', { name: 'Shopping cart, 3 items', exact: true }).click();
  await expect(page).toHaveURL(/\/cart$/);
  const first = page.getByRole('spinbutton', { name: 'Quantity of SmartFeeder One', exact: true });
  await first.fill('2');
  await expect(page.getByTestId('grand-total')).toHaveText('$277.00');
  await expect(page.getByRole('link', { name: 'Shopping cart, 3 items', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Update Cart', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Shopping cart, 4 items', exact: true })).toBeVisible();
  await first.fill('0');
  await page.getByRole('button', { name: 'Update Cart', exact: true }).click();
  await expect(first).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByTestId('grand-total')).toHaveText('$366.00');
  await first.fill('1');
  await page.getByRole('button', { name: 'Update Cart', exact: true }).click();
  await page.getByRole('textbox', { name: 'Coupon code', exact: true }).fill('save5');
  await page.getByRole('button', { name: 'Apply Coupon', exact: true }).click();
  await expect(page.getByTestId('grand-total')).toHaveText('$263.65');
  await expect(page.getByRole('button', { name: 'Proceed To Checkout (Demo)', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByTestId('grand-total')).toHaveText('$263.65');
  await expect(first).toHaveValue('1');
  await page.getByRole('link', { name: 'Continue shopping', exact: true }).click();
  await page.getByRole('button', { name: 'Increase quantity of SmartFeeder One', exact: true }).click();
  await page.getByRole('button', { name: 'Add 1 SmartFeeder One to cart', exact: true }).click();
  await page.getByRole('link', { name: 'Shopping cart, 4 items', exact: true }).click();
  await expect(first).toHaveValue('2');
  for (const product of products) {
    await page.getByRole('button', { name: `Remove ${product.name} from cart`, exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Your cart is empty', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Shopping cart, 0 items', exact: true })).toBeVisible();
});

for (const width of [375, 640, 768, 1024, 1517]) {
  test(`responsive cart and keyboard controls at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((fixture) => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('octocat-cart', JSON.stringify({
        version: 1,
        items: fixture.map((product) => ({ product, quantity: 1 })),
        coupon: 'SAVE5',
      }));
    }, products);
    await page.goto('/cart');
    const summary = page.getByRole('complementary', { name: 'Order Summary', exact: true });
    const table = page.getByRole('region', { name: 'Shopping cart items', exact: true });
    await expect(summary).toBeVisible();
    await expect(page.getByRole('link', { name: 'Shopping cart, 3 items', exact: true })).toBeVisible();
    const couponBox = await page.getByRole('textbox', { name: 'Coupon code', exact: true }).boundingBox();
    expect(couponBox).not.toBeNull();
    expect(couponBox!.width).toBeGreaterThanOrEqual(120);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const summaryBox = await summary.boundingBox();
    const tableBox = await table.boundingBox();
    expect(summaryBox).not.toBeNull();
    expect(tableBox).not.toBeNull();
    if (width < 1280) {
      expect(summaryBox!.y).toBeGreaterThan(tableBox!.y + tableBox!.height);
    } else {
      expect(summaryBox!.x).toBeGreaterThan(tableBox!.x + tableBox!.width);
      await page.screenshot({ path: testInfo.outputPath('cart-dark.png'), fullPage: true, animations: 'disabled' });
    }
    const quantity = page.getByRole('spinbutton', { name: 'Quantity of SmartFeeder One', exact: true });
    await quantity.focus();
    await page.keyboard.press('ArrowUp');
    await expect(quantity).toHaveValue('2');
    const update = page.getByRole('button', { name: 'Update Cart', exact: true });
    await update.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('link', { name: 'Shopping cart, 4 items', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Toggle dark/light mode', exact: true }).click();
    await expect(page.locator('html')).toHaveClass('light');
    await expect(summary).toBeVisible();
    await expect(page.getByTestId('grand-total')).toHaveText('$348.20');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('cart-light.png'), fullPage: true, animations: 'disabled' });
  });
}

test('malformed stored cart displays a visible warning instead of crashing', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('octocat-cart', '{"version":99}'));
  await page.goto('/cart');
  await expect(page.getByRole('alert')).toContainText('saved cart could not be read');
  await expect(page.getByRole('heading', { name: 'Your cart is empty', exact: true })).toBeVisible();
});
