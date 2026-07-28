import { expect, test } from '@playwright/test';

function setupErrorCollector(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  return errors;
}

test.describe('CodeScape viewer', () => {
  test('renders the 3D city and supports search and reset', async ({ page }) => {
    const errors = setupErrorCollector(page);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'CodeScape' })).toBeVisible();

    const canvas = page.getByTestId('city-canvas');
    await canvas.waitFor({ state: 'visible', timeout: 15000 });
    await expect(canvas).toBeVisible();

    const inspectorEmpty = page.getByTestId('inspector-empty');
    await expect(inspectorEmpty).toBeVisible();
    await expect(inspectorEmpty).toHaveText(/No selection/);

    const search = page.getByTestId('search-input');
    await search.fill('page');
    const firstResult = page.getByTestId('search-result-item').first();
    await firstResult.waitFor({ state: 'visible', timeout: 5000 });
    await firstResult.click();

    await expect(inspectorEmpty).not.toBeVisible();
    const inspector = page.locator('[class*="inspector-card"]').first();
    await expect(inspector).toContainText('Path');

    await page.getByTestId('reset-view-button').click();
    await expect(inspectorEmpty).toHaveText(/No selection/);

    expect(errors).toEqual([]);
  });

  test('selects a building via the deterministic test picking helper', async ({ page }) => {
    const errors = setupErrorCollector(page);
    await page.goto('/?test-picking=1');

    const canvas = page.getByTestId('city-canvas');
    await canvas.waitFor({ state: 'visible', timeout: 15000 });

    const world = await page.evaluate(() => window.__codescapeWorld);
    if (!world || world.buildings.length === 0) {
      throw new Error('No buildings available for test picking');
    }
    const firstBuilding = world.buildings[0];
    await page.evaluate((id) => window.__codescapeSelectBuilding?.(id), firstBuilding.id);

    const inspector = page.locator('[class*="inspector-card"]').first();
    await expect(inspector).toContainText(firstBuilding.path);

    await page.getByTestId('reset-view-button').click();
    await expect(page.getByTestId('inspector-empty')).toBeVisible();

    expect(errors).toEqual([]);
  });
});
