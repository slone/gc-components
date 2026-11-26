import { test, expect, BASIC, prop } from './fixtures.js';

test.describe('value and selection', () => {
  test('the value attribute selects the matching segment', async ({ page, mount }) => {
    await mount(BASIC);
    expect(await prop(page, 'value')).toBe('list');
    expect(await prop(page, 'selectedIndex')).toBe(0);
    expect(await page.locator('gc-segment').evaluateAll((s) => s.map((x) => x.selected))).toEqual([true, false, false]);
  });

  test('a segment marked selected is adopted, and text content is the default value', async ({ page, mount }) => {
    await mount(`
      <gc-segmented-control aria-label="Answer">
        <gc-segment>Yes</gc-segment><gc-segment selected>No</gc-segment>
      </gc-segmented-control>`);
    expect(await prop(page, 'value')).toBe('No');
    expect(await prop(page, 'defaultValue')).toBe('No');
  });

  test('setting selected on a segment deselects the others', async ({ page, mount }) => {
    await mount(BASIC);
    await page.locator('gc-segment').nth(2).evaluate((s) => { s.selected = true; });
    expect(await prop(page, 'value')).toBe('map');
    expect(await page.locator('gc-segment[selected]').count()).toBe(1);
  });

  test('a value set before its segment exists is applied when the segment arrives', async ({ page, mount }) => {
    await mount(`<gc-segmented-control aria-label="Late"></gc-segmented-control>`);
    const value = await page.locator('gc-segmented-control').evaluate(async (el) => {
      el.value = 'b';
      const before = el.value;
      for (const v of ['a', 'b']) {
        const s = document.createElement('gc-segment');
        s.value = v;
        s.textContent = v;
        el.append(s);
      }
      await new Promise((r) => requestAnimationFrame(r));
      return [before, el.value];
    });
    expect(value).toEqual(['', 'b']);
  });

  test('changes made by script fire no event', async ({ page, mount }) => {
    await mount(BASIC);
    const result = await page.locator('gc-segmented-control').evaluate((el) => {
      let count = 0;
      el.addEventListener('input', () => count++);
      el.addEventListener('change', () => count++);
      el.value = 'grid';
      el.selectedIndex = 2;
      el.value = null;
      return { count, value: el.value, index: el.selectedIndex };
    });
    expect(result).toEqual({ count: 0, value: '', index: -1 });
  });

  test('properties set before the definition go through the setters (upgrade)', async ({ page, mount }) => {
    await mount(`
      <gc-segmented-control aria-label="Up">
        <gc-segment value="a">A</gc-segment><gc-segment value="b">B</gc-segment>
      </gc-segmented-control>`, { script: false });
    await page.locator('gc-segmented-control').evaluate((el) => { el.value = 'b'; el.disabled = true; });
    await page.addScriptTag({ type: 'module', url: './gc-segmented-control.js' });
    await page.evaluate(() => customElements.whenDefined('gc-segmented-control'));
    expect(await page.locator('gc-segmented-control').evaluate((el) => [el.value, el.hasAttribute('disabled')])).toEqual(['b', true]);
  });
});
