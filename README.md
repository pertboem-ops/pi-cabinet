# Cabinet 内阁议事

低频重决策的内阁议事插件：在父智能体统筹下，4–6 个异质立场的子智能体
对议题论证、交叉质询、合议，产出可追溯的议定书。

结构借鉴官方示例 `examples/plugins/roundtable`，在其"角色 + 轮次 + 父级合议"
骨架上增加：场景角色包、专职阁员两级映射、跨 provider 模型混编、轮间用户
介入点、双轨预算、灾备降级路径、议定书归档与运行日志。

> **v0.4.0（2026-10-13）**：M2′ 代码门批（20261013-2120 场重启设计 v3 落地）——
> 封存预答席机制入码（默认关）：tiers.json 增 preanswer 独立预算轨、generate.mjs
> 渲染 PREANSWER 常量、main.js 条件渲染"第 0.6 步"预答规程与双计数器执法文本、
> schema 增 provenance 块（since 2.3）、verify 增预答三门断言组、smoke 增默认关
> 负向断言；启用前置四条全部闭合（②(e)′并入①、③复审方 A+C，均用户裁定；
> ④成本基准实测 docs/预答席成本基准.md）。启用方式见 cabinet.md"预答席"节。
>
> **v0.3.2（2026-10-13）**：第五场审议（20261013-2120-sealed-control）地基批——
> beyond_preanswer 占位绊网补装 pi 轨（schema+main.js+cabinet.md 三件同步+verify
> 断言组，对齐 2233 P3）；scripts/ 收进包内（generate.mjs 包内版+新增 audit.mjs
> 最小归档对账器，填补三场"audit=未跑"缺口），verify 门规④ 解析改树内优先、
> 树外兜底；语料纪律两条入册（cabinet.md 证据标级节）；装机副本与 D 真源 SHA
> 对账完成、基线锁定（议定书 P5）。
> 重启设计 v3（封存预答席·缓建至 M2′）成文见 `docs/重启设计-v3.md`——启用
> 前置四条不过则任何条款不入码。
>
> **v0.2.7（2026-10-06）**：批次 D 首件·数据件真源——新增 config/
> tiers.json（档位预算唯一真源）与 schemas/protocol-v2.json（schema
> 字段真源）；scripts/generate.mjs 渲染 main.js TIERS 块与本文/cabinet.md
> 档位表（生成时依赖、运行时无 I/O）；门规④落地（generate --check 阻断
> ＋main.TIERS==tiers.json 逐字段断言）；退役第一批 8 条数值看守断言
> （38→51→49：同步税消除的起点）。
>
> **v0.2.6（2026-10-06）**：第六场审议吸收——cabinet.md 场景表补齐
> cabinet- 前缀名并对齐 gen-2 编制（第四个映射载体入护栏：verify 增
> 分行齐备＋幽灵名双断言）；预算纪律增"议程闭合时在 disclosure 记
> '调用轨未用 N 次'"半句（未动用额度不结转、机会成本记 0 但必须写出）。
>
> **v0.2.5（2026-10-06）**：三张角色卡"首选专职席"行对齐 v0.5 编制——
> research 正方 yuan→**li**、方法审查官 mou→**shen**，writing 结构官
> mou→**gu**（v0.5 新增三阁员时插件卡未跟随，造成映射三处失配、li 呆
> 库存）；verify 映射断言期望清单同步；纯文本变更，机制不动。
>
> **v0.2.4（2026-10-06）**：门与留档小修——verify 结构漂移受控 FAIL＋
> 崩溃兜底输出（V-01）；smoke 默认留档出包（V-02）；smoke 自报数比对
> 断言（P1）；pack 验证束（P6：逐断言 JSON＋main.js SHA256）；"超限
> 截断"文案改"标注不截断"（对齐 §六诚实优先）；roles 三卡映射行入门
> 断言；三维不重合检查抽为纯函数 checkSeatDimensions＋负向用例，开场
> 披露增"设计钉扎 vs 实际解析"对照。
>
> **v0.2.3（2026-10-06）**：并入原 v0.2.2 勘误并新增专职席档位——
> token 参考轨 18K→**19K**（取整规则统一：标称×1.1+次均成本，四舍五入
> 至千位，附次均成本表）；余量依据措辞降级为"1 场实跑观测 + 1 条档案
> 在册的自述记录"；events 规范 v1.1（phase 枚举 10 值 +steering/upgrade、
> seq0 元数据行豁免、事后补录 t 标 lower-bound）；cost 增 reassigns 字段
> （灾备率分母）；**映射两级制**（首选专职席 cabinet-feng/ju/mou/yuan/zhong
> → 能力偏好征召）+ 三维不重合检查（气质×立场×模型）；补位优先未在场
> 专职席；发布门迁 Node（tests/verify.mjs + tests/smoke.mjs：门执行被验
> 对象、JSON 语义比对、公式机检、resume 白名单分级、留档默认出包）。
>
> **v0.2.1（2026-10-06）**：全新委派主路径、双轨重定性、schema v2
> （+degraded/deviation）、提前收敛边界、升档重调 start、混编按实际解析
> 模型、TaskWait 超时语义、R2 攻击面全文优先、events.jsonl、红队完整卡
> 与补位规则。**v0.2.0**：全新委派+内嵌原文取代跨停等续谈（实测断链）。

## 安装（开发加载）

1. 打开 PI-Desktop（要求 ≥0.16.0），进入 **Plugins** 页面。
2. 头部溢出菜单 → **Load development plugin** → 选择本 `cabinet` 目录。
3. 同意两项权限（缺一插件静默无效）：`agent.prompt.inject`（技能目录
   通电开关）、`agent.tool.register`（注册 `plugin_local_cabinet_start`）。

**可选强化——专职阁员**：把项目 `ministers/` 目录的五个定义文件装到
`%USERPROFILE%\.agents\subagents\`（说明见 ministers/README.md）。装好后
组阁自动优先映射 cabinet-feng/ju/mou/yuan/zhong（两级映射 + 三维不重合
检查）；不装也不影响，自动回退到在场智能体征召制。

## 使用

**显式开阁（推荐主路径）**：`/skill:cabinet` 后接议题，或直接说：

> 开个内阁：我们该不该把 monorepo 拆成多仓库？

**升档**（默认 4 席 ×1 轮，升档只能手动；主持人会重取进阶档完整计划后续跑）：

> 开内阁，用进阶档：这个微服务改造方案有哪些风险？

**轮间介入**：首轮立场书出来后议事会停下等你，可以说：

- `进二轮` — 组织交叉质询
- `点名 成本官：砍一半预算的版本具体长什么样？` — 追问某席
- `合议` — 跳过质询直接出议定书
- `散会` / `就按X办` — 立即出简版议定书并终止

## 模型混编（强烈建议）

混编按**各席实际解析到的模型**判定（智能体定义默认模型含专职席钉扎 ∪
Task.model 覆盖 ∪ 会话继承）。两条实现路径任选：多个 provider 家族的模型
标记 `availableForSubagents`；或不同子智能体定义钉扎不同家族默认模型
（专职阁员即为此设计——cabinet-feng 与会话异源是铁律）。全部席位实际
同一家族时，披露"单源模型分角色推演"后继续。

## 档位与预算

<!-- tiers-table:begin GENERATED FROM config/tiers.json — scripts/generate.mjs -->
| 档位 | 配置 | 名义 token / 次数 | 次均成本 | 调用轨（执法轨） | token 轨（参考轨） |
|------|------|------------------|---------|------------------|-------------------|
| standard（默认） | 4 席 × 1 轮 | 14K / 4 次 | 3.5K/次 | 9 次委派 | 19K |
| advanced（手动） | 5 席 × 2 轮 | 45K / 10 次 | 4.5K/次 | 16 次委派 | 54K |
| max（手动） | 6 席 × 2 轮 | 55K / 12 次 | ≈4.6K/次 | 19 次委派 | 65K |
<!-- tiers-table:end -->

调用轨公式：cap = 名义 + 一整轮重派 + 1（余量依据 = 1 场实跑观测 + 1 条
档案在册的自述记录，reassigns 分母 ≥5 场前数值暂定）。记账口径：只计
子智能体 Task 委派，主持人回合不计；每次重派计 cost.reassigns。token 轨
入账不中止（校准口径"摘录兜底"；R2 全文优先约 ×1.8 属预期超支），逐场写
cost.deviation。提前收敛：0 分歧直接合议、1 分歧停等跳质询（R1 后必停
优先）；升档仅手动且即切换预算。

## 产出物

- 会话内：议定书（结构化 protocol.json，schemaVersion 2，速览 ≤300 字；
  字段清单以 main.js 内 schema 模板为单一事实源）。
- 落盘：项目工作区 `.cabinet/<时间戳>-<slug>/`（round-N.jsonl、
  protocol.json、运行日志 events.jsonl、跨会话索引 index.jsonl）。

## 角色包与专职席

- 固定席：红队批判官（完整角色卡见主技能；首选专职席 cabinet-feng，
  异源铁律；任何议题不可缺席）
- `roles-coding`：架构官（远）/ 工程官（谋）/ 成本官（众）
- `roles-writing`：立意官（远）/ 结构官（谋）/ 读者代理（众）/ 事实核查官（据）
- `roles-research`（通用默认）：正方（远）/ 反方（红队占用锋时走征召）/
  方法审查官（谋）/ 信源核查官（据）
- 席位不足补位顺序：未在场专职席（据/众通用候补）→ 邻近角色包选调 →
  通用席；补位不得复用在场智能体（除非异源并披露）

自定义角色：在 `skills/roles/` 添加角色卡文件并在 `manifest.json` 登记
即可（发布门对用户新增卡仅警告不拦截）。

## 发布门

`tests/verify.mjs`（Node 单文件，跨平台）：执行被验对象（node --check +
冒烟阻断）、manifest↔main.js JSON 语义比对、TIERS 公式机检、
resume 白名单分级、旧过时 schema 表述零容忍；输出留档默认写包外
（`--out=` 可指定）。改动任何文件后先跑 `node tests/verify.mjs` 全绿再打包。
`scripts/audit.mjs`（v0.3.2 新增）：归档对账器——按场核对 dispatch: 事件数
与 cost.calls、beyond_preanswer 恒 null 绊网、必备归档件齐备；议事归档后跑
`node scripts/audit.mjs`，把结论写入 index.jsonl 的 audit 列。

## 上线后校准（改判率）

同一议题先跑直答得 A 案、开阁得 B 案，用户盲选并勾"是否改变原决定"
（无回填样本作废）。双指标：**改判率**与**劣化率**，主动盲评累计
n≥40 后评判（出处：设计方案 v0.4 §十三）；**劣化率 ≥ 改判率即撤出默认
触发路径**。主动盲评预算封顶 ≈400K（每组 = standard B 案参考轨 19K ×
≤20 组）；M1′ 阶段校准数据一律标"参考"；议定书 cost.deviation 逐场落
实际/cap 偏差率，供成本自校准。

## 已知边界（M1′ 阶段）

- 预算硬顶、cites/字数校验是编排计划中的规则文本，由父智能体自律执行，
  无代码门执法；M2′ 将固化 `cabinet_archive` + `cabinet_protocol` 两件
  代码门（第一步先做数据件真源 config/tiers.json + schemas/
  protocol-v2.json；开工前过前置六问）。
- token 参考轨无量测手段（主持人不可观测子智能体内部消耗）；TaskWait
  是否返回 usage 字段待实跑确认后成文。
- v0.2.1 分支覆盖：E7（收敛边界）/N2（超时续等）/degraded 三分支未实跑，
  版本维持 rc 标注至分支覆盖声明（覆盖记录见设计方案 v0.4 附录 C）。
- 二轮与点名追问依赖"全新委派+内嵌原文"，每席每次续谈都是冷启动；
  宿主若在未来版本支持跨回合 resume，可优化为续谈省 token。
- Plan 模式下宿主禁用插件工具，仅 Agent 模式可用。
- 归档依赖父智能体自身的工作区文件工具，归档失败不阻断议定书。

## 阁员模型面板（0.3.0 新增）

右侧工作面板「内阁·阁员模型」（contributes.views + ui.view）：
列出八个 cabinet-* 阁员的当前 model 钉扎、建议家族/建议 thinkingLevel
（静态嵌入，与 ministers/README 同源，verify 断言逐字一致）、异源警示
（锋 vs 会话模型）与模型下拉（数据源 pi.models.list，过滤
availableForSubagents；含"继承会话默认"=删除 model 行）。

- **写侧**：保存仅改 frontmatter `model` 行（切段封口，正文与
  thinkingLevel 逐字节不动；CRLF 保留）；格式正则硬闸 + 清单命中软校验
  （notInList 黄条，下一场开场披露核对）；**下一场议事生效**（进行中
  场次按开场快照执行——F6-01）。
- **授权**：首次使用选 `%USERPROFILE%\.agents\subagents` 目录
  （userSelected root，scope cabinet-*.md）；后缀异常黄条强确认；
  宿主重启后授权失效需一键重授权（宿主内存态）。
- **两轨同步**：改定后「导出变更包」（散件，落插件数据目录
  exports/<时间戳>/，写不可用时自动降级平铺/桌面）拷回 D 盘 ministers/
  并跑 ministers-check.ps1；指纹脏标提示"改定后未导出"。
- **审计**：每次改定追加 model-changes.jsonl（插件数据目录；写不可用
  时回退插件 settings 存储），即视为完成 v0.4 §16.3 钉扎变更追记。
- 本面板为《Cabinet-0.3.0-面板设计方案.md》（修订版 1.1）的落地件；
  议事编排主路径（start 工具/技能/预算）自 0.2.7 未动。
