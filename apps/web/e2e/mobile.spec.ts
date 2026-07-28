import { expect, test } from '@playwright/test';

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
});

test('search and reset work on a mobile viewport', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'CodeScape' })).toBeVisible();

  const search = page.getByTestId('search-input');
  await search.fill('page');
  const firstResult = page.getByTestId('search-result-item').first();
  await firstResult.waitFor({ state: 'visible', timeout: 5000 });
  await firstResult.tap();

  const inspector = page.locator('[class*="inspector-card"]').first();
  await expect(inspector).toContainText('Path');

  await page.getByTestId('reset-view-button').tap();
  await expect(page.getByTestId('inspector-empty')).toBeVisible();

  expect(errors).toEqual([]);
});
