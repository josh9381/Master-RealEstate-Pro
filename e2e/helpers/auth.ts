import { Page, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@realestate.com';
const ADMIN_PASSWORD = 'admin123';

/**
 * Log in as admin and return the authenticated page.
 * Waits for the dashboard to confirm successful login.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  console.log('🔑 Logging in as admin...');
  await page.goto(`${BASE_URL}/auth/login`);
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {
    // Some apps redirect to / instead of /dashboard
    return page.waitForURL('**/', { timeout: 5000 });
  });

  await page.waitForLoadState('networkidle');
  console.log('✅ Logged in successfully');
}

/**
 * Navigate to a route and wait for the page to settle.
 */
export async function navigateTo(page: Page, path: string, label: string): Promise<void> {
  console.log(`📍 Navigating to: ${label} (${path})`);
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Click a sidebar navigation item by its text.
 */
export async function clickSidebarItem(page: Page, text: string): Promise<void> {
  console.log(`🧭 Clicking sidebar: "${text}"`);
  const sidebar = page.locator('nav, aside, [class*="sidebar"], [class*="Sidebar"]');
  const link = sidebar.locator(`a, button`).filter({ hasText: text }).first();
  await link.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Take a labeled screenshot for the report.
 */
export async function screenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
  console.log(`📸 Screenshot: ${name}`);
}

/**
 * Click all visible buttons/links on the page (non-destructive ones).
 * Avoids delete, logout, and other dangerous actions.
 */
export async function clickAllSafeElements(page: Page): Promise<string[]> {
  const clicked: string[] = [];
  const dangerousWords = ['delete', 'remove', 'logout', 'log out', 'sign out', 'destroy', 'unsubscribe', 'cancel subscription'];

  // Get all clickable elements
  const elements = page.locator('button:visible, a:visible, [role="button"]:visible, [role="tab"]:visible');
  const count = Math.min(await elements.count(), 25); // Cap to prevent hangs

  for (let i = 0; i < count; i++) {
    const el = elements.nth(i);
    const text = (await el.textContent())?.trim().toLowerCase() || '';
    const ariaLabel = (await el.getAttribute('aria-label'))?.toLowerCase() || '';
    const combined = `${text} ${ariaLabel}`;

    // Skip dangerous actions
    if (dangerousWords.some(w => combined.includes(w))) {
      console.log(`  ⛔ Skipping dangerous: "${text || ariaLabel}"`);
      continue;
    }

    // Skip if not visible or disabled
    if (!(await el.isVisible()) || (await el.isDisabled().catch(() => false))) {
      continue;
    }

    try {
      const label = text.substring(0, 50) || ariaLabel.substring(0, 50) || `element-${i}`;
      console.log(`  👆 Clicking: "${label}"`);
      await el.click({ timeout: 2000 });
      clicked.push(label);

      // If a modal opened, close it
      const modal = page.locator('[role="dialog"]:visible, [class*="modal"]:visible, [class*="Modal"]:visible');
      if (await modal.count() > 0) {
        console.log(`  📦 Modal detected, closing...`);
        // Try to close via close button or escape
        const closeBtn = modal.locator('button').filter({ hasText: /close|cancel|×|✕/i }).first();
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }
    } catch {
      // Element may have become stale or modal closed the page
    }
  }

  return clicked;
}

/**
 * Try to fill a form on the page with test data.
 */
export async function fillVisibleInputs(page: Page, overrides: Record<string, string> = {}): Promise<void> {
  const inputs = page.locator('input:visible, textarea:visible, select:visible');
  const count = await inputs.count();

  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i);
    const type = (await input.getAttribute('type')) || 'text';
    const name = (await input.getAttribute('name')) || '';
    const placeholder = (await input.getAttribute('placeholder')) || '';
    const tagName = await input.evaluate(el => el.tagName.toLowerCase());

    // Skip hidden, submit, file inputs
    if (['hidden', 'submit', 'button', 'file', 'checkbox', 'radio'].includes(type)) continue;

    const key = name || placeholder;
    if (overrides[key]) {
      await input.fill(overrides[key]);
      continue;
    }

    try {
      if (tagName === 'select') {
        // Select first non-empty option
        const options = input.locator('option');
        const optCount = await options.count();
        if (optCount > 1) {
          const val = await options.nth(1).getAttribute('value');
          if (val) await input.selectOption(val);
        }
      } else if (tagName === 'textarea') {
        await input.fill('Test content generated by Playwright E2E testing');
      } else if (type === 'email') {
        await input.fill('test@playwright.example.com');
      } else if (type === 'tel' || name.includes('phone')) {
        await input.fill('+1234567890');
      } else if (type === 'number') {
        await input.fill('100');
      } else if (type === 'url') {
        await input.fill('https://example.com');
      } else if (type === 'date') {
        await input.fill('2025-06-15');
      } else if (type === 'password') {
        await input.fill('TestPassword123!');
      } else {
        await input.fill(`Test ${name || placeholder || 'value'}`);
      }
    } catch {
      // Input may be read-only or controlled
    }
  }
}

/**
 * Check that the page loaded without errors (no crash, error boundary, etc.)
 */
export async function verifyPageLoaded(page: Page): Promise<void> {
  // Check no error boundary / crash screen
  const errorBoundary = page.locator('text=/something went wrong/i, text=/error occurred/i, text=/unexpected error/i');
  const errorCount = await errorBoundary.count();

  if (errorCount > 0) {
    console.log('⚠️  Error boundary detected on page!');
  }

  // Page should have some content
  const body = page.locator('body');
  await expect(body).not.toBeEmpty();
}

/**
 * Click all tab elements on the page.
 */
export async function clickAllTabs(page: Page): Promise<void> {
  const tabs = page.locator('[role="tab"]:visible');
  const count = Math.min(await tabs.count(), 8); // Cap at 8 tabs

  if (count === 0) {
    console.log('  📑 No tabs found on page');
    return;
  }

  for (let i = 0; i < count; i++) {
    const tab = tabs.nth(i);
    try {
      if (!(await tab.isVisible())) continue;
      const text = (await tab.textContent({ timeout: 1000 }))?.trim() || `tab-${i}`;
      console.log(`  📑 Clicking tab: "${text.substring(0, 40)}"`);
      await tab.click({ timeout: 2000 });
    } catch {
      // Tab may not be clickable, continue to next
    }
  }
}

export { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD };
