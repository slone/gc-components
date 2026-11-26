// Shared Playwright fixtures for every gc-* package.
//
// Pages are served from a fake origin (http://gc.test) through request
// interception: no web server, and components are loaded exactly as a user
// would load them, as native ES modules, without any build step. The origin
// maps to the repository root, so a package's sources can import gc-base
// with a relative path, as they do in the repository.
import { test as base, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, normalize, sep } from 'node:path';

export const ORIGIN = 'http://gc.test';
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/** Records each element's ElementInternals, so tests can read the ARIA
 *  state a component exposes without adding attributes to the DOM. */
function spyOnInternals() {
  const map = new WeakMap();
  const original = HTMLElement.prototype.attachInternals;
  HTMLElement.prototype.attachInternals = function attachInternals() {
    const internals = original.call(this);
    map.set(this, internals);
    return internals;
  };
  window.__internalsOf = (el) => map.get(el);
}

/**
 * Creates the `test` object of a package.
 *
 * @param {object} options
 * @param {string} options.pkg     Package folder under packages/, e.g. 'gc-toggle-switch'.
 * @param {string} [options.script] Module loaded by fixture pages, relative to the package (default `<pkg>.js`).
 * @param {string[]} [options.tags] Elements to wait for after loading (default `[pkg]`).
 */
export function createTest({ pkg, script = `${pkg}.js`, tags = [pkg] }) {
  /** URL of the package folder: pages and imports resolve against it. */
  const pkgUrl = `${ORIGIN}/packages/${pkg}/`;

  const fixtureHtml = (body, { lang = 'en', dir, script: load = true, head = '' } = {}) => `<!doctype html>
<html lang="${lang}"${dir ? ` dir="${dir}"` : ''}>
<head>
  <meta charset="utf-8">
  <title>${pkg} test</title>
  ${head}
  ${load ? `<script type="module" src="./${script}"></script>` : ''}
</head>
<body>
<main>
${body}
</main>
</body>
</html>`;

  return base.extend({
    pkgUrl,

    page: async ({ page }, use) => {
      await page.addInitScript(spyOnInternals);
      await page.route(`${ORIGIN}/**`, async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith('/__fixture__')) {
          return route.fulfill({ contentType: 'text/html', body: url.searchParams.get('html') ?? '' });
        }
        const file = normalize(ROOT + decodeURIComponent(url.pathname));
        if (!file.startsWith(ROOT) || file.includes(`${sep}node_modules${sep}`)) {
          return route.fulfill({ status: 404 });
        }
        try {
          const body = await readFile(file);
          return route.fulfill({ contentType: TYPES[extname(file)] ?? 'application/octet-stream', body });
        } catch {
          return route.fulfill({ status: 404 });
        }
      });
      await use(page);
    },

    /** Loads a page of the package folder whose <main> holds `body`, and waits
     *  for the element definitions (unless `script: false`, where the component is not loaded). */
    mount: async ({ page }, use) => {
      await use(async (body, options = {}) => {
        const html = fixtureHtml(body, options);
        await page.goto(`${pkgUrl}__fixture__?html=${encodeURIComponent(html)}`);
        if (options.script === false) return;
        await page.evaluate((names) => Promise.all(names.map((n) => customElements.whenDefined(n))), tags);
      });
    },
  });
}

/** The ARIA state held by an element's ElementInternals (null when unset), and
 *  which of the custom states used by gc-* components are set. */
export function internals(locator) {
  return locator.evaluate((el) => {
    const i = window.__internalsOf(el);
    let states = [];
    // has() rather than iteration: WebKit does not reliably iterate CustomStateSet.
    const KNOWN = ['checked', 'selected', 'disabled', 'busy', 'invalid'];
    try { states = KNOWN.filter((s) => i.states.has(s)); } catch { /* CustomStateSet not supported */ }
    return {
      role: i.role,
      ariaChecked: i.ariaChecked,
      ariaSelected: i.ariaSelected,
      ariaDisabled: i.ariaDisabled,
      ariaRequired: i.ariaRequired,
      ariaBusy: i.ariaBusy,
      ariaOrientation: i.ariaOrientation,
      states,
    };
  });
}

export { expect };
