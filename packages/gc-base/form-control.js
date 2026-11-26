/**
 * The form-associated part shared by the gc-* form controls.
 *
 * A component extends `FormControlMixin(HTMLElement)` and implements
 * `[sync]()`, where it refreshes its ARIA state, its form value and its
 * validity (through `[applyValidity]()`). The mixin provides the standard
 * form control API: `form`, `labels`, `validity`, `validationMessage`,
 * `willValidate`, `checkValidity()`, `reportValidity()`,
 * `setCustomValidity()`, the reflected `disabled`, `required` and `name`
 * properties, and tracks `<fieldset disabled>`.
 */

/** The element's ElementInternals. */
export const internals = Symbol('internals');
/** Method the component implements: refresh ARIA, form value and validity. */
export const sync = Symbol('sync');
/** Method: true when disabled by the attribute or by a disabled ancestor fieldset. */
export const isDisabled = Symbol('isDisabled');
/** Method: sets the validity from the custom error, else from `valueMissing`. */
export const applyValidity = Symbol('applyValidity');

/**
 * @template {new (...args: any[]) => HTMLElement} T
 * @param {T} Base
 */
export function FormControlMixin(Base) {
  return class FormControl extends Base {
    static formAssociated = true;

    #formDisabled = false;
    #customValidity = '';

    /** @param {...any} args */
    constructor(...args) {
      super(...args);
      /** @type {ElementInternals} */
      this[internals] = this.attachInternals();
      // Form submission validates without calling our methods: refresh the
      // message when the browser reports this element as invalid.
      this.addEventListener('invalid', () => this[sync]());
    }

    /** Refreshes ARIA, form value and validity. Implemented by the component. */
    [sync]() {}

    [isDisabled]() {
      return this.hasAttribute('disabled') || this.#formDisabled;
    }

    /**
     * @param {boolean} valueMissing
     * @param {string} message Message of the valueMissing error.
     * @param {HTMLElement} [anchor] Element the browser points to when reporting.
     */
    [applyValidity](valueMissing, message, anchor) {
      const i = this[internals];
      if (this.#customValidity) i.setValidity({ customError: true }, this.#customValidity, anchor);
      else if (valueMissing) i.setValidity({ valueMissing: true }, message, anchor);
      else i.setValidity({});
    }

    /** @param {boolean} disabled */
    formDisabledCallback(disabled) {
      this.#formDisabled = disabled;
      this[sync]();
    }

    /** @type {boolean}
     * @default false
     * @reflect */
    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { this.toggleAttribute('disabled', Boolean(v)); }

    /** @type {boolean}
     * @default false
     * @reflect */
    get required() { return this.hasAttribute('required'); }
    set required(v) { this.toggleAttribute('required', Boolean(v)); }

    /** @type {string}
     * @default ""
     * @reflect */
    get name() { return this.getAttribute('name') ?? ''; }
    set name(v) { this.setAttribute('name', v); }

    /** @type {HTMLFormElement | null} */
    get form() { return this[internals].form; }
    /** @type {NodeList} */
    get labels() { return this[internals].labels; }
    /** @type {ValidityState} */
    get validity() { return this[internals].validity; }
    /** @type {string} */
    get validationMessage() { this[sync](); return this[internals].validationMessage; }
    /** @type {boolean} */
    get willValidate() { return this[internals].willValidate; }

    // The built-in message follows the current page language: refresh it before validating.
    /** @returns {boolean} */
    checkValidity() { this[sync](); return this[internals].checkValidity(); }
    /** @returns {boolean} */
    reportValidity() { this[sync](); return this[internals].reportValidity(); }
    /**
     * @param {string} message An empty string clears the custom error.
     * @returns {void}
     */
    setCustomValidity(message) {
      this.#customValidity = String(message ?? '');
      this[sync]();
    }
  };
}
