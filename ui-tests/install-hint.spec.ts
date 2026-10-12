import { test, expect } from 'playwright/test';
import { teamWithPlayers } from '../src/state/fixtures.ts';
import { openApp } from './helpers.ts';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const HINT = /Add Match Stats to your Home Screen/;

test.describe('in Safari on an iPhone', () => {
  test.use({ userAgent: IPHONE });

  test('a hint explains to add it to the Home Screen first, and can be hidden', async ({ page }) => {
    await openApp(page, { state: teamWithPlayers(3, 5) });
    await expect(page.getByText(HINT)).toBeVisible();
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(page.getByText(HINT)).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(HINT)).toHaveCount(0);
  });

  test('no hint once opened from the Home Screen', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
    await openApp(page);
    await expect(page.getByLabel('Team name')).toBeVisible();
    await expect(page.getByText(HINT)).toHaveCount(0);
  });
});

test('no hint on other browsers', async ({ page }) => {
  await openApp(page);
  await expect(page.getByLabel('Team name')).toBeVisible();
  await expect(page.getByText(HINT)).toHaveCount(0);
});
