// A minimal form control built on gc-base, used by the gc-base tests.
import { FormControlMixin, internals, sync, isDisabled, applyValidity } from '../form-control.js';
import { upgradeProperties } from '../attributes.js';

class DemoControl extends FormControlMixin(HTMLElement) {
  static observedAttributes = ['disabled', 'required'];
  #value = '';

  connectedCallback() {
    upgradeProperties(this, ['required', 'name', 'value']);
    this[sync]();
  }

  attributeChangedCallback() { this[sync](); }

  get value() { return this.#value; }
  set value(v) { this.#value = String(v); this[sync](); }

  [sync]() {
    const i = this[internals];
    i.ariaDisabled = this[isDisabled]() ? 'true' : null;
    i.setFormValue(this.#value || null);
    this[applyValidity](this.required && !this.#value, 'Required');
  }
}

customElements.define('demo-control', DemoControl);
