import { test, expect } from '@playwright/test'

/**
 * E2E tests for protected routes — verifies that all major app sections
 * correctly redirect unauthenticated users to the login page.
 * This ensures auth guards are properly configured for every route group.
 */
test.describe('Protected Route Guards', () => {
  const protectedRoutes = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Leads Overview', path: '/leads' },
    { name: 'Leads List', path: '/leads/all' },
    { name: 'Lead Create', path: '/leads/create' },
    { name: 'Leads Pipeline', path: '/leads/pipeline' },
    { name: 'Leads Import', path: '/leads/import' },
    { name: 'Campaigns', path: '/campaigns' },
    { name: 'Campaign Create', path: '/campaigns/create' },
    { name: 'Campaign Templates', path: '/campaigns/templates' },
    { name: 'Communication Inbox', path: '/communication/inbox' },
    { name: 'Email Templates', path: '/communication/templates' },
    { name: 'SMS Templates', path: '/communication/sms-templates' },
    { name: 'AI Hub', path: '/ai' },
    { name: 'Lead Scoring', path: '/ai/lead-scoring' },
    { name: 'Intelligence Hub', path: '/ai/intelligence' },
    { name: 'Analytics Dashboard', path: '/analytics' },
    { name: 'Lead Analytics', path: '/analytics/leads' },
    { name: 'Workflows', path: '/workflows' },
    { name: 'Workflow Builder', path: '/workflows/builder' },
    { name: 'Settings', path: '/settings' },
    { name: 'Profile Settings', path: '/settings/profile' },
    { name: 'Security Settings', path: '/settings/security' },
    { name: 'Admin Panel', path: '/admin' },
    { name: 'Billing', path: '/billing' },
    { name: 'Calendar', path: '/calendar' },
    { name: 'Tasks', path: '/tasks' },
    { name: 'Activity', path: '/activity' },
    { name: 'Integrations', path: '/integrations' },
    { name: 'Help Center', path: '/help' },
    { name: 'Notifications', path: '/notifications' },
  ]

  for (const route of protectedRoutes) {
    test(`${route.name} (${route.path}) redirects to login`, async ({ page }) => {
      await page.goto(route.path)
      await expect(page).toHaveURL(/auth\/login|login/)
    })
  }
})
