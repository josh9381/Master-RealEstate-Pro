import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, screenshot, verifyPageLoaded, clickAllTabs } from '../helpers/auth';

test.describe('03 - Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Dashboard loads with widgets', async ({ page }) => {
    console.log('\n🧪 TEST: Dashboard loads');
    await navigateTo(page, '/dashboard', 'Dashboard');
    await verifyPageLoaded(page);
    await screenshot(page, '03-dashboard');

    // Check for dashboard content - cards, charts, stats
    const cards = page.locator('[class*="card" i]:visible, [class*="Card" i]:visible, [class*="widget" i]:visible');
    const count = await cards.count();
    console.log(`  📊 Found ${count} dashboard cards/widgets`);
    expect(count).toBeGreaterThan(0);
  });

  test('Dashboard interactive elements', async ({ page }) => {
    console.log('\n🧪 TEST: Dashboard interactions');
    await navigateTo(page, '/dashboard', 'Dashboard');

    // Click any tabs on dashboard
    await clickAllTabs(page);

    // Click dropdown filters if any
    const selects = page.locator('select:visible, [class*="select" i]:visible');
    const selectCount = await selects.count();
    if (selectCount > 0) {
      console.log(`  📋 Found ${selectCount} filter selects`);
      for (let i = 0; i < Math.min(selectCount, 3); i++) {
        try {
          await selects.nth(i).click();
        } catch { /* skip */ }
      }
    }

    // Click any action buttons (like "View All", "See More")
    const actionLinks = page.locator('a:visible, button:visible').filter({ hasText: /view all|see more|view|details/i });
    const linkCount = await actionLinks.count();
    console.log(`  🔗 Found ${linkCount} action links`);

    await screenshot(page, '03-dashboard-interactions');
  });
});
