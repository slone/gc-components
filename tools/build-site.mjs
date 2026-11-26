#!/usr/bin/env node
// Builds the GitHub Pages site into _site/:
//   _site/index.html          catalogue of the components, generated from their package.json
//   _site/<package>/…         each package folder (demo.html, sources…), without its tests
// The folders sit side by side, so a demo loads its component as in the
// repository, with gc-base imported from ../gc-base/.
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const out = new URL('_site/', root);
await rm(out, { recursive: true, force: true });
await mkdir(out);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const items = [];
for (const name of (await readdir(new URL('packages/', root))).sort()) {
  const dir = new URL(`packages/${name}/`, root);
  await cp(dir, new URL(`${name}/`, out), {
    recursive: true,
    filter: (src) => !/\/(test|node_modules)(\/|$)/.test(src),
  });
  const pkg = JSON.parse(await readFile(new URL('package.json', dir), 'utf8'));
  if (pkg.private) continue;
  items.push(`    <li><a href="./${esc(name)}/"><code>&lt;${esc(name)}&gt;</code></a> <span>${esc(pkg.version)}</span>
      <p>${esc(pkg.description ?? '')}</p></li>`);
}

await writeFile(new URL('index.html', out), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>gc-components</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; line-height: 1.5; }
    body { max-width: 44rem; margin: 2rem auto; padding: 0 1rem; }
    ul { list-style: none; padding: 0; }
    li { margin-block: 1.25rem; }
    li span { opacity: 0.7; font-size: 0.9em; }
    li p { margin: 0.25rem 0 0; }
  </style>
</head>
<body>
  <h1>gc-components</h1>
  <p>Accessible, dependency-free, form-associated web components. Each demo is in English and French.</p>
  <ul>
${items.join('\n')}
  </ul>
  <p><a href="https://github.com/slone/gc-components">Source on GitHub</a></p>
</body>
</html>
`);
console.log(`_site/: ${items.length} component(s)`);
