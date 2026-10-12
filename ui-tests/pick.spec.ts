import { test, expect } from 'playwright/test';
import { openApp, readState, savedMatch, START } from './helpers.ts';
import { teamWithPlayers } from '../src/state/fixtures.ts';

test('next unlocks only with the full number of starters, and kick off starts the match', async ({ page }) => {
  await openApp(page, { state: teamWithPlayers(3, 5), now: START });
  const next = page.getByRole('button', { name: 'Next' });
  await expect(next).toBeDisabled();
  for (const n of ['1 P1', '2 P2']) await page.getByRole('button', { name: n }).click();
  await expect(page.getByText('2 of 3')).toBeVisible();
  await expect(next).toBeDisabled();
  await page.getByRole('button', { name: '3 P3' }).click();
  await page.getByRole('button', { name: '5 P5' }).click();
  await page.getByRole('button', { name: '5 P5' }).click(); // start -> not here
  await page.getByLabel('Playing against').fill('Rovers');
  await expect(next).toBeEnabled();
  await next.click();

  // The next screen looks like the live match, waiting for kick off: nothing is saved or running yet.
  await expect(page.getByTestId('match-clock')).toHaveText('00:00');
  await expect(page.getByRole('region', { name: /On the pitch/ }).getByRole('button')).toHaveText([/P1.*00:00/, /P2.*00:00/, /P3.*00:00/]);
  await expect(page.getByRole('region', { name: /Bench/ }).getByRole('button')).toHaveText([/P4/]);
  await expect(page.getByText('Rovers')).toBeVisible();
  expect((await readState(page)).teams[0].seasons[0].matches).toHaveLength(0);

  await page.getByRole('button', { name: 'Kick off' }).click();
  await expect(page.getByRole('button', { name: 'Half time' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New match' })).toHaveCount(0); // tabs hidden on the live screen
  const m = await savedMatch(page);
  expect(m).toMatchObject({ opposition: 'Rovers', starters: ['p1', 'p2', 'p3'], bench: ['p4'] });
  expect(m.events[0].type).toBe('kickoff');
  expect(m.events[0].type === 'kickoff' && m.events[0].at - START).toBeLessThan(1000);
});

test('back from the kick off screen keeps the team as picked', async ({ page }) => {
  await openApp(page, { state: teamWithPlayers(3, 5) });
  for (const n of ['1 P1', '2 P2', '3 P3']) await page.getByRole('button', { name: n }).click();
  await page.getByLabel('Playing against').fill('Rovers');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByText('3 of 3')).toBeVisible();
  await expect(page.getByLabel('Playing against')).toHaveValue('Rovers');
  expect((await readState(page)).teams[0].seasons[0].matches).toHaveLength(0);
});

test('a fourth starter keeps start match locked', async ({ page }) => {
  await openApp(page, { state: teamWithPlayers(3, 5) });
  for (const n of ['1 P1', '2 P2', '3 P3', '4 P4']) await page.getByRole('button', { name: n }).click();
  await expect(page.getByText('4 of 3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
});

test('a squad smaller than the format says what to do', async ({ page }) => {
  await openApp(page, { state: teamWithPlayers(7, 5) });
  await expect(page.getByText('Add more players in Settings to start a 7 a side match.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
});
