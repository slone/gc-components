#!/usr/bin/env node
// Fails when the generated files of any package differ from the committed ones,
// or are not committed at all (a new package).
import { execFileSync } from 'node:child_process';

const status = execFileSync('git', ['status', '--porcelain', '--', 'packages/*/custom-elements.json', 'packages/*/vscode.html-custom-data.json'], { encoding: 'utf8' }).trim();
if (status) {
  console.error(`Generated files are out of date or not committed (run npm run analyze, then commit):\n${status}`);
  execFileSync('git', ['diff', '--', 'packages'], { stdio: 'inherit' });
  process.exit(1);
}
