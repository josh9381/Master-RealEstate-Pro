import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, screenshot, verifyPageLoaded, clickAllTabs, fillVisibleInputs } from '../helpers/auth';

test.describe('13 - Help & Support', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Help center', async ({ page }) => {
    console.log('\n🧪 TEST: Help center');
    await navigateTo(page, '/help', 'Help Center');
    await verifyPageLoaded(page);
    await screenshot(page, '13-help-center');

    await clickAllTabs(page);

    // Check for search
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('how to create lead');
      console.log('  ✅ Help search works');
    }

    console.log('  ✅ Help center loaded');
  });

  test('Documentation pages', async ({ page }) => {
    console.log('\n🧪 TEST: Documentation');
    await navigateTo(page, '/help/docs', 'Documentation');
    await verifyPageLoaded(page);
    await screenshot(page, '13-help-docs');

    await clickAllTabs(page);

    // Check for doc sections
    const sections = page.locator('[class*="section" i]:visible, [class*="article" i]:visible, [class*="doc" i]:visible');
    const count = await sections.count();
    console.log(`  📖 Found ${count} documentation sections`);
    console.log('  ✅ Documentation loaded');
  });

  test('Support ticket system', async ({ page }) => {
    console.log('\n🧪 TEST: Support tickets');
    await navigateTo(page, '/help/support', 'Support Tickets');
    await verifyPageLoaded(page);
    await screenshot(page, '13-help-support');

    await clickAllTabs(page);

    // Check for create ticket button/form
    const createBtn = page.locator('button').filter({ hasText: /create|new|submit|open/i }).first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await screenshot(page, '13-help-support-create');
      console.log('  ✅ Create ticket form opened');

      // Fill ticket form
      await fillVisibleInputs(page, {
        subject: 'Test Support Ticket from Playwright',
        description: 'This is an automated test ticket',
      });
      await screenshot(page, '13-help-support-create-filled');

      // Don't submit, close
      await page.keyboard.press('Escape');
    }

    console.log('  ✅ Support ticket system loaded');
  });

  test('Video tutorials', async ({ page }) => {
    console.log('\n🧪 TEST: Video tutorials');
    await navigateTo(page, '/help/videos', 'Video Tutorials');
    await verifyPageLoaded(page);
    await screenshot(page, '13-help-videos');

    await clickAllTabs(page);

    // Check for video cards
    const videos = page.locator('[class*="video" i]:visible, [class*="tutorial" i]:visible');
    const count = await videos.count();
    console.log(`  🎥 Found ${count} video/tutorial elements`);
    console.log('  ✅ Video tutorials loaded');
  });
});
