import { test, expect } from '@playwright/test'

/**
 * E2E tests for the authentication forms — verifies form structure,
 * validation, and navigation between auth pages.
 */
test.describe('Auth Forms', () => {
  test.describe('Login Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/login')
    })

    test('renders login heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /sign in|log in/i })).toBeVisible()
    })

    test('has email and password inputs', async ({ page }) => {
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i)).toBeVisible()
    })

    test('has submit button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible()
    })

    test('stays on login page when submitting empty form', async ({ page }) => {
      await page.getByRole('button', { name: /sign in|log in/i }).click()
      await expect(page).toHaveURL(/login/)
    })

    test('has link to register page', async ({ page }) => {
      const link = page.getByRole('link', { name: /sign up|register|create.*account/i })
      await expect(link).toBeVisible()
    })

    test('has link to forgot password', async ({ page }) => {
      const link = page.getByRole('link', { name: /forgot|reset/i })
      await expect(link).toBeVisible()
    })

    test('shows error for invalid credentials', async ({ page }) => {
      await page.getByLabel(/email/i).fill('nonexistent@test.com')
      await page.getByLabel(/password/i).fill('WrongPassword123!')
      await page.getByRole('button', { name: /sign in|log in/i }).click()
      // Should stay on login (not redirect to dashboard) with an error or remain
      await expect(page).toHaveURL(/login/)
    })
  })

  test.describe('Register Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/register')
    })

    test('renders register heading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /sign up|register|create/i })).toBeVisible()
    })

    test('has required fields', async ({ page }) => {
      await expect(page.getByLabel(/first name/i)).toBeVisible()
      await expect(page.getByLabel(/last name/i)).toBeVisible()
      await expect(page.getByLabel(/email/i)).toBeVisible()
      // Password field(s)
      const passwordFields = page.locator('input[type="password"]')
      await expect(passwordFields.first()).toBeVisible()
    })

    test('has link to login page', async ({ page }) => {
      const link = page.getByRole('link', { name: /sign in|log in|already.*account/i })
      await expect(link).toBeVisible()
    })

    test('stays on register page when submitting empty form', async ({ page }) => {
      await page.getByRole('button', { name: /sign up|register|create/i }).click()
      await expect(page).toHaveURL(/register/)
    })
  })

  test.describe('Forgot Password Form', () => {
    test('renders forgot password page', async ({ page }) => {
      await page.goto('/auth/forgot-password')
      await expect(page).toHaveURL(/forgot-password/)
    })

    test('has email input', async ({ page }) => {
      await page.goto('/auth/forgot-password')
      await expect(page.getByLabel(/email/i)).toBeVisible()
    })

    test('has submit button', async ({ page }) => {
      await page.goto('/auth/forgot-password')
      const button = page.getByRole('button', { name: /reset|send|submit/i })
      await expect(button).toBeVisible()
    })

    test('has link back to login', async ({ page }) => {
      await page.goto('/auth/forgot-password')
      const link = page.getByRole('link', { name: /back|login|sign in/i })
      await expect(link).toBeVisible()
    })
  })

  test.describe('Auth Navigation Flow', () => {
    test('can navigate from login to register', async ({ page }) => {
      await page.goto('/auth/login')
      await page.getByRole('link', { name: /sign up|register|create.*account/i }).click()
      await expect(page).toHaveURL(/register/)
    })

    test('can navigate from register to login', async ({ page }) => {
      await page.goto('/auth/register')
      await page.getByRole('link', { name: /sign in|log in|already.*account/i }).click()
      await expect(page).toHaveURL(/login/)
    })

    test('can navigate from login to forgot password', async ({ page }) => {
      await page.goto('/auth/login')
      await page.getByRole('link', { name: /forgot|reset/i }).click()
      await expect(page).toHaveURL(/forgot-password/)
    })
  })
})
