import { test, expect } from '@playwright/test';

test.describe('Stock Page', () => {
  test('requires login - redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/stock');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
