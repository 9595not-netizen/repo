import { test, expect } from '@playwright/test';

test.describe('Reports Page', () => {
  test('requires login - redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/reports');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
