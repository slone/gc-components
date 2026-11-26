# gc-components

[English](README.md) · **Français**

Composants web accessibles, sans framework ni dépendance à l'exécution : des Custom Elements natifs associés aux formulaires. Chaque composant est un paquet npm et un module ES unique et autonome.

| Composant | npm | Démo |
|---|---|---|
| [`<gc-toggle-switch>`](packages/gc-toggle-switch/README.fr.md) | [`gc-toggle-switch`](https://www.npmjs.com/package/gc-toggle-switch) | [démo](https://slone.github.io/gc-components/gc-toggle-switch/?lang=fr) |

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/gc-toggle-switch@1/gc-toggle-switch.js"></script>
```

## Organisation du dépôt

```
packages/
  gc-base/            utilitaires partagés (non publié : intégré à chaque composant)
    messages.js         messages traduits (lang le plus proche, puis navigateur ; registerMessages)
    attributes.js       upgradeProperties(), setState()
    form-control.js     FormControlMixin : form, validité, setCustomValidity, fieldset disabled…
    test/fixtures.js    fixtures Playwright communes
  gc-toggle-switch/   un dossier par paquet publié
custom-elements-manifest.config.mjs
playwright.config.js
tools/                pack (intégration de gc-base), publication, site, nouveau composant
.github/workflows/    ci.yml, release.yml, pages.yml
```

Les sources tournent telles quelles dans le navigateur : aucun build en développement. Un composant importe gc-base par un chemin relatif (`../gc-base/form-control.js`) ; à la création du paquet, `tools/pack.mjs` intègre gc-base au fichier publié avec Rollup (sans minification, commentaires conservés), puis remet la source en place. Utilisez les URLs jsDelivr `npm/`, pas des URLs `gh/` vers ce dépôt.

## Développement

Node.js 22 ou plus.

```sh
npm install
npx playwright install        # navigateurs, une seule fois
npm test                      # tous les paquets, Chromium, Firefox et WebKit
npm run test:chromium
npx playwright test packages/gc-toggle-switch
npm run analyze               # regénère custom-elements.json et vscode.html-custom-data.json
```

Pour voir une démo, servez la racine du dépôt en HTTP (`python -m http.server 8000`) et ouvrez <http://localhost:8000/packages/gc-toggle-switch/demo.html>.

Les tests chargent chaque composant comme module ES natif depuis une origine fictive (sans serveur) et couvrent les formulaires, le clavier, le pointeur, les événements, l'état ARIA exposé via `ElementInternals` et des audits WCAG axe.

`custom-elements.json` et `vscode.html-custom-data.json` sont générés depuis la JSDoc du composant (`@attr`, `@fires`, `@slot`, `@csspart`, `@cssprop`, `@cssstate`) et commités ; la CI échoue s'ils ne sont pas à jour. Les fichiers `.d.ts` restent écrits à la main.

## Ajouter un composant

```sh
npm run new -- gc-rating "Accessible star rating"
npm install
```

Cela crée `packages/gc-rating` avec package.json, composant, types, README bilingues, changelog, démo et un test. Vérifiez d'abord que le nom npm est libre (`npm view gc-rating`).

## Publier une version

Les versions sont indépendantes ; un tag `<paquet>@<version>` publie ce paquet.

1. Mettre à jour le `CHANGELOG.md` du paquet, puis `npm version 1.5.0 -w packages/gc-toggle-switch --no-git-tag-version`.
2. Commit, puis `git tag gc-toggle-switch@1.5.0 && git push origin main gc-toggle-switch@1.5.0`.
3. `release.yml` vérifie que le tag correspond au `package.json`, rejoue la CI, publie sur npm avec provenance (une version avec un tiret part sous le dist-tag `next`) et crée une GitHub Release depuis le changelog. Un tag dont la version est déjà sur npm (les tags importés `gc-toggle-switch@1.x`) ne publie rien.

Réglages à faire une fois :

- **Publication de confiance npm**, par paquet : sur npmjs.com, réglages du paquet → *Trusted publisher* → GitHub Actions, dépôt `slone/gc-components`, workflow `release.yml`. Aucun jeton npm n'est stocké dans GitHub.
- **GitHub Pages** : Settings → Pages → Source : *GitHub Actions*. `pages.yml` publie un catalogue sur <https://slone.github.io/gc-components/> et chaque démo sous `/<paquet>/`.

## Historique

`gc-toggle-switch` a été développé dans [slone/gc-toggle-switch](https://github.com/slone/gc-toggle-switch) jusqu'à la 1.4.1. Son historique a été importé ici sous `packages/gc-toggle-switch`, avec les tags renommés de `v1.x.y` en `gc-toggle-switch@1.x.y`. L'ancien dépôt reste en lecture seule : ses tags, ses URLs jsDelivr `gh/` et sa démo continuent de marcher.

## Licence

[MIT](LICENSE) © 2026 Chantraine.net
