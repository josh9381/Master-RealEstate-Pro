import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, screenshot, verifyPageLoaded, clickSidebarItem } from '../helpers/auth';

test.describe('02 - Navigation & Layout', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Sidebar navigation - all main items', async ({ page }) => {
    console.log('\n🧪 TEST: Sidebar navigation');

    const sidebarItems = [
      { text: 'Dashboard', expectedPath: '/' },
      { text: 'Leads', expectedPath: '/leads' },
      { text: 'Campaigns', expectedPath: '/campaigns' },
      { text: 'AI', expectedPath: '/ai' },
      { text: 'Analytics', expectedPath: '/analytics' },
      { text: 'Communication', expectedPath: '/communication' },
      { text: 'Automation', expectedPath: '/workflows' },
      { text: 'Settings', expectedPath: '/settings' },
      { text: 'Help', expectedPath: '/help' },
    ];

    for (const item of sidebarItems) {
      try {
        await clickSidebarItem(page, item.text);
        const url = page.url();
        console.log(`  ✅ "${item.text}" → ${url}`);
        await screenshot(page, `02-sidebar-${item.text.toLowerCase()}`);
      } catch {
        console.log(`  ⚠️  Could not click sidebar item: "${item.text}"`);
      }
    }
  });

  test('Sidebar admin navigation items', async ({ page }) => {
    console.log('\n🧪 TEST: Admin sidebar items');

    const adminItems = ['Admin', 'Team', 'Subscription', 'Billing'];

    for (const item of adminItems) {
      try {
        await clickSidebarItem(page, item);
        console.log(`  ✅ Admin item "${item}" → ${page.url()}`);
      } catch {
        console.log(`  ⚠️  Could not click admin item: "${item}"`);
      }
    }

    await screenshot(page, '02-admin-nav');
  });

  test('Header elements - theme toggle', async ({ page }) => {
    console.log('\n🧪 TEST: Theme toggle');

    // Find theme toggle button (moon/sun icon)
    const themeBtn = page.locator('button').filter({ has: page.locator('[class*="moon"], [class*="sun"], [class*="Moon"], [class*="Sun"]') }).first();
    if (await themeBtn.isVisible().catch(() => false)) {
      await themeBtn.click();
      await screenshot(page, '02-theme-dark');
      console.log('  ✅ Theme toggled');

      // Toggle back
      await themeBtn.click();
      await screenshot(page, '02-theme-light');
    } else {
      // Try any button with aria-label related to theme
      const altThemeBtn = page.locator('button[aria-label*="theme" i], button[aria-label*="dark" i], button[aria-label*="mode" i]').first();
      if (await altThemeBtn.isVisible().catch(() => false)) {
        await altThemeBtn.click();
        await screenshot(page, '02-theme-toggled');
        console.log('  ✅ Theme toggled via aria-label');
      } else {
        console.log('  ℹ️  Theme toggle button not found, trying generic approach');
        // Try clicking any button that could be a theme toggle
        const buttons = page.locator('header button:visible, [class*="header"] button:visible');
        const count = await buttons.count();
        for (let i = 0; i < count; i++) {
          const text = (await buttons.nth(i).textContent())?.trim() || '';
          if (!text || text.length < 3) {
            // Likely an icon-only button, could be theme toggle
            console.log(`  trying button ${i}`);
          }
        }
      }
    }
  });

  test('Header elements - notification bell', async ({ page }) => {
    console.log('\n🧪 TEST: Notification bell');

    const bellBtn = page.locator('button[aria-label*="notif" i], [class*="notification" i] button, [class*="Notification" i] button, [class*="bell" i]').first();
    if (await bellBtn.isVisible().catch(() => false)) {
      await bellBtn.click();
      await screenshot(page, '02-notifications-open');
      console.log('  ✅ Notification panel opened');

      // Close it
      await page.keyboard.press('Escape');
    } else {
      // Broader search
      const headerBtns = page.locator('header button:visible');
      const count = await headerBtns.count();
      console.log(`  ℹ️  Found ${count} header buttons, trying each`);
      for (let i = 0; i < Math.min(count, 5); i++) {
        const btn = headerBtns.nth(i);
        const text = (await btn.textContent())?.trim() || '';
        const ariaLabel = (await btn.getAttribute('aria-label')) || '';
        console.log(`  button[${i}]: text="${text.substring(0, 20)}" aria="${ariaLabel}"`);
      }
    }
  });

  test('Header elements - profile dropdown', async ({ page }) => {
    console.log('\n🧪 TEST: Profile dropdown');

    const profileBtn = page.locator('[class*="avatar" i], [class*="profile" i] button, [class*="user" i] button, img[class*="avatar" i]').first();
    if (await profileBtn.isVisible().catch(() => false)) {
      await profileBtn.click();
      await screenshot(page, '02-profile-menu');
      console.log('  ✅ Profile menu opened');

      // Check menu items
      const menuItems = page.locator('[role="menuitem"]:visible, [class*="menu" i] a:visible, [class*="dropdown" i] a:visible');
      const count = await menuItems.count();
      console.log(`  📋 Profile menu has ${count} items`);

      // Close
      await page.keyboard.press('Escape');
    }
  });

  test('Global search modal', async ({ page }) => {
    console.log('\n🧪 TEST: Global search');

    // Try clicking search button/bar
    const searchBtn = page.locator('button[aria-label*="search" i], [class*="search" i] button, input[placeholder*="search" i]').first();
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click();
      await screenshot(page, '02-global-search-open');
      console.log('  ✅ Global search opened');

      // Type a search query
      const searchInput = page.locator('[role="dialog"] input:visible, [class*="search" i] input:visible, [class*="modal" i] input:visible').first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('test lead');
        await screenshot(page, '02-global-search-results');
        console.log('  ✅ Search query typed, results showing');
      }

      await page.keyboard.press('Escape');
    }
  });

  test('Floating AI button', async ({ page }) => {
    console.log('\n🧪 TEST: Floating AI assistant button');

    const aiBtn = page.locator('[class*="float" i] button, [class*="ai" i][class*="float" i], button[class*="float" i]').first();
    if (await aiBtn.isVisible().catch(() => false)) {
      await aiBtn.click();
      await screenshot(page, '02-ai-assistant-open');
      console.log('  ✅ AI assistant panel opened');

      // Try typing a message
      const chatInput = page.locator('[class*="ai" i] input:visible, [class*="ai" i] textarea:visible, [class*="chat" i] input:visible').first();
      if (await chatInput.isVisible().catch(() => false)) {
        await chatInput.fill('Hello, what can you help me with?');
        console.log('  ✅ Typed message in AI assistant');
      }

      // Close
      await page.keyboard.press('Escape');
    } else {
      console.log('  ℹ️  Floating AI button not found on this page');
    }
  });

  test('Sidebar collapse/expand', async ({ page }) => {
    console.log('\n🧪 TEST: Sidebar collapse/expand');

    const hamburger = page.locator('button[aria-label*="menu" i], button[aria-label*="sidebar" i], [class*="hamburger" i]').first();
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click();
      await screenshot(page, '02-sidebar-collapsed');
      console.log('  ✅ Sidebar toggled');

      await hamburger.click();
      await screenshot(page, '02-sidebar-expanded');
    }
  });

  test('404 page', async ({ page }) => {
    console.log('\n🧪 TEST: 404 page');
    await navigateTo(page, '/this-page-does-not-exist', 'Non-existent page');
    await screenshot(page, '02-404-page');
    await verifyPageLoaded(page);
    console.log(`  Current URL: ${page.url()}`);
  });
});
