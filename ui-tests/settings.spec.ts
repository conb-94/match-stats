import { test, expect } from 'playwright/test';
import { openApp } from './helpers.ts';
import { teamWithPlayers } from '../src/state/fixtures.ts';
import { errorMessage } from '../src/ui/messages.ts';

test('first run: create a team, pick a format, add a player, and it is still there after a reload', async ({ page }) => {
  await openApp(page);
  await page.getByLabel('Team name').fill('Under 10s');
  await page.getByRole('button', { name: '7 a side' }).click();
  await page.getByRole('button', { name: 'Create team' }).click();
  await page.getByRole('button', { name: 'Add player' }).click();
  await page.getByLabel('Shirt number').fill('5');
  await page.getByLabel('Name', { exact: true }).fill('Alfie');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: '5 Alfie' })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('button', { name: '5 Alfie' })).toBeVisible();
  await expect(page.getByLabel('Team', { exact: true })).toHaveValue(/.+/);
  await expect(page.getByRole('combobox', { name: 'Team' }).locator('option:checked')).toHaveText('Under 10s');
  await expect(page.getByRole('button', { name: '7 a side' })).toHaveAttribute('aria-pressed', 'true');
});

test('a duplicate shirt number shows a message and adds nothing', async ({ page }) => {
  await openApp(page, { state: teamWithPlayers(3, 5) });
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Add player' }).click();
  await page.getByLabel('Shirt number').fill('1');
  await page.getByLabel('Name', { exact: true }).fill('Leo');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert')).toHaveText(errorMessage('number_taken'));
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('button', { name: '1 Leo' })).toHaveCount(0);
  await expect(page.locator('.squad .card')).toHaveCount(5);
});

test('a player can be renamed and removed', async ({ page }) => {
  await openApp(page, { state: teamWithPlayers(3, 5) });
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: '2 P2' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Ollie');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: '2 Ollie' })).toBeVisible();
  await page.getByRole('button', { name: '5 P5' }).click();
  await page.getByRole('button', { name: 'Remove' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByRole('button', { name: '5 P5' })).toHaveCount(0);
});

test('a second team can be added and switched to', async ({ page }) => {
  await openApp(page, { state: teamWithPlayers(3, 5) });
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'New team' }).click();
  await page.getByLabel('Team name').fill('Under 8s');
  await page.getByRole('button', { name: '5 a side' }).click();
  await page.getByRole('button', { name: 'Create team' }).click();
  const select = page.getByRole('combobox', { name: 'Team' });
  await expect(select.locator('option:checked')).toHaveText('Under 8s');
  await expect(page.getByRole('button', { name: '5 a side' })).toHaveAttribute('aria-pressed', 'true');
  await select.selectOption({ label: 'T' });
  await expect(page.getByRole('button', { name: '3 a side' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.squad .card')).toHaveCount(5);
});

test('a bad restore file is refused and nothing changes', async ({ page }) => {
  await openApp(page, { state: teamWithPlayers(3, 5) });
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('nope') });
  await expect(page.getByRole('alert')).toHaveText('That file is not a Match Stats backup.');
  await expect(page.locator('.squad .card')).toHaveCount(5);
});

test('a good backup file restores after a confirmation', async ({ page }) => {
  await openApp(page, { state: teamWithPlayers(3, 5) });
  await page.getByRole('button', { name: 'Settings' }).click();
  const backup = JSON.stringify({ app: 'match-stats', version: 1, exportedAt: 0, state: teamWithPlayers(5, 2) });
  await page.locator('input[type=file]').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
  await expect(page.getByText('Replace everything on this phone with this backup?')).toBeVisible();
  await page.getByRole('button', { name: 'Replace' }).click();
  await expect(page.locator('.squad .card')).toHaveCount(2);
});
