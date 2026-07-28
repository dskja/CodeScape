import { expect, test } from '@playwright/test';

test.describe('CodeScape viewer', () => {
  test('renders the 3D city, supports search and reset', async ({ page }) => {
    page.on('console', (msg) => console.log(`[browser ${msg.type()}]`, msg.text()));
    page.on('pageerror', (err) => console.log('[page error]', err));

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
  });
});
