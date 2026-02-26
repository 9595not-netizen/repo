import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /เข้าสู่ระบบ|ล็อกอิน/i })).toBeVisible();
  });

  test('should show validation error for short username', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/username|ชื่อผู้ใช้/i).fill('ab');
    await page.getByPlaceholder(/password|รหัสผ่าน/i).fill('123456');
    await page.getByRole('button', { name: /เข้าสู่ระบบ|ล็อกอิน/i }).click();
    await expect(page.getByText(/username.*3|อย่างน้อย 3/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error for short password', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/username|ชื่อผู้ใช้/i).fill('user123');
    await page.getByPlaceholder(/password|รหัสผ่าน/i).fill('12345');
    await page.getByRole('button', { name: /เข้าสู่ระบบ|ล็อกอิน/i }).click();
    await expect(page.getByText(/password.*6|อย่างน้อย 6/i)).toBeVisible({ timeout: 5000 });
  });
});
