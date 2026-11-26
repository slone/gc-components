// Unit tests of the gc-base helpers, run in a real browser.
import { createTest, expect, internals } from './fixtures.js';

const test = createTest({ pkg: 'gc-base', script: 'test/demo-control.js', tags: ['demo-control'] });

test.describe('gc-base', () => {
  test('createMessages: page language, regional fallback, English fallback, register()', async ({ page, mount }) => {
    await mount(`<p id="a">a</p><section lang="fr-BE"><p id="b">b</p></section>`, { script: false });
    const result = await page.evaluate(async () => {
      const { createMessages } = await import('/packages/gc-base/messages.js');
      const m = createMessages({ en: { hi: 'Hello', bye: 'Bye' }, fr: { hi: 'Bonjour' } });
      const a = document.querySelector('#a');
      const b = document.querySelector('#b');
      const out = [m.get(a, 'hi'), m.get(b, 'hi'), m.get(b, 'bye')];
      m.register('fr-BE', { hi: 'Bonjour (BE)' });
      out.push(m.get(b, 'hi'));
      return out;
    });
    expect(result).toEqual(['Hello', 'Bonjour', 'Bye', 'Bonjour (BE)']);
  });

  test('upgradeProperties: values set before definition go through the setters', async ({ page, mount }) => {
    await mount(`<demo-control aria-label="Demo"></demo-control>`, { script: false });
    const result = await page.evaluate(async () => {
      const el = document.querySelector('demo-control');
      el.required = true;
      el.name = 'x';
      await import('/packages/gc-base/test/demo-control.js');
      return [el.hasAttribute('required'), el.getAttribute('name')];
    });
    expect(result).toEqual([true, 'x']);
  });

  test('FormControlMixin: form API, fieldset disabled, custom validity', async ({ page, mount }) => {
    await mount(`<form><fieldset><demo-control name="n" aria-label="Demo" required></demo-control></fieldset></form>`);
    const el = page.locator('demo-control');
    expect(await el.evaluate((e) => [e.form?.tagName, e.willValidate, e.validity.valueMissing, e.validationMessage]))
      .toEqual(['FORM', true, true, 'Required']);
    expect(await el.evaluate((e) => { e.setCustomValidity('Nope'); return [e.checkValidity(), e.validity.customError]; }))
      .toEqual([false, true]);
    expect(await el.evaluate((e) => { e.setCustomValidity(''); e.value = 'v'; return e.checkValidity(); })).toBe(true);
    expect(await page.evaluate(() => [...new FormData(document.forms[0])])).toEqual([['n', 'v']]);

    await page.evaluate(() => { document.querySelector('fieldset').disabled = true; });
    expect((await internals(el)).ariaDisabled).toBe('true');
    expect(await page.evaluate(() => [...new FormData(document.forms[0])])).toEqual([]);
  });
});
