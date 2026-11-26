/**
 * <gc-toggle-switch> — an accessible, dependency-free toggle switch
 * built as a native, form-associated Custom Element.
 *
 * Usage:
 *   <script type="module" src="./gc-toggle-switch.js"></script>
 *   <label for="wifi">Wi-Fi</label>
 *   <gc-toggle-switch id="wifi" name="wifi" checked></gc-toggle-switch>
 *
 * See README.md for the full documentation.
 */

import { FormControlMixin, internals, sync, isDisabled, applyValidity } from '../gc-base/form-control.js';
import { upgradeProperties, setState } from '../gc-base/attributes.js';
import { createMessages } from '../gc-base/messages.js';

const STYLES = /* css */ `
:host {
  /* ---- Public API (can be overridden from the page) ----
     --switch-off-color      track colour when off
     --switch-on-color       track colour when on
     --switch-thumb-color    thumb colour
     --switch-thumb-shadow   thumb shadow
     --switch-thumb-size     thumb diameter
     --switch-padding        gap between the thumb and the track edge
     --switch-length         track length (long side)
     --switch-focus-color    focus ring colour
     --switch-label-color    state indicator colour (I / O)
     --switch-halo-color     hover / press halo around the thumb
     --switch-duration       animation duration
     --switch-vertical       0 = horizontal, 1 = vertical             */

  /* Defaults, adapted to light/dark through color-scheme. */
  --_def-off: #767676;
  --_def-on: #1a7f37;
  --_def-thumb: #ffffff;
  --_def-focus: #0b57d0;
  --_def-halo: rgb(128 128 128 / 0.22);

  /* Orientation: the attribute (rules below) wins over the CSS property. */
  --_v: var(--switch-vertical, 0);

  --_thumb: var(--switch-thumb-size, 1.25em);
  --_pad: var(--switch-padding, 0.1875em);
  --_short: calc(var(--_thumb) + 2 * var(--_pad));
  --_long: var(--switch-length, calc(var(--_short) * 1.65));
  --_travel: calc(var(--_long) - var(--_short));
  --_w: calc(var(--_short) + var(--_travel) * (1 - var(--_v)));
  --_h: calc(var(--_short) + var(--_travel) * var(--_v));
  --_dur: var(--switch-duration, 180ms);

  /* Writing direction: 1 = left-to-right, -1 = right-to-left (dir="rtl"). */
  --_dir: 1;
  /* Movement from the "off" position to the "on" position.
     Horizontal: towards the line end (right, or left in RTL). Vertical: upwards. */
  --_shift: translate(
    calc(var(--_travel) * (1 - var(--_v)) * var(--_dir)),
    calc(var(--_travel) * -1 * var(--_v))
  );

  /* Colours: attribute > CSS property > default. */
  --_off: var(--_off-attr, var(--switch-off-color, var(--_def-off)));
  --_on: var(--_on-attr, var(--switch-on-color, var(--_def-on)));
  --_cur: var(--_off);
  --_halo: var(--switch-halo-color, var(--_def-halo));

  display: inline-block;
  position: relative;
  flex: none;
  box-sizing: border-box;
  vertical-align: middle;
  width: var(--_w);
  height: var(--_h);
  border-radius: calc(var(--_short) / 2);
  cursor: pointer;
  outline: none;
  /* Let the page scroll across the switch axis, but keep drags on it. */
  touch-action: pan-y pinch-zoom;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}

@supports (color: light-dark(#000, #fff)) {
  :host {
    --_def-off: light-dark(#767676, #8e8e93);
    --_def-on: light-dark(#1a7f37, #2ea043);
    --_def-focus: light-dark(#0b57d0, #a8c7fa);
    --_def-halo: light-dark(rgb(0 0 0 / 0.1), rgb(255 255 255 / 0.18));
  }
}
@supports not (color: light-dark(#000, #fff)) {
  @media (prefers-color-scheme: dark) {
    :host {
      --_def-off: #8e8e93;
      --_def-on: #2ea043;
      --_def-focus: #a8c7fa;
    }
  }
}

:host([hidden]) { display: none; }
:host([checked]) { --_cur: var(--_on); }

:host([orientation="vertical" i]) { --_v: 1; touch-action: pan-x pinch-zoom; }
:host([orientation="horizontal" i]) { --_v: 0; touch-action: pan-y pinch-zoom; }
:host(:dir(rtl)) { --_dir: -1; }

/* Invisible hit area: at least 24 × 24 CSS px (WCAG 2.5.8), even for small switches. */
.hit {
  position: absolute;
  inset: min(0px, calc((var(--_h) - 24px) / 2)) min(0px, calc((var(--_w) - 24px) / 2));
}

.track {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--_cur);
  transition: background-color var(--_dur) ease;
}

/* "Off" position: bottom, at the line start. Works for both orientations. */
.thumb, .label {
  position: absolute;
  left: var(--_pad);
  bottom: var(--_pad);
  width: var(--_thumb);
  height: var(--_thumb);
}
:host(:dir(rtl)) .thumb, :host(:dir(rtl)) .label {
  left: auto;
  right: var(--_pad);
}

/* State indicators (state-labels attribute or "on"/"off" slots):
   each one sits at the end of the track left free by the thumb. */
.label {
  display: none;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  color: var(--switch-label-color, #ffffff);
  line-height: 1;
  opacity: 0;
  transition: opacity var(--_dur) ease;
  pointer-events: none;
}
.show-labels .label { display: flex; }
.label.off { transform: var(--_shift); }
:host([checked]) .label.on, :host(:not([checked])) .label.off { opacity: 1; }
.label slot { font-size: 0.6em; font-weight: 700; }
.glyph-on {
  display: block;
  width: 0.2em;
  height: 1em;
  border-radius: 0.1em;
  background: currentColor;
}
.glyph-off {
  display: block;
  box-sizing: border-box;
  width: 1em;
  height: 1em;
  border-radius: 50%;
  border: 0.2em solid currentColor;
}

.thumb {
  --_hs: 0px; /* halo size */
  border-radius: 50%;
  background: var(--switch-thumb-color, var(--_def-thumb));
  box-shadow:
    var(--switch-thumb-shadow, 0 1px 3px rgb(0 0 0 / 0.35), 0 0 0 0.5px rgb(0 0 0 / 0.08)),
    0 0 0 var(--_hs) var(--_halo);
  transition:
    transform var(--_dur) cubic-bezier(0.3, 0.7, 0.4, 1),
    box-shadow var(--_dur) ease;
}
:host([checked]) .thumb { transform: var(--_shift); }

/* While dragging, the thumb follows the pointer without easing. */
.dragging .thumb, .dragging .label { transition: none; }

/* Hover and press feedback: a halo around the thumb. */
@media (hover: hover) {
  :host(:hover) .thumb { --_hs: 0.3em; }
}
:host .pressed .thumb { --_hs: 0.45em; }

/* Busy: a spinner inside the thumb, in the current track colour. */
.thumb::after {
  content: "";
  display: none;
  position: absolute;
  inset: 22%;
  box-sizing: border-box;
  border-radius: 50%;
  border: max(2px, 0.14em) solid var(--_cur);
  border-right-color: transparent;
  animation: gc-toggle-switch-spin 0.8s linear infinite;
}
:host([busy]) .thumb::after { display: block; }
:host([busy]) { cursor: progress; }
@keyframes gc-toggle-switch-spin { to { transform: rotate(1turn); } }

:host(:focus-visible) .track {
  outline: 2px solid var(--switch-focus-color, var(--_def-focus));
  outline-offset: 2px;
}

:host([disabled]) { cursor: not-allowed; opacity: 0.45; }
:host(:disabled) { cursor: not-allowed; opacity: 0.45; }
:host([disabled]) .track .thumb, :host(:disabled) .track .thumb, :host([busy]) .track .thumb { --_hs: 0px; }

@media (prefers-reduced-motion: reduce) {
  .track, .thumb, .label { transition: none; }
  .thumb::after { animation-duration: 2.4s; }
}

@media (forced-colors: active) {
  :host { --_halo: transparent; }
  .track, .thumb, .label { forced-color-adjust: none; }
  .label.off { color: CanvasText; }
  .label.on { color: HighlightText; }
  .track { background: Canvas; border: 1px solid CanvasText; }
  .thumb { background: CanvasText; box-shadow: none; }
  .thumb::after { border-color: Canvas; border-right-color: transparent; }
  :host([checked]) .track { background: Highlight; border-color: Highlight; }
  :host([checked]) .thumb { background: HighlightText; }
  :host([checked]) .thumb::after { border-color: Highlight; border-right-color: transparent; }
  :host(:focus-visible) .track { outline-color: Highlight; }
  :host([disabled]) .track, :host(:disabled) .track { border-color: GrayText; background: Canvas; }
  :host([disabled]) .thumb, :host(:disabled) .thumb { background: GrayText; }
  :host([disabled]), :host(:disabled) { opacity: 1; }
}
`;

let sharedSheet;
function getSheet() {
  if (!sharedSheet) {
    sharedSheet = new CSSStyleSheet();
    sharedSheet.replaceSync(STYLES);
  }
  return sharedSheet;
}

const COLOR_ATTRS = { 'off-color': '--_off-attr', 'on-color': '--_on-attr' };

/** Pointer movement (px) before a press becomes a drag. */
const DRAG_THRESHOLD = 4;
/** After a drag, the browser may still send a click: ignore it for this long (ms). */
const CLICK_SUPPRESS_MS = 400;

const messages = createMessages({
  en: { valueMissing: 'Please turn this switch on.' },
  fr: { valueMissing: 'Veuillez activer cet interrupteur.' },
});

/**
 * An on/off switch, horizontal or vertical, usable with a pointer (click or drag) and the keyboard (Space, Enter).
 *
 * @tag gc-toggle-switch
 * @summary Accessible, form-associated toggle switch.
 *
 * @attr {boolean} checked - The "on" state (reflected). Also sets the default state used by form.reset().
 * @attr {boolean} disabled - Disables the switch and excludes it from the form.
 * @attr {boolean} busy - Shows a spinner, exposes aria-busy and ignores user actions.
 * @attr {boolean} required - The form is invalid while the switch is off.
 * @attr {string} name - Field name in the form.
 * @attr {string} value - Value submitted when the switch is on.
 * @attr {'horizontal' | 'vertical'} orientation - Orientation. Wins over --switch-vertical; horizontal when neither is set.
 * @attr {string} off-color - Track colour when off (any CSS colour). Wins over --switch-off-color.
 * @attr {string} on-color - Track colour when on (any CSS colour). Wins over --switch-on-color.
 * @attr {boolean} state-labels - Shows I / O state indicators in the track.
 *
 * @fires {Event} input - The user toggled the switch. Bubbles and is composed.
 * @fires {Event} change - Fired right after input. Bubbles.
 * @fires {CustomEvent<{ oldChecked: boolean; newChecked: boolean }>} toggle - Fired right after change, with the old and new states. Does not bubble.
 *
 * @slot on - Indicator shown when on (short text or icon).
 * @slot off - Indicator shown when off (short text or icon).
 *
 * @csspart track - The track (rounded background).
 * @csspart thumb - The round thumb.
 * @csspart on-label - The indicator shown when on.
 * @csspart off-label - The indicator shown when off.
 *
 * @cssprop [--switch-off-color=light-dark(#767676, #8e8e93)] - Track colour when off.
 * @cssprop [--switch-on-color=light-dark(#1a7f37, #2ea043)] - Track colour when on.
 * @cssprop [--switch-thumb-color=#ffffff] - Thumb colour.
 * @cssprop [--switch-thumb-shadow=0 1px 3px rgb(0 0 0 / 0.35), 0 0 0 0.5px rgb(0 0 0 / 0.08)] - Thumb shadow.
 * @cssprop [--switch-thumb-size=1.25em] - Thumb diameter.
 * @cssprop [--switch-padding=0.1875em] - Gap between the thumb and the track edge.
 * @cssprop [--switch-length=1.65 × the track width] - Track length (long side).
 * @cssprop [--switch-focus-color=light-dark(#0b57d0, #a8c7fa)] - Focus ring colour.
 * @cssprop [--switch-label-color=#ffffff] - State indicator colour.
 * @cssprop [--switch-halo-color=light-dark(rgb(0 0 0 / 0.1), rgb(255 255 255 / 0.18))] - Halo around the thumb on hover and press.
 * @cssprop [--switch-duration=180ms] - Animation duration.
 * @cssprop [--switch-vertical=0] - 0 = horizontal, 1 = vertical. The orientation attribute wins.
 *
 * @cssstate checked - The switch is on.
 */
export class ToggleSwitch extends FormControlMixin(HTMLElement) {
  static observedAttributes = [
    'checked', 'disabled', 'required', 'value', 'busy', 'off-color', 'on-color', 'state-labels',
  ];

  /**
   * Adds or overrides the built-in messages for a language, e.g.
   * `ToggleSwitch.registerMessages('de', { valueMissing: 'Bitte einschalten.' })`.
   * The language comes from the closest `lang` attribute, else the browser.
   * @param {string} lang
   * @param {{ valueMissing?: string }} entries
   */
  static registerMessages(lang, entries) {
    messages.register(lang, entries);
  }

  #track;
  #thumb;
  #attrSheet;
  #checked = false;
  #defaultChecked = false;
  #reflecting = false;
  #managedTabindex = false;
  #spacePressed = false;
  #drag = null;
  #internalClick = false;
  #suppressClickUntil = 0;
  #userClickInTask = false;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    this.#attrSheet = new CSSStyleSheet();
    root.adoptedStyleSheets = [getSheet(), this.#attrSheet];
    root.innerHTML =
      '<span class="hit"></span>' +
      '<span class="track" part="track">' +
        '<span class="label on" part="on-label" aria-hidden="true"><slot name="on"><span class="glyph-on"></span></slot></span>' +
        '<span class="label off" part="off-label" aria-hidden="true"><slot name="off"><span class="glyph-off"></span></slot></span>' +
        '<span class="thumb" part="thumb"></span>' +
      '</span>';
    this.#track = root.querySelector('.track');
    this.#thumb = root.querySelector('.thumb');
    for (const slot of root.querySelectorAll('slot')) {
      slot.addEventListener('slotchange', () => this.#updateLabels());
    }

    this[internals].role = 'switch';

    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeyDown);
    this.addEventListener('keyup', this.#onKeyUp);
    this.addEventListener('blur', () => {
      this.#spacePressed = false;
      this.#track.classList.remove('pressed');
    });
    this.addEventListener('pointerdown', this.#onPointerDown);
    this.addEventListener('pointermove', this.#onPointerMove);
    this.addEventListener('pointerup', this.#onPointerUp);
    this.addEventListener('pointercancel', this.#onPointerCancel);
  }

  connectedCallback() {
    upgradeProperties(this, ['checked', 'defaultChecked', 'disabled', 'required', 'name', 'value', 'orientation', 'stateLabels', 'busy']);
    this.#updateLabels();
    this[sync]();
  }

  attributeChangedCallback(name, _old, value) {
    if (name === 'checked') {
      if (this.#reflecting) return;
      // As with <input type="checkbox">, the attribute sets the default state
      // (used by form.reset()); here it also sets the current state.
      this.#defaultChecked = value !== null;
      this.#checked = value !== null;
    } else if (name in COLOR_ATTRS) {
      this.#updateColorSheet();
      return;
    } else if (name === 'state-labels') {
      this.#updateLabels();
      return;
    }
    this[sync]();
  }

  // ---- Forms ----------------------------------------------------------------

  formResetCallback() {
    this.#setChecked(this.#defaultChecked);
  }

  formStateRestoreCallback(state) {
    this.#setChecked(state === 'true');
  }

  // ---- Properties -----------------------------------------------------------

  /** Current state. Setting it fires no event.
   * @type {boolean}
   * @default false
   * @reflect */
  get checked() { return this.#checked; }
  set checked(v) { this.#setChecked(Boolean(v)); }

  /** State restored by form.reset().
   * @type {boolean}
   * @default false */
  get defaultChecked() { return this.#defaultChecked; }
  set defaultChecked(v) { this.#defaultChecked = Boolean(v); }

  /** @type {boolean}
   * @default false
   * @reflect */
  get busy() { return this.hasAttribute('busy'); }
  set busy(v) { this.toggleAttribute('busy', Boolean(v)); }

  /** @type {string}
   * @default "on"
   * @reflect */
  get value() { return this.getAttribute('value') ?? 'on'; }
  set value(v) { this.setAttribute('value', v); }

  /** Orientation set by the attribute; an orientation set in CSS is not visible here.
   * @type {'horizontal' | 'vertical'}
   * @default "horizontal"
   * @reflect */
  get orientation() {
    return (this.getAttribute('orientation') || '').toLowerCase() === 'vertical' ? 'vertical' : 'horizontal';
  }
  set orientation(v) {
    if (v == null || v === '') this.removeAttribute('orientation');
    else this.setAttribute('orientation', v);
  }

  /** @type {boolean}
   * @default false
   * @reflect */
  get stateLabels() { return this.hasAttribute('state-labels'); }
  set stateLabels(v) { this.toggleAttribute('state-labels', Boolean(v)); }

  /** @type {'gc-toggle-switch'} */
  get type() { return 'gc-toggle-switch'; }

  /**
   * Toggles the state, or sets it when force is a boolean. Fires no event.
   * @param {boolean} [force]
   * @returns {boolean} - The new state.
   */
  toggle(force) {
    this.checked = typeof force === 'boolean' ? force : !this.#checked;
    return this.#checked;
  }

  // ---- Internals ------------------------------------------------------------

  /** The user can change the state: neither disabled nor busy. */
  #isInteractive() {
    return !this[isDisabled]() && !this.hasAttribute('busy');
  }

  #setChecked(v) {
    this.#checked = v;
    this.#reflecting = true;
    this.toggleAttribute('checked', v);
    this.#reflecting = false;
    this[sync]();
  }

  /** Dispatches a click from the component itself (keyboard, end of a drag). */
  #activate() {
    this.#internalClick = true;
    try { this.click(); } finally { this.#internalClick = false; }
  }

  #onClick = (event) => {
    // Firefox: clicking the switch inside a wrapping <label> makes the label
    // dispatch a second click to the switch in the same task. Ignore it.
    const forwarded = !this.#internalClick && this.#userClickInTask && this.labels.length > 0;
    const swallowed = forwarded ||
      (!this.#internalClick && performance.now() < this.#suppressClickUntil);
    if (swallowed && !forwarded) this.#suppressClickUntil = 0;
    if (!swallowed && !this.#internalClick && event.isTrusted) {
      this.#userClickInTask = true;
      setTimeout(() => { this.#userClickInTask = false; }, 0);
    }
    if (swallowed || !this.#isInteractive()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    // As with <input type="checkbox">: the state flips right away (click
    // listeners see the new state); once the event has fully propagated, it
    // is reverted if a listener called preventDefault().
    const oldChecked = this.#checked;
    this.#setChecked(!oldChecked);

    let settled = false;
    const settle = (e) => {
      if (settled || (e && e !== event)) return;
      settled = true;
      window.removeEventListener('click', settle);
      if (event.defaultPrevented) {
        this.#setChecked(oldChecked);
      } else {
        const newChecked = this.#checked;
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        this.dispatchEvent(new Event('change', { bubbles: true }));
        // Does not bubble, like the native `toggle` event: a switch inside a
        // <details> must not trigger the listeners of that <details>.
        this.dispatchEvent(new CustomEvent('toggle', { detail: { oldChecked, newChecked } }));
      }
    };
    // End of propagation: a listener added on window runs last.
    // Fallback when propagation is stopped or the element is not in the document.
    window.addEventListener('click', settle);
    setTimeout(settle, 0);
  };

  #onKeyDown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || !this.#isInteractive()) return;
    if (event.key === ' ') {
      event.preventDefault(); // no page scroll
      this.#spacePressed = true;
      this.#track.classList.add('pressed');
    } else if (event.key === 'Enter') {
      event.preventDefault(); // no implicit form submission
      if (!event.repeat) this.#activate();
    }
  };

  #onKeyUp = (event) => {
    if (event.key === ' ' && this.#spacePressed) {
      this.#spacePressed = false;
      this.#track.classList.remove('pressed');
      if (this.#isInteractive()) this.#activate();
    }
  };

  // ---- Pointer: press feedback and dragging the thumb -------------------------

  #onPointerDown = (event) => {
    if (!event.isPrimary || event.button !== 0 || !this.#isInteractive()) return;
    const rect = this.getBoundingClientRect();
    const vertical = rect.height > rect.width;
    const travel = Math.abs(rect.width - rect.height);
    this.#drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      vertical,
      travel,
      rtl: getComputedStyle(this).direction === 'rtl',
      start: this.#checked ? travel : 0,
      pos: this.#checked ? travel : 0,
      moved: false,
    };
    this.#track.classList.add('pressed');
    try { this.setPointerCapture(event.pointerId); } catch { /* ignore */ }
  };

  #onPointerMove = (event) => {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.id) return;
    const delta = drag.vertical
      ? drag.y - event.clientY
      : (event.clientX - drag.x) * (drag.rtl ? -1 : 1);
    if (!drag.moved && Math.abs(delta) < DRAG_THRESHOLD) return;
    drag.moved = true;
    drag.pos = Math.min(drag.travel, Math.max(0, drag.start + delta));
    this.#track.classList.add('dragging');
    this.#thumb.style.transform = drag.vertical
      ? `translate(0, ${-drag.pos}px)`
      : `translate(${drag.pos * (drag.rtl ? -1 : 1)}px, 0)`;
  };

  #onPointerUp = (event) => {
    const drag = this.#endDrag(event);
    if (!drag?.moved) return; // a simple tap: the native click toggles
    this.#suppressClickUntil = performance.now() + CLICK_SUPPRESS_MS;
    const wanted = drag.pos > drag.travel / 2;
    if (wanted !== this.#checked && this.#isInteractive()) this.#activate();
  };

  #onPointerCancel = (event) => {
    const drag = this.#endDrag(event);
    if (drag?.moved) this.#suppressClickUntil = performance.now() + CLICK_SUPPRESS_MS;
  };

  #endDrag(event) {
    const drag = this.#drag;
    if (!drag || event.pointerId !== drag.id) return null;
    this.#drag = null;
    this.#track.classList.remove('pressed', 'dragging');
    this.#thumb.style.transform = '';
    return drag;
  }

  #updateLabels() {
    const show = this.hasAttribute('state-labels') ||
      [...this.children].some((child) => child.slot === 'on' || child.slot === 'off');
    this.#track.classList.toggle('show-labels', show);
  }

  #updateColorSheet() {
    const decls = [];
    for (const [attr, prop] of Object.entries(COLOR_ATTRS)) {
      const value = this.getAttribute(attr)?.trim();
      // CSS.supports() rejects invalid values (and any CSS injection).
      if (value && CSS.supports('color', value)) decls.push(`${prop}: ${value};`);
    }
    this.#attrSheet.replaceSync(decls.length ? `:host { ${decls.join(' ')} }` : '');
  }

  [sync]() {
    const i = this[internals];
    const checked = this.#checked;
    const disabled = this[isDisabled]();

    i.ariaChecked = String(checked);
    i.ariaDisabled = disabled ? 'true' : null;
    i.ariaRequired = this.required ? 'true' : null;
    i.ariaBusy = this.busy ? 'true' : null;
    setState(i, 'checked', checked);

    i.setFormValue(checked ? this.value : null, String(checked));
    this[applyValidity](this.required && !checked, messages.get(this, 'valueMissing'), this.#track);

    if (!this.isConnected) return;
    if (disabled) {
      if (this.#managedTabindex) {
        this.removeAttribute('tabindex');
        this.#managedTabindex = false;
      }
    } else if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
      this.#managedTabindex = true;
    }
  }
}

if (!customElements.get('gc-toggle-switch')) {
  customElements.define('gc-toggle-switch', ToggleSwitch);
}
