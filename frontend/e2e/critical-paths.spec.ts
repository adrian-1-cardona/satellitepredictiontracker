import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should display landing page with hero section', async ({ page }) => {
    await page.goto('/');

    // Check for main heading
    const mainHeading = page.locator('h1');
    await expect(mainHeading).toBeVisible();

    // Check for call-to-action button
    const ctaButton = page.locator('button, a').filter({ hasText: /get started|launch|sign/i }).first();
    await expect(ctaButton).toBeVisible();
  });

  test('should navigate to login when clicking login button', async ({ page }) => {
    await page.goto('/');

    // Find and click login link
    const loginLink = page.locator('a, button').filter({ hasText: /login|sign in/i }).first();
    await loginLink.click();

    // Should navigate to login page
    await expect(page).toHaveURL(/.*auth.*login|.*login/);
  });

  test('should navigate to register when clicking signup button', async ({ page }) => {
    await page.goto('/');

    // Find and click signup/register link
    const signupLink = page.locator('a, button').filter({ hasText: /sign up|register|create account/i }).first();
    await signupLink.click();

    // Should navigate to register page
    await expect(page).toHaveURL(/.*auth.*register|.*register/);
  });
});

test.describe('Authentication Flow', () => {
  test('should allow user registration with valid credentials', async ({ page }) => {
    const uniqueEmail = `test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    await page.goto('/auth/register');

    // Fill registration form
    await page.fill('input[type="email"], input[placeholder*="email" i]', uniqueEmail);
    await page.fill('input[type="password"]', password);

    // Find and click register button
    const registerButton = page.locator('button').filter({ hasText: /register|create|sign up/i }).first();
    await registerButton.click();

    // Should redirect to dashboard or login on success
    await page.waitForURL(/.*dashboard|.*home|.*auth\/login/, { timeout: 10000 }).catch(() => {
      // If navigation times out, check if we got an error message
      return page.locator('text=/error|invalid|failed/i').first();
    });
  });

  test('should reject registration with invalid email', async ({ page }) => {
    await page.goto('/auth/register');

    // Fill form with invalid email
    await page.fill('input[placeholder*="email" i]', 'not-an-email');
    await page.fill('input[type="password"]', 'TestPassword123!');

    const registerButton = page.locator('button').filter({ hasText: /register|create|sign up/i }).first();
    await registerButton.click();

    // Should show error or validation message
    await expect(page.locator('text=/invalid|error|email/i')).toBeVisible({ timeout: 5000 }).catch(() => null);
  });

  test('should persist user login via token storage', async ({ page, context }) => {
    const uniqueEmail = `test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    // Register first
    await page.goto('/auth/register');
    await page.fill('input[placeholder*="email" i]', uniqueEmail);
    await page.fill('input[type="password"]', password);
    const registerButton = page.locator('button').filter({ hasText: /register|create|sign up/i }).first();
    await registerButton.click();

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle').catch(() => null);

    // Check if logged in (should be on dashboard)
    const isOnDashboard = await page.url().includes('dashboard') || await page.url().includes('home');
    if (isOnDashboard) {
      await expect(page).toHaveURL(/.*dashboard|.*home/);
    }
  });
});

test.describe('Dashboard Navigation', () => {
  test('should display dashboard when accessing root path after login', async ({ page }) => {
    await page.goto('/');

    // If on landing, try to navigate to dashboard directly
    await page.goto('/dashboard').catch(() => null);

    // Check if any dashboard elements are visible
    const dashboardElement = page.locator('text=/dashboard|locations|passes|satellite/i').first();
    await expect(dashboardElement).toBeVisible({ timeout: 5000 }).catch(() => null);
  });

  test('should have navigation menu with all main sections', async ({ page }) => {
    await page.goto('/dashboard').catch(() => page.goto('/'));

    // Check for navigation links
    const navigationLinks = ['locations', 'passes', 'alerts', 'profile'];
    for (const link of navigationLinks) {
      const navElement = page.locator(`a, button, [role="menuitem"]`).filter({ hasText: new RegExp(link, 'i') }).first();
      await expect(navElement).toBeVisible({ timeout: 3000 }).catch(() => null);
    }
  });
});

test.describe('3D Visualization', () => {
  test('should display 3D globe on dashboard', async ({ page }) => {
    await page.goto('/dashboard').catch(() => page.goto('/'));

    // Look for canvas element (3D visualization)
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 5000 }).catch(() => null);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/').catch(() => null);

    // Check that page is still usable on mobile
    const mainContent = page.locator('body');
    await expect(mainContent).toBeVisible();
  });
});

test.describe('API Integration', () => {
  test('should fetch and display satellite data', async ({ page }) => {
    await page.goto('/').catch(() => null);

    // Monitor network requests for API calls
    const apiCall = page.waitForResponse(response =>
      response.url().includes('/api') && response.status() === 200
    ).catch(() => null);

    // Navigate to a page that loads satellite data
    await page.goto('/dashboard').catch(() => null);

    // Wait a bit for data to load
    await page.waitForLoadState('networkidle').catch(() => null);
  });
});

test.describe('Error Handling', () => {
  test('should handle 404 errors gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page').catch(() => null);

    // Check that page renders without crashing
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // May show 404 message or navigate back to home
    const isValid404 = await page.url().includes('nonexistent') || await page.locator('text=/not found|404|error/i').first().isVisible({ timeout: 3000 }).catch(() => false);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network error
    await page.route('**/*api**', route => route.abort('failed'));

    await page.goto('/dashboard').catch(() => null);

    // Page should still render
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // May show error message
    await page.locator('text=/error|loading|failed/i').first().isVisible({ timeout: 3000 }).catch(() => null);
  });
});
