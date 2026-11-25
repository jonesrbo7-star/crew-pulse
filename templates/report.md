---
bot_id: "bot-01"
en_name: "Ivo"
timestamp: "2026-11-25T07:40:00+08:00"
status: "ok"
summary: "一句话。"
role: "芯片与制造信号"
tag: "芯片"
signal_strength: 60
sources:
  - name: "Reuters Technology"
    url: "https://www.reuters.com/technology/"
    type: "news"
flow:
  - stage: "signal"
    text: "一句话，写观察到的信号"
  - stage: "path"
    text: "一句话，写它怎么传开"
  - stage: "impact"
    text: "一句话，写落到哪里"
---

演示内容。

正文保持很短。关键数字用 **26** 这样的粗体。`status` 只能是 `ok`、`warn` 或 `down`。`sources[].type` 只能是 `news`、`paper` 或 `patent`。`flow.stage` 只能是 `signal`、`path` 或 `impact`。

文件名用 `<YYYY-MM-DD-HHmm>.md`，时钟与 `timestamp` 一致。身份只看 `bot_id`。
