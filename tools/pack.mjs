#!/usr/bin/env node
// Runs as the prepack / postpack script of each published package.
//
//   node ../../tools/pack.mjs prepack    inline gc-base into the package's main file
//   node ../../tools/pack.mjs postpack   restore the source file
//
// In the repository a component imports gc-base with a relative path, which
// works without a build in the demos and the tests. On npm each component must
// stay one self-contained, readable ES module: prepack bundles the main file
// with Rollup (no minification, comments kept), and postpack puts the source back.
import { rollup } from 'rollup';
import { readFile, writeFile, rename, access } from 'node:fs/promises';
import { join } from 'node:path';

const [step] = process.argv.slice(2);
const dir = process.cwd();
const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
const main = join(dir, pkg.main);
const backup = `${main}.source`;

const exists = (file) => access(file).then(() => true, () => false);

if (step === 'prepack') {
  if (await exists(backup)) throw new Error(`${backup} exists: a previous pack did not finish. Restore it first.`);
  const source = await readFile(main, 'utf8');
  // The leading comment of the source (what the component is, how to use it)
  // stays at the top of the published file; Rollup drops comments before imports.
  const header = source.match(/^\/\*\*[\s\S]*?\*\//)?.[0] ?? '';
  const banner = `${header}\n\n// Built from the gc-components repository: the gc-base helpers are inlined below.\n`;
  const bundle = await rollup({ input: main, onwarn: (w) => { throw new Error(w.message); } });
  const { output } = await bundle.generate({ format: 'es', banner });
  await bundle.close();
  if (output.length !== 1) throw new Error(`Expected one chunk, got ${output.length}`);
  // Keep the header once, at the top.
  const code = banner + output[0].code.slice(banner.length).replace(header, '').replace(/\n{3,}/g, '\n\n');
  if (/^\s*import\s/m.test(code) || /\bimport\(/.test(code)) {
    throw new Error(`${pkg.main} still imports a module after inlining`);
  }
  await rename(main, backup);
  await writeFile(main, code);
  console.log(`${pkg.name}: gc-base inlined into ${pkg.main}`);
} else if (step === 'postpack') {
  if (await exists(backup)) await rename(backup, main);
} else {
  throw new Error('Usage: pack.mjs prepack|postpack');
}
