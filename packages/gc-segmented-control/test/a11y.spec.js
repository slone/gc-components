import AxeBuilder from '@axe-core/playwright';
import { test, expect, internals, BASIC } from './fixtures.js';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('ARIA through ElementInternals', () => {
  test('radiogroup and radio roles follow the state', async ({ page, mount }) => {
    await mount(BASIC);
    const el = page.locator('gc-segmented-control');
    expect(await internals(el)).toMatchObject({ role: 'radiogroup', ariaOrientation: 'horizontal', ariaDisabled: null, ariaRequired: null });
    const segs = page.locator('gc-segment');
    expect((await internals(segs.nth(0))).role).toBe('radio');
    expect((await internals(segs.nth(0))).ariaChecked).toBe('true');
    expect((await internals(segs.nth(1))).ariaChecked).toBe('false');

    await el.evaluate((e) => { e.disabled = true; e.required = true; e.orientation = 'vertical'; });
    expect(await internals(el)).toMatchObject({ ariaOrientation: 'vertical', ariaDisabled: 'true', ariaRequired: 'true' });
    expect((await internals(segs.nth(1))).ariaDisabled).toBe('true');
  });

  test('no ARIA attribute is added to the light DOM', async ({ page, mount }) => {
    await mount(BASIC);
    expect(await page.locator('gc-segmented-control').evaluate((el) => el.getAttributeNames().sort()))
      .toEqual(['aria-label', 'name', 'value']);
    expect(await page.locator('gc-segment').first().evaluate((el) => el.getAttributeNames().sort()))
      .toEqual(['selected', 'tabindex', 'value']);
  });

  test('the :state(selected) custom state follows the selection', async ({ page, mount }) => {
    await mount(BASIC);
    const supported = await page.evaluate(() => CSS.supports('selector(:state(selected))'));
    test.skip(!supported, 'CustomStateSet / :state() not supported by this browser');
    expect(await page.locator('gc-segment:state(selected)').getAttribute('value')).toBe('list');
  });
});

test.describe('axe', () => {
  test('no WCAG violation, light and dark, horizontal and vertical', async ({ page, mount }) => {
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme });
      await mount(`
        <style>:root { color-scheme: light dark; } body { background: Canvas; color: CanvasText; }</style>
        <label for="v">View</label>${BASIC.replace('<gc-segmented-control', '<gc-segmented-control id="v"')}
        <gc-segmented-control orientation="vertical" aria-label="Speed" value="b">
          <gc-segment value="a">Slow</gc-segment><gc-segment value="b">Fast</gc-segment>
        </gc-segmented-control>
        <gc-segmented-control aria-label="Icons" value="x">
          <gc-segment value="x" aria-label="Rows"><svg aria-hidden="true" width="16" height="16"></svg></gc-segment>
          <gc-segment value="y" aria-label="Tiles"><svg aria-hidden="true" width="16" height="16"></svg></gc-segment>
        </gc-segmented-control>`);
      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect(results.violations.map((v) => `${colorScheme}: ${v.id}`)).toEqual([]);
    }
  });
});
