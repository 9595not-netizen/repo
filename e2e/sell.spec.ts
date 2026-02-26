import { test, expect } from '@playwright/test';

test.describe('Sell Page', () => {
  test('requires login - redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/sell');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
