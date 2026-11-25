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
  - name: "Reuters"
    url: "https://www.reuters.com/technology/"
    type: "news"
flow:
  - stage: "signal"
    text: "观察到的信号，写全句，不要用省略号截断"
  - stage: "path"
    text: "它如何传到下一步"
  - stage: "impact"
    text: "落到哪里"
---

## 摘要

用两三句说清这一条要回答的问题，和最后的判断。

## 1. 第一节标题

这一节的第一句是导语，先给结论再给依据。

> 推理链：信号 → 路径 → 影响。因为某事实，所以下一步成立。

## 2. 第二节标题

导语一句。下面只放真正的表格，例如日期、对象、性质、影响、来源。

| 日期 | 对象 | 性质 | 影响 | 来源 |
| --- | --- | --- | --- | --- |
| 2026-11-25 | 示例 | 已确认 | 一句影响 | [来源名](https://example.com) |

## 关联与判断

把上面几节连起来：哪些已确认，哪些只是宣称，哪些仍是推测。

## 结论

最后的判断，单独成节。置信度写在这一节里。

`flow` 可省略。没有 `flow` 时，正文占满展开区域。文件名 `<YYYY-MM-DD-HHmm>.md` 的时钟与 `timestamp` 一致。身份只看 `bot_id`。
