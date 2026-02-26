import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('requires login - redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
