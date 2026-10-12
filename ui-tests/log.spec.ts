import { test, expect, type Page } from 'playwright/test';
import { openApp, savedMatch } from './helpers.ts';
import { KICK, liveState } from '../src/state/fixtures.ts';
import { errorMessage } from '../src/ui/messages.ts';
import type { AppState, MatchEvent } from '../src/domain/types.ts';

function liveWith(...events: MatchEvent[]): AppState {
  const s = liveState();
  s.teams[0].seasons[0].matches[0].events.push(...events);
  return s;
}

const goalAndSub = liveWith(
  { id: 'g1', type: 'goal', t: 494_000, side: 'us', scorerId: 'p1', assistId: 'p2', ownGoal: false },
  { id: 's1', type: 'sub', t: 630_000, offId: 'p3', onId: 'p4' },
);

async function openLog(page: Page) {
  await page.getByTestId('last-entry').click();
  await expect(page.getByRole('heading', { name: 'Match log' })).toBeVisible();
}

const entry = (page: Page, title: string) => page.locator('.entry').filter({ has: page.locator('.title', { hasText: new RegExp(`^${title}$`) }) });

test('entries are listed newest first', async ({ page }) => {
  await openApp(page, { state: goalAndSub, now: KICK + 700_000 });
  await openLog(page);
  await expect(page.locator('.entry .title')).toHaveText(['Sub', 'Goal', 'Kick off']);
  await expect(page.locator('.entry .time')).toHaveText(['10:30', '08:14', '00:00']);
  await expect(page.locator('.entry .desc').first()).toHaveText('3 P3 off, 4 P4 on');
});

test('changing a goal scorer updates the score sheet', async ({ page }) => {
  await openApp(page, { state: goalAndSub, now: KICK + 700_000 });
  await openLog(page);
  await entry(page, 'Goal').locator('.entry-main').click();
  await page.getByRole('button', { name: 'Change players' }).click();
  await page.getByRole('group', { name: 'Who scored' }).getByRole('button', { name: '2 P2', exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  expect((await savedMatch(page)).events.find((e) => e.id === 'g1')).toMatchObject({ scorerId: 'p2', assistId: null });
  await expect(entry(page, 'Goal').locator('.desc')).toHaveText('2 P2');
});

test('changing a time re-stamps the entry', async ({ page }) => {
  await openApp(page, { state: goalAndSub, now: KICK + 700_000 });
  await openLog(page);
  await entry(page, 'Sub').locator('.entry-main').click();
  await page.getByRole('button', { name: 'Change time' }).click();
  await page.getByLabel('Minutes').fill('9');
  await page.getByLabel('Seconds').fill('0');
  await page.getByRole('button', { name: 'Save' }).click();
  expect((await savedMatch(page)).events.find((e) => e.id === 's1')).toMatchObject({ t: 540_000 });
  await expect(entry(page, 'Sub').locator('.time')).toHaveText('09:00');
});

test('a change that breaks a later entry is refused with a message', async ({ page }) => {
  await openApp(page, {
    state: liveWith({ id: 's1', type: 'sub', t: 600_000, offId: 'p3', onId: 'p4' }, { id: 's2', type: 'sub', t: 900_000, offId: 'p4', onId: 'p3' }),
    now: KICK + 1_000_000,
  });
  await openLog(page);
  await page.locator('.entry').filter({ hasText: '10:00' }).locator('.entry-main').click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('alert')).toHaveText(errorMessage('off_not_on_pitch'));
  expect((await savedMatch(page)).events).toHaveLength(3);
});

test('a sub can be swapped for a different player', async ({ page }) => {
  await openApp(page, { state: goalAndSub, now: KICK + 700_000 });
  await openLog(page);
  await entry(page, 'Sub').locator('.entry-main').click();
  await page.getByRole('button', { name: 'Change players' }).click();
  await page.getByRole('group', { name: 'Coming off' }).getByRole('button', { name: '2 P2', exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  expect((await savedMatch(page)).events.find((e) => e.id === 's1')).toMatchObject({ offId: 'p2', onId: 'p4' });
});

test('closing the log returns to the live match', async ({ page }) => {
  await openApp(page, { state: goalAndSub, now: KICK + 700_000 });
  await openLog(page);
  await page.getByRole('button', { name: 'Close match log' }).click();
  await expect(page.getByTestId('match-clock')).toBeVisible();
});
