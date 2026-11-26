/**
 * Re-applies the properties set on an element before it was defined
 * (upgrade), so that they go through the class setters.
 * Call it from `connectedCallback`.
 *
 * @param {HTMLElement} el
 * @param {string[]} names
 */
export function upgradeProperties(el, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(el, name)) {
      const value = el[name];
      delete el[name];
      el[name] = value;
    }
  }
}

/**
 * Adds or removes a custom state (`:state(name)`); does nothing in browsers
 * without CustomStateSet.
 *
 * @param {ElementInternals} internals
 * @param {string} name
 * @param {boolean} on
 */
export function setState(internals, name, on) {
  try {
    if (on) internals.states.add(name);
    else internals.states.delete(name);
  } catch { /* CustomStateSet not supported */ }
}
