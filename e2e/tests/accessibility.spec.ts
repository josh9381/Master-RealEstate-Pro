import { test, expect } from '@playwright/test'

/**
 * E2E tests for page accessibility and performance basics.
 * Verifies that common pages load, have proper document structure,
 * and don't crash with JavaScript errors.
 */
test.describe('Accessibility & Page Fundamentals', () => {
  test('login page has a proper page title', async ({ page }) => {
    await page.goto('/auth/login')
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
  })

  test('register page has a proper page title', async ({ page }) => {
    await page.goto('/auth/register')
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
  })

  test('login page has no console errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    // Filter out expected React dev-mode warnings
    const criticalErrors = errors.filter(
      (e) => !e.includes('Warning:') && !e.includes('React does not recognize')
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('404 page has no console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('/this-page-should-not-exist-xyz-123')
    await page.waitForLoadState('networkidle')

    const criticalErrors = errors.filter(
      (e) => !e.includes('Warning:') && !e.includes('React does not recognize')
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('login page responds within reasonable time', async ({ page }) => {
    const start = Date.now()
    await page.goto('/auth/login')
    await page.waitForLoadState('domcontentloaded')
    const duration = Date.now() - start
    // Should load within 10 seconds even on slow CI
    expect(duration).toBeLessThan(10000)
  })

  test('login form is keyboard accessible', async ({ page }) => {
    await page.goto('/auth/login')
    // Tab through the form
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    // Should be able to reach the submit button
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()
  })

  test('terms of service page has content', async ({ page }) => {
    await page.goto('/terms-of-service')
    // Should have some text content
    const bodyText = await page.textContent('body')
    expect(bodyText!.length).toBeGreaterThan(100)
  })
})
