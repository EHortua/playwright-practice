import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await test.step('Given the Playwright website is loaded', async () => {
    await page.goto('https://playwright.dev/');
  });

  await test.step('Then the page title should contain "Playwright"', async () => {
    await expect(page).toHaveTitle(/Playwright/);
  });
});

test('get started link', async ({ page }) => {
  await test.step('Given the Playwright website is loaded', async () => {
    await page.goto('https://playwright.dev/');
  });

  await test.step('When I click the "Get started" link', async () => {
    await page.getByRole('link', { name: 'Get started' }).click();
  });

  await test.step('Then I should see the Installation heading', async () => {
    await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
  });
});

test.describe('main sections', () => {
  test('Banner is visible', async ({ page }) => {
    await test.step('Given the Gears & Ink landing page is running', async () => {
      await page.goto('');
    });

    await test.step('Then the banner should be visible', async () => {
      await expect(page.getByRole('banner')).toBeVisible();
    });

    await test.step('When I click the "Gears & Ink home" link', async () => {
      await page.getByRole('link', { name: 'Gears & Ink home' }).click();
    });

    await test.step('Then the "Gears & Ink home" link should still be visible', async () => {
      await expect(page.getByRole('link', { name: 'Gears & Ink home' })).toBeVisible();
    });
  });
});
