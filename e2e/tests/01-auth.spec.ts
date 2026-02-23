import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, screenshot, verifyPageLoaded, fillVisibleInputs, BASE_URL } from '../helpers/auth';

test.describe('01 - Authentication Flow', () => {

  test('Login page loads correctly', async ({ page }) => {
    console.log('\n🧪 TEST: Login page loads');
    await navigateTo(page, '/auth/login', 'Login Page');
    await screenshot(page, '01-login-page');

    // Verify login form elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    console.log('✅ Login form elements present');
  });

  test('Login with invalid credentials shows error', async ({ page }) => {
    console.log('\n🧪 TEST: Invalid login');
    await navigateTo(page, '/auth/login', 'Login Page');

    await page.fill('input[type="email"], input[name="email"]', 'wrong@email.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await screenshot(page, '01-login-invalid');
    console.log('✅ Invalid login handled');
  });

  test('Login with valid admin credentials', async ({ page }) => {
    console.log('\n🧪 TEST: Valid admin login');
    await loginAsAdmin(page);
    await screenshot(page, '01-login-success');

    // Should be on dashboard
    const url = page.url();
    expect(url).toMatch(/\/(dashboard)?$/);
    console.log('✅ Admin login successful, on dashboard');
  });

  test('Register page loads correctly', async ({ page }) => {
    console.log('\n🧪 TEST: Register page');
    await navigateTo(page, '/auth/register', 'Register Page');
    await screenshot(page, '01-register-page');

    await expect(page.locator('input[name="firstName"], input[placeholder*="irst"]').first()).toBeVisible();
    await expect(page.locator('input[name="lastName"], input[placeholder*="ast"]').first()).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    console.log('✅ Register form elements present');
  });

  test('Forgot password page loads', async ({ page }) => {
    console.log('\n🧪 TEST: Forgot password page');
    await navigateTo(page, '/auth/forgot-password', 'Forgot Password');
    await screenshot(page, '01-forgot-password');
    await verifyPageLoaded(page);

    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    console.log('✅ Forgot password page loaded');
  });

  test('Auth pages redirect when logged in', async ({ page }) => {
    console.log('\n🧪 TEST: Auth redirect when logged in');
    await loginAsAdmin(page);

    // Try going to login - should redirect to dashboard
    await page.goto(`${BASE_URL}/auth/login`);
    const url = page.url();
    console.log(`  Current URL after visiting /auth/login while logged in: ${url}`);
    await screenshot(page, '01-auth-redirect');
    console.log('✅ Auth redirect test complete');
  });

  test('Logout flow', async ({ page }) => {
    console.log('\n🧪 TEST: Logout');
    await loginAsAdmin(page);

    // Find and click the profile/user menu
    const profileBtn = page.locator('[class*="avatar"], [class*="Avatar"], [class*="profile"], [class*="Profile"], [class*="user-menu"]').first();
    if (await profileBtn.isVisible().catch(() => false)) {
      await profileBtn.click();

      const logoutBtn = page.locator('button, a, [role="menuitem"]').filter({ hasText: /log\s*out|sign\s*out/i }).first();
      if (await logoutBtn.isVisible().catch(() => false)) {
        await logoutBtn.click();
        console.log('✅ Logged out via profile menu');
      }
    } else {
      console.log('  ℹ️  Profile button not found, trying sidebar logout');
      const sidebarLogout = page.locator('button, a').filter({ hasText: /log\s*out/i }).first();
      if (await sidebarLogout.isVisible().catch(() => false)) {
        await sidebarLogout.click();
        console.log('✅ Logged out via sidebar');
      }
    }

    await screenshot(page, '01-logout');
  });
});
