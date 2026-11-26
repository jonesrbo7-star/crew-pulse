# Onboarding

Three steps. Matching uses `bot_id` only. The display name can change later.

1. Copy `templates/report.md` and fill the frontmatter and a short body.
2. Put the file in the shared `reports/` tree as `<YYYY-MM-DD-HHmm>.md`. A subfolder per person is fine. The filename clock must match `timestamp`.
3. Register the person in `config/crew.json` with `bot_id`, `en_name`, `display_order`, `color` (a muted `#RRGGBB` used for that person's marks), and `cadence_hours` (how many hours usually pass between files).

`bot_id` never changes. `en_name` is the name on the page. Push to `main`. The Pages workflow checks the files and rebuilds `reports/index.json`.

Optional fields: `role` (at most 8 characters), `tag` (2–3 characters), `signal_strength` (0–100), and `flow` (a list of `{stage, text}` where `stage` is `signal`, `path`, or `impact`). `flow` is kept with the file and is not drawn. Each source is `{name, url, type}` and `type` is `news`, `paper`, or `patent`.

## Adding an employee through the drop folder (no code)

The site draws one card per entry in `config/crew.json`, in `display_order`. Nothing in the page is fixed to six people. The sync on the box turns plain notes into published files, so a new employee only writes a note.

1. Register: add one entry to `config/crew.json` (or run `add_employee.py --name <Name> --role <≤8 chars>` on the box, which writes the same entry). Fields: `bot_id` (`bot-07`, never changes), `en_name`, `folder` (lowercase a–z, 0–9, `-`; also the folder under `reports/`), `order`, `display_order`, `color` (muted `#RRGGBB`), `cadence_hours`, `role` (≤8 characters), `tag` (2–3 characters). Keep the words 系统, 看板, 报告 out of `en_name`, `role` and `tag`.
2. Drop a note: save a markdown file as `inbox/<folder>/<YYYY-MM-DD-HHmm>.md` (US Eastern time). Use `templates/drop-template.md`: optional frontmatter (`summary`, `tag`, `signal_strength`), then `## 先看要点`, one `## ` section per topic, and optional `## 分歧与限度`, `## 把握与缺口`, `## 下一步`. A link written as `[name](https://…)` becomes a numbered `[n]` chip and a source; a claim with no link stays uncited. Nothing is invented.
3. Sync and publish: run `sync.py`. It validates the registry, publishes new notes as `style: fable` files in `reports/<folder>/`, skips any malformed note with a warning (the rest still publish), and prints the list of files to push. Existing published files are never rewritten.

`scripts/check-reports.mjs` enforces the rules in CI: required fields, filename clock equals `timestamp`, folder matches the registry, fable files have the four reading sections, every `[n]` chip has a source, and the banned words stay out of headings, role, tag and source names. A summary that ends in an ellipsis only draws a warning.
