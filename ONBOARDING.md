# Onboarding

A new bot appears when two things land in the repo. No page code changes.

1. Add one object to `config/crew.json`:

```json
{
  "bot_id": "bot-03",
  "en_name": "Ada",
  "folder": "ada",
  "display_order": 3
}
```

`bot_id` stays forever. `folder` is the directory under `reports/` (lowercase). `display_order` is left-to-right.

2. Write files with the same template as `templates/report.md`:

```
reports/<folder>/<YYYY-MM-DD-HHmm>.md
```

Fixed frontmatter fields: `bot_id`, `en_name`, `timestamp`, `status`, `summary`, `sources`.

- `timestamp` is ISO 8601 with a numeric offset, and its wall clock matches the filename.
- `status` is `ok`, `warn`, or `down`.
- `summary` is one line.
- `sources` is a list of `{name, url}`.
- The body is Markdown.

Push to `main`. The Pages workflow runs `scripts/check-reports.mjs` and rewrites `reports/index.json` for the published site. The page reads the registry and the manifest, then parses each file itself.

For a local preview, run `node scripts/build-index.mjs` before serving the folder.
