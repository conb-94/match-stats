import { test, expect, type Page } from 'playwright/test';
import { openApp, savedMatch } from './helpers.ts';
import { finishedState, KICK, liveState, teamWithPlayers } from '../src/state/fixtures.ts';
import type { AppState } from '../src/domain/types.ts';

async function openSavedMatch(page: Page) {
  await page.getByRole('button', { name: 'Season' }).click();
  await page.getByRole('button', { name: /1 – 0 v Rovers/ }).click();
  await expect(page.getByRole('heading', { name: 'Full time' })).toBeVisible();
}

const row = (page: Page, name: string) => page.getByRole('row').filter({ hasText: name });

test("full time shows each player's time, goals and assists", async ({ page }) => {
  await openApp(page, { state: finishedState() });
  await openSavedMatch(page);
  await expect(row(page, 'P3').locator('td').nth(2)).toHaveText('20:00');
  await expect(row(page, 'P4').locator('td').nth(2)).toHaveText('30:00');
  await expect(row(page, 'P1').locator('td')).toHaveText(['1', 'P1', '50:00', '1', '0']);
  await expect(row(page, 'P2').locator('td')).toHaveText(['2', 'P2', '50:00', '0', '1']);
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('heading', { name: 'Season totals' })).toBeVisible();
});

test('season lists players lowest average first, in whole minutes', async ({ page }) => {
  await openApp(page, { state: finishedState() });
  await page.getByRole('button', { name: 'Season' }).click();
  await expect(page.getByText('1 match played')).toBeVisible();
  const rows = page.locator('table.season tbody tr');
  await expect(rows).toHaveCount(5);
  await expect(rows.nth(0).locator('td')).toHaveText(['3', 'P3', '1', '20', '20', '0', '0']);
  await expect(rows.nth(1).locator('td')).toHaveText(['4', 'P4', '1', '30', '30', '0', '0']);
  await expect(rows.nth(2).locator('td')).toHaveText(['1', 'P1', '1', '50', '50', '1', '0']);
  await expect(rows.nth(4).locator('td').nth(1)).toHaveText('P5');
});

test('with no saved matches the season says so', async ({ page }) => {
  await openApp(page, { state: teamWithPlayers(3, 5) });
  await page.getByRole('button', { name: 'Season' }).click();
  await expect(page.getByText('No matches saved yet.')).toBeVisible();
});

test('an earlier season can still be viewed', async ({ page }) => {
  const s = finishedState();
  const team = s.teams[0];
  team.seasons[0].closedAt = KICK + 10_000_000;
  team.seasons.push({ id: 's2', startedAt: KICK + 10_000_000, closedAt: null, matches: [] });
  await openApp(page, { state: s });
  await page.getByRole('button', { name: 'Season' }).click();
  await expect(page.getByText('No matches saved yet.')).toBeVisible();
  const select = page.getByLabel('Season', { exact: true });
  await expect(select.locator('option:checked')).toHaveText('This season');
  await select.selectOption({ index: 1 });
  await expect(page.getByText('1 match played')).toBeVisible();
});

test('a forgotten full time can be corrected from the match log', async ({ page }) => {
  const s: AppState = liveState();
  s.teams[0].seasons[0].matches[0].events.push(
    { id: 'h', type: 'halftime', at: KICK + 1_500_000 },
    { id: 'sh', type: 'secondhalf', at: KICK + 2_000_000 },
    { id: 'ft', type: 'fulltime', at: KICK + 20_000_000 },
  );
  s.teams[0].seasons[0].matches[0].events.splice(1, 0, { id: 'g', type: 'goal', t: 100_000, side: 'us', scorerId: 'p1', assistId: null, ownGoal: false });
  await openApp(page, { state: s, now: KICK + 30_000_000 });
  await openSavedMatch(page);
  await page.getByRole('button', { name: 'Match log' }).click();
  await page.locator('.entry').filter({ hasText: 'Full time' }).locator('.entry-main').click();
  await page.getByRole('button', { name: 'Change time' }).click();
  await page.getByLabel('Minutes').fill('50');
  await page.getByLabel('Seconds').fill('0');
  await page.getByRole('button', { name: 'Save' }).click();
  expect((await savedMatch(page)).events.find((e) => e.id === 'ft')).toMatchObject({ at: KICK + 3_500_000 });
  await page.getByRole('button', { name: 'Close match log' }).click();
  await expect(row(page, 'P1').locator('td').nth(2)).toHaveText('50:00');
});
