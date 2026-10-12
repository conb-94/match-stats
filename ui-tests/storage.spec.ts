import { test, expect } from 'playwright/test';
import { build } from 'esbuild';

// Bundles storage.ts and the fixtures for the page, exposed on window.__storageTest.
async function storageBundle(): Promise<string> {
  const result = await build({
    stdin: {
      contents: `
        import { loadState, saveState } from './src/state/storage.ts';
        import { initialState } from './src/state/reducer.ts';
        import { liveState } from './src/state/fixtures.ts';
        window.__storageTest = { loadState, saveState, initialState, liveState };`,
      resolveDir: process.cwd(),
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'iife',
  });
  return result.outputFiles[0].text;
}

test('state survives a save and a page reload', async ({ page }) => {
  const code = await storageBundle();
  await page.goto('/');
  await page.addScriptTag({ content: code });
  const empty = await page.evaluate(async () => {
    const t = (window as any).__storageTest;
    return JSON.stringify(await t.loadState()) === JSON.stringify(t.initialState());
  });
  expect(empty).toBe(true);
  await page.evaluate(async () => {
    const t = (window as any).__storageTest;
    await t.saveState(t.liveState());
  });
  await page.reload();
  await page.addScriptTag({ content: code });
  const same = await page.evaluate(async () => {
    const t = (window as any).__storageTest;
    return JSON.stringify(await t.loadState()) === JSON.stringify(t.liveState());
  });
  expect(same).toBe(true);
});
