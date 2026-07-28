import { expect, test } from '@playwright/test';

function setupErrorCollector(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
});

test('search, tap and reset work on a mobile viewport', async ({ page }) => {
  const errors = setupErrorCollector(page);
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

test('selects a building deterministically via the test picking helper on mobile', async ({
  page,
}) => {
  const errors = setupErrorCollector(page);
  await page.goto('/?test-picking=1');

  const canvas = page.getByTestId('city-canvas');
  await canvas.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(
    () => window.__codescapeWorld !== undefined && window.__codescapeSelectBuilding !== undefined,
    { timeout: 5000 },
  );

  const world = await page.evaluate(() => window.__codescapeWorld);
  if (!world || world.buildings.length === 0) {
    throw new Error('No buildings available for test picking');
  }
  const firstBuilding = world.buildings[0];
  await page.evaluate((id) => window.__codescapeSelectBuilding?.(id), firstBuilding.id);

  const inspector = page.locator('[class*="inspector-card"]').first();
  await expect(inspector).toContainText(firstBuilding.path);

  await page.getByTestId('reset-view-button').tap();
  await expect(page.getByTestId('inspector-empty')).toBeVisible();

  expect(errors).toEqual([]);
});
