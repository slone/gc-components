/**
 * <gc-segmented-control> — an accessible, dependency-free segmented control
 * (a row of mutually exclusive options) built as a native, form-associated
 * Custom Element. Each option is a <gc-segment> child, defined by this module.
 *
 * Usage:
 *   <script type="module" src="./gc-segmented-control.js"></script>
 *   <gc-segmented-control name="view" value="list" aria-label="View">
 *     <gc-segment value="list">List</gc-segment>
 *     <gc-segment value="grid">Grid</gc-segment>
 *   </gc-segmented-control>
 *
 * See README.md for the full documentation.
 */

import { FormControlMixin, internals, sync, isDisabled, applyValidity } from '../gc-base/form-control.js';
import { upgradeProperties, setState } from '../gc-base/attributes.js';
import { createMessages } from '../gc-base/messages.js';

const CONTROL_STYLES = /* css */ `
:host {
  /* ---- Public API (can be overridden from the page) ----
     --segmented-background        track background
     --segmented-border            track border (shorthand)
     --segmented-color             text colour of the segments
     --segmented-selected-color    text colour of the selected segment
     --segmented-indicator-color   background of the selection indicator
     --segmented-indicator-shadow  shadow of the selection indicator
     --segmented-hover-color       background of a hovered segment
     --segmented-radius            outer corner radius
     --segmented-padding           gap between the track edge and the segments
     --segmented-gap               gap between two segments
     --segmented-segment-padding   inner padding of each segment
     --segmented-focus-color       focus ring colour
     --segmented-duration          animation duration                       */

  /* Defaults, adapted to light/dark through color-scheme. */
  --_def-bg: #ececf0;
  --_def-border: #b9bcc4;
  --_def-indicator: #0b57d0;
  --_def-selected: #ffffff;
  --_def-focus: #0b57d0;
  --_def-hover: rgb(0 0 0 / 0.07);

  /* Inherited by the <gc-segment> children (custom properties inherit). */
  --_pad: var(--segmented-padding, 0.1875em);
  --_radius: var(--segmented-radius, 0.5em);
  --_inner-radius: max(0px, calc(var(--_radius) - var(--_pad)));
  --_dur: var(--segmented-duration, 200ms);
  --_fg: var(--segmented-color, inherit);
  --_sel-fg: var(--segmented-selected-color, var(--_def-selected));
  --_hover: var(--segmented-hover-color, var(--_def-hover));
  --_focus: var(--segmented-focus-color, var(--_def-focus));

  display: inline-block;
  box-sizing: border-box;
  vertical-align: middle;
  max-width: 100%;
  -webkit-tap-highlight-color: transparent;
}

@supports (color: light-dark(#000, #fff)) {
  :host {
    --_def-bg: light-dark(#ececf0, #2b2e35);
    --_def-border: light-dark(#b9bcc4, #4a4f5a);
    --_def-indicator: light-dark(#0b57d0, #a8c7fa);
    --_def-selected: light-dark(#ffffff, #062e6f);
    --_def-focus: light-dark(#0b57d0, #a8c7fa);
    --_def-hover: light-dark(rgb(0 0 0 / 0.07), rgb(255 255 255 / 0.1));
  }
}
@supports not (color: light-dark(#000, #fff)) {
  @media (prefers-color-scheme: dark) {
    :host {
      --_def-bg: #2b2e35;
      --_def-border: #4a4f5a;
      --_def-indicator: #a8c7fa;
      --_def-selected: #062e6f;
      --_def-focus: #a8c7fa;
      --_def-hover: rgb(255 255 255 / 0.1);
    }
  }
}

:host([hidden]) { display: none; }

.track {
  position: relative;
  display: grid;
  /* Horizontal: one column per segment, all as wide as the widest one. */
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: var(--segmented-gap, 0.125em);
  box-sizing: border-box;
  padding: var(--_pad);
  border: var(--segmented-border, 1px solid var(--_def-border));
  border-radius: var(--_radius);
  background: var(--segmented-background, var(--_def-bg));
}
:host([orientation="vertical" i]) .track {
  grid-auto-flow: row;
  grid-auto-columns: auto;
  grid-auto-rows: 1fr;
}

/* The selection indicator slides from one segment to the other.
   Its position and size are measured by the script. */
.indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--_iw, 0px);
  height: var(--_ih, 0px);
  transform: translate(var(--_ix, 0px), var(--_iy, 0px));
  box-sizing: border-box;
  border-radius: var(--_inner-radius);
  background: var(--segmented-indicator-color, var(--_def-indicator));
  box-shadow: var(--segmented-indicator-shadow, 0 1px 2px rgb(0 0 0 / 0.2));
  opacity: 0;
  pointer-events: none;
}
.has-selection .indicator { opacity: 1; }
.animate .indicator {
  transition:
    transform var(--_dur) cubic-bezier(0.3, 0.7, 0.4, 1),
    width var(--_dur) cubic-bezier(0.3, 0.7, 0.4, 1),
    height var(--_dur) cubic-bezier(0.3, 0.7, 0.4, 1),
    opacity var(--_dur) ease;
}

:host([disabled]), :host(:disabled) { opacity: 0.45; }

@media (prefers-reduced-motion: reduce) {
  .animate .indicator { transition: none; }
}

@media (forced-colors: active) {
  .track, .indicator { forced-color-adjust: none; }
  .track { background: Canvas; border: 1px solid CanvasText; }
  .indicator { background: Highlight; box-shadow: none; }
  :host([disabled]) .track, :host(:disabled) .track { border-color: GrayText; }
  :host([disabled]) .indicator, :host(:disabled) .indicator { background: GrayText; }
  :host([disabled]), :host(:disabled) { opacity: 1; }
}
`;

const SEGMENT_STYLES = /* css */ `
:host {
  position: relative;
  z-index: 1; /* above the indicator */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4em;
  box-sizing: border-box;
  /* At least 24 × 24 CSS px (WCAG 2.5.8). */
  min-width: 24px;
  min-height: 24px;
  padding: var(--segmented-segment-padding, 0.375em 0.875em);
  border-radius: var(--_inner-radius, 0.3em);
  color: var(--_fg, inherit);
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
  transition: color var(--_dur, 200ms) ease, background-color var(--_dur, 200ms) ease;
}
:host([hidden]) { display: none; }
:host([selected]) { color: var(--_sel-fg, inherit); }

@media (hover: hover) {
  :host(:not([selected]):not([disabled]):not(:state(group-disabled)):hover) { background: var(--_hover, rgb(128 128 128 / 0.15)); }
}
:host(:not([selected]):not([disabled]):not(:state(group-disabled)):active) { background: var(--_hover, rgb(128 128 128 / 0.15)); }

:host(:focus-visible) {
  outline: 2px solid var(--_focus, Highlight);
  outline-offset: 1px;
}

:host([disabled]) { cursor: not-allowed; opacity: 0.45; }
:host(:state(group-disabled)) { cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) {
  :host { transition: none; }
}

@media (forced-colors: active) {
  :host { forced-color-adjust: none; color: CanvasText; }
  :host([selected]) { color: HighlightText; }
  :host([disabled]) { color: GrayText; opacity: 1; }
  :host([selected][disabled]), :host([selected]:state(group-disabled)) { color: Canvas; }
  :host(:not([selected]):not([disabled]):hover) { background: transparent; }
  :host(:focus-visible) { outline-color: CanvasText; }
}
`;

const sheets = new Map();
function getSheet(css) {
  let sheet = sheets.get(css);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    sheets.set(css, sheet);
  }
  return sheet;
}

// Module-private hooks between a control and its segments.
const NOTIFY = Symbol('notify');
const SET_GROUP_STATE = Symbol('setGroupState');

const messages = createMessages({
  en: { valueMissing: 'Please select one of these options.' },
  fr: { valueMissing: 'Veuillez sélectionner l’une de ces options.' },
});

// =============================================================================
// <gc-segment>
// =============================================================================

/**
 * One option of a <gc-segmented-control>. Must be a direct child of the control.
 *
 * @tag gc-segment
 * @summary An option of a segmented control (role "radio").
 *
 * @attr {string} value - Value submitted when selected. Defaults to the text content.
 * @attr {boolean} selected - Reflected selection state. Selecting one segment deselects the others.
 * @attr {boolean} disabled - The segment cannot be selected and is skipped by the arrow keys.
 *
 * @slot - The segment's content: text, icon, or both.
 *
 * @cssstate selected - The segment is selected.
 * @cssstate disabled - The segment, or its whole control, is disabled.
 */
export class Segment extends HTMLElement {
  static observedAttributes = ['selected', 'disabled', 'value'];

  #internals;
  #groupDisabled = false;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [getSheet(SEGMENT_STYLES)];
    root.innerHTML = '<slot></slot>';
    this.#internals.role = 'radio';
    this.#sync();
  }

  connectedCallback() {
    upgradeProperties(this, ['selected', 'disabled', 'value']);
    this.#sync();
  }

  attributeChangedCallback(name) {
    this.#sync();
    this.#control()?.[NOTIFY](this, name);
  }

  /**
   * The value submitted when this segment is selected: the `value` attribute, or else the text content.
   * @type {string}
   */
  get value() { return this.getAttribute('value') ?? this.textContent.trim(); }
  set value(v) { this.setAttribute('value', v); }

  /**
   * Selecting a segment deselects the others. Fires no event.
   * @type {boolean}
   * @default false
   * @reflect
   */
  get selected() { return this.hasAttribute('selected'); }
  set selected(v) { this.toggleAttribute('selected', Boolean(v)); }

  /**
   * @type {boolean}
   * @default false
   * @reflect
   */
  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', Boolean(v)); }

  /**
   * The <gc-segmented-control> this segment belongs to (its parent), if any.
   * @type {SegmentedControl | null}
   */
  get control() { return this.#control(); }

  #control() {
    const parent = this.parentElement;
    return parent instanceof SegmentedControl ? parent : null;
  }

  /** Called by the control when the whole group is (un)disabled. */
  [SET_GROUP_STATE](groupDisabled) {
    if (this.#groupDisabled === groupDisabled) return;
    this.#groupDisabled = groupDisabled;
    this.#sync();
  }

  #sync() {
    const i = this.#internals;
    const selected = this.hasAttribute('selected');
    const disabled = this.hasAttribute('disabled') || this.#groupDisabled;
    i.ariaChecked = String(selected);
    i.ariaDisabled = disabled ? 'true' : null;
    setState(i, 'selected', selected);
    setState(i, 'disabled', disabled);
    setState(i, 'group-disabled', this.#groupDisabled);
  }
}

// =============================================================================
// <gc-segmented-control>
// =============================================================================

/**
 * An accessible, form-associated segmented control (role "radiogroup").
 *
 * @tag gc-segmented-control
 * @summary A row of mutually exclusive options, submitted with forms.
 *
 * @attr {string} value - Value of the selected segment. Also sets the default value used by form.reset().
 * @attr {string} name - Field name in the form.
 * @attr {boolean} disabled - Disables the whole control.
 * @attr {boolean} required - The form is invalid while no segment is selected.
 * @attr {'horizontal' | 'vertical'} orientation - Layout direction. Defaults to horizontal.
 *
 * @fires input - The user selected another segment. Bubbles and is composed.
 * @fires change - Right after input. Bubbles.
 *
 * @slot - The <gc-segment> options.
 *
 * @csspart track - The container: background, border, grid of segments.
 * @csspart indicator - The sliding selection indicator.
 *
 * @cssprop --segmented-background - Track background.
 * @cssprop --segmented-border - Track border (shorthand).
 * @cssprop --segmented-color - Text colour of the segments.
 * @cssprop --segmented-selected-color - Text colour of the selected segment.
 * @cssprop --segmented-indicator-color - Background of the selection indicator.
 * @cssprop --segmented-indicator-shadow - Shadow of the selection indicator.
 * @cssprop --segmented-hover-color - Background of a hovered segment.
 * @cssprop [--segmented-radius=0.5em] - Outer corner radius.
 * @cssprop [--segmented-padding=0.1875em] - Gap between the track edge and the segments.
 * @cssprop [--segmented-gap=0.125em] - Gap between two segments.
 * @cssprop [--segmented-segment-padding=0.375em 0.875em] - Inner padding of each segment.
 * @cssprop --segmented-focus-color - Focus ring colour.
 * @cssprop [--segmented-duration=200ms] - Animation duration.
 */
export class SegmentedControl extends FormControlMixin(HTMLElement) {
  static observedAttributes = ['value', 'disabled', 'required', 'orientation'];

  /**
   * Adds or overrides the built-in messages for a language, e.g.
   * `SegmentedControl.registerMessages('de', { valueMissing: 'Bitte wählen Sie eine Option.' })`.
   * The language comes from the closest `lang` attribute, else the browser.
   * @param {string} lang
   * @param {{ valueMissing?: string }} entries
   */
  static registerMessages(lang, entries) {
    messages.register(lang, entries);
  }

  #track;
  #slot;
  /** Wanted value. It may not match any segment yet (children added later). */
  #value = null;
  #defaultValue = null;
  #defaultCaptured = false;
  #updating = false;
  #resizeObserver;
  #observed = new Set();
  #layoutFrame = 0;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [getSheet(CONTROL_STYLES)];
    root.innerHTML =
      '<div class="track" part="track">' +
        '<span class="indicator" part="indicator"></span>' +
        '<slot></slot>' +
      '</div>';
    this.#track = root.querySelector('.track');
    this.#slot = root.querySelector('slot');
    this.#slot.addEventListener('slotchange', () => this.#onSlotChange());

    this[internals].role = 'radiogroup';

    this.#resizeObserver = new ResizeObserver(() => this.#layout(false));

    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeyDown);
  }

  connectedCallback() {
    upgradeProperties(this, ['value', 'defaultValue', 'disabled', 'required', 'name', 'orientation']);
    this.#resizeObserver.observe(this);
    this.#onSlotChange();
  }

  disconnectedCallback() {
    this.#resizeObserver.disconnect();
    this.#observed.clear();
    cancelAnimationFrame(this.#layoutFrame);
    this.#track.classList.remove('animate');
  }

  attributeChangedCallback(name, _old, value) {
    if (name === 'value') {
      // As with <gc-toggle-switch checked>: the attribute sets the default
      // value (used by form.reset()) and the current value.
      this.#defaultValue = value;
      this.#defaultCaptured = true;
      this.#setValue(value);
      return;
    }
    this[sync]();
    if (name === 'orientation') this.#layout(false);
  }

  // ---- Forms ----------------------------------------------------------------

  formResetCallback() {
    this.#setValue(this.#defaultValue);
  }

  formStateRestoreCallback(state) {
    this.#setValue(typeof state === 'string' && state !== '' ? state : null);
  }

  // ---- Properties -----------------------------------------------------------
  // disabled, required, name, form, labels, validity, validationMessage,
  // willValidate and the validation methods come from FormControlMixin.

  /**
   * Value of the selected segment, or "" when none is selected. Setting it fires no event.
   * @type {string}
   */
  get value() { return this.selectedSegment?.value ?? ''; }
  set value(v) { this.#setValue(v == null ? null : String(v)); }

  /**
   * Value restored by form.reset().
   * @type {string}
   */
  get defaultValue() { return this.#defaultValue ?? ''; }
  set defaultValue(v) {
    this.#defaultValue = v == null ? null : String(v);
    this.#defaultCaptured = true;
  }

  /**
   * The <gc-segment> children, in order.
   * @type {Segment[]}
   */
  get segments() {
    return this.#slot.assignedElements().filter((el) => el instanceof Segment);
  }

  /**
   * The selected <gc-segment>, or null.
   * @type {Segment | null}
   */
  get selectedSegment() {
    return this.segments.find((s) => s.hasAttribute('selected')) ?? null;
  }

  /**
   * Index of the selected segment among `segments`, or -1. Setting it fires no event.
   * @type {number}
   */
  get selectedIndex() { return this.segments.findIndex((s) => s.hasAttribute('selected')); }
  set selectedIndex(i) {
    const segment = this.segments[Number(i)];
    this.#setValue(segment ? segment.value : null);
  }

  /**
   * @type {'horizontal' | 'vertical'}
   * @default 'horizontal'
   * @reflect
   */
  get orientation() {
    return (this.getAttribute('orientation') || '').toLowerCase() === 'vertical' ? 'vertical' : 'horizontal';
  }
  set orientation(v) {
    if (v == null || v === '') this.removeAttribute('orientation');
    else this.setAttribute('orientation', v);
  }

  /** @type {'gc-segmented-control'} */
  get type() { return 'gc-segmented-control'; }

  /** Focuses the selected segment (or the first enabled one), as the Tab key would. */
  focus(options) {
    this.#focusTarget()?.focus(options);
  }

  // ---- Segments -------------------------------------------------------------

  /** Called by a <gc-segment> child when one of its attributes changes. */
  [NOTIFY](segment, attr) {
    if (this.#updating) return;
    if (attr === 'selected') {
      if (segment.hasAttribute('selected')) this.#value = segment.value;
      else if (this.#value === segment.value) this.#value = null;
    } else if (attr === 'value' && segment.hasAttribute('selected')) {
      this.#value = segment.value;
    }
    this.#update(false);
  }

  #onSlotChange() {
    const segments = this.segments;
    if (this.#value === null) {
      // Adopt a segment marked `selected` in the HTML.
      const preselected = segments.find((s) => s.hasAttribute('selected'));
      if (preselected) this.#value = preselected.value;
    }
    if (!this.#defaultCaptured && segments.length) {
      this.#defaultValue = this.#value;
      this.#defaultCaptured = true;
    }
    // Watch each segment's size (fonts loading, text changes…).
    const current = new Set(segments);
    for (const el of this.#observed) {
      if (!current.has(el)) { this.#resizeObserver.unobserve(el); this.#observed.delete(el); }
    }
    for (const el of segments) {
      if (!this.#observed.has(el)) { this.#resizeObserver.observe(el); this.#observed.add(el); }
    }
    this.#update(false);
  }

  #setValue(value) {
    this.#value = value;
    this.#update(true);
  }

  /** Reflects the wanted value to the segments' `selected` attribute, then refreshes everything. */
  #update(animate) {
    let found = false;
    this.#updating = true;
    try {
      for (const segment of this.segments) {
        const selected = !found && this.#value !== null && segment.value === this.#value;
        if (selected) found = true;
        if (segment.hasAttribute('selected') !== selected) segment.toggleAttribute('selected', selected);
      }
    } finally {
      this.#updating = false;
    }
    this[sync]();
    this.#layout(animate);
  }

  #enabledSegments() {
    if (this[isDisabled]()) return [];
    return this.segments.filter((s) => !s.hasAttribute('disabled') && !s.hidden);
  }

  /** The segment that takes focus with Tab: the selected one, else the first enabled one. */
  #focusTarget() {
    const enabled = this.#enabledSegments();
    return enabled.find((s) => s.hasAttribute('selected')) ?? enabled[0] ?? null;
  }

  // ---- User interaction -----------------------------------------------------

  /** Selects a segment on behalf of the user and fires input / change. */
  #userSelect(segment) {
    if (segment.hasAttribute('selected')) return;
    this.#value = segment.value;
    this.#update(true);
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  #segmentFromEvent(event) {
    for (const el of event.composedPath()) {
      if (el === this) return null;
      if (el instanceof Segment && el.parentElement === this) return el;
    }
    return null;
  }

  #onClick = (event) => {
    const segment = this.#segmentFromEvent(event);
    if (!segment) {
      // A click on an associated <label>: move focus into the group.
      if (event.target === this) this.focus();
      return;
    }
    if (this[isDisabled]() || segment.hasAttribute('disabled')) return;
    segment.focus({ preventScroll: true });
    this.#userSelect(segment);
  };

  #onKeyDown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const current = this.#segmentFromEvent(event);
    if (!current) return;
    const enabled = this.#enabledSegments();
    if (!enabled.length) return;

    let target = null;
    const index = enabled.indexOf(current);
    const rtl = getComputedStyle(this).direction === 'rtl';
    const step = (delta) => enabled[(Math.max(index, 0) + delta + enabled.length) % enabled.length];

    switch (event.key) {
      // As with native radio buttons, both arrow pairs work in both orientations.
      case 'ArrowDown': target = step(1); break;
      case 'ArrowUp': target = step(-1); break;
      case 'ArrowRight': target = step(rtl ? -1 : 1); break;
      case 'ArrowLeft': target = step(rtl ? 1 : -1); break;
      case 'Home': target = enabled[0]; break;
      case 'End': target = enabled[enabled.length - 1]; break;
      case ' ':
        event.preventDefault(); // no page scroll
        if (!event.repeat && index !== -1) this.#userSelect(current);
        return;
      default: return;
    }
    event.preventDefault();
    target.focus();
    this.#userSelect(target);
  };

  // ---- Rendering ------------------------------------------------------------

  /** Moves the indicator under the selected segment. */
  #layout(animate) {
    const track = this.#track;
    const selected = this.selectedSegment;
    if (!this.isConnected || !selected || selected.hidden) {
      track.classList.remove('has-selection');
      return;
    }
    const t = track.getBoundingClientRect();
    const s = selected.getBoundingClientRect();
    if (!t.width || !s.width) return; // not rendered (display: none)

    if (!animate) track.classList.remove('animate');
    track.style.setProperty('--_ix', `${s.left - t.left - track.clientLeft}px`);
    track.style.setProperty('--_iy', `${s.top - t.top - track.clientTop}px`);
    track.style.setProperty('--_iw', `${s.width}px`);
    track.style.setProperty('--_ih', `${s.height}px`);
    track.classList.add('has-selection');

    if (!animate) {
      // Re-enable transitions after this frame, so that the first paint and
      // resizes do not animate, but the next selection change does.
      cancelAnimationFrame(this.#layoutFrame);
      this.#layoutFrame = requestAnimationFrame(() => {
        this.#layoutFrame = requestAnimationFrame(() => track.classList.add('animate'));
      });
    }
  }

  [sync]() {
    const i = this[internals];
    const disabled = this[isDisabled]();
    const segments = this.segments;
    const selected = segments.find((s) => s.hasAttribute('selected')) ?? null;

    i.ariaDisabled = disabled ? 'true' : null;
    i.ariaRequired = this.required ? 'true' : null;
    i.ariaOrientation = this.orientation;

    // Roving tabindex: only one segment is in the tab order.
    const focusTarget = this.#focusTarget();
    for (const segment of segments) {
      segment[SET_GROUP_STATE](disabled);
      if (segment === focusTarget) segment.setAttribute('tabindex', '0');
      else if (disabled || segment.hasAttribute('disabled')) segment.removeAttribute('tabindex');
      else segment.setAttribute('tabindex', '-1');
    }

    const value = selected ? selected.value : null;
    i.setFormValue(value, value ?? '');

    this[applyValidity](this.required && !selected, messages.get(this, 'valueMissing'), focusTarget ?? undefined);
  }
}

if (!customElements.get('gc-segment')) {
  customElements.define('gc-segment', Segment);
}
if (!customElements.get('gc-segmented-control')) {
  customElements.define('gc-segmented-control', SegmentedControl);
}
