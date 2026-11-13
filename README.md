# ODS Docs

A readable, searchable home for the [ODS](https://github.com/Osmantic/ODS) documentation.

ODS ships more than 150 guides, but they only live as Markdown files in the repo, and installer messages point at paths like `docs/INSTALL-TROUBLESHOOTING.md` that most people never find. This site turns them into a manual: one page per guide, a sidebar of sections, and a search that also understands ODS errors.

**Use it:** https://ironicrayquaza.github.io/ods-docs/

## What it does

- **Will ODS run on my machine?** ([check.html](https://ironicrayquaza.github.io/ods-docs/check.html)): pick your system, graphics and memory, and see the model ODS would install, the disk it needs, and anything that would stop it. The answers aren't written by hand: the build runs ODS's own `classify-hardware.sh`, `select-model.py` and `preflight-engine.sh` (and the macOS installer's tier and chip checks) for every machine on the page, and quotes the support matrix.
- **Read:** every ODS guide as a page, grouped into sections (Getting Started, Platform & Hardware, Operations & Runbooks, …), with an "On this page" list and previous/next links. Links between guides stay on the site.
- **Search:** plain questions ("switch model", "where are the logs") open the matching section of the right page.
- **Paste an error or a whole log:** the answer names the part of ODS that printed it (with the script and line), then cites the sections of the manual that cover that message: the doc the message itself points to ("See docs/INSTALL-TROUBLESHOOTING.md#container-build-dns"), or a guide that quotes it word for word. When no guide covers it, the page says so and lists the closest sections.
- **Platform filter:** Windows, macOS or Linux, to hide steps for other systems.
- **Pinned to a commit:** every page and every GitHub link names the exact Osmantic/ODS commit the site was built from, so line numbers never drift.
- **Deep links:** `https://ironicrayquaza.github.io/ods-docs/?q=<text>` opens a search, so a dashboard error or an installer message can link straight to the answer.
- **Report a problem with this page:** opens an ODS issue with the page already named.

Nothing on the site is generated or rewritten. The pages are the ODS docs as written, and search results quote them word for word.

## How it stays up to date

[`.github/workflows/pages.yml`](.github/workflows/pages.yml) runs every night, on every push to `main`, and on demand. It runs the tests, clones the latest `Osmantic/ODS`, builds the site with `build.js`, and publishes it to GitHub Pages. If anything fails, nothing is published and the live site keeps its last good version.

## Run it locally

Node 18 or newer and Python 3 (for the ODS scripts the checker runs), no dependencies. `ODS_SOURCE=ods-source npm test` also runs the checker against the real ODS code.

```
npm test
git clone --depth 1 https://github.com/Osmantic/ODS ods-source
npm run build
npx serve _site
```

## The catalog, for the ODS dashboard

The build also writes `catalog.json`: every guide's page name, repo path, title, one-line description and section, plus the ODS commit it came from. The ODS dashboard's offline docs page can read the same file, so the in-product reader and this site always list the same guides.

## Files

| File | What it does |
|---|---|
| `build.js` | Reads an ODS checkout and writes the whole site into `_site/` |
| `catalog.js`, `categories.js` | Which guides get a page, their section, title and description |
| `markdown.js`, `slug.js` | Turns ODS Markdown into HTML, with GitHub-compatible heading anchors; raw HTML is never passed through |
| `pages.js`, `style.css` | Page layout: top bar, sidebar, page, "On this page", footer |
| `chunk.js`, `include.js`, `errors.js` | Split guides into search sections, choose files, find error messages in scripts |
| `cite.js` | Link each error message to the sections of the manual that name or quote it |
| `search.js`, `logsplit.js`, `platform.js` | Ranking, exact error matching, picking error lines from pasted logs, platform tags |
| `app.js`, `render.js`, `snippet.js`, `recipes.js` | The search page in the browser |
| `checker.js`, `oracle.js`, `select_batch.py`, `check.js` | "Will ODS run on my machine?": the machines on the page, running ODS's scripts for them at build time, and the page in the browser |
| `*.test.js` | Tests (`npm test`) |

## Credits and license

- Started from [How to ODS](https://github.com/IronicRayquaza/how-to-ods), the ODS Weekly Dev Jam entry.
- Sections and short titles come from Pratham's ODS dashboard docs page ([PrathamS1/ODS-Pratham](https://github.com/PrathamS1/ODS-Pratham/tree/feat/docs-webpage)).
- Code: [Apache License 2.0](LICENSE). See [NOTICE](NOTICE).
- Content: the [Osmantic/ODS](https://github.com/Osmantic/ODS) docs and scripts (Apache-2.0).
- Fonts: Inter, JetBrains Mono and Sora under the SIL Open Font License 1.1 (see `fonts/`).
- The ODS logo belongs to the ODS project and is not covered by this repo's license.
- A community project, not an official Osmantic site.
