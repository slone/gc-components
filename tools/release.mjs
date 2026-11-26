#!/usr/bin/env node
// Helpers of .github/workflows/release.yml.
//
//   node tools/release.mjs info  gc-toggle-switch@1.5.0
//     Prints package=, version=, dist-tag= and published= lines (GITHUB_OUTPUT
//     format). Fails when packages/<package>/package.json has another version.
//     published=true when npm already has this version (e.g. a 1.x tag imported
//     from the old repository): the workflow then publishes nothing.
//
//   node tools/release.mjs notes gc-toggle-switch@1.5.0
//     Prints the CHANGELOG.md section of that version.
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const [command, tag] = process.argv.slice(2);
const match = /^(gc-[a-z0-9-]+)@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(tag ?? '');
if (!match) fail(`Tag "${tag}" is not <package>@<version>, e.g. gc-toggle-switch@1.5.0`);
const [, name, version] = match;
const dir = new URL(`../packages/${name}/`, import.meta.url);

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

if (command === 'info') {
  let pkg;
  try {
    pkg = JSON.parse(await readFile(new URL('package.json', dir), 'utf8'));
  } catch {
    fail(`No package packages/${name}`);
  }
  if (pkg.name !== name) fail(`packages/${name}/package.json is named "${pkg.name}"`);
  if (pkg.private) fail(`${name} is private`);
  if (pkg.version !== version) fail(`Tag ${tag}, but packages/${name}/package.json says ${pkg.version}`);

  let published = false;
  try {
    published = execFileSync('npm', ['view', `${name}@${version}`, 'version'], { encoding: 'utf8' }).trim() === version;
  } catch { /* not found: not published yet */ }
  if (published) console.error(`::notice::${name}@${version} is already on npm: nothing to publish.`);

  console.log(`package=${name}`);
  console.log(`version=${version}`);
  console.log(`dist-tag=${version.includes('-') ? 'next' : 'latest'}`);
  console.log(`published=${published}`);
} else if (command === 'notes') {
  const changelog = await readFile(new URL('CHANGELOG.md', dir), 'utf8');
  const lines = changelog.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));
  if (start < 0) fail(`No "## [${version}]" section in packages/${name}/CHANGELOG.md`);
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  console.log(lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim());
} else {
  fail('Usage: release.mjs info|notes <package>@<version>');
}
