import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, screenshot, verifyPageLoaded, clickAllTabs, fillVisibleInputs, clickAllSafeElements } from '../helpers/auth';

test.describe('04 - Leads', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Leads list page loads', async ({ page }) => {
    console.log('\n🧪 TEST: Leads list');
    await navigateTo(page, '/leads', 'Leads List');
    await verifyPageLoaded(page);
    await screenshot(page, '04-leads-list');

    // Check for table or list of leads
    const table = page.locator('table:visible, [class*="table" i]:visible, [class*="list" i]:visible, [class*="grid" i]:visible');
    const count = await table.count();
    console.log(`  📋 Found ${count} list/table elements`);
  });

  test('Leads list - search and filters', async ({ page }) => {
    console.log('\n🧪 TEST: Leads search & filters');
    await navigateTo(page, '/leads', 'Leads List');

    // Try search input
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('John');
      await screenshot(page, '04-leads-search');
      console.log('  ✅ Search input works');
      await searchInput.clear();
    }

    // Try filter buttons
    const filterBtn = page.locator('button').filter({ hasText: /filter/i }).first();
    if (await filterBtn.isVisible().catch(() => false)) {
      await filterBtn.click();
      await screenshot(page, '04-leads-filters-open');
      console.log('  ✅ Filter panel opened');
    }

    // Click status filter tabs if any
    await clickAllTabs(page);
    await screenshot(page, '04-leads-tabs');
  });

  test('Leads list - table/grid toggle', async ({ page }) => {
    console.log('\n🧪 TEST: Leads view toggle');
    await navigateTo(page, '/leads', 'Leads List');

    // Look for view toggle buttons
    const toggleBtns = page.locator('button[aria-label*="grid" i], button[aria-label*="table" i], button[aria-label*="view" i], button[aria-label*="list" i]');
    const count = await toggleBtns.count();
    console.log(`  🔀 Found ${count} view toggle buttons`);
    for (let i = 0; i < count; i++) {
      await toggleBtns.nth(i).click();
      await screenshot(page, `04-leads-view-${i}`);
    }
  });

  test('Leads list - bulk selection', async ({ page }) => {
    console.log('\n🧪 TEST: Leads bulk selection');
    await navigateTo(page, '/leads', 'Leads List');

    // Try checking select-all checkbox
    const selectAll = page.locator('input[type="checkbox"]').first();
    if (await selectAll.isVisible().catch(() => false)) {
      await selectAll.check();
      await screenshot(page, '04-leads-bulk-selected');
      console.log('  ✅ Bulk selection checkbox clicked');

      // Check if bulk actions bar appeared
      const bulkBar = page.locator('[class*="bulk" i]:visible');
      if (await bulkBar.count() > 0) {
        console.log('  ✅ Bulk actions bar visible');
      }

      // Uncheck
      await selectAll.uncheck();
    }
  });

  test('Create lead page', async ({ page }) => {
    console.log('\n🧪 TEST: Create lead');
    await navigateTo(page, '/leads/create', 'Create Lead');
    await verifyPageLoaded(page);
    await screenshot(page, '04-leads-create-empty');

    // Fill form fields
    await fillVisibleInputs(page, {
      firstName: 'Playwright',
      lastName: 'TestLead',
      email: 'playwright.test@example.com',
      phone: '+15551234567',
      company: 'Test Company LLC',
      jobTitle: 'Test Manager',
      city: 'Test City',
      state: 'CA',
      zipCode: '90210',
    });

    await screenshot(page, '04-leads-create-filled');
    console.log('  ✅ Create lead form filled');

    // Submit the form
    const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /create|save|submit|add/i }).first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await screenshot(page, '04-leads-create-submitted');
      console.log('  ✅ Create lead form submitted');
    }
  });

  test('Lead detail page', async ({ page }) => {
    console.log('\n🧪 TEST: Lead detail');
    await navigateTo(page, '/leads', 'Leads List');

    // Click first lead in the list
    const firstLead = page.locator('table tbody tr a, [class*="lead" i][class*="card" i] a, [class*="lead" i][class*="item" i] a, table tbody tr').first();
    if (await firstLead.isVisible().catch(() => false)) {
      await firstLead.click();
      await screenshot(page, '04-lead-detail');
      console.log(`  ✅ Lead detail page: ${page.url()}`);
      await verifyPageLoaded(page);

      // Click tabs on detail page
      await clickAllTabs(page);
      await screenshot(page, '04-lead-detail-tabs');

      // Try edit button (but don't save)
      const editBtn = page.locator('button').filter({ hasText: /edit/i }).first();
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        await screenshot(page, '04-lead-edit-modal');
        console.log('  ✅ Edit modal opened');

        // Close without saving
        await page.keyboard.press('Escape');
      }
    } else {
      console.log('  ℹ️  No leads found in list to click');
    }
  });

  test('Leads pipeline/kanban view', async ({ page }) => {
    console.log('\n🧪 TEST: Leads pipeline');
    await navigateTo(page, '/leads/pipeline', 'Leads Pipeline');
    await verifyPageLoaded(page);
    await screenshot(page, '04-leads-pipeline');

    // Check for kanban columns
    const columns = page.locator('[class*="column" i]:visible, [class*="lane" i]:visible, [class*="stage" i]:visible');
    const count = await columns.count();
    console.log(`  📊 Found ${count} pipeline columns`);
  });

  test('Leads import page', async ({ page }) => {
    console.log('\n🧪 TEST: Leads import');
    await navigateTo(page, '/leads/import', 'Leads Import');
    await verifyPageLoaded(page);
    await screenshot(page, '04-leads-import');
    console.log('  ✅ Import page loaded');
  });

  test('Leads export page', async ({ page }) => {
    console.log('\n🧪 TEST: Leads export');
    await navigateTo(page, '/leads/export', 'Leads Export');
    await verifyPageLoaded(page);
    await screenshot(page, '04-leads-export');
    console.log('  ✅ Export page loaded');
  });

  test('Leads follow-ups page', async ({ page }) => {
    console.log('\n🧪 TEST: Leads follow-ups');
    await navigateTo(page, '/leads/followups', 'Leads Follow-ups');
    await verifyPageLoaded(page);
    await screenshot(page, '04-leads-followups');

    await clickAllTabs(page);
    console.log('  ✅ Follow-ups page loaded');
  });

  test('Lead history page', async ({ page }) => {
    console.log('\n🧪 TEST: Lead history');
    await navigateTo(page, '/leads/history', 'Lead History');
    await verifyPageLoaded(page);
    await screenshot(page, '04-leads-history');
    console.log('  ✅ History page loaded');
  });

  test('Leads merge page', async ({ page }) => {
    console.log('\n🧪 TEST: Leads merge');
    await navigateTo(page, '/leads/merge', 'Leads Merge');
    await verifyPageLoaded(page);
    await screenshot(page, '04-leads-merge');
    console.log('  ✅ Merge page loaded');
  });
});
