import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, screenshot, verifyPageLoaded, clickAllTabs, clickAllSafeElements } from '../helpers/auth';

test.describe('06 - AI Hub', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('AI Hub main page', async ({ page }) => {
    console.log('\n🧪 TEST: AI Hub');
    await navigateTo(page, '/ai', 'AI Hub');
    await verifyPageLoaded(page);
    await screenshot(page, '06-ai-hub');

    await clickAllTabs(page);

    // Look for training data upload
    const uploadBtn = page.locator('button').filter({ hasText: /upload|train|import/i }).first();
    if (await uploadBtn.isVisible().catch(() => false)) {
      console.log('  📤 Upload/train button found');
    }
    console.log('  ✅ AI Hub loaded');
  });

  test('AI Lead Scoring page', async ({ page }) => {
    console.log('\n🧪 TEST: AI Lead Scoring');
    await navigateTo(page, '/ai/lead-scoring', 'AI Lead Scoring');
    await verifyPageLoaded(page);
    await screenshot(page, '06-ai-lead-scoring');
    await clickAllTabs(page);
    console.log('  ✅ Lead scoring page loaded');
  });

  test('AI Segmentation page', async ({ page }) => {
    console.log('\n🧪 TEST: AI Segmentation');
    await navigateTo(page, '/ai/segmentation', 'AI Segmentation');
    await verifyPageLoaded(page);
    await screenshot(page, '06-ai-segmentation');
    await clickAllTabs(page);
    console.log('  ✅ Segmentation page loaded');
  });

  test('AI Predictive Analytics page', async ({ page }) => {
    console.log('\n🧪 TEST: AI Predictive Analytics');
    await navigateTo(page, '/ai/predictive', 'Predictive Analytics');
    await verifyPageLoaded(page);
    await screenshot(page, '06-ai-predictive');
    await clickAllTabs(page);
    console.log('  ✅ Predictive analytics loaded');
  });

  test('AI Model Training page', async ({ page }) => {
    console.log('\n🧪 TEST: AI Model Training');
    await navigateTo(page, '/ai/training', 'Model Training');
    await verifyPageLoaded(page);
    await screenshot(page, '06-ai-training');
    await clickAllTabs(page);
    console.log('  ✅ Model training page loaded');
  });

  test('AI Intelligence Insights page', async ({ page }) => {
    console.log('\n🧪 TEST: AI Intelligence Insights');
    await navigateTo(page, '/ai/insights', 'Intelligence Insights');
    await verifyPageLoaded(page);
    await screenshot(page, '06-ai-insights');
    await clickAllTabs(page);
    console.log('  ✅ Insights page loaded');
  });

  test('AI Analytics page', async ({ page }) => {
    console.log('\n🧪 TEST: AI Analytics');
    await navigateTo(page, '/ai/analytics', 'AI Analytics');
    await verifyPageLoaded(page);
    await screenshot(page, '06-ai-analytics');
    await clickAllTabs(page);
    console.log('  ✅ AI Analytics page loaded');
  });
});
