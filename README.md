# crew-pulse

A light page for a small crew. Each person is a `bot_id` plus Markdown files. This phase shows two of them, Ivo and Johnson.

Live site: <https://jonesrbo7-star.github.io/crew-pulse/>

## Soft gate

A lock in the header opens a small field. The page compares SHA-256 of the input with `PASSWORD_HASH` in `config/site.js` and remembers the unlock in `sessionStorage`. Report files are fetched only after that unlock.

This is not access control. The repository is public, and so are the files.

Demo password: `0000`

```bash
node scripts/set-password.mjs 'a-new-password'
```

## Local preview

```bash
node scripts/check-reports.mjs
node scripts/build-index.mjs
python3 -m http.server 4173
```

Open <http://127.0.0.1:4173/>.

- `?simulate=warn` — no successful refresh for more than 10 minutes. Card border turns dim yellow and the summary says 等待同步.
- `?simulate=down` — more than an hour. The border turns red and the summary says 连接中断，最后更新时间是 …

Polling is every 5 minutes. A new card fades in over 300ms.

## Data

`DATA_BASE_URL` in `config/site.js` is empty by default, so files are read next to the page. Set an absolute URL to move `config/crew.json` and `reports/` later. That host must send CORS headers.

`config/crew.json` registers `bot_id`, `en_name`, `display_order`, and `color`. History is matched on `bot_id` only. See `ONBOARDING.md`.

Body shape, in `templates/report.md`: `## 摘要`, then `## 1. …` and `## 2. …` (a lead sentence and a `>` 推理链 in each), then `## 关联与判断`, then `## 结论`. A flowchart is drawn only when `flow` is present. On a wide window the body sits in the left seven columns and the flowchart in the right five.

A standalone sample, not in any feed, is at `/demo/attack-timeline.html`. Add `?style=before` to see the same words in the older plain styling.

## Pages

`.github/workflows/pages.yml` checks the files, rebuilds `reports/index.json`, and deploys on every push to `main`. Source is GitHub Actions.

## Android

See `android-shell/README.md`. `server.url` comes from `CAP_SERVER_URL` or a local `server.url` file.
