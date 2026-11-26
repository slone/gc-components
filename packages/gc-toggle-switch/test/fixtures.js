// Fixtures of <gc-toggle-switch>: the shared ones plus event recording helpers.
import { createTest, expect, internals, ORIGIN } from '../../gc-base/test/fixtures.js';

export const test = createTest({ pkg: 'gc-toggle-switch' });
export { expect, internals, ORIGIN };

/** Records the events fired by `locator` (or its descendants); read them with `recorded(locator)`. */
export function recordEvents(locator, types = ['input', 'change', 'toggle']) {
  return locator.evaluate((el, types) => {
    el.__events = [];
    for (const type of types) {
      el.addEventListener(type, (e) => el.__events.push({
        type,
        checked: el.checked,
        detail: e.detail ?? null,
        bubbles: e.bubbles,
        composed: e.composed,
      }));
    }
  }, types);
}

/** Types of the events recorded so far. */
export function recorded(locator) {
  return locator.evaluate((el) => el.__events.map((e) => e.type));
}

/** Full records ({ type, checked, detail, bubbles, composed }) of the events so far. */
export function recordedDetails(locator) {
  return locator.evaluate((el) => el.__events);
}

