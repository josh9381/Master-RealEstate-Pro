import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, screenshot, verifyPageLoaded, clickAllTabs } from '../helpers/auth';

test.describe('07 - Analytics', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Analytics dashboard', async ({ page }) => {
    console.log('\n🧪 TEST: Analytics dashboard');
    await navigateTo(page, '/analytics', 'Analytics Dashboard');
    await verifyPageLoaded(page);
    await screenshot(page, '07-analytics-dashboard');

    await clickAllTabs(page);

    // Check for charts
    const charts = page.locator('[class*="chart" i]:visible, [class*="recharts" i]:visible, canvas:visible, svg:visible');
    const count = await charts.count();
    console.log(`  📊 Found ${count} chart elements`);
    console.log('  ✅ Analytics dashboard loaded');
  });

  test('Campaign analytics', async ({ page }) => {
    console.log('\n🧪 TEST: Campaign analytics');
    await navigateTo(page, '/analytics/campaigns', 'Campaign Analytics');
    await verifyPageLoaded(page);
    await screenshot(page, '07-analytics-campaigns');
    await clickAllTabs(page);
    console.log('  ✅ Campaign analytics loaded');
  });

  test('Lead analytics', async ({ page }) => {
    console.log('\n🧪 TEST: Lead analytics');
    await navigateTo(page, '/analytics/leads', 'Lead Analytics');
    await verifyPageLoaded(page);
    await screenshot(page, '07-analytics-leads');
    await clickAllTabs(page);
    console.log('  ✅ Lead analytics loaded');
  });

  test('Conversion reports', async ({ page }) => {
    console.log('\n🧪 TEST: Conversion reports');
    await navigateTo(page, '/analytics/conversions', 'Conversion Reports');
    await verifyPageLoaded(page);
    await screenshot(page, '07-analytics-conversions');
    await clickAllTabs(page);
    console.log('  ✅ Conversion reports loaded');
  });

  test('Usage analytics', async ({ page }) => {
    console.log('\n🧪 TEST: Usage analytics');
    await navigateTo(page, '/analytics/usage', 'Usage Analytics');
    await verifyPageLoaded(page);
    await screenshot(page, '07-analytics-usage');
    await clickAllTabs(page);
    console.log('  ✅ Usage analytics loaded');
  });

  test('Custom reports', async ({ page }) => {
    console.log('\n🧪 TEST: Custom reports');
    await navigateTo(page, '/analytics/custom-reports', 'Custom Reports');
    await verifyPageLoaded(page);
    await screenshot(page, '07-analytics-custom-reports');
    await clickAllTabs(page);
    console.log('  ✅ Custom reports loaded');
  });

  test('Report builder', async ({ page }) => {
    console.log('\n🧪 TEST: Report builder');
    await navigateTo(page, '/analytics/report-builder', 'Report Builder');
    await verifyPageLoaded(page);
    await screenshot(page, '07-analytics-report-builder');

    // Check for builder controls
    const controls = page.locator('select:visible, [class*="select" i]:visible, button:visible');
    const count = await controls.count();
    console.log(`  🔧 Found ${count} builder controls`);
    console.log('  ✅ Report builder loaded');
  });
});
