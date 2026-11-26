# gc-components

**English** · [Français](README.fr.md)

Accessible web components with no framework or runtime dependency: native, form-associated Custom Elements. Each component is its own npm package and a single self-contained ES module.

| Component | npm | Demo |
|---|---|---|
| [`<gc-toggle-switch>`](packages/gc-toggle-switch#readme) | [`gc-toggle-switch`](https://www.npmjs.com/package/gc-toggle-switch) | [demo](https://slone.github.io/gc-components/gc-toggle-switch/) |

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/gc-toggle-switch@1/gc-toggle-switch.js"></script>
```

## Repository layout

```
packages/
  gc-base/            shared helpers (not published: inlined into each component)
    messages.js         localised messages (closest lang, then browser; registerMessages)
    attributes.js       upgradeProperties(), setState()
    form-control.js     FormControlMixin: form, validity, setCustomValidity, fieldset disabled…
    test/fixtures.js    shared Playwright fixtures
  gc-toggle-switch/   one folder per published package
custom-elements-manifest.config.mjs
playwright.config.js
tools/                pack (inline gc-base), release, site, new component
.github/workflows/    ci.yml, release.yml, pages.yml
```

Sources run as they are in the browser: no build in development. A component imports gc-base with a relative path (`../gc-base/form-control.js`); when the package is packed, `tools/pack.mjs` inlines gc-base into the published file with Rollup (no minification, comments kept), then puts the source back. Use `npm/` jsDelivr URLs, not `gh/` URLs to this repository.

## Development

Node.js 22 or later.

```sh
npm install
npx playwright install        # browsers, once
npm test                      # every package, Chromium, Firefox and WebKit
npm run test:chromium
npx playwright test packages/gc-toggle-switch
npm run analyze               # regenerate custom-elements.json and vscode.html-custom-data.json
```

To view a demo, serve the repository root over HTTP (`python -m http.server 8000`) and open <http://localhost:8000/packages/gc-toggle-switch/demo.html>.

The tests load each component as a native ES module from a fake origin (no server) and cover forms, keyboard, pointer, events, the ARIA state exposed through `ElementInternals`, and axe WCAG audits.

`custom-elements.json` and `vscode.html-custom-data.json` are generated from the component's JSDoc (`@attr`, `@fires`, `@slot`, `@csspart`, `@cssprop`, `@cssstate`) and committed; CI fails when they are out of date. The `.d.ts` files are still written by hand.

## Adding a component

```sh
npm run new -- gc-rating "Accessible star rating"
npm install
```

This creates `packages/gc-rating` with package.json, component, types, bilingual READMEs, changelog, demo and a test. Check that the npm name is free first (`npm view gc-rating`).

## Releasing

Versions are independent; a tag `<package>@<version>` publishes that package.

1. Update the package's `CHANGELOG.md`, then `npm version 1.5.0 -w packages/gc-toggle-switch --no-git-tag-version`.
2. Commit, then `git tag gc-toggle-switch@1.5.0 && git push origin main gc-toggle-switch@1.5.0`.
3. `release.yml` checks that the tag matches `package.json`, runs CI, publishes to npm with provenance (a version with a hyphen goes to the `next` dist-tag) and creates a GitHub Release from the changelog. A tag whose version is already on npm (the imported `gc-toggle-switch@1.x` tags) publishes nothing.

One-time setup:

- **npm trusted publishing**, per package: on npmjs.com, package settings → *Trusted publisher* → GitHub Actions, repository `slone/gc-components`, workflow `release.yml`. No npm token is stored in GitHub.
- **GitHub Pages**: Settings → Pages → Source: *GitHub Actions*. `pages.yml` publishes a catalogue at <https://slone.github.io/gc-components/> and each demo at `/<package>/`.

## History

`gc-toggle-switch` was developed in [slone/gc-toggle-switch](https://github.com/slone/gc-toggle-switch) up to 1.4.1. Its history was imported here under `packages/gc-toggle-switch`, with tags renamed from `v1.x.y` to `gc-toggle-switch@1.x.y`. The old repository stays read-only, so its tags, its jsDelivr `gh/` URLs and its demo keep working.

## License

[MIT](LICENSE) © 2026 Chantraine.net
