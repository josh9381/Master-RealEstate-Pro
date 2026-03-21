import { test, expect } from '@playwright/test';
import { loginAsAdmin, navigateTo, screenshot, verifyPageLoaded, clickAllTabs, clickAllSafeElements } from '../helpers/auth';

test.describe('09 - Workflows & Automation', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Workflows list page', async ({ page }) => {
    console.log('\n🧪 TEST: Workflows list');
    await navigateTo(page, '/workflows', 'Workflows List');
    await verifyPageLoaded(page);
    await screenshot(page, '09-workflows-list');

    await clickAllTabs(page);

    // Check for workflow cards/items
    const items = page.locator('[class*="workflow" i][class*="card" i]:visible, [class*="workflow" i][class*="item" i]:visible, table tbody tr:visible');
    const count = await items.count();
    console.log(`  📋 Found ${count} workflow items`);

    // Try clicking first workflow for analytics modal
    if (count > 0) {
      const analyticsBtn = page.locator('button').filter({ hasText: /analytics|stats|view/i }).first();
      if (await analyticsBtn.isVisible().catch(() => false)) {
        await analyticsBtn.click();
        await screenshot(page, '09-workflow-analytics-modal');
        console.log('  ✅ Analytics modal opened');
        await page.keyboard.press('Escape');
      }
    }

    console.log('  ✅ Workflows list loaded');
  });

  test('Workflow builder page', async ({ page }) => {
    console.log('\n🧪 TEST: Workflow builder');
    await navigateTo(page, '/workflows/builder', 'Workflow Builder');
    await verifyPageLoaded(page);
    await screenshot(page, '09-workflow-builder');

    // Check for ReactFlow canvas
    const canvas = page.locator('[class*="react-flow" i]:visible, [class*="reactflow" i]:visible, [class*="canvas" i]:visible');
    const canvasCount = await canvas.count();
    console.log(`  🎨 Found ${canvasCount} canvas elements`);

    // Check for component library/sidebar
    const componentLib = page.locator('[class*="library" i]:visible, [class*="panel" i]:visible, [class*="sidebar" i]:visible');
    const libCount = await componentLib.count();
    console.log(`  📚 Found ${libCount} library/panel elements`);

    // Try template browse button
    const templateBtn = page.locator('button').filter({ hasText: /template|browse|library/i }).first();
    if (await templateBtn.isVisible().catch(() => false)) {
      await templateBtn.click();
      await screenshot(page, '09-workflow-template-modal');
      console.log('  ✅ Template modal opened');
      await page.keyboard.press('Escape');
    }

    // Try to drag a node from component library into canvas
    const draggableNodes = page.locator('[draggable="true"]:visible, [class*="drag" i]:visible');
    const nodeCount = await draggableNodes.count();
    console.log(`  🔲 Found ${nodeCount} draggable elements`);

    await screenshot(page, '09-workflow-builder-explored');
    console.log('  ✅ Workflow builder loaded');
  });


});
