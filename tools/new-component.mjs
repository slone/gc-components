#!/usr/bin/env node
// Creates packages/gc-<name>/ with the usual files of a gc-* component.
//   npm run new -- gc-rating "Accessible star rating"
import { mkdir, writeFile, access, copyFile } from 'node:fs/promises';

const [name, description = 'TODO: one-line description.'] = process.argv.slice(2);
if (!/^gc-[a-z][a-z0-9-]*$/.test(name ?? '')) {
  console.error('Usage: npm run new -- gc-<name> "Description"');
  process.exit(1);
}
const root = new URL('../', import.meta.url);
const dir = new URL(`packages/${name}/`, root);
if (await access(dir).then(() => true, () => false)) {
  console.error(`packages/${name} already exists`);
  process.exit(1);
}
const className = name.slice(3).replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
const year = new Date().getFullYear();

const files = {
  'package.json': `${JSON.stringify({
    name,
    version: '0.1.0',
    description,
    type: 'module',
    main: `${name}.js`,
    module: `${name}.js`,
    types: `${name}.d.ts`,
    customElements: 'custom-elements.json',
    exports: {
      '.': { types: `./${name}.d.ts`, default: `./${name}.js` },
      './custom-elements.json': './custom-elements.json',
      './vscode.html-custom-data.json': './vscode.html-custom-data.json',
    },
    files: [`${name}.js`, `${name}.d.ts`, 'custom-elements.json', 'vscode.html-custom-data.json', 'README.fr.md'],
    scripts: {
      analyze: 'cem analyze --config ../../custom-elements-manifest.config.mjs',
      prepack: 'npm run analyze && node ../../tools/pack.mjs prepack',
      postpack: 'node ../../tools/pack.mjs postpack',
    },
    keywords: ['web-component', 'custom-element', name, 'accessibility', 'a11y'],
    author: 'Chantraine.net',
    license: 'MIT',
    homepage: `https://github.com/slone/gc-components/tree/main/packages/${name}#readme`,
    repository: { type: 'git', url: 'git+https://github.com/slone/gc-components.git', directory: `packages/${name}` },
    bugs: { url: 'https://github.com/slone/gc-components/issues' },
  }, null, 2)}\n`,

  [`${name}.js`]: `/**
 * <${name}> — ${description}
 *
 * Usage:
 *   <script type="module" src="./${name}.js"></script>
 *   <${name}></${name}>
 *
 * See README.md for the full documentation.
 */

import { upgradeProperties } from '../gc-base/attributes.js';

/**
 * ${description}
 *
 * @tag ${name}
 * @summary ${description}
 */
export class ${className} extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = '<slot></slot>';
  }

  connectedCallback() {
    upgradeProperties(this, []);
  }
}

if (!customElements.get('${name}')) {
  customElements.define('${name}', ${className});
}
`,

  [`${name}.d.ts`]: `export declare class ${className} extends HTMLElement {}

declare global {
  interface HTMLElementTagNameMap {
    '${name}': ${className};
  }
}
`,

  'README.md': `# \`<${name}>\`\n\n**English** · [Français](README.fr.md)\n\n${description}\n\n## Installation\n\n\`\`\`sh\nnpm install ${name}\n\`\`\`\n\n## License\n\n[MIT](LICENSE) © ${year} Chantraine.net\n`,
  'README.fr.md': `# \`<${name}>\`\n\n[English](README.md) · **Français**\n\nTODO : description.\n\n## Installation\n\n\`\`\`sh\nnpm install ${name}\n\`\`\`\n\n## Licence\n\n[MIT](LICENSE) © ${year} Chantraine.net\n`,
  'CHANGELOG.md': `# Changelog\n\nThe format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).\n\n## [Unreleased]\n\n### Added\n\n- \`<${name}>\`.\n`,
  'demo.html': `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>&lt;${name}&gt; demo</title>\n  <script type="module" src="./${name}.js"></script>\n</head>\n<body>\n  <main>\n    <h1>&lt;${name}&gt;</h1>\n    <${name}></${name}>\n  </main>\n</body>\n</html>\n`,
  'index.html': `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta http-equiv="refresh" content="0; url=./demo.html">\n  <title>&lt;${name}&gt;</title>\n</head>\n<body>\n  <p><a href="./demo.html">See the demo of &lt;${name}&gt;</a></p>\n</body>\n</html>\n`,
  [`test/${name}.spec.js`]: `import { createTest, expect } from '../../gc-base/test/fixtures.js';

const test = createTest({ pkg: '${name}' });

test('is defined', async ({ page, mount }) => {
  await mount('<${name}></${name}>');
  expect(await page.evaluate(() => customElements.get('${name}')?.name)).toBe('${className}');
});
`,
};

await mkdir(new URL('test/', dir), { recursive: true });
for (const [file, content] of Object.entries(files)) await writeFile(new URL(file, dir), content);
await copyFile(new URL('LICENSE', root), new URL('LICENSE', dir));
console.log(`Created packages/${name}. Next: npm install, then npm run analyze -w packages/${name}.`);
