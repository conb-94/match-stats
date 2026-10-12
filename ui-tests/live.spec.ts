import { test, expect } from 'playwright/test';
import { openApp, savedMatch, setNow } from './helpers.ts';
import { KICK, liveState } from '../src/state/fixtures.ts';
import type { AppState, MatchEvent } from '../src/domain/types.ts';

function liveWith(...events: MatchEvent[]): AppState {
  const s = liveState();
  s.teams[0].seasons[0].matches[0].events.push(...events);
  return s;
}

const card = (page: import('playwright/test').Page, name: string) => page.getByRole('button', { name, exact: true });

test('clocks tick from saved time, not from a counter', async ({ page }) => {
  await openApp(page, { state: liveState(), now: KICK + 600_000 });
  await expect(page.getByTestId('match-clock')).toHaveText('10:00');
  await expect(card(page, '1 P1')).toContainText('10:00');
  await expect(card(page, '4 P4')).toContainText('00:00');
  await setNow(page, KICK + 1_062_000); // as if the phone had been locked for 7 minutes
  await expect(page.getByTestId('match-clock')).toHaveText('17:42');
  await expect(card(page, '3 P3')).toContainText('17:42');
});

test('half time freezes every clock and the second half carries on', async ({ page }) => {
  await openApp(page, { state: liveState(), now: KICK + 1_500_000 });
  await page.getByRole('button', { name: 'Half time' }).click();
  await setNow(page, KICK + 2_400_000);
  await expect(page.getByTestId('period')).toHaveText('Half time');
  await expect(page.getByTestId('match-clock')).toHaveText('25:00');
  await expect(card(page, '1 P1')).toContainText('25:00');
  await page.getByRole('button', { name: 'Start 2nd half' }).click();
  await setNow(page, KICK + 2_700_000);
  await expect(page.getByTestId('match-clock')).toHaveText('30:00');
  await expect(page.getByTestId('period')).toHaveText('2nd half');
});

test('the bench lists the least played first and a sub shows on the strip', async ({ page }) => {
  await openApp(page, { state: liveWith({ id: 's1', type: 'sub', t: 630_000, offId: 'p3', onId: 'p4' }), now: KICK + 700_000 });
  const pitch = page.getByRole('region', { name: /On the pitch/ });
  const bench = page.getByRole('region', { name: /Bench/ });
  await expect(pitch.getByRole('button')).toHaveText([/P1/, /P2/, /P4/]);
  await expect(bench.getByRole('button')).toHaveText([/P3.*10:30/]);
  await expect(page.getByTestId('last-entry')).toHaveText("Last: 10' Sub · 3 P3 off, 4 P4 on");
});

test('undo takes back the last entry', async ({ page }) => {
  await openApp(page, { state: liveWith({ id: 's1', type: 'sub', t: 630_000, offId: 'p3', onId: 'p4' }), now: KICK + 700_000 });
  await page.getByRole('button', { name: 'Undo' }).click();
  expect((await savedMatch(page)).events).toHaveLength(1);
  await expect(page.getByRole('region', { name: /On the pitch/ }).getByRole('button')).toHaveText([/P1/, /P2/, /P3/]);
});

test('undo at kick off asks before cancelling the match', async ({ page }) => {
  await openApp(page, { state: liveState(), now: KICK + 5_000 });
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Keep it' }).click();
  await expect(page.getByTestId('match-clock')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel match' }).click();
  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
});

test('full time asks first, then shows the summary', async ({ page }) => {
  await openApp(page, {
    state: liveWith({ id: 'h', type: 'halftime', at: KICK + 1_500_000 }, { id: 'sh', type: 'secondhalf', at: KICK + 2_000_000 }),
    now: KICK + 3_000_000,
  });
  await page.getByRole('button', { name: 'Full time' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Keep playing' }).click();
  await expect(page.getByRole('button', { name: 'Full time' })).toBeVisible();
  await page.getByRole('button', { name: 'Full time' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'End match' }).click();
  await expect(page.getByRole('heading', { name: 'Full time' })).toBeVisible();
  const end = (await savedMatch(page)).events.at(-1)!;
  expect(end.type).toBe('fulltime');
  expect(end.type === 'fulltime' && end.at - (KICK + 3_000_000)).toBeLessThan(1000);
});

test('goal is not available at half time', async ({ page }) => {
  await openApp(page, { state: liveWith({ id: 'h', type: 'halftime', at: KICK + 1_500_000 }), now: KICK + 1_600_000 });
  await expect(page.getByRole('button', { name: 'Goal' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Sub' })).toBeEnabled();
});
