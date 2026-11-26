// Fixtures of <gc-segmented-control>: the shared ones plus a few helpers.
import { createTest, expect, internals, ORIGIN } from '../../gc-base/test/fixtures.js';

export const test = createTest({ pkg: 'gc-segmented-control', tags: ['gc-segmented-control', 'gc-segment'] });
export { expect, internals, ORIGIN };

/** The usual three-segment control. */
export const BASIC = `
  <gc-segmented-control name="view" value="list" aria-label="View">
    <gc-segment value="list">List</gc-segment>
    <gc-segment value="grid">Grid</gc-segment>
    <gc-segment value="map">Map</gc-segment>
  </gc-segmented-control>`;

/** Reads a property of the first element matching `selector`. */
export function prop(page, name, selector = 'gc-segmented-control') {
  return page.locator(selector).first().evaluate((el, name) => el[name], name);
}

/** Records input/change events on `locator`; read them with `recorded(locator)`. */
export function recordEvents(locator) {
  return locator.evaluate((el) => {
    el.__events = [];
    for (const type of ['input', 'change']) {
      el.addEventListener(type, (e) => el.__events.push({ type, value: el.value, bubbles: e.bubbles, composed: e.composed }));
    }
  });
}

export function recorded(locator) {
  return locator.evaluate((el) => el.__events);
}
