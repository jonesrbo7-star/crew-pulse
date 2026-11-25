## 摘要

2026-09-02 至 2026-11-25（美东时间）核过的机场与关键网络中断里，没有证据显示存在一场协同攻击。大面积停摆来自老旧架构、变更和容灾反噬；已确认的攻击更多打在外包、凭证和供应链上。北海 GPS 干扰与俄籍船只的关系、以及若干 DDoS，仍停留在宣称或推测。

## 1. 时间线

下表只收来源材料里的日期、对象、性质、影响和链接。

| 日期 | 对象 | 性质 | 影响 | 来源 |
| --- | --- | --- | --- | --- |
| 2026-09-02 | 英国曼彻斯特机场集团 MAG | 已确认 · 勒索未果后公开数据 | 约 870 万用户个人数据（Wi-Fi/停车库，约 0.5TB）；航班未受影响 | [BBC](https://www.bbc.com/news/articles/c74k39g3ee5o) |
| 2026-09-08 05:00–14:30 EDT | 英国 NATS Swanwick | 已确认 · 非攻击（遗留软件缺陷） | 飞行数据损坏，全英离港暂停，转手动 | [Cyber Monitoring Centre](https://cybermonitoringcentre.com/2026/11/04/cyber-monitoring-centre-statement-on-the-nats-incident-november-2026/) |
| 2026-09-18（招标取证日） | 南非 ATNS | 已确认发现早期恶意程序；外传为疑似 | 伊丽莎白港机场天气/空管 OT 网络；ATNS 称已遏制，外部取证待定 | [Dark Reading](https://www.darkreading.com/cyberattacks-data-breaches/south-africa-help-cyberattack-air-traffic-control) |
| 2026-09-21 01:20–09:00 EDT | 英国 NATS Prestwick | 已确认 · 非攻击，与 9/8 无关 | 内部数据分发网络负载过高，容量降至 40%，117 架次取消 | [NATS](https://www.nats.aero/wp-content/uploads/2026/10/Prestwick-Incident-Report-161026.pdf) |
| 访问窗口 2023-08-10 至 2026-09-23；10/01–11/09 披露 | Amadeus | 已确认 · 凭证与展示漏洞越权访问 PNR | 日航 9.2 万、泰航 60,529、国泰 5.3 万、新航 4.6 万、全日空约 3.8 万，以及韩亚、大韩、马航；航班无中断 | [The Record](https://therecord.media/asian-airlines-announce-data-breach-it-provider-incident) |
| 2026-09-30~10-01 | Azure | 已确认 · 非攻击 | 多区域 5 小时 45 分，网关控制面过载 | [Control Plane](https://controlplane.com/blog/post/cloud-outage-tracker) |
| 2026-10-06 起 | 俄圣彼得堡 ISP SkyNet | 已确认遭 DDoS；1.5 万设备瘫痪为单方宣称 | 多日中断 | [The Record](https://therecord.media/russian-internet-provider-skynet-reports-outages-ddos) |
| 2026-10-06 14:40 EDT | 日本 IDC Frontier | 已确认 · 勒索软件 | 4 个可用区下线，495 家客户受影响 | [Shattered](https://shattered.io/idc-frontier-idcf-cloud-ransomware-attack-2026/) |
| 2026-10-19~20 | Cloudflare One Gateway；Google Cloud europe-west2 | 已确认 · 非攻击 | 前者 3 小时 12 分；后者 6 小时 08 分（供电 + PLC 误配置） | [Control Plane](https://controlplane.com/blog/post/cloud-outage-tracker) |
| 10 月中下旬 | 意大利佛罗伦萨/比萨机场 | 宣称 | BD Anonymous 宣称 DDoS 门户，未见官方确认运行受影响 | [Telsy](https://www.telsy.com/en/php2shell-and-new-itw-exploits-apt-and-cyberspionage-operations-the-latest-from-italy/) |
| 2026-11-03 | 博茨瓦纳航空 | 疑似勒索 | 内部/员工侧疑似入侵；预订与飞安未受影响 | [TechCabal](https://techcabal.com/2026/11/18/ethiopian-airlines-reports-cyberattack/) |
| 2026-11-08 | 德国汉诺威/不来梅机场 | 宣称 | NoName057(16) 宣称 DDoS 网页/邮件门户，无运行中断记载 | [CIRCL](https://social.circl.lu/@NoName57Bot/117579315157487444) |
| 2026-11-09 约 12:00 EST，约 20 分钟 | 史基浦/北海空域 | 已确认中断；归因未官方确认 | 约 80 架飞机 GPS/RNP 中断（含 7 架史基浦进近），均安全降落；专家疑干扰源为北海船只（附近 6 艘俄籍船） | [VRT](https://www.vrt.be/vrtnws/en/2026/11/16/gps-signals-from-dozens-of-aircraft-over-belgium-and-the-netherl/) |
| 2026-11-12 11:20 – 11-13 11:10 EST | Microsoft 365 | 已确认 · 非攻击 | 全球中断约 24 小时：7 月网关补丁潜伏并发缺陷 + 切流 + 维护叠加，超过 80% 网关冻结 | [Ars Technica](https://arstechnica.com/gadgets/2026/11/microsoft-details-how-three-problems-combined-for-a-global-outage/) |
| 2026-11-13 约 15:30–20:15 EST | FAA | 已确认 · FAA 称无网络攻击迹象 | L3Harris 在阿肯色 El Dorado 站装新路由器后，该站与得州 Amarillo 雷达站向旧通信网洪泛数据；22 个航路中心中 17 个不稳定，停飞逾 4.5 小时 | [FAA](https://www.faa.gov/newsroom/nationwide-ground-stop-questions-and-answers) · [CNBC](https://www.cnbc.com/2026/11/18/faa-ground-stop-router-investigation.html) |
| 2026-11-15 06:05–09:10 EST | AWS us-east-1 | 已确认中断 · 根因未公布 | IAM Identity Center 等中断约 3 小时 16 分 | [Control Plane](https://controlplane.com/blog/post/cloud-outage-tracker) |
| 2026-11-16 | Optimizely | 已确认 · 供应链 JS 投毒 | 178 家机构官网（含银行、航空）被注入恶意 JS 窃卡 | [The Record](https://therecord.media/optimizely-malicious-code-customer-sites) |
| 2026-11-16 约 10:00–19:00 EST | 摩根大通与美联航 | 已确认中断 · 双方称无攻击迹象 | 摩根大通约 8–9 小时（波及 Zelle）；美联航飞行计划/配载，少于 150 架次延误 | [Semafor](https://www.semafor.com/article/11/16/2026/united-airlines-major-us-banks-report-system-outages) |
| 2026-11-16~18 | USDA；NSANet；Bell Canada | 已确认入侵 / 维护降级 / 已报道入侵 | USDA 安全入侵致农贷下线；NSANet 维护降级，非攻击；Bell Canada 遭“智能体威胁行为者”入侵，邮箱锁死与信息泄露 | [Nextgov](https://www.nextgov.com/cybersecurity/2026/11/usda-grapples-security-breach-it-staff-take-multiple-systems-offline/417350/) · [NBC News](https://www.nbcnews.com/politics/national-security/classified-nsa-network-still-leaving-staff-working-home-rcna610261) · [CBC](https://www.cbc.ca/news/canada/bell-cybersecurity-incident-virgin-plus-9.7432273) |
| 2026-11-18 | 埃塞俄比亚航空 ShebaMiles | 可能泄露 · 有限攻击 | 数据可能泄露，航班未中断 | [TechCabal](https://techcabal.com/2026/11/18/ethiopian-airlines-reports-cyberattack/) |
| 2026-11-24 09:33 EST | 伦敦盖特威克 AutoPay | 已确认 · 越权访问 | 外包落客缴费泄露姓名、住址、车牌等，已停用并报 ICO，航班正常 | [BBC](https://www.bbc.co.uk/news/articles/ckx283l7n17ro) |
| 2026-11-25 10:55–11:36 EST | GitHub | 已确认 · 非攻击 | 数据库负载过高，部分服务中断 | [githubstatus.com](https://www.githubstatus.com/) |

## 2. 证据分级

### 已确认

MAG 公开数据、NATS 两起（官方确认非攻击且互不相关）、Amadeus 越权、Azure / Cloudflare / Google Cloud / Microsoft 365 / FAA / GitHub 的中断原因按各源所述、IDC Frontier 勒索、Optimizely 投毒、SkyNet 的 DDoS 中断本身、盖特威克 AutoPay、USDA 安全入侵、Bell Canada 入侵、摩根大通与美联航中断（双方称无攻击迹象）、史基浦一带的 GPS/RNP 中断本身。

### 宣称

乌克兰 BO Team 关于 SkyNet 1.5 万台设备瘫痪；佛罗伦萨/比萨机场 BD Anonymous 的 DDoS；汉诺威/不来梅 NoName057(16) 的 DDoS。后两处未见官方确认运行受影响。

### 推测

ATNS 的疑似数据外传（恶意程序为发现，外传未定）；博茨瓦纳航空的疑似勒索；埃航 ShebaMiles“可能”因有限攻击泄露；北海 GPS 干扰源被专家疑为附近船只（6 艘俄籍船），无官方归因；“AI 发现漏洞致集中打补丁过载”无公开证据（CSA 来源返回 403，未能复核）。

> 推理链：来源写明“确认 / 官方排除”的，进已确认。只出现单方说法、且写明未见官方确认的，进宣称。写明“疑似 / 可能 / 专家疑 / 无官方归因 / 无公开证据”的，进推测。

## 3. 关联分析

> 推理链：同一供应商或同一故障被写明拖累了别人，才算已证实的关联；时间靠近本身不够。

已证实共用基础设施：8 家亚洲航司泄露同源于 Amadeus。微软 365 故障连带第三方连接器报错；Google Cloud 伦敦区故障拖累英国银行。

已证实无关：11/12–17 美国宕机潮（微软、FAA、Workday、摩根大通、美联航、Apple、NSANet）根因各不相同，官方排除协同攻击。NATS 两起事故相互独立。

未证实：非洲 ATNS、博茨瓦纳航空、埃航仅时间地域接近，无共享归因证据。北海 GPS 干扰与俄船的关系未获官方归因。

## 4. 根因与置信度

1. 大面积停摆（FAA、NATS、M365、摩根大通等）来自老旧架构脆弱，加上变更/容灾机制反噬。置信度：高。
2. 真实网络攻击（Amadeus、MAG、盖特威克、Optimizely、IDCF）来自第三方外包与供应链集中暴露，加上凭证治理缺位。置信度：高。
3. 欧洲机场 DDoS 与 GPS 干扰，是地缘摩擦下的低成本灰色骚扰。置信度：中（多为宣称或未归因）。

> 推理链：因为停摆各源给出的根因彼此不同，所以不能收成一场协同攻击。因为已确认的入侵集中在外包与凭证，所以核心运行被绕开。因为多起 DDoS 与 GPS 仍缺官方归因，所以第三点只到“中”。

## 结论

没有证据显示存在一场协同攻击。真正造成停摆的是老化与变更失误；真实攻击则绕开空管核心，盯住外包与凭证。
