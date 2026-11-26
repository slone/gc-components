import { test, expect, prop } from './fixtures.js';

const FORM = `
  <form>
    <gc-segmented-control name="size" value="m" aria-label="Size">
      <gc-segment value="s">S</gc-segment><gc-segment value="m">M</gc-segment>
    </gc-segmented-control>
    <gc-segmented-control name="ship" required aria-label="Shipping">
      <gc-segment value="std">Standard</gc-segment><gc-segment value="exp">Express</gc-segment>
    </gc-segmented-control>
  </form>`;

const entries = (page) => page.locator('form').evaluate((f) => [...new FormData(f)]);

test.describe('form association', () => {
  test('submits name=value, nothing when no segment is selected', async ({ page, mount }) => {
    await mount(FORM);
    expect(await entries(page)).toEqual([['size', 'm']]);
    await page.locator('gc-segment[value=exp]').click();
    expect(await entries(page)).toEqual([['size', 'm'], ['ship', 'exp']]);
  });

  test('required: valueMissing with a message in the page language', async ({ page, mount }) => {
    await mount(FORM);
    const ship = page.locator('[name=ship]');
    expect(await ship.evaluate((el) => [el.checkValidity(), el.validity.valueMissing, el.validationMessage]))
      .toEqual([false, true, 'Please select one of these options.']);
    await page.locator('form').evaluate((f) => { f.lang = 'fr-CA'; });
    expect(await prop(page, 'validationMessage', '[name=ship]')).toBe('Veuillez sélectionner l’une de ces options.');
    await ship.evaluate((el) => { el.value = 'std'; });
    expect(await ship.evaluate((el) => el.checkValidity())).toBe(true);
  });

  test('registerMessages adds a language; setCustomValidity wins', async ({ page, mount }) => {
    await mount(FORM, { lang: 'de' });
    const ship = page.locator('[name=ship]');
    await page.evaluate(() => customElements.get('gc-segmented-control').registerMessages('de', { valueMissing: 'Bitte wählen.' }));
    expect(await prop(page, 'validationMessage', '[name=ship]')).toBe('Bitte wählen.');
    await ship.evaluate((el) => el.setCustomValidity('Nope'));
    expect(await ship.evaluate((el) => [el.validity.customError, el.validationMessage])).toEqual([true, 'Nope']);
  });

  test('form.reset() restores the default value', async ({ page, mount }) => {
    await mount(FORM);
    await page.locator('gc-segment[value=s]').click();
    await page.locator('gc-segment[value=exp]').click();
    await page.locator('form').evaluate((f) => f.reset());
    expect(await prop(page, 'value', '[name=size]')).toBe('m');
    expect(await prop(page, 'value', '[name=ship]')).toBe('');
  });

  test('a disabled fieldset disables the control and its segments', async ({ page, mount }) => {
    await mount(`
      <form><fieldset disabled>
        <gc-segmented-control name="x" value="a" aria-label="X"><gc-segment value="a">A</gc-segment></gc-segmented-control>
      </fieldset></form>`);
    const el = page.locator('gc-segmented-control');
    expect(await el.evaluate((e) => e.matches(':disabled'))).toBe(true);
    expect(await entries(page)).toEqual([]);
    expect(await page.locator('gc-segment').getAttribute('tabindex')).toBeNull();
  });

  test('exposes form, labels and type', async ({ page, mount }) => {
    await mount(`<form id="f"><label for="c">Choice</label>
      <gc-segmented-control id="c" name="c"><gc-segment>A</gc-segment></gc-segmented-control></form>`);
    expect(await page.locator('#c').evaluate((el) => [el.form.id, [...el.labels].map((l) => l.textContent), el.type, el.willValidate]))
      .toEqual(['f', ['Choice'], 'gc-segmented-control', true]);
  });
});
