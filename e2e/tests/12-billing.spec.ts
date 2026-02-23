import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, screenshot, verifyPageLoaded, clickAllTabs } from '../helpers/auth';

test.describe('12 - Billing', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Billing page', async ({ page }) => {
    console.log('\n🧪 TEST: Billing page');
    await navigateTo(page, '/billing', 'Billing');
    await verifyPageLoaded(page);
    await screenshot(page, '12-billing');
    await clickAllTabs(page);
    console.log('  ✅ Billing page loaded');
  });

  test('Billing subscription page', async ({ page }) => {
    console.log('\n🧪 TEST: Billing subscription');
    await navigateTo(page, '/billing/subscription', 'Billing Subscription');
    await verifyPageLoaded(page);
    await screenshot(page, '12-billing-subscription');

    // Check for plan cards
    const plans = page.locator('[class*="plan" i]:visible, [class*="tier" i]:visible, [class*="pricing" i]:visible');
    const count = await plans.count();
    console.log(`  💳 Found ${count} plan/pricing elements`);
    await clickAllTabs(page);
    console.log('  ✅ Billing subscription loaded');
  });

  test('Billing usage dashboard', async ({ page }) => {
    console.log('\n🧪 TEST: Usage dashboard');
    await navigateTo(page, '/billing/usage', 'Usage Dashboard');
    await verifyPageLoaded(page);
    await screenshot(page, '12-billing-usage');
    await clickAllTabs(page);

    // Check for usage meters/charts
    const meters = page.locator('[class*="meter" i]:visible, [class*="progress" i]:visible, [class*="chart" i]:visible');
    const count = await meters.count();
    console.log(`  📊 Found ${count} usage meters/charts`);
    console.log('  ✅ Usage dashboard loaded');
  });

  test('Upgrade wizard', async ({ page }) => {
    console.log('\n🧪 TEST: Upgrade wizard');
    await navigateTo(page, '/billing/upgrade', 'Upgrade Wizard');
    await verifyPageLoaded(page);
    await screenshot(page, '12-billing-upgrade');

    // Check for plan comparison
    const plans = page.locator('[class*="plan" i]:visible, [class*="card" i]:visible');
    const count = await plans.count();
    console.log(`  ⬆️ Found ${count} upgrade cards`);
    console.log('  ✅ Upgrade wizard loaded');
  });

  test('Payment methods page', async ({ page }) => {
    console.log('\n🧪 TEST: Payment methods');
    await navigateTo(page, '/billing/payment-methods', 'Payment Methods');
    await verifyPageLoaded(page);
    await screenshot(page, '12-billing-payment-methods');

    // Check for add payment method button
    const addBtn = page.locator('button').filter({ hasText: /add|new|create/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      console.log('  ✅ Add payment method button present');
    }
    console.log('  ✅ Payment methods loaded');
  });
});
