import { test, expect, BASIC, prop, recordEvents, recorded } from './fixtures.js';

test.describe('pointer', () => {
  test('a click selects and fires input then change, once', async ({ page, mount }) => {
    await mount(BASIC);
    const el = page.locator('gc-segmented-control');
    await recordEvents(el);
    await page.locator('gc-segment[value=grid]').click();
    await page.locator('gc-segment[value=grid]').click();
    expect(await recorded(el)).toEqual([
      { type: 'input', value: 'grid', bubbles: true, composed: true },
      { type: 'change', value: 'grid', bubbles: true, composed: false },
    ]);
  });

  test('a click on the <label> moves focus into the group', async ({ page, mount }) => {
    await mount(`<label for="v">View</label>${BASIC.replace('<gc-segmented-control', '<gc-segmented-control id="v"')}`);
    await page.locator('label').click();
    await expect(page.locator('gc-segment[value=list]')).toBeFocused();
  });

  test('disabled controls and segments ignore clicks', async ({ page, mount }) => {
    await mount(`
      <gc-segmented-control id="a" value="a" aria-label="A" disabled>
        <gc-segment value="a">A</gc-segment><gc-segment value="b">B</gc-segment>
      </gc-segmented-control>
      <gc-segmented-control id="b" value="a" aria-label="B">
        <gc-segment value="a">A</gc-segment><gc-segment value="b" disabled>B</gc-segment>
      </gc-segmented-control>`);
    await page.locator('#a gc-segment[value=b]').click({ force: true });
    await page.locator('#b gc-segment[value=b]').click({ force: true });
    expect(await prop(page, 'value', '#a')).toBe('a');
    expect(await prop(page, 'value', '#b')).toBe('a');
  });
});

test.describe('keyboard', () => {
  test('arrows move and select, wrapping and skipping disabled segments; Home and End', async ({ page, mount }) => {
    await mount(`
      <gc-segmented-control value="a" aria-label="Keys">
        <gc-segment value="a">A</gc-segment>
        <gc-segment value="b" disabled>B</gc-segment>
        <gc-segment value="c">C</gc-segment>
      </gc-segmented-control>`);
    await page.keyboard.press('Tab');
    await expect(page.locator('gc-segment[value=a]')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    expect(await prop(page, 'value')).toBe('c');
    await expect(page.locator('gc-segment[value=c]')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    expect(await prop(page, 'value')).toBe('a');
    await page.keyboard.press('ArrowUp');
    expect(await prop(page, 'value')).toBe('c');
    await page.keyboard.press('Home');
    expect(await prop(page, 'value')).toBe('a');
    await page.keyboard.press('End');
    expect(await prop(page, 'value')).toBe('c');
  });

  test('Left and Right follow the visual order in right-to-left', async ({ page, mount }) => {
    await mount(`
      <gc-segmented-control value="1" aria-label="RTL">
        <gc-segment value="1">1</gc-segment><gc-segment value="2">2</gc-segment><gc-segment value="3">3</gc-segment>
      </gc-segmented-control>`, { dir: 'rtl' });
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowLeft');
    expect(await prop(page, 'value')).toBe('2');
    await page.keyboard.press('ArrowRight');
    expect(await prop(page, 'value')).toBe('1');
  });

  test('Space selects the focused segment when none is selected', async ({ page, mount }) => {
    await mount(`
      <gc-segmented-control aria-label="Space">
        <gc-segment value="a">A</gc-segment><gc-segment value="b">B</gc-segment>
      </gc-segmented-control>`);
    await page.keyboard.press('Tab');
    expect(await prop(page, 'value')).toBe('');
    await page.keyboard.press(' ');
    expect(await prop(page, 'value')).toBe('a');
  });

  test('a single tab stop (roving tabindex), removed when disabled', async ({ page, mount }) => {
    await mount(BASIC);
    const tabindexes = () => page.locator('gc-segment').evaluateAll((s) => s.map((x) => x.getAttribute('tabindex')));
    expect(await tabindexes()).toEqual(['0', '-1', '-1']);
    await page.locator('gc-segmented-control').evaluate((el) => { el.value = 'map'; });
    expect(await tabindexes()).toEqual(['-1', '-1', '0']);
    await page.locator('gc-segmented-control').evaluate((el) => { el.disabled = true; });
    expect(await tabindexes()).toEqual([null, null, null]);
  });
});

test.describe('indicator', () => {
  test('sits under the selected segment', async ({ page, mount }) => {
    await mount(BASIC);
    await page.locator('gc-segment[value=grid]').click();
    await expect.poll(() => page.locator('gc-segmented-control').evaluate((el) => {
      const i = el.shadowRoot.querySelector('.indicator').getBoundingClientRect();
      const s = el.selectedSegment.getBoundingClientRect();
      return [Math.round(i.left - s.left), Math.round(i.width - s.width), Math.round(i.top - s.top)];
    })).toEqual([0, 0, 0]);
  });
});
