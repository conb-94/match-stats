import { test, expect } from 'playwright/test';
import { openApp, savedMatch, setNow } from './helpers.ts';
import { finishedState, KICK, liveState, teamWithPlayers } from '../src/state/fixtures.ts';
import type { AppState, MatchEvent } from '../src/domain/types.ts';

function liveWith(...events: MatchEvent[]): AppState {
  const s = liveState();
  s.teams[0].seasons[0].matches[0].events.push(...events);
  return s;
}

test('if saved data cannot be read, nothing is overwritten and Retry loads it', async ({ page }) => {
  await openApp(page, { state: teamWithPlayers(3, 5) });
  await page.addInitScript(() => {
    const realOpen = indexedDB.open.bind(indexedDB);
    (window as any).__failOpen = true;
    (indexedDB as any).open = (...args: [string, number?]) => {
      if (!(window as any).__failOpen) return realOpen(...args);
      const request: any = { result: undefined, error: new DOMException('Connection lost', 'UnknownError') };
      Promise.resolve().then(() => request.onerror?.(new Event('error')));
      return request;
    };
  });
  await page.reload();
  await expect(page.getByText("Couldn't open your saved teams and matches.")).toBeVisible();
  await expect(page.getByLabel('Team name')).toHaveCount(0); // no first-run form that could save over the data
  await page.evaluate(() => { (window as any).__failOpen = false; });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('button', { name: '1 P1' })).toBeVisible();
});

test('a double tap on Half time does not start the second half', async ({ page }) => {
  await openApp(page, { state: liveState(), now: KICK + 1_500_000 });
  await page.getByRole('button', { name: 'Half time' }).dblclick();
  expect((await savedMatch(page)).events.map((e) => e.type)).toEqual(['kickoff', 'halftime']);
  await expect(page.getByRole('button', { name: 'Start 2nd half' })).toBeDisabled();
  await setNow(page, KICK + 1_503_000);
  await expect(page.getByRole('button', { name: 'Start 2nd half' })).toBeEnabled();
});

test('a kick off tapped early can be moved to the real time', async ({ page }) => {
  await openApp(page, { state: liveWith({ id: 's1', type: 'sub', t: 600_000, offId: 'p3', onId: 'p4' }), now: KICK + 1_000_000 });
  await page.getByTestId('last-entry').click();
  await page.locator('.entry').filter({ hasText: 'Kick off' }).locator('.entry-main').click();
  await page.getByRole('button', { name: 'Change time' }).click();
  // KICK is 00:16:40 UTC; the real kick off was 5 minutes later.
  await page.getByLabel('Time of day').fill('00:21:40');
  await page.getByRole('button', { name: 'Save' }).click();
  const m = await savedMatch(page);
  expect(m.events.find((e) => e.id === 's1')).toMatchObject({ t: 300_000 });
  expect(m.events[0]).toMatchObject({ type: 'kickoff', at: KICK + 300_000 });
});

test('a mistaken full time can be reopened from the match log', async ({ page }) => {
  await openApp(page, { state: finishedState(), now: KICK + 3_600_000 });
  await page.getByRole('button', { name: 'Season' }).click();
  await page.getByRole('button', { name: /1 – 0 v Rovers/ }).click();
  await page.getByRole('button', { name: 'Match log' }).click();
  await page.locator('.entry').filter({ hasText: 'Full time' }).locator('.entry-main').click();
  await page.getByRole('button', { name: 'Reopen match' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reopen' }).click();
  await expect(page.getByTestId('match-clock')).toBeVisible();
  expect((await savedMatch(page)).events.at(-1)!.type).toBe('secondhalf');
});
