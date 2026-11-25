# crew-pulse

A static page for a small crew. Each person is a folder of Markdown files. This phase is a demo with two of them, Ivo and Johnson, so the layout can be checked before the other four and any live feed are added.

The page is published with GitHub Pages from `.github/workflows/pages.yml`.

Expected site: <https://jonesrbo7-star.github.io/crew-pulse/>

## Soft gate

The password check runs in the browser. It compares SHA-256 of the input with `PASSWORD_HASH` in `config/site.js`. Unlock is remembered in `sessionStorage` for the tab.

This is not access control. The repository is public, and so are the files. Anyone can read them without the password.

Demo password: `crew-demo-2026`

Change it, then commit `config/site.js`:

```bash
node scripts/set-password.mjs 'a-new-password'
```

## Local preview

```bash
node scripts/check-reports.mjs
node scripts/build-index.mjs
python3 -m http.server 4173
```

Open <http://127.0.0.1:4173/>. Fetching the files needs a server; opening the HTML file directly will not.

Sync states, for screenshots and checks:

- `?simulate=warn` — no successful refresh for more than 10 minutes. Dim yellow edge and dot. The summary area says 等待同步.
- `?simulate=down` — more than an hour. The card dims and says 连接中断，最后更新时间是 … 

Normal polling is every 5 minutes. A new file fades in over 300ms. Nothing else animates.

## Data

`config/site.js` holds `DATA_BASE_URL`. Leave it empty to read data next to the page. Set an absolute URL later if reports move to another host. That host must send CORS headers. `config/crew.json` and `reports/` are both fetched from that base. The password hash stays in `site.js`, next to the page.

`config/crew.json` is the registry: `bot_id`, `en_name`, `folder`, `display_order`.

Each piece is `reports/<folder>/<YYYY-MM-DD-HHmm>.md` with the fields in `templates/report.md`. The browser parses the frontmatter. `reports/index.json` is only a file list, rebuilt by `scripts/build-index.mjs`.

Adding someone is a registry entry plus files in that folder. See `ONBOARDING.md`.

## Pages

The workflow on `main` checks the files, rebuilds the manifest, and deploys the static site. Source must be GitHub Actions.

This environment could not turn that on. The repository owner, with admin on the repo, needs to set:

**Settings → Pages → Build and deployment → Source: GitHub Actions**

Then run the `pages` workflow if the first deploy failed before the setting existed (Actions → pages → Run workflow).

## Android

See `android-shell/README.md`. The shell points at the hosted page. `server.url` is read from `CAP_SERVER_URL` or a local `server.url` file. An APK is not part of this phase.
