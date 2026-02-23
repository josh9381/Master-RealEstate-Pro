import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, screenshot, verifyPageLoaded, clickAllTabs } from '../helpers/auth';

test.describe('14 - Integrations', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Integrations hub', async ({ page }) => {
    console.log('\n🧪 TEST: Integrations hub');
    await navigateTo(page, '/integrations', 'Integrations Hub');
    await verifyPageLoaded(page);
    await screenshot(page, '14-integrations-hub');

    await clickAllTabs(page);

    // Check for integration cards
    const cards = page.locator('[class*="card" i]:visible, [class*="integration" i]:visible');
    const count = await cards.count();
    console.log(`  🔌 Found ${count} integration cards`);

    // Try clicking on an integration card
    if (count > 0) {
      const firstCard = cards.first();
      await firstCard.click();
      await screenshot(page, '14-integrations-hub-clicked');
    }

    console.log('  ✅ Integrations hub loaded');
  });

  test('API integrations page', async ({ page }) => {
    console.log('\n🧪 TEST: API integrations');
    await navigateTo(page, '/integrations/api', 'API Integrations');
    await verifyPageLoaded(page);
    await screenshot(page, '14-integrations-api');

    await clickAllTabs(page);
    console.log('  ✅ API integrations loaded');
  });
});
