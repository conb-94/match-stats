import { test, expect } from 'playwright/test';
import { openApp, savedMatch, START } from './helpers.ts';
import { teamWithPlayers } from '../src/state/fixtures.ts';

test('start match unlocks only with the full number of starters', async ({ page }) => {
  await openApp(page, { state: teamWithPlayers(3, 5), now: START });
  const start = page.getByRole('button', { name: 'Start match' });
  await expect(start).toBeDisabled();
  for (const n of ['1 P1', '2 P2']) await page.getByRole('button', { name: n }).click();
  await expect(page.getByText('2 of 3')).toBeVisible();
  await expect(start).toBeDisabled();
  await page.getByRole('button', { name: '3 P3' }).click();
  await page.getByRole('button', { name: '5 P5' }).click();
  await page.getByRole('button', { name: '5 P5' }).click(); // start -> not here
  await page.getByLabel('Playing against').fill('Rovers');
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.getByRole('button', { name: 'New match' })).toHaveCount(0); // tabs hidden on the live screen
  const m = await savedMatch(page);
  expect(m).toMatchObject({ opposition: 'Rovers', starters: ['p1', 'p2', 'p3'], bench: ['p4'] });
  expect(m.events[0].type).toBe('kickoff');
  expect(m.events[0].type === 'kickoff' && m.events[0].at - START).toBeLessThan(1000);
});

test('a fourth starter keeps start match locked', async ({ page }) => {
  await openApp(page, { state: teamWithPlayers(3, 5) });
  for (const n of ['1 P1', '2 P2', '3 P3', '4 P4']) await page.getByRole('button', { name: n }).click();
  await expect(page.getByText('4 of 3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start match' })).toBeDisabled();
});

test('a squad smaller than the format says what to do', async ({ page }) => {
  await openApp(page, { state: teamWithPlayers(7, 5) });
  await expect(page.getByText('Add more players in Settings to start a 7 a side match.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start match' })).toBeDisabled();
});
