import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, screenshot, verifyPageLoaded, clickAllTabs, clickAllSafeElements } from '../helpers/auth';

test.describe('11 - Admin Panel', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Admin panel overview', async ({ page }) => {
    console.log('\n🧪 TEST: Admin panel');
    await navigateTo(page, '/admin', 'Admin Panel');
    await verifyPageLoaded(page);
    await screenshot(page, '11-admin-panel');

    await clickAllTabs(page);
    console.log('  ✅ Admin panel loaded');
  });

  test('Admin team management', async ({ page }) => {
    console.log('\n🧪 TEST: Admin team');
    await navigateTo(page, '/admin/team', 'Admin Team Management');
    await verifyPageLoaded(page);
    await screenshot(page, '11-admin-team');

    await clickAllTabs(page);

    // Check for user list
    const users = page.locator('table tbody tr:visible, [class*="user" i][class*="card" i]:visible, [class*="team" i][class*="member" i]:visible');
    const count = await users.count();
    console.log(`  👥 Found ${count} team members`);
    console.log('  ✅ Admin team management loaded');
  });

  test('Admin subscription page', async ({ page }) => {
    console.log('\n🧪 TEST: Admin subscription');
    await navigateTo(page, '/admin/subscription', 'Admin Subscription');
    await verifyPageLoaded(page);
    await screenshot(page, '11-admin-subscription');

    await clickAllTabs(page);

    // Check for subscription tier info
    const tierInfo = page.locator('[class*="tier" i]:visible, [class*="plan" i]:visible, [class*="subscription" i]:visible');
    const count = await tierInfo.count();
    console.log(`  👑 Found ${count} tier/plan elements`);
    console.log('  ✅ Admin subscription loaded');
  });

  test('Admin system settings', async ({ page }) => {
    console.log('\n🧪 TEST: Admin system settings');
    await navigateTo(page, '/admin/system', 'System Settings');
    await verifyPageLoaded(page);
    await screenshot(page, '11-admin-system');

    await clickAllTabs(page);

    // Check for forms
    const inputs = page.locator('input:visible, textarea:visible, select:visible');
    const count = await inputs.count();
    console.log(`  📝 Found ${count} system setting fields`);
    console.log('  ✅ System settings loaded');
  });

  test('Admin feature flags', async ({ page }) => {
    console.log('\n🧪 TEST: Feature flags');
    await navigateTo(page, '/admin/features', 'Feature Flags');
    await verifyPageLoaded(page);
    await screenshot(page, '11-admin-features');

    // Check for flag toggles
    const toggles = page.locator('input[type="checkbox"]:visible, [role="switch"]:visible');
    const count = await toggles.count();
    console.log(`  🚩 Found ${count} feature flag toggles`);

    // Check create button
    const createBtn = page.locator('button').filter({ hasText: /create|new|add/i }).first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await screenshot(page, '11-admin-features-create');
      console.log('  ✅ Create feature flag dialog opened');
      await page.keyboard.press('Escape');
    }
    console.log('  ✅ Feature flags loaded');
  });

  test('Admin debug console', async ({ page }) => {
    console.log('\n🧪 TEST: Debug console');
    await navigateTo(page, '/admin/debug', 'Debug Console');
    await verifyPageLoaded(page);
    await screenshot(page, '11-admin-debug');
    await clickAllTabs(page);
    console.log('  ✅ Debug console loaded');
  });

  test('Admin backup & restore', async ({ page }) => {
    console.log('\n🧪 TEST: Backup & restore');
    await navigateTo(page, '/admin/backup', 'Backup & Restore');
    await verifyPageLoaded(page);
    await screenshot(page, '11-admin-backup');

    // Check for backup list and create button
    const createBackupBtn = page.locator('button').filter({ hasText: /create|backup|new/i }).first();
    if (await createBackupBtn.isVisible().catch(() => false)) {
      console.log('  ✅ Create backup button present');
    }
    console.log('  ✅ Backup & restore loaded');
  });

  test('Admin data export wizard', async ({ page }) => {
    console.log('\n🧪 TEST: Data export wizard');
    await navigateTo(page, '/admin/export', 'Data Export Wizard');
    await verifyPageLoaded(page);
    await screenshot(page, '11-admin-export');
    await clickAllTabs(page);
    console.log('  ✅ Data export wizard loaded');
  });

  test('Admin retry queue', async ({ page }) => {
    console.log('\n🧪 TEST: Retry queue');
    await navigateTo(page, '/admin/retry-queue', 'Retry Queue');
    await verifyPageLoaded(page);
    await screenshot(page, '11-admin-retry-queue');
    await clickAllTabs(page);
    console.log('  ✅ Retry queue loaded');
  });

  test('Admin health check dashboard', async ({ page }) => {
    console.log('\n🧪 TEST: Health check');
    await navigateTo(page, '/admin/health', 'Health Check Dashboard');
    await verifyPageLoaded(page);
    await screenshot(page, '11-admin-health');
    await clickAllTabs(page);

    // Check for health indicators
    const indicators = page.locator('[class*="health" i]:visible, [class*="status" i]:visible');
    const count = await indicators.count();
    console.log(`  💚 Found ${count} health indicators`);
    console.log('  ✅ Health check dashboard loaded');
  });

  test('Admin database maintenance', async ({ page }) => {
    console.log('\n🧪 TEST: Database maintenance');
    await navigateTo(page, '/admin/database', 'Database Maintenance');
    await verifyPageLoaded(page);
    await screenshot(page, '11-admin-database');
    await clickAllTabs(page);
    console.log('  ✅ Database maintenance loaded');
  });
});
