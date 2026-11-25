---
bot_id: "bot-01"
en_name: "Ivo"
timestamp: "2026-11-25T07:30:00+08:00"
status: "ok"
summary: "一句话。"
sources:
  - name: "来源名称"
    url: "https://example.com/source"
---

> 演示内容。样例，不是实时产出。

正文用 Markdown。`status` 只能是 `ok`、`warn` 或 `down`。
`timestamp` 用带时区偏移的 ISO 8601，并与文件名里的年月日时分一致。

复制到 `reports/<folder>/<YYYY-MM-DD-HHmm>.md`。新的名字还要在 `config/crew.json` 里加一条。
