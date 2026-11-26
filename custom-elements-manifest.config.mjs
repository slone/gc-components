// Configuration of @custom-elements-manifest/analyzer, run from a package folder:
//   cd packages/gc-toggle-switch && npx cem analyze --config ../../custom-elements-manifest.config.mjs
// (or `npm run analyze` at the root for every package).
//
// It writes custom-elements.json and vscode.html-custom-data.json from the
// JSDoc of the component. gc-base is analysed too, so that members inherited
// from FormControlMixin are listed, then removed from the output: it is
// inlined into the published file and is not part of the package API.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.cwd();
const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
const BASE = '../gc-base/';
const isBase = (path) => /(^|\/)gc-base\//.test(path ?? '');

/** Members that belong to the API: no private (#) or symbol-keyed ([sync]) member,
 *  no lifecycle callback, and no property of the shadow root or ElementInternals
 *  that the analyzer mistakes for one of the element. */
const NOT_API = new Set(['role', 'innerHTML', 'adoptedStyleSheets']);
function isPublicMember(m) {
  return m.name && !/^[#[]/.test(m.name) && m.privacy !== 'private'
    && !/Callback$/.test(m.name) && !NOT_API.has(m.name);
}

/** Links each attribute to the field of the same (camelCase) name. */
function linkAttributes(decl) {
  const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  for (const attr of decl.attributes ?? []) {
    const field = decl.members?.find((m) => m.kind === 'field' && !m.static && m.name === camel(attr.name));
    if (!field) continue;
    attr.fieldName = field.name;
    field.attribute = attr.name;
    if (attr.default === undefined && field.default !== undefined) attr.default = field.default;
  }
}

/** Hides gc-base: its modules, and the mixin / inheritedFrom links to it. */
function hideGcBase() {
  return {
    name: 'gc-hide-gc-base',
    packageLinkPhase({ customElementsManifest: cem }) {
      cem.modules = cem.modules.filter((m) => !isBase(m.path));
      for (const mod of cem.modules) {
        for (const decl of mod.declarations ?? []) {
          if (decl.mixins) {
            decl.mixins = decl.mixins.filter((m) => !isBase(m.module));
            if (!decl.mixins.length) delete decl.mixins;
          }
          // Our components extend FormControlMixin(HTMLElement): HTMLElement in the end.
          if (decl.customElement) decl.superclass = { name: 'HTMLElement', package: 'global:' };
          for (const list of [decl.members, decl.attributes, decl.events]) {
            for (const item of list ?? []) {
              if (isBase(item.inheritedFrom?.module)) delete item.inheritedFrom;
            }
          }
          if (decl.members) decl.members = decl.members.filter(isPublicMember);
          linkAttributes(decl);
        }
      }
    },
  };
}

/** Writes vscode.html-custom-data.json (VS Code HTML completion) from the manifest. */
function vsCodeData() {
  return {
    name: 'gc-vscode-data',
    packageLinkPhase({ customElementsManifest: cem }) {
      const tags = [];
      for (const mod of cem.modules) {
        for (const decl of mod.declarations ?? []) {
          if (!decl.customElement || !decl.tagName) continue;
          tags.push({
            name: decl.tagName,
            description: decl.description || decl.summary || '',
            attributes: (decl.attributes ?? []).map((attr) => {
              const out = { name: attr.name, description: attr.description ?? '' };
              const type = attr.type?.text ?? '';
              if (type === 'boolean') out.valueSet = 'v';
              const values = [...type.matchAll(/'([^']+)'/g)].map((m) => ({ name: m[1] }));
              if (values.length) out.values = values;
              return out;
            }),
            references: [{ name: 'Documentation', url: pkg.homepage }],
          });
        }
      }
      writeFileSync(join(dir, 'vscode.html-custom-data.json'), `${JSON.stringify({ version: 1.1, tags }, null, 2)}\n`);
    },
  };
}

export default {
  globs: [pkg.main, `${BASE}*.js`],
  exclude: ['**/test/**', '**/*.d.ts'],
  outdir: '.',
  plugins: [
    hideGcBase(),
    vsCodeData(),
  ],
};
