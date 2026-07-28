import { expect, test } from '@playwright/test';

test('shows the empty state when there are no buildings', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto('/empty');
  const empty = page.getByTestId('empty-state');
  await empty.waitFor({ state: 'visible', timeout: 10000 });
  await expect(empty).toContainText('no supported files');
  await expect(page.getByTestId('city-canvas')).not.toBeVisible();

  expect(errors).toEqual([]);
});
