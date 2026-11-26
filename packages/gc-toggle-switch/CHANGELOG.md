# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Static `ToggleSwitch.registerMessages(lang, { valueMissing })` to add or override the built-in validation message for a language.
- Automated tests with Playwright in Chromium, Firefox and WebKit: form association, keyboard, pointer, events, ARIA through `ElementInternals`, and axe WCAG audits.

### Changed

- The component moved to the [gc-components](https://github.com/slone/gc-components) monorepo. The published files, their paths and the `exports` are unchanged; the recommended CDN URL is now `cdn.jsdelivr.net/npm/gc-toggle-switch@<version>/gc-toggle-switch.js`.
- The form-associated code, the upgrade of early properties and the localised messages now come from the shared `gc-base` helpers, inlined into the published file.
- `custom-elements.json` and `vscode.html-custom-data.json` are generated from the JSDoc.

## [1.4.1] — 2026-11-24

### Changed

- The package can be published to npm: `private` removed, repository links added, npm installation documented. No change to the component.

## [1.4.0] — 2026-11-24

### Added

- `toggle` event (`CustomEvent`), fired after `change` with `detail.oldChecked` and `detail.newChecked`. It does not bubble.

### Fixed

- A cancelled `click` now restores the state from before the click, even if a listener changed `checked` in the meantime.

## [1.3.0] — 2026-11-24

### Added

- TypeScript definitions (`gc-toggle-switch.d.ts`).
- Custom Elements Manifest (`custom-elements.json`).
- VS Code HTML completion data (`vscode.html-custom-data.json`).

## [1.2.0] — 2026-11-24

### Added

- Drag the thumb with the mouse or a finger, as on iOS: released past half of its travel, the switch toggles; otherwise it snaps back. Works vertically and right-to-left.
- Hover and press feedback: a halo around the thumb (`--switch-halo-color`), also shown while Space is held.
- `busy` attribute and property: a spinner in the thumb, `aria-busy`, user actions ignored while an async action is in progress.
- Hit area of at least 24 × 24 CSS px (WCAG 2.5.8), even for small switches.
- English README (`README.md`) and French README (`README.fr.md`).
- Bilingual demo page (English / French), with a busy example.

### Changed

- The built-in `required` validation message now follows language changes made after the element was created.
- Code comments and the changelog are now in English.
- The README screenshot is now `docs/preview.jpg`.

## [1.1.0] — 2026-11-24

### Added

- State indicators that do not rely on colour: `state-labels` attribute (I / O), `on` and `off` slots for custom content, `on-label` and `off-label` parts, `--switch-label-color` property.
- Right-to-left support (`dir="rtl"`): "on" puts the thumb at the line end.
- Documented CSS rule to reserve the element's space before the module loads.

### Changed

- `event.preventDefault()` on `click` now cancels the toggle, as with `<input type="checkbox">`. `input` and `change` are fired after the `click` has fully propagated.

## [1.0.0] — 2026-11-24

### Added

- `<gc-toggle-switch>` element: a native Custom Element, dependency-free ES module.
- On/off states, reflected `checked` attribute, `input` and `change` events.
- Form association: `name`, `value`, `disabled`, `required`, `form.reset()`, `<fieldset disabled>`.
- Horizontal or vertical orientation, through the `orientation` attribute or the `--switch-vertical` CSS property.
- Colours through attributes (`off-color`, `on-color`) or CSS properties, `em`-based sizes, `track` and `thumb` parts.
- Accessibility: `role="switch"`, keyboard (Space, Enter), visible focus, reduced motion, light and dark themes, high contrast.
- Demo page and documentation.
