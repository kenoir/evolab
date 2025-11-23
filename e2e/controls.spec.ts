import { test, expect } from '@playwright/test';

test.describe('Game Controls', () => {
  test.beforeEach(async ({ page }) => {
    // Set local storage before navigation to skip welcome modal
    await page.addInitScript(() => {
      localStorage.setItem('evolab_skip_welcome', 'true');
    });
    await page.goto('/');
  });

  test('should toggle pause with button', async ({ page }) => {
    // Ensure we are on desktop size to see the controls
    await page.setViewportSize({ width: 1280, height: 720 });

    const pauseButton = page.getByRole('button', { name: 'PAUSE' });
    await expect(pauseButton).toBeVisible();

    await pauseButton.click();
    await expect(page.getByRole('button', { name: 'RESUME' })).toBeVisible();

    await page.getByRole('button', { name: 'RESUME' }).click();
    await expect(page.getByRole('button', { name: 'PAUSE' })).toBeVisible();
  });

  test('should toggle pause with Space key', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Initially PAUSE (running)
    await expect(page.getByRole('button', { name: 'PAUSE' })).toBeVisible();

    // Press Space
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'RESUME' })).toBeVisible();

    // Press Space again
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'PAUSE' })).toBeVisible();
  });

  test('minimap should be visible and clickable', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    // The minimap has specific classes we can target
    const minimapCanvas = page.locator('canvas.cursor-pointer');
    await expect(minimapCanvas).toBeVisible();
    
    // Click it
    await minimapCanvas.click();
  });
});
