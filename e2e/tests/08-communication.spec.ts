import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, screenshot, verifyPageLoaded, clickAllTabs, fillVisibleInputs } from '../helpers/auth';

test.describe('08 - Communication', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Communication inbox', async ({ page }) => {
    console.log('\n🧪 TEST: Communication inbox');
    await navigateTo(page, '/communication', 'Communication Inbox');
    await verifyPageLoaded(page);
    await screenshot(page, '08-communication-inbox');

    await clickAllTabs(page);

    // Check for AI Composer panel
    const aiComposer = page.locator('[class*="composer" i]:visible, [class*="Composer" i]:visible');
    if (await aiComposer.count() > 0) {
      console.log('  🤖 AI Composer panel found');
      await screenshot(page, '08-communication-ai-composer');
    }

    // Try compose/new message button
    const composeBtn = page.locator('button').filter({ hasText: /compose|new|write|create/i }).first();
    if (await composeBtn.isVisible().catch(() => false)) {
      await composeBtn.click();
      await screenshot(page, '08-communication-compose');
      console.log('  ✅ Compose opened');
    }

    console.log('  ✅ Communication inbox loaded');
  });

  test('Communication inbox - alternate route', async ({ page }) => {
    console.log('\n🧪 TEST: Communication inbox (/inbox)');
    await navigateTo(page, '/communication/inbox', 'Communication Inbox Alt');
    await verifyPageLoaded(page);
    await screenshot(page, '08-communication-inbox-alt');
  });

  test('Email templates library', async ({ page }) => {
    console.log('\n🧪 TEST: Email templates');
    await navigateTo(page, '/communication/templates', 'Email Templates');
    await verifyPageLoaded(page);
    await screenshot(page, '08-communication-templates');

    await clickAllTabs(page);

    // Try create template button
    const createBtn = page.locator('button').filter({ hasText: /create|new|add/i }).first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await screenshot(page, '08-communication-template-create');
      console.log('  ✅ Create template dialog opened');
      await page.keyboard.press('Escape');
    }

    console.log('  ✅ Email templates loaded');
  });

  test('SMS center', async ({ page }) => {
    console.log('\n🧪 TEST: SMS center');
    await navigateTo(page, '/communication/sms', 'SMS Center');
    await verifyPageLoaded(page);
    await screenshot(page, '08-communication-sms');
    await clickAllTabs(page);
    console.log('  ✅ SMS center loaded');
  });

  test('Call center', async ({ page }) => {
    console.log('\n🧪 TEST: Call center');
    await navigateTo(page, '/communication/calls', 'Call Center');
    await verifyPageLoaded(page);
    await screenshot(page, '08-communication-calls');
    await clickAllTabs(page);
    console.log('  ✅ Call center loaded');
  });

  test('Social media dashboard', async ({ page }) => {
    console.log('\n🧪 TEST: Social media');
    await navigateTo(page, '/communication/social', 'Social Media Dashboard');
    await verifyPageLoaded(page);
    await screenshot(page, '08-communication-social');
    await clickAllTabs(page);
    console.log('  ✅ Social media dashboard loaded');
  });

  test('Newsletter management', async ({ page }) => {
    console.log('\n🧪 TEST: Newsletter');
    await navigateTo(page, '/communication/newsletter', 'Newsletter Management');
    await verifyPageLoaded(page);
    await screenshot(page, '08-communication-newsletter');
    await clickAllTabs(page);
    console.log('  ✅ Newsletter management loaded');
  });
});
