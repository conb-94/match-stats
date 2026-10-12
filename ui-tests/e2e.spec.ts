import { test, expect } from 'playwright/test';

const toMs = (text: string) => {
  const [m, s] = text.split(':').map(Number);
  return (m * 60 + s) * 1000;
};

test('a whole match from first run, surviving a reload and going offline', async ({ page, context }) => {
  // 1. Create the team and squad.
  await page.goto('/');
  await page.getByLabel('Team name').fill('Under 10s');
  await page.getByRole('button', { name: '3 a side' }).click();
  await page.getByRole('button', { name: 'Create team' }).click();
  for (const [n, name] of [['1', 'Sam'], ['2', 'Ollie'], ['3', 'Jack'], ['4', 'Noah']]) {
    await page.getByRole('button', { name: 'Add player' }).click();
    await page.getByLabel('Shirt number').fill(n);
    await page.getByLabel('Name', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Save' }).click();
  }

  // 2. Pick the team and start.
  await page.getByRole('button', { name: 'New match' }).click();
  for (const name of ['1 Sam', '2 Ollie', '3 Jack']) await page.getByRole('button', { name }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Kick off' }).click();
  await expect(page.getByTestId('match-clock')).toBeVisible();

  // 3. Reload: still the live match, clock not behind.
  await page.waitForTimeout(1500);
  const before = toMs(await page.getByTestId('match-clock').innerText());
  await page.reload();
  await expect(page.getByTestId('match-clock')).toBeVisible();
  expect(toMs(await page.getByTestId('match-clock').innerText())).toBeGreaterThanOrEqual(before);

  // 4. A sub: the bench player's clock starts running.
  await page.getByRole('button', { name: 'Sub' }).click();
  await page.getByRole('group', { name: 'Coming off' }).getByRole('button', { name: '3 Jack' }).click();
  await page.getByRole('group', { name: 'Coming on' }).getByRole('button', { name: '4 Noah' }).click();
  await page.getByRole('button', { name: 'Confirm sub' }).click();
  await page.waitForTimeout(2200);
  await expect(page.getByRole('button', { name: '4 Noah', exact: true })).not.toContainText('00:00');

  // 5. A goal.
  await page.getByRole('button', { name: 'Goal' }).click();
  await page.getByRole('group', { name: 'Who scored' }).getByRole('button', { name: '1 Sam' }).click();
  await page.getByRole('button', { name: 'Confirm goal' }).click();
  await expect(page.getByText('1 – 0')).toBeVisible();

  // 6. Offline reload still works.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('1 – 0')).toBeVisible();
  await context.setOffline(false);

  // 7. Play it out.
  await page.getByRole('button', { name: 'Half time' }).click();
  await page.getByRole('button', { name: 'Start 2nd half' }).click();
  await page.getByRole('button', { name: 'Full time' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'End match' }).click();
  await expect(page.getByRole('heading', { name: 'Full time' })).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('1 match played')).toBeVisible();
});

test('the app can be installed: manifest and icons are served', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const manifest = await (await request.get(`/${href!.replace('./', '')}`)).json();
  expect(manifest).toMatchObject({ name: 'Match Stats', display: 'standalone', theme_color: '#14181A', background_color: '#F4F5F2' });
  for (const icon of manifest.icons) expect((await request.get(`/${icon.src.replace('./', '')}`)).ok()).toBe(true);
  await expect(page.locator('link[rel=apple-touch-icon]')).toHaveCount(1);
});
