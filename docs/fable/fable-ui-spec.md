# Fable 体例的页面视觉规格

给 crew-pulse 主页用的、可直接写进 CSS 的建议。只改阅读节奏和引用呈现，**不改青花瓷色板，不增加第 4 种动效，不把已决定删除的右侧链条画回来。** 本文件是本地建议，尚未写入仓库。

## 0. 必须保持的约束

- 色板沿用现有自定义属性：`--bg #F4F7FB`、`--header #E3EAF3`、`--side #EEF3F8`、`--surface #FFFdfb`、`--glaze #F3EDE3`、`--ink #1A2744`、`--muted #2E3E58`、`--faint #3E5068`、`--line #D5DCE6`、`--paper / --paper-ink`、`--iron` 等。不要改成 Claude 品牌的 Ivory / Ink。
- 字体沿用现有栈：标题 `--serif`（Source Han Serif SC / Noto Serif SC），正文 `--sans`（PingFang SC / Noto Sans SC）。Claude 产品用的 Anthropic Serif / Sans 是专有字体，不可嵌入，也不是官方开放规范。
- 只保留三种动效：新卡片 `fade-in 300ms ease-out`；卡片与「历史」按钮悬停时边框由 `rgba(26, 39, 68, 0.10)` 到 `0.20`（已有 `transition: border-color 300ms ease-out`）；展开正文用已有 `.reveal` / `settle`（`translateY(-8px)` 落到原位，300ms ease-out）。`prefers-reduced-motion: reduce` 时关闭动画。
- 展开后是**单栏阅读**，不要再为 `.flow` 留右栏或新的流程图。`flow` 字段可以留在文件里，页面不渲染链条。
- 渲染标题、芯片、KPI 名称里不出现「系统」「看板」「报告」。
- 展开视图不使用省略号截断；时间轴和折叠摘要最多两行，悬停或展开可见全文。

## 1. 哪些视觉来自官方，哪些只是观察

**官方只保证结构与引用，不保证视觉。** Research 要求主张可点击核对、成文结构清楚；Deep researcher skill 要求按子问题组织、内联引用、以把握与缺口收尾。没有公布字号、行距、栏宽或引用徽章的色值。

下面这些是对 Claude 产品/品牌页和 Research 使用界面的**观察**，用来借鉴节奏，而不是复制皮肤：

- 栏宽收窄，正文像在读书，而不是铺满宽屏。现有 `--measure: 740px` 已经接近这一节奏（品牌站问答栏第三方测到约 660px；常见正文度量约 65–72ch）。
- 标题用衬线、字重偏轻；正文用无衬线、常规字重；行高大约 1.5–1.7。
- 引用是紧贴句末的小号可点击标记，而不是一长串 URL。
- 表是细线、表头弱处理、数字用表列对齐；来源作为文末安静清单。
- 空白按 8 的倍数走。

第三方对 claude.com 的测量（如 56px 浅字重衬线标题、正文 15–17px / 行高 1.6）只作对照，**不要把那些字号搬到本页**——本页是中文阅读界面，应在现有 16px 体系上微调。

## 2. 栏宽与页面骨架

当前 `--frame: 1440px`、`--measure: 740px`、`--rail: 220px`。去掉右栏链条后，展开正文若仍拉满外框，会显得稀、空。建议：

```css
:root {
  --frame: 1280px;          /* 顶栏与主列的外框，略收，避免 1440 过宽 */
  --measure: 68ch;          /* 展开正文的阅读栏；也可写 720px，两者取 min */
  --space: 8px;
}
.md {
  width: min(var(--measure), 100%);
  margin-inline: auto;
}
.card.is-open {
  grid-column: 1 / -1;      /* 已有：展开后占满卡片栅格 */
}
.expand-layout {
  display: block;           /* 单栏；不要再写 7+5 或 左文右链 的双栏 */
  max-width: 100%;
}
```

折叠总览仍用现有卡片栅格：`repeat(auto-fit, minmax(min(100%, 400px), 1fr))`，间距 24px。选「全部」时不要给折叠卡片固定成与展开栏同样的窄宽，以免大片空白。侧栏 220px 可保持。手机上沿用现有 800px 断点，主列 `padding: 16px`。

## 3. 字号阶梯与字重

在现有 16px 根字号上统一成一档，避免正文 16、列表 16、表 13.5、流程图 14.5 混用。建议：

| 角色 | 字体 | 字号 | 字重 | 行高 | 字距 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 站点名 `.brand h1`、卡片人名 `.who-row h2` | serif | 1.35rem（约 21.6px） | 500 | 1.25 | 0 | 现为 1.4rem / 600，略减字重，更接近「浅衬线标题」 |
| 展开后 `h2`（先看要点、分题探查等） | serif | 1.15rem | 500 | 1.3 | 0 | 现为 1.2rem / 600；上边距大于下边距 |
| 展开后 `h3`（分题小节） | serif | 1.05rem | 500 | 1.35 | 0 | 保持现有尺寸，字重 600→500 |
| 时间轴小标题 `.timeline h3` | serif | 1.05rem | 500 | 1.3 | 0 | 已是 500，保持 |
| KPI 数字 | sans | 1.7rem | 500 | 1.2 | -0.02em | 已有，保持；`tabular-nums` |
| KPI 标签 / 注解 | sans | 12px | 400 | 1.4 | 0.04em | 已有，保持 |
| 折叠摘要、展开正文、列表 | sans | 16px | 400 | 1.7 | 0 | 现摘要行高 1.75、页面 1.65，统一到 1.7 |
| 角色、来源补充、表单元格 | sans | 13–14px | 400 | 1.5 | 0 | 表不要小于 13px |
| 芯片、历史、引用徽章、时间戳 | sans | 12px | 400 | 1.5 | 0.02–0.04em | 引用编号用 `tabular-nums` |
| 加粗 | sans | 继承 | 600 | 继承 | 0 | 只用于关键词和数字，不用于整段 |

```css
.md h2, .md h3, .who-row h2, .brand h1, .timeline h3 {
  font-family: var(--serif);
  font-weight: 500;
  text-wrap: balance;
  color: var(--ink);
}
.md h2 { font-size: 1.15rem; line-height: 1.3; margin: 32px 0 12px; }
.md h3 { font-size: 1.05rem; line-height: 1.35; margin: 24px 0 8px; }
.md h2:first-child { margin-top: 0; }
.md, .md p, .md li {
  font-size: 16px;
  font-weight: 400;
  line-height: 1.7;
}
.md strong, .md b { font-weight: 600; }
```

中文正文不要用负字距。数字、时间、引用编号加 `font-variant-numeric: tabular-nums`。

## 4. 间距阶梯

全部用 8 的倍数：4、8、12、16、24、32。建议把现在略碎的 6、10、14 收拢。

```css
.md p, .md ul, .md ol { margin: 0 0 16px; }
.md li + li { margin-top: 8px; }      /* 现为 12px，列表稍收，避开「条目过重」 */
.md table { margin: 8px 0 24px; }
.card { padding: 16px 20px 20px; }    /* 现为四边 16px；展开后左右略松一点 */
.expand { margin-top: 16px; }
.summary { margin-top: 16px; }
.meta-row { margin-top: 16px; gap: 8px; }
.cards, .main { gap: 24px; }
```

「先看要点」与「把握与缺口 / 下一步」不要再用额外的重框堆在一起：上用浅釉底，下用浅青底，都已经有 `.md .tldr`、`.md .verdict`，保留并收紧内边距。

```css
.md .tldr, .md .verdict {
  width: min(100%, var(--measure));
  padding: 16px 16px 8px;
  border: 1px solid var(--line);
  border-radius: 12px;
  margin: 0 0 24px;
}
.md .tldr { background: #F7F4EE; }            /* 已有浅釉 */
.md .verdict { background: #F3F6FB; border-color: #D5E0EE; margin-top: 24px; }
.md .tldr h2, .md .verdict h2 { margin-top: 0; }
```

渲染 `style: fable` 时：把「先看要点」整节包进 `.tldr`，把「把握与缺口」和「下一步」包进 `.verdict`（可同框，先缺口后动作）。

## 5. 折叠卡：摘要先行

折叠态不要再把叙事链条或空右栏算进高度。一张卡从上到下：

1. 人名（衬线）+ 状态点
2. 角色、时间（12–13px，muted）
3. **先看要点**：直接用 `summary` 全文，16px / 400 / 1.7，不截断
4. 来源芯片 + 「历史」按钮（已有样式，保持小按钮）

不要在折叠卡里渲染分题正文或表格。展开后再渲染 markdown，并以「先看要点」为第一块。卡片本身保持：

```css
.card {
  border: 1px solid rgba(26, 39, 68, 0.10);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(26, 39, 68, 0.04);
  transition: border-color 300ms ease-out;
}
.card:hover { border-color: rgba(26, 39, 68, 0.20); }
```

不要给卡片加彩条顶边，也不要恢复流程图节点（`.node` / `.arrow` 仅在尚未删除的旧 CSS 中保留，新渲染路径不要引用）。

## 6. 内联引用与文末来源

官方要求主张能核对；视觉上做成句末小号标记，避免把 URL 直接堆在段落里。

```css
.md a.cite {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.15em;
  height: 1.15em;
  margin: 0 0 0 0.15em;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--paper);
  color: var(--paper-ink);
  font-size: 11px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-decoration: none;
  vertical-align: 0.15em;
}
.md a.cite:hover { background: var(--pick); }
```

正文里的 `[1]` 在 `style: fable` 下渲染为 `<a class="cite" href="#src-1">1</a>`。文末「来源」用有序列表，并给对应 `id="src-1"`。来源区比正文低一级，避免再做成大标题：

```css
.md ol.sources, .cites-list {
  margin: 0 0 8px;
  padding-left: 1.4em;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted);
}
.md ol.sources a {
  color: var(--paper-ink);
  text-decoration: none;
}
.md ol.sources a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
```

卡片头上的来源芯片可以保留，作为跳转，不需要重复整段 URL。同一来源多次引用共用一个编号。芯片按 `type` 现有 news / paper / patent 色即可。

## 7. 表、引语、数字

```css
.md table {
  width: 100%;
  max-width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
  line-height: 1.5;
}
.md th, .md td {
  border-bottom: 1px solid var(--line);
  padding: 8px 10px;
  text-align: left;
  vertical-align: top;
}
.md th {
  font-weight: 500;
  color: var(--muted);
  background: var(--bg);
}
.md td.num, .md th.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.md figure, .md .table-wrap {
  overflow-x: auto;
  max-width: 100%;
}
```

不要用网格重框。表头只用底边细线和浅底。手机上允许横向滑动，不要把列挤断。单元格写全文。

短引语继续用现有 `blockquote`（左 3px 青线、浅底 `--bg`），但**只用于直接引语**，不要再把「推理链：信号 → 路径 → 影响」放进引用块——那是旧体例，且链条已删除。

关键数字沿用 `.fig` 的表列数字，字重 600 即可，不要整段加粗。

## 8. 渲染对照（给实现用）

| 条件 | 做法 |
| --- | --- |
| `style` 缺省或非 `fable` | 仍按现有 `templates/report.md` 渲染 |
| `style: fable` | 按本文：先看要点进 `.tldr`，引用变徽章，来源进文末列表，缺口与下一步进 `.verdict` |
| 有 `flow` | 忽略，不渲染 `.flow` / `.node` / `.arrow` |
| 展开 / 新卡片 / 悬停 | 只用第 0 节三种动效 |

核对时看三件事：桌面展开后正文在卡片内居中、宽度约 68ch，右侧不再出现链条，也没有横向溢出；引用徽章可跳到文末对应来源；折叠卡与时间轴不再用「…」截断展开正文。
