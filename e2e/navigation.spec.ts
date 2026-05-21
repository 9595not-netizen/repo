import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('/add redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/add');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('/add?product_id= redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/add?product_id=test-id');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('protected routes redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/reports');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
