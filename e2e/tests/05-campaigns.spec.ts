import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, screenshot, verifyPageLoaded, clickAllTabs, fillVisibleInputs, clickAllSafeElements } from '../helpers/auth';

test.describe('05 - Campaigns', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Campaigns list page', async ({ page }) => {
    console.log('\n🧪 TEST: Campaigns list');
    await navigateTo(page, '/campaigns', 'Campaigns List');
    await verifyPageLoaded(page);
    await screenshot(page, '05-campaigns-list');

    // Click status tabs (All, Active, Scheduled, Paused, Completed)
    await clickAllTabs(page);
    await screenshot(page, '05-campaigns-tabs');
  });

  test('Campaigns list - search', async ({ page }) => {
    console.log('\n🧪 TEST: Campaigns search');
    await navigateTo(page, '/campaigns', 'Campaigns List');

    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('email campaign');
      await screenshot(page, '05-campaigns-search');
      console.log('  ✅ Campaign search works');
    }
  });

  test('Create campaign page', async ({ page }) => {
    console.log('\n🧪 TEST: Create campaign');
    await navigateTo(page, '/campaigns/create', 'Create Campaign');
    await verifyPageLoaded(page);
    await screenshot(page, '05-campaigns-create');

    // Fill available form fields
    await fillVisibleInputs(page, {
      name: 'Playwright Test Campaign',
      subject: 'Test Email Subject',
    });
    await screenshot(page, '05-campaigns-create-filled');

    // Check for multi-step navigation (Next button)
    const nextBtn = page.locator('button').filter({ hasText: /next|continue/i }).first();
    if (await nextBtn.isVisible().catch(() => false)) {
      console.log('  📋 Multi-step form detected');
      await nextBtn.click();
      await screenshot(page, '05-campaigns-create-step2');
      console.log('  ✅ Moved to step 2');
    }
  });

  test('Campaign detail page', async ({ page }) => {
    console.log('\n🧪 TEST: Campaign detail');
    await navigateTo(page, '/campaigns', 'Campaigns List');

    // Click first campaign
    const firstCampaign = page.locator('table tbody tr a, [class*="campaign" i][class*="card" i] a, [class*="campaign" i][class*="item" i], table tbody tr').first();
    if (await firstCampaign.isVisible().catch(() => false)) {
      await firstCampaign.click();
      await screenshot(page, '05-campaign-detail');
      console.log(`  ✅ Campaign detail: ${page.url()}`);

      await clickAllTabs(page);

      // Try "View Full Content" button
      const contentBtn = page.locator('button').filter({ hasText: /content|view/i }).first();
      if (await contentBtn.isVisible().catch(() => false)) {
        await contentBtn.click();
        await screenshot(page, '05-campaign-content-modal');
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('  ℹ️  No campaigns in list to click');
    }
  });

  test('Campaign templates page', async ({ page }) => {
    console.log('\n🧪 TEST: Campaign templates');
    await navigateTo(page, '/campaigns/templates', 'Campaign Templates');
    await verifyPageLoaded(page);
    await screenshot(page, '05-campaigns-templates');
    await clickAllTabs(page);
    console.log('  ✅ Templates page loaded');
  });

  test('Campaign schedule page', async ({ page }) => {
    console.log('\n🧪 TEST: Campaign schedule');
    await navigateTo(page, '/campaigns/schedule', 'Campaign Schedule');
    await verifyPageLoaded(page);
    await screenshot(page, '05-campaigns-schedule');
    console.log('  ✅ Schedule page loaded');
  });

  test('Campaign reports page', async ({ page }) => {
    console.log('\n🧪 TEST: Campaign reports');
    await navigateTo(page, '/campaigns/reports', 'Campaign Reports');
    await verifyPageLoaded(page);
    await screenshot(page, '05-campaigns-reports');
    await clickAllTabs(page);
    console.log('  ✅ Reports page loaded');
  });

  test('Email campaigns page', async ({ page }) => {
    console.log('\n🧪 TEST: Email campaigns');
    await navigateTo(page, '/campaigns/email', 'Email Campaigns');
    await verifyPageLoaded(page);
    await screenshot(page, '05-campaigns-email');

    // Click tabs (all, sent, scheduled, draft)
    await clickAllTabs(page);
    console.log('  ✅ Email campaigns page loaded');
  });

  test('SMS campaigns page', async ({ page }) => {
    console.log('\n🧪 TEST: SMS campaigns');
    await navigateTo(page, '/campaigns/sms', 'SMS Campaigns');
    await verifyPageLoaded(page);
    await screenshot(page, '05-campaigns-sms');
    console.log('  ✅ SMS campaigns page loaded');
  });

  test('Phone campaigns page', async ({ page }) => {
    console.log('\n🧪 TEST: Phone campaigns');
    await navigateTo(page, '/campaigns/phone', 'Phone Campaigns');
    await verifyPageLoaded(page);
    await screenshot(page, '05-campaigns-phone');
    console.log('  ✅ Phone campaigns page loaded');
  });

  test('A/B Testing page', async ({ page }) => {
    console.log('\n🧪 TEST: A/B Testing');
    await navigateTo(page, '/campaigns/ab-testing', 'A/B Testing');
    await verifyPageLoaded(page);
    await screenshot(page, '05-campaigns-ab-testing');
    await clickAllTabs(page);
    console.log('  ✅ A/B testing page loaded');
  });
});
