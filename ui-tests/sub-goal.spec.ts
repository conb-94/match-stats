import { test, expect, type Page } from 'playwright/test';
import { openApp, savedMatch, setNow } from './helpers.ts';
import { KICK, liveState } from '../src/state/fixtures.ts';

const inGroup = (page: Page, group: string, name: string) =>
  page.getByRole('group', { name: group }).getByRole('button', { name, exact: true });

test('a sub is pick off, pick on, confirm, stamped at confirm time', async ({ page }) => {
  await openApp(page, { state: liveState(), now: KICK + 600_000 });
  await page.getByRole('button', { name: 'Sub' }).click();
  const confirm = page.getByRole('button', { name: 'Confirm sub' });
  await expect(confirm).toBeDisabled();
  await inGroup(page, 'Coming off', '3 P3').click();
  await inGroup(page, 'Coming on', '4 P4').click();
  await expect(page.getByTestId('sub-summary')).toHaveText('3 P3 off → 4 P4 on');
  await setNow(page, KICK + 630_000);
  await confirm.click();
  await expect(page.getByRole('button', { name: 'Goal' })).toBeVisible(); // back on the live screen
  const sub = (await savedMatch(page)).events.at(-1)!;
  expect(sub).toMatchObject({ type: 'sub', offId: 'p3', onId: 'p4' });
  expect(sub.type === 'sub' && sub.t).toBeGreaterThanOrEqual(630_000);
  expect(sub.type === 'sub' && sub.t).toBeLessThan(631_000);
});

test('cancel logs nothing', async ({ page }) => {
  await openApp(page, { state: liveState(), now: KICK + 600_000 });
  await page.getByRole('button', { name: 'Sub' }).click();
  await inGroup(page, 'Coming off', '3 P3').click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Goal' })).toBeVisible();
  expect((await savedMatch(page)).events).toHaveLength(1);
});

test('the goal keeps the time of the Goal tap', async ({ page }) => {
  await openApp(page, { state: liveState(), now: KICK + 494_000 });
  await page.getByRole('button', { name: 'Goal' }).click();
  await setNow(page, KICK + 530_000);
  await inGroup(page, 'Who scored', '1 P1').click();
  await inGroup(page, 'Assist', '2 P2').click();
  await page.getByRole('button', { name: 'Confirm goal' }).click();
  const goal = (await savedMatch(page)).events.at(-1)!;
  expect(goal).toMatchObject({ type: 'goal', side: 'us', scorerId: 'p1', assistId: 'p2', ownGoal: false });
  expect(goal.type === 'goal' && goal.t).toBeGreaterThanOrEqual(494_000);
  expect(goal.type === 'goal' && goal.t).toBeLessThan(495_000);
  await expect(page.getByText('1 – 0')).toBeVisible();
});

test('the scorer cannot be picked as the assist', async ({ page }) => {
  await openApp(page, { state: liveState(), now: KICK + 494_000 });
  await page.getByRole('button', { name: 'Goal' }).click();
  await expect(page.getByRole('button', { name: 'Confirm goal' })).toBeDisabled();
  await inGroup(page, 'Who scored', '1 P1').click();
  await expect(inGroup(page, 'Assist', '1 P1')).toBeDisabled();
  await expect(inGroup(page, 'Assist', 'No assist')).toHaveAttribute('aria-pressed', 'true');
});

test('an opposition goal needs no players', async ({ page }) => {
  await openApp(page, { state: liveState(), now: KICK + 494_000 });
  await page.getByRole('button', { name: 'Goal' }).click();
  await page.getByRole('button', { name: 'Opposition', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Who scored' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Confirm goal' }).click();
  expect((await savedMatch(page)).events.at(-1)).toMatchObject({ type: 'goal', side: 'them', scorerId: null });
  await expect(page.getByText('0 – 1')).toBeVisible();
});

test('an own goal counts for us with no scorer', async ({ page }) => {
  await openApp(page, { state: liveState(), now: KICK + 494_000 });
  await page.getByRole('button', { name: 'Goal' }).click();
  await inGroup(page, 'Who scored', 'Own goal').click();
  await expect(page.getByRole('group', { name: 'Assist' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Confirm goal' }).click();
  expect((await savedMatch(page)).events.at(-1)).toMatchObject({ type: 'goal', side: 'us', ownGoal: true, scorerId: null });
  await expect(page.getByText('1 – 0')).toBeVisible();
});
