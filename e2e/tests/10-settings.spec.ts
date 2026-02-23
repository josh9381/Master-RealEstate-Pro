import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, screenshot, verifyPageLoaded, clickAllTabs, fillVisibleInputs } from '../helpers/auth';

test.describe('10 - Settings', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Settings hub page', async ({ page }) => {
    console.log('\n🧪 TEST: Settings hub');
    await navigateTo(page, '/settings', 'Settings Hub');
    await verifyPageLoaded(page);
    await screenshot(page, '10-settings-hub');

    // Check for settings cards/links
    const settingsLinks = page.locator('a:visible, [class*="card" i]:visible').filter({ hasText: /profile|business|team|email|security|notification/i });
    const count = await settingsLinks.count();
    console.log(`  ⚙️ Found ${count} settings section links`);
    console.log('  ✅ Settings hub loaded');
  });

  test('Profile settings', async ({ page }) => {
    console.log('\n🧪 TEST: Profile settings');
    await navigateTo(page, '/settings/profile', 'Profile Settings');
    await verifyPageLoaded(page);
    await screenshot(page, '10-settings-profile');

    // Check form fields are present
    const inputs = page.locator('input:visible, textarea:visible');
    const count = await inputs.count();
    console.log(`  📝 Found ${count} form fields`);

    // Find and note the save button (don't click to avoid changes)
    const saveBtn = page.locator('button').filter({ hasText: /save|update/i }).first();
    if (await saveBtn.isVisible().catch(() => false)) {
      console.log('  ✅ Save button present');
    }
    console.log('  ✅ Profile settings loaded');
  });

  test('Business settings', async ({ page }) => {
    console.log('\n🧪 TEST: Business settings');
    await navigateTo(page, '/settings/business', 'Business Settings');
    await verifyPageLoaded(page);
    await screenshot(page, '10-settings-business');

    const inputs = page.locator('input:visible, textarea:visible, select:visible');
    const count = await inputs.count();
    console.log(`  📝 Found ${count} form fields`);
    console.log('  ✅ Business settings loaded');
  });

  test('Team management settings', async ({ page }) => {
    console.log('\n🧪 TEST: Team management');
    await navigateTo(page, '/settings/team', 'Team Management');
    await verifyPageLoaded(page);
    await screenshot(page, '10-settings-team');
    await clickAllTabs(page);
    console.log('  ✅ Team management loaded');
  });

  test('Email configuration settings', async ({ page }) => {
    console.log('\n🧪 TEST: Email configuration');
    await navigateTo(page, '/settings/email', 'Email Configuration');
    await verifyPageLoaded(page);
    await screenshot(page, '10-settings-email');
    await clickAllTabs(page);
    console.log('  ✅ Email configuration loaded');
  });

  test('Notification settings', async ({ page }) => {
    console.log('\n🧪 TEST: Notification settings');
    await navigateTo(page, '/settings/notifications', 'Notification Settings');
    await verifyPageLoaded(page);
    await screenshot(page, '10-settings-notifications');

    // Check for toggle/checkbox preferences
    const toggles = page.locator('input[type="checkbox"]:visible, [role="switch"]:visible');
    const count = await toggles.count();
    console.log(`  🔀 Found ${count} notification toggles`);
    console.log('  ✅ Notification settings loaded');
  });

  test('Security settings', async ({ page }) => {
    console.log('\n🧪 TEST: Security settings');
    await navigateTo(page, '/settings/security', 'Security Settings');
    await verifyPageLoaded(page);
    await screenshot(page, '10-settings-security');
    await clickAllTabs(page);
    console.log('  ✅ Security settings loaded');
  });

  test('Change password page', async ({ page }) => {
    console.log('\n🧪 TEST: Change password');
    await navigateTo(page, '/settings/security/password', 'Change Password');
    await verifyPageLoaded(page);
    await screenshot(page, '10-settings-password');

    const passwordInputs = page.locator('input[type="password"]:visible');
    const count = await passwordInputs.count();
    console.log(`  🔒 Found ${count} password fields`);
    console.log('  ✅ Change password page loaded');
  });

  test('Compliance settings', async ({ page }) => {
    console.log('\n🧪 TEST: Compliance settings');
    await navigateTo(page, '/settings/compliance', 'Compliance Settings');
    await verifyPageLoaded(page);
    await screenshot(page, '10-settings-compliance');
    console.log('  ✅ Compliance settings loaded');
  });

  test('Google integration settings', async ({ page }) => {
    console.log('\n🧪 TEST: Google integration');
    await navigateTo(page, '/settings/google', 'Google Integration');
    await verifyPageLoaded(page);
    await screenshot(page, '10-settings-google');
    console.log('  ✅ Google integration loaded');
  });

  test('Twilio setup settings', async ({ page }) => {
    console.log('\n🧪 TEST: Twilio setup');
    await navigateTo(page, '/settings/twilio', 'Twilio Setup');
    await verifyPageLoaded(page);
    await screenshot(page, '10-settings-twilio');

    const inputs = page.locator('input:visible');
    const count = await inputs.count();
    console.log(`  📝 Found ${count} Twilio config fields`);
    console.log('  ✅ Twilio setup loaded');
  });

  test('Service configuration settings', async ({ page }) => {
    console.log('\n🧪 TEST: Service configuration');
    await navigateTo(page, '/settings/services', 'Service Configuration');
    await verifyPageLoaded(page);
    await screenshot(page, '10-settings-services');
    console.log('  ✅ Service configuration loaded');
  });

  test('Demo data generator', async ({ page }) => {
    console.log('\n🧪 TEST: Demo data generator');
    await navigateTo(page, '/settings/demo-data', 'Demo Data Generator');
    await verifyPageLoaded(page);
    await screenshot(page, '10-settings-demo-data');

    // Check for generate button (don't click)
    const generateBtn = page.locator('button').filter({ hasText: /generate|create|seed/i }).first();
    if (await generateBtn.isVisible().catch(() => false)) {
      console.log('  ✅ Generate button present');
    }
    console.log('  ✅ Demo data generator loaded');
  });

  test('Tags manager', async ({ page }) => {
    console.log('\n🧪 TEST: Tags manager');
    await navigateTo(page, '/settings/tags', 'Tags Manager');
    await verifyPageLoaded(page);
    await screenshot(page, '10-settings-tags');

    // Check for add tag button
    const addBtn = page.locator('button').filter({ hasText: /add|create|new/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      console.log('  ✅ Add tag button present');
    }
    console.log('  ✅ Tags manager loaded');
  });

  test('Custom fields manager', async ({ page }) => {
    console.log('\n🧪 TEST: Custom fields');
    await navigateTo(page, '/settings/custom-fields', 'Custom Fields Manager');
    await verifyPageLoaded(page);
    await screenshot(page, '10-settings-custom-fields');

    const addBtn = page.locator('button').filter({ hasText: /add|create|new/i }).first();
    if (await addBtn.isVisible().catch(() => false)) {
      console.log('  ✅ Add custom field button present');
    }
    console.log('  ✅ Custom fields manager loaded');
  });
});
