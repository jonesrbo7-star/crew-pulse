# Onboarding

Three steps. Matching uses `bot_id` only. The display name can change later.

1. Copy `templates/report.md` and fill the frontmatter and a short body.
2. Put the file in the shared `reports/` tree as `<YYYY-MM-DD-HHmm>.md`. A subfolder per person is fine. The filename clock must match `timestamp`.
3. Register the person in `config/crew.json` with `bot_id`, `en_name`, and `display_order`.

`bot_id` never changes. `en_name` is the name on the page. Push to `main`. The Pages workflow checks the files and rebuilds `reports/index.json`.

Optional fields the page knows how to draw: `role` (at most 8 characters), `tag` (2–3 characters), `signal_strength` (0–100), and `flow` (a list of `{stage, text}` where `stage` is `signal`, `path`, or `impact`). Each source is `{name, url, type}` and `type` is `news`, `paper`, or `patent`.
