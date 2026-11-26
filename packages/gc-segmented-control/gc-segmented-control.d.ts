/**
 * Type definitions for <gc-segmented-control> and <gc-segment>.
 * Importing "./gc-segmented-control.js" also registers both elements, so that
 * `document.querySelector('gc-segmented-control')` and
 * `document.createElement('gc-segment')` are typed.
 */

export type SegmentedControlOrientation = 'horizontal' | 'vertical';

export declare class Segment extends HTMLElement {
  static readonly observedAttributes: string[];

  /** The `value` attribute, or else the text content. */
  get value(): string;
  set value(value: string);

  /** Reflects the `selected` attribute. Selecting a segment deselects the others. Fires no event. */
  get selected(): boolean;
  set selected(value: boolean);

  /** Reflects the `disabled` attribute. */
  get disabled(): boolean;
  set disabled(value: boolean);

  /** The parent <gc-segmented-control>, or null. */
  get control(): SegmentedControl | null;
}

export declare class SegmentedControl extends HTMLElement {
  static readonly formAssociated: true;
  static readonly observedAttributes: string[];

  /** Adds or overrides the built-in messages for a language (closest `lang` attribute, else the browser). */
  static registerMessages(lang: string, entries: { valueMissing?: string }): void;

  /** Value of the selected segment, or "" when none is selected. Setting it fires no event. */
  get value(): string;
  set value(value: string | null);

  /** Value restored by `form.reset()`. Initialised from the `value` attribute or the segment marked `selected`. */
  get defaultValue(): string;
  set defaultValue(value: string | null);

  /** Index of the selected segment, or -1. Setting it fires no event. */
  get selectedIndex(): number;
  set selectedIndex(value: number);

  /** The <gc-segment> children, in order. */
  get segments(): Segment[];

  /** The selected <gc-segment>, or null. */
  get selectedSegment(): Segment | null;

  /** Reflects the `disabled` attribute (not a parent `<fieldset disabled>`). */
  get disabled(): boolean;
  set disabled(value: boolean);

  /** Reflects the `required` attribute: the form is invalid while no segment is selected. */
  get required(): boolean;
  set required(value: boolean);

  /** Reflects the `name` attribute. */
  get name(): string;
  set name(value: string);

  get orientation(): SegmentedControlOrientation;
  set orientation(value: SegmentedControlOrientation | null);

  /** Always "gc-segmented-control". */
  readonly type: 'gc-segmented-control';
  readonly form: HTMLFormElement | null;
  readonly labels: NodeList;
  readonly validity: ValidityState;
  readonly validationMessage: string;
  readonly willValidate: boolean;

  checkValidity(): boolean;
  reportValidity(): boolean;
  setCustomValidity(message: string): void;

  /** Focuses the selected segment, or the first enabled one. */
  focus(options?: FocusOptions): void;

  formDisabledCallback(disabled: boolean): void;
  formResetCallback(): void;
  formStateRestoreCallback(state: unknown): void;
}

declare global {
  interface HTMLElementTagNameMap {
    'gc-segmented-control': SegmentedControl;
    'gc-segment': Segment;
  }
}
