import { test, expect } from '@playwright/test'

test.describe('Navigation & Routing', () => {
  test('login page is the default for unauthenticated users', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/login/)
  })

  test('404 page renders for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page.getByText(/not found|404/i)).toBeVisible()
  })

  test('terms of service page is accessible', async ({ page }) => {
    await page.goto('/terms-of-service')
    await expect(page).toHaveURL(/terms-of-service/)
  })
})
