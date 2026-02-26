import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test('requires login - redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
