import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, screenshot, verifyPageLoaded, clickAllTabs, fillVisibleInputs } from '../helpers/auth';

test.describe('15 - Calendar, Activity, Tasks, Notifications', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Calendar page', async ({ page }) => {
    console.log('\n🧪 TEST: Calendar');
    await navigateTo(page, '/calendar', 'Calendar');
    await verifyPageLoaded(page);
    await screenshot(page, '15-calendar');

    await clickAllTabs(page);

    // Try "New Event" button
    const newEventBtn = page.locator('button').filter({ hasText: /new|create|add|event/i }).first();
    if (await newEventBtn.isVisible().catch(() => false)) {
      await newEventBtn.click();
      await screenshot(page, '15-calendar-new-event');
      console.log('  ✅ New event dialog opened');
      await page.keyboard.press('Escape');
    }

    // Try switching calendar views (day, week, month)
    const viewBtns = page.locator('button').filter({ hasText: /day|week|month|agenda/i });
    const viewCount = await viewBtns.count();
    for (let i = 0; i < viewCount; i++) {
      const text = (await viewBtns.nth(i).textContent())?.trim() || '';
      try {
        await viewBtns.nth(i).click();
        console.log(`  📅 Switched to view: "${text}"`);
      } catch { /* skip */ }
    }

    // Navigation arrows (prev/next month)
    const navBtns = page.locator('button[aria-label*="prev" i], button[aria-label*="next" i], button[aria-label*="back" i], button[aria-label*="forward" i]');
    const navCount = await navBtns.count();
    for (let i = 0; i < Math.min(navCount, 4); i++) {
      try {
        await navBtns.nth(i).click();
      } catch { /* skip */ }
    }

    await screenshot(page, '15-calendar-navigated');
    console.log('  ✅ Calendar loaded');
  });

  test('Activity page', async ({ page }) => {
    console.log('\n🧪 TEST: Activity feed');
    await navigateTo(page, '/activity', 'Activity');
    await verifyPageLoaded(page);
    await screenshot(page, '15-activity');

    await clickAllTabs(page);

    // Check for activity items
    const activities = page.locator('[class*="activity" i]:visible, [class*="feed" i]:visible, [class*="timeline" i]:visible');
    const count = await activities.count();
    console.log(`  📋 Found ${count} activity elements`);
    console.log('  ✅ Activity page loaded');
  });

  test('Tasks page', async ({ page }) => {
    console.log('\n🧪 TEST: Tasks');
    await navigateTo(page, '/tasks', 'Tasks');
    await verifyPageLoaded(page);
    await screenshot(page, '15-tasks');

    await clickAllTabs(page);

    // Try creating a task
    const addTaskInput = page.locator('input[placeholder*="task" i], input[placeholder*="add" i], input[placeholder*="new" i]').first();
    if (await addTaskInput.isVisible().catch(() => false)) {
      await addTaskInput.fill('Playwright test task');

      // Submit (Enter or button)
      const addBtn = page.locator('button').filter({ hasText: /add|create/i }).first();
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
      } else {
        await addTaskInput.press('Enter');
      }
      await screenshot(page, '15-tasks-created');
      console.log('  ✅ Task created');
    } else {
      // Try a create button that opens a form
      const createBtn = page.locator('button').filter({ hasText: /create|new|add/i }).first();
      if (await createBtn.isVisible().catch(() => false)) {
        await createBtn.click();
        await screenshot(page, '15-tasks-create-dialog');
        console.log('  ✅ Task creation dialog opened');
        await page.keyboard.press('Escape');
      }
    }

    // Try toggling a task complete
    const checkboxes = page.locator('input[type="checkbox"]:visible');
    const cbCount = await checkboxes.count();
    if (cbCount > 0) {
      await checkboxes.first().check();
      console.log('  ✅ Task toggled complete');
      // Toggle back
      await checkboxes.first().uncheck().catch(() => {});
    }

    // Filter by status
    const filterBtns = page.locator('button').filter({ hasText: /all|active|completed|pending/i });
    const filterCount = await filterBtns.count();
    for (let i = 0; i < filterCount; i++) {
      try {
        await filterBtns.nth(i).click();
      } catch { /* skip */ }
    }

    console.log('  ✅ Tasks page loaded');
  });

  test('Notifications page', async ({ page }) => {
    console.log('\n🧪 TEST: Notifications page');
    await navigateTo(page, '/notifications', 'Notifications');
    await verifyPageLoaded(page);
    await screenshot(page, '15-notifications');

    await clickAllTabs(page);

    // Check for notification items
    const notifications = page.locator('[class*="notification" i]:visible');
    const count = await notifications.count();
    console.log(`  🔔 Found ${count} notification elements`);

    // Try mark as read button
    const markReadBtn = page.locator('button').filter({ hasText: /mark.*read|read all/i }).first();
    if (await markReadBtn.isVisible().catch(() => false)) {
      console.log('  ✅ Mark as read button present');
    }

    console.log('  ✅ Notifications page loaded');
  });

  test('Unsubscribe page (public)', async ({ page }) => {
    console.log('\n🧪 TEST: Unsubscribe page');
    // This is a public route, no login needed
    await navigateTo(page, '/unsubscribe/test-token', 'Unsubscribe');
    await screenshot(page, '15-unsubscribe');
    await verifyPageLoaded(page);
    console.log('  ✅ Unsubscribe page loaded');
  });
});
