# Claude / Fable 体例说明

本文说明如何把 Claude 的调研成文习惯，做成 crew-pulse 的一种可选体例（frontmatter 写 `style: fable`）。只作本地规格，不改仓库。

## 1. 先核对名称与版本

**存在，且应使用的准确名称是 Claude Fable 5.2。**

| 项 | 值 | 出处 |
| --- | --- | --- |
| 对外名称 | Claude Fable 5.2（与 Claude Mythos 5.2 为同一底层模型；Mythos 仅对通过核验的机构开放） | [Anthropic 公告，2026-11-09](https://www.anthropic.com/claude-fable-and-mythos-5-2) |
| 模型 ID | `claude-fable-5-2` | [Platform：Fable 5.2 概览](https://platform.claude.com/docs/en/models/fable-5-2/overview) |
| 定位 | 高要求推理与长程代理工作；典型用途包括历时数小时的代理会话、多步深入调研，以及把分析做到一份完成的文档、表格或幻灯 | 同上 |
| 发布 | 2026 年 11 月 9 日；知识截止 2026 年 6 月 | 同上 |

更早的 **Claude Fable 5** 于 2026 年 6 月 9 日发布，见 [Anthropic 公告](https://www.anthropic.com/news/claude-fable-5-mythos-5)。Google Cloud 博客标题里的 [Cloud Fable 5 on Google Cloud](https://cloud.google.com/blog/products/ai-machine-learning/cloud-fable-5-on-google-cloud) 指的是这一次 Fable 5 上云，**不是 5.2**。5.2 在 Google Cloud 上的模型 ID 同样是 `claude-fable-5-2`，见 Platform 概览。不存在单独叫 “Cloud Fable 5.2” 的官方产品名；对用户说话时用 **Claude Fable 5.2**。

## 2. 关键界限：没有官方固定成文体例

Anthropic **没有**为 Fable 5.2（或任何 Claude 型号）发布一份固定的成文模板，规定必须用哪些标题、先写几句摘要、如何收尾。Fable 5.2 是模型，不是版式。下面能写死的，是官方文档与官方 skill 里反复出现的**方法**，再加上产品界面和 Anthropic 自己成文里**观察到**的习惯。两者必须分开，不能把观察说成官方格式。

另有一条产品事实，必须写清：claude.ai 的 Research 功能「无论对话里选了哪个模型」，当前都跑在 **Claude Opus 5.5** 上，必要时回退到 Claude Opus 4.8。见 [Help Center：Use research on Claude](https://support.claude.com/en/articles/11088861)。因此，不能把「Research 页面上的成文」说成「Fable 5.2 生成的官方格式」。Fable 5.2 文档只是把「多步深入调研、把分析写成成品文档」列为它擅长的工作。

## 3. 官方写明的方法（Anthropic 文档 / 官方 skill）

以下均可追溯到 Anthropic 自己的材料，不是第三方归纳。

### 3.1 Research 产品在做什么

据 [Help Center：Use research on Claude](https://support.claude.com/en/articles/11088861)、[Claude Academy：Research for deep dives](https://academy.claude.com/courses/claude-101/research-mode-for-deep-dives)、官方文章 [Claude takes research to new places](https://claude.com/resources/articles/research)：

1. **先规划再检索。** 把问题拆开，想清楚要查什么，再动手。
2. **多轮、互相接力的检索。** 不是一次搜完；根据已读到的内容决定下一步查什么，并把未决问题系统做完。
3. **综合成一篇结构清楚、材料较全的成文**（原文用 comprehensive, well-organized report）。
4. **主张可核对。** Academy 写的是：Research 成文里每一条主张都链回出处，便于打开核对。官方文章写的是 thorough answers，并带 easy-to-check citations；对接 Google Workspace 时提供 **inline citations**，用来核对来源是否够新。
5. 读者应自己打开引用，而不是把「有引用」当成「已核实」。这是产品设计，不是版式法令。

技术侧，[Web search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool) 规定：最终回复里，被检索结果支撑的文本块会带 `citations`，字段包括 `url`、`title`、`cited_text`（摘句）。这是「句段级、内联引用」的数据来源，不是视觉规范。

Anthropic 工程文 [How we built our multi-agent research system](https://www.anthropic.com/research/multi-agent-research-system)（2025-06-13）描述：主研究员综合材料后，交给 CitationAgent，由它在成文中标出引用位置，保证主张能溯源。这是系统行为，同样不是一份标题清单。

### 3.2 官方 Deep researcher skill 的成文结构

来源：[anthropics/skills 仓库，Deep researcher](https://github.com/anthropics/skills/blob/main/skills/claude-api/shared/managed-agents-quickstarts/deep-researcher.md)。这是 Anthropic 发布的 skill，不是产品强制版式，但是目前最接近「官方推荐结构」的文本。它要求：

1. 把原问题拆成 **3–5 个具体子问题**，合在一起能覆盖原题。
2. 每个子问题都去查权威来源：优先一手材料、官方文档、同行评议，而不是博客或二次转述。
3. **按子问题组织成文**；每一个非显而易见的主张都要有**内联引用**。
4. **以 “confidence & gaps”（把握与缺口）收尾**：写明来源在何处分歧、何处查不到像样的覆盖、何处仍不确定。
5. 发出前复核引用：能换成一手来源的就换；找不到更强来源的主张，要明确标出。
6. **保持怀疑。** 来源冲突时写出来，并说明更采信哪一方、为什么。不要用斩钉截铁的口气盖住不确定。

验收标准（同一文件中的 outcome rubric）与上面四条一致：按子问题作答、非显然主张有权威内联引用、分歧被摊开并给出可信度判断、文末有把握与缺口。

### 3.3 Anthropic 自己发表的调研长文，习惯上怎样开头和收尾

这不是 Research 功能的规范，而是 Anthropic 研究页上的成文习惯，可作参照。以 [How scientists use Claude](https://www.anthropic.com/research/how-researchers-use-claude)（2026-11-05）为例：

- 标题、日期、作者在先。
- 正文前是 **Summary**：若干条较长的要点，每条以短标签起头（如 “What we measure.”），先交代测量了什么、看到了什么、意味着什么。
- 然后才是 Introduction 与分节正文。
- 文中有独立一节 **How we conducted this research**，说明方法与限度。
- 文末是 **References**（作者、题名、出版物、日期等）。

「摘要先行、方法与限度单独成节、来源放在最后」是观察，不是 Fable 5.2 的强制模板。

## 4. 观察性约定（示例与第三方，不得写成官方格式）

下列常见，但 Anthropic 并未把它们写成必须遵守的标题表：

- 文首用 2–3 句把答案说完（有人写成 TL;DR 或 Answer in brief）。Deep researcher skill **没有**强制这一节，但和 Anthropic 长文的 Summary、以及「先给结论再展开」的阅读习惯一致。
- 比较类题目用表格：一行一个对象，数字旁给出处。第三方教程（如对 Research 的操作课）常这样示范，并强调要点开引用、核日期。
- 引用在产品界面里是可点击的内联标记；点开可看到来源标题与站点，再跳到原页。官方只保证「可核对的引用」，没有公布字号、形状或色值。
- 成文过程中可以看到来源在累积；文末通常还有一份来源清单。
- 收尾除「把握与缺口」外，实用场景里常再加「未决问题 / 下一步」。这是常见补全，不是官方必选项。
- 视觉：见同目录 `fable-ui-spec.md`。Claude 产品与品牌站使用自有字体 Anthropic Serif / Sans，字号与行距来自第三方对页面的测量，**不是**官方设计规范，也不可把这些专有字体用进 crew-pulse。

## 5. 建议搬到 crew-pulse 的体例

在官方方法上，加上一条观察性的「先看要点」，并写成中文章节。渲染标题里不用「系统」「看板」「报告」三词。现有体例（`templates/report.md` 的 摘要 → 1./2. → 关联与判断 → 结论）仍保留；本体例是并列选项，靠 `style: fable` 区分。

推荐章节顺序：

1. **先看要点** — 2–4 句或短列表，先给判断与限定。
2. **分题探查** — 3–5 个主题小节（`### 1. …`），每节先一句判断，再写依据；非显然主张后加内联引用。
3. **依据一览** — 仅在有可并列的事实或数字时用表；每行有来源。
4. **分歧与限度** — 冲突、未证实、范围边界。
5. **把握与缺口** — 总把握（高 / 中 / 低，并写理由）、证据强弱、仍不确定什么。
6. **下一步** — 可核对的后续动作，或「暂无」。
7. **来源** — 编号清单：名称、标题或类型、可打开的 URL、日期（若有）。

引用写法：正文用 `[1]`、`[2]`，与文末来源编号一致；同一来源多次引用可重复同一编号。能引用就引用一手来源。不要用省略号截断展开后的正文。`flow` 可留在 frontmatter 里，页面不再画出链条。
