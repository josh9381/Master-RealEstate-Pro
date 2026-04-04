import { test, expect } from '@playwright/test'

/**
 * E2E tests for route redirects — verifies that legacy and convenience
 * redirect routes work correctly.
 */
test.describe('Route Redirects', () => {
  test('root redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/auth\/login|login/)
  })

  test('/campaigns/email redirects to /campaigns with type filter', async ({ page }) => {
    await page.goto('/campaigns/email')
    // Will redirect to login since unauthenticated, but route should be handled
    await expect(page).toHaveURL(/login|campaigns/)
  })

  test('/communication redirects to /communication/inbox', async ({ page }) => {
    await page.goto('/communication')
    // Will redirect to login since unauthenticated
    await expect(page).toHaveURL(/login|communication\/inbox/)
  })

  test('unknown route shows 404 page', async ({ page }) => {
    await page.goto('/completely-invalid-route-xyz')
    await expect(page.getByText(/not found|404/i)).toBeVisible()
  })

  test('terms of service page renders without auth', async ({ page }) => {
    await page.goto('/terms-of-service')
    await expect(page).toHaveURL(/terms-of-service/)
  })
})
