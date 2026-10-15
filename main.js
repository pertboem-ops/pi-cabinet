/**
 * Cabinet 内阁议事插件入口。
 * 注册一个编排计划生成器工具：不自己派发子智能体，只返回完整议事编排计划，
 * 由父智能体用 Task / TaskWait 执行。
 *
 * 结构借鉴官方 examples/plugins/roundtable。宿主注入全局 `pi`。
 *
 * v0.2.3 依据第三场审议（20261006-132753，28 项发现）与 v0.4 方案修订，
 * 并入原 v0.2.2 积压（批次 A/B）：
 * - F-08 token 参考轨 18K→19K（取整规则统一：标称×1.1+次均成本，四舍五入
 *   至千位）；TIERS 增 nominalTokens 与次均成本，供发布门机检公式。
 * - F-04 余量依据措辞降级："1 场实跑观测 + 1 条档案在册的自述记录
 *   （v1 原型报告，转述级，非独立核验）"，不再称"两次独立观测"。
 * - F-19/C4 events 规范 v1.1：phase 枚举 10 值（+steering/upgrade）、
 *   seq0 元数据行豁免、事后补录 t 须标 t_type:"lower-bound"。
 * - F-05 cost 增可选字段 reassigns（灾备率分母，自第三场起记账）。
 * - §16.4 专职席档位：映射两级化（首选专职席 cabinet-feng/ju/mou/yuan/zhong
 *   → 能力偏好征召）+ 三维不重合检查（气质×立场×模型，组阁后必做）；
 *   补位优先取未在场专职席（据/众为通用候补）。
 * - F-01/F-14 发布门迁 Node（tests/verify.mjs + tests/smoke.mjs）：
 *   门执行被验对象、JSON 语义比对、公式机检、resume 白名单分级
 *  （自带角色包零容忍/用户新增卡仅警告）；TIERS 导出供门消费。
 * - 沿用 v0.2.0 主路径：续谈一律全新委派 + 简报内嵌原文；不使用 resume
 *   （停等边界后委派链重建读作 interrupted；首场实跑观测 + v1 报告自述记录）。
 *
 * v0.2.6（第六场审议 20261006-205335 吸收，P6-3/P6-8）：
 * - 预算纪律增"议程闭合时在 disclosure 记'X'"半句
 *   （N＝cap−calls；不结转不交易、机会成本记 0 但必须写出）。
 *
 * v0.2.4（第五场审议 20261006-163159 吸收，R5-03/R5-06）：
 * - R5-03 "超限截断"文案废止：立场书超限按目标值对待，如实标注
 *   over_limit、不截断归档（对齐 v0.4 方案 §六"诚实优先于整洁"）。
 * - R5-06 三维不重合检查从提示语升级为纯函数 checkSeatDimensions
 *   （无 I/O，smoke 注入负向用例——构造不出 FAIL 用例的检查不得宣称
 *   存在）；开场披露必含"设计钉扎 model vs 实际解析 model"逐席对照。
 *
 * M1′ 阶段约束：本文件只做纯字符串模板与纯函数，无 I/O、无状态；
 * 预算硬顶与转写校验在此阶段是计划文本中的规则，M2′ 才固化为代码门。
 */

// 双轨预算（v0.4 方案 §五）：
// - 调用轨 = 执法轨（硬顶）：cap = 名义 + 一整轮重派 + 1（+1 挂 F2 级联——
//   送达核对重取失败 → 缺员重派的那一次）。余量依据 = 1 场实跑观测
//  （2026-10-06 首场：一次灾备恰好耗尽无余量额度）+ 1 条档案在册的自述
//   记录（v1 原型报告，转述级，非独立核验）；数值在灾备率分母
//  （protocol.cost.reassigns）≥5 场前为暂定值。
// - token 轨 = 参考轨（软指标）：入账不中止；数值 = 标称×1.1 + 次均成本，
//   四舍五入至千位（14K:15400+3500=18900→19K；45K:49500+4500=54K；
//   55K:60500+4583=65083→65K）。校准口径为"摘录兜底"；R2 全文优先时
//   简报约 ×1.8（第三场 deviation 1.31 实测）。
// >>> TIERS — GENERATED FROM config/tiers.json by scripts/generate.mjs — DO NOT EDIT
// （数值由数据件渲染，运行时不读文件——M1′ 无 I/O 不变量保持）
const TIERS = {
  standard: {
    seats: 4,
    rounds: 1,
    nominalTokens: 14000,
    tokenCap: 19000,
    callCap: 9, // 名义 4 + 一整轮重派 4 + 1（F2 级联）
    nominal: "4 次",
    estimate: "约 14K token / 4 次调用 / 约 60 秒",
  },
  advanced: {
    seats: 5,
    rounds: 2,
    nominalTokens: 45000,
    tokenCap: 54000,
    callCap: 16, // 名义 10（5席×2轮）+ 一整轮重派 5 + 1（F2 级联）
    nominal: "10 次",
    estimate: "约 45K token / 10 次调用 / 约 80-90 秒",
  },
  max: {
    seats: 6,
    rounds: 2,
    nominalTokens: 55000,
    tokenCap: 65000,
    callCap: 19, // 名义 12（6席×2轮）+ 一整轮重派 6 + 1（F2 级联）
    nominal: "12 次",
    estimate: "约 55K token / 12 次调用 / 约 2 分钟",
  },
};

// 预答席独立预算轨（默认关；v0.4.0＝2120 场重启设计 v3 §二-2）
const PREANSWER = {"enabled":false,"calls":1,"tokens":3500};
// <<< TIERS

const SCENE_ROLE_PACKS = {
  coding: "roles-coding",
  writing: "roles-writing",
  research: "roles-research",
  general: "roles-research",
};

// —— 0.3.0 面板通道依赖：SHA-256 指纹（纯计算，非 I/O；M1' 不变量不受影响）——
const { createHash } = require("node:crypto");
function sha256Hex(s) {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function resolveTier(tier) {
  return TIERS[tier] || TIERS.standard;
}

// —— §16.4 三维不重合检查（v0.2.4 起为纯函数；R5-06：smoke 注入负向用例）——
// 模型家族口径：provider 前缀（id 斜杠前）——zai-coding-plan/* 同家族、
// kimi-for-coding/* 同家族、deepseek/* 同家族。
function modelFamily(model) {
  const s = typeof model === 'string' ? model.trim() : '';
  return s.includes('/') ? s.split('/')[0] : s;
}

/**
 * 三维不重合检查（组阁后必做）。纯函数、无 I/O；判据见 v0.4 方案 §16.4。
 * @param {Array<{seat:string, temperament?:string, stance?:string, model:string, isRedTeam?:boolean}>} seats
 * @param {string} sessionModel 会话当前模型 id（红队异源铁律的对照物）
 * @returns {{pass:boolean, failures:string[]}}
 */
function checkSeatDimensions(seats, sessionModel) {
  if (!Array.isArray(seats) || seats.length === 0) {
    return { pass: false, failures: ['组阁名单为空或非法'] };
  }
  const failures = [];
  const uniqCount = (key) =>
    new Set(seats.map((s) => s?.[key]).filter((v) => v !== undefined && v !== null && v !== '')).size;
  if (seats.length > 1 && uniqCount('temperament') < 2) {
    failures.push('气质维全重合：在场专职席气质全部相同');
  }
  if (seats.length > 1 && uniqCount('stance') < 2) {
    failures.push('立场维全重合：角色卡锚点全部相同');
  }
  const families = new Set(seats.map((s) => modelFamily(s?.model)).filter(Boolean));
  if (families.size < 2) {
    failures.push('模型维全重合：各席实际解析模型 <2 个 provider 家族');
  }
  const red = seats.find((s) => s?.isRedTeam);
  if (red && sessionModel && modelFamily(red.model) === modelFamily(sessionModel)) {
    failures.push('红队异源铁律被违反：红队批判官与会话模型同源');
  }
  return { pass: failures.length === 0, failures };
}

/**
 * 生成议事编排计划。计划是自包含的：父智能体读完后不再需要本插件
 * 的任何其他输入即可执行全场议事。
 */
function buildInstruction({ topic, scene, roles, tier, goal }) {
  const t = resolveTier(tier);
  const sceneKey = SCENE_ROLE_PACKS[scene] ? scene : "general";
  const rolePackId = SCENE_ROLE_PACKS[sceneKey];
  const customRoles = Array.isArray(roles) && roles.length > 0 ? roles : null;
  const goalLine = goal
    ? `本场议事必须产出：${goal}`
    : "本场议事应收敛为一份明确、可执行的结论；无法收敛时如实记录分歧状态，不强行凑共识。";
  // v0.4.0 预答轨（20261013-2120 场重启设计 v3，docs/重启设计-v3.md）：
  // 默认关；用户改 config/tiers.json preanswer.enabled=true 并重渲后下一场生效
  // （选材机械化：逐场显式开启，无"适合议题"筛选条款——禁裁量）。
  const preOn = typeof PREANSWER !== "undefined" && PREANSWER.enabled === true;

  return [
    `## 内阁议事编排计划`,
    ``,
    `**议题：** ${topic}`,
    `**场景：** ${sceneKey}（角色包技能 id：${rolePackId}）`,
    `**档位：** ${tier || "standard"} = ${t.seats} 席 × ${t.rounds} 轮`,
    `**预算：** 调用轨（执法轨，触顶即中止）${t.callCap} 次子智能体委派（= 名义 ${t.nominal} + 一整轮重派 + 1）；`,
    `token 轨（参考轨，软指标，入账不中止）${t.tokenCap}（= 标称 ${t.nominalTokens / 1000}K ×1.1 + 次均成本，四舍五入至千位）。`,
    preOn
      ? `**预答轨（独立计数器，本场已开启）**：预答席 1 次委派单独记账（cap ${PREANSWER.calls} 次委派 / 参考 ${PREANSWER.tokens} token），不占席位轨调用额度。（v0.4.0＝2120 场 v3 §二-2）`
      : null,
    `**记账口径：** 只计 Task 子智能体委派与子智能体 token；主持人自身回合、插件工具调用不计。`,
    goalLine,
    ``,
    `严格按以下步骤执行。阁员之间不直接通信，你是唯一的集成点。`,
    ``,
    `### 第 0 步 — 前置检查（必须先做，缺一不可）`,
    ``,
    `1. **模式检查**：若当前处于 Plan 模式，停止并告知用户"内阁议事仅在 Agent 模式下可用，请切换后重试"。`,
    `2. **加载角色包**：用 Skill 工具加载技能 ${rolePackId}，取得本场席位定义。`,
    customRoles
      ? `   用户指定了席位：${customRoles.map((r) => `"${r}"`).join(", ")}。用指定席位覆盖角色包默认席位，但**红队批判官必须保留**。`
      : `   按角色包默认席位组阁，共 ${t.seats} 席（含固定席：红队批判官）。`,
    `3. **智能体映射（两级：首选专职席 → 能力偏好征召）与三维不重合检查**：`,
    `   - 若会话委派目录中存在 cabinet 专职阁员（cabinet-feng 锋 / cabinet-ju 据 /`,
    `     cabinet-mou 谋 / cabinet-yuan 远 / cabinet-zhong 众），各席位优先按角色卡`,
    `     "首选专职席"行映射；**同一专职席同场不兼任两席**——被占用或缺失的席位按`,
    `     角色卡"能力需求与偏好"征召在场智能体。`,
    `   - 无任何专职席时全部走征召（零配置回退，机制不变）。`,
    `   - 映射后核对实际工具面（能读文件/能检索）；可达性按"智能体 × 路径 × 轮次"`,
    `     三维看待，不假设 R1 可达则 R2 可达。`,
    `   - **三维不重合检查（组阁后必做；判据＝本插件导出的 checkSeatDimensions 纯函数，可测）**：`,
    `     气质维（在场专职席气质不全同）、立场维（角色卡锚点不全同）、模型维`,
    `    （各席实际解析模型 ≥2 个 provider 家族，红队异源）。某维全重合 → 至少换一席`,
    `     （专职席候补或征召池），并在 events.jsonl 记录换席原因。`,
    `   - **开场披露必含一行**：逐席"设计钉扎 model（ministers/ 定义）vs 实际解析`,
    `     model"对照——有失配即记入 protocol.disclosure；只列自报模型清单不算 diff。`,
    `4. **模型混编检查（按各席实际解析到的模型判定，不是只看委派目录）**：`,
    `   - 盘点各席将实际使用的模型：智能体定义默认模型（含专职席钉扎）∪ Task.model 覆盖 ∪ 会话继承。`,
    `   - 实际模型覆盖 ≥2 个 provider 家族 = 已混编——经智能体默认模型达成的混编同样有效；`,
    `     委派目录支持时可用 Task.model 显式指定异源，红队批判官优先异源。`,
    `   - 全部席位实际解析到同一家族 = 单源：开场披露"当前为单源模型分角色推演，视角差异`,
    `     来自角色卡而非模型差异"后继续。**委派目录为空 ≠ 单源**——先看各席实际模型再下结论。`,
    `5. **开场披露**：向用户输出一行说明——"本场议事阁员为 AI 分角色推演，价值在强制多视角，不代表独立专家意见。"`,
    ``,
    ...(preOn
      ? [
          `### 第 0.6 步 — 预答席（封存预答；本场用户已显式开启）`,
          ``,
          `在派发任何议事席位**之前**，先串行完成预答席工序（不得与席位派发并发）：`,
          `1. **裸议题**：把议题改写为决策问题本体——剥离前案场次编号、缓建/否决理由与门槛措辞、用户倾向词；反事实检验（删句后预答席仍能陈述问题与约束即合格）；改写文本写入 events.jsonl（event 前缀 preanswer:topic-bare）。`,
          `2. **派发预答席**：1 个子智能体，异 provider 家族且与在场席同档思考强度；简报硬条款——全文自写平台临时区 sealed/<场id>.md（不可写则回退 .cabinet/<场id>/sealed/ 并在 disclosure 记 fallback）；**最终回复仅含 {sha256, 字数, model, effort} 四元组，禁止复述任何内容句**。`,
          `3. **封存**：你只把四元组写入 events.jsonl（phash 行，t+hash 双锚、实时记录、不含路径——路径由场 id 确定性派生）；预答席不入席位名单、不进任何席位简报、不参与质询。`,
          `4. **启封**：挂"R1 后必停"停等点由用户选择是否启封（不新增停等点）；启封时重算哈希，错配记 tamper 事件并降级该预答为不可用。`,
          `5. **收敛**：启封后你作三态处置（采纳某点/分歧存照/整体否决）＋议定书 provenance 块（行数=decisions 条数，缺行标 provenance_incomplete:true；decision-log 非证据，禁趋势/聚合引用）。`,
          `6. **放弃声明（成文措辞，不写"双轨"）**：议定书必含——"本变体不测量。'超出合议的异源增量'轨无仪器，明示放弃而非回答；预答产出仅限收敛参考与退场触发；预答-合议一致不计印证。"`,
          `7. **停用判据（先冻结后启用）**：T1 连续 3 场"采纳某点"计 0 → 自动停用（index 记 stop:ritual-3zero）；T2 连续 3 场"整体否决" → 同；T3 预答轨超支且处置∈{存照,否决} 计 waste、3 场 ≥2 次 → 停用复审。停用只作退场触发、永不作升格依据；复审由不启用预答席的下一场议事执行（2026-10-13 用户裁定 A+C）。`,
          ``,
        ]
      : []),
    `### 第 1 步 — 第一轮：独立立场书（并发派发 ${t.seats} 个 Task）`,
    ``,
    `每个 Task 的简报必须包含：`,
    `- 该席的角色卡全文（职责 / 立场锚点 / 必答一问 / 异质锚点与驳论义务 / 首选专职席与能力偏好）。`,
    `- 议题原文："${topic}"。`,
    `- 全部其他席位名单（仅名单，不含他人立场）。`,
    `- 需要核验的文件：优先**把关键片段直接内嵌进简报**，或将材料复制进工作区后给绝对路径`,
    `  （外部路径受智能体根目录权限约束且随轮次漂移，不可达时该席声明"以简报材料为据"）。`,
    `- 输出格式要求：立场书 ≤600 字（目标值；超限如实标注 over_limit、不截断归档）；结尾给出该席**最坚持的一点**与`,
    `  **最没把握的一点**；关键论据标注证据等级——【核验】亲自读文件/跑命令验证过、`,
    `  【推断】由材料推理、【转述】引自他席或外部来源。`,
    `- 检索纪律：阁员做工作区级 Grep 复核时排除 .cabinet 归档目录（限定活文件路径或用排除模式）。`,
    ``,
    `全部席位**同时**派发，然后用 TaskWait 收齐。`,
    ``,
    `**TaskWait 送达核对与超时语义（每轮必做）**：TaskWait 返回后与派出名单逐一核对；`,
    `缺席者先用 TaskList 查状态——状态 completed 而报告缺失的，按 delegationId 重取一次，`,
    `仍取不到按缺员处理。**TaskWait 超时 ≠ 席位失败**：超时且仍在运行 → 续等一次；`,
    `二次超时或确认失败/中断 → 按缺员重派（全新委派 + 简报内嵌该席已有材料，计 reassigns）。`,
    ``,
    `**缺员处理**：某席确认缺席，在速览中标注"缺席"，剩余席位照常议事；`,
    `到场不足 3 席时，议定书标记 degraded: true。`,
    ``,
    `### 第 2 步 — 立场速览与中止点（**必须停下等用户**）`,
    ``,
    `收齐并核对后输出立场速览：每席 ≤100 字摘要 + 两栏对举（v0.3.1 起，议定 20261013-0037 P1）——`,
    `- **共识面**：逐条列出两席及以上立场重合的命题，每条 = text＋votes（支持席位名单）＋strength＋阶段标注。`,
    `  strength 由计数机械派生（分母=到场且显式涉及该命题的席数；未涉及者单列「未表态」，不入分母不计支持；缺席席枚举名单）：全同→[全场一致]；严格过半非全同→[多数 n/m]；无严格过半（2:2、2:1:1 等并列）→[分裂]。`,
    `  每条注 [R1 未质询]/[R2 已质询]；[全场一致] 条目旁附伪多样性警示（全场一致≠正确，先查席位异源性）。`,
    `  共识面只读、不构成跳轮依据——跳轮仍只看实质分歧条数。`,
    `- **分歧面**：你判定的实质分歧点清单（编号，标对立席位）。`,
    `空面注记：0 条分歧记"首轮即收敛"、共识面记"未采集"，禁止由 0 分歧推强度；共识面为空记"无实质共识"。`,
    `然后**停止推进**，向用户给出选择：`,
    ``,
    ...(t.rounds > 1
      ? [
          `- "进二轮"：按分歧点组织交叉质询（默认动作，用户无回复时不擅自继续）。`,
        ]
      : [
          `- "升档到进阶"：重新调用 plugin_local_cabinet_start（tier="advanced"、topic 不变）`,
          `  取得含二轮规程的完整计划，按新计划续跑；预算切换为 54K/16 次，已消耗计入。`,
        ]),
    `- "点名 X：问题"：指定某席回答一个追问（全新委派该席，简报内嵌其 R1 立场书原文 + 问题）。`,
    `- "合议"：跳过质询直接出议定书。`,
    `- "散会" / "就按X办"：立即输出简版议定书并终止。`,
    ``,
    `**提前收敛边界（优先级裁定：R1 后必停 > 提前收敛自动跳轮 > 预算切换）**：`,
    `实质分歧恰 1 条 → 跳过质询，但仍须输出速览后**停等用户**；0 条 → 注明"首轮即收敛"直接合议。`,
    `降档自动、升档手动。`,
    ``,
    ...(t.rounds > 1
      ? [
          `### 第 3 步 — 第二轮：交叉质询（全新委派 + 内嵌原文）`,
          ``,
          `**不要使用 resume**：停等边界之后的委派链不可续谈（会读作 interrupted）。`,
          `**攻击面（全文优先、摘录兜底）**：预算允许时，每席简报内嵌**全部**其他席位 R1 立场书`,
          `原文 + 指定质询点；不可行时至少内嵌指定质询点原文 + 其余席位速览，并在议定书披露`,
          `"本轮行使了摘录选择权"。`,
          ``,
          `对每个需要质询的席位，发一个**全新 Task**，简报包含：`,
          `- 该席自己的 R1 立场书**原文**（逐字内嵌，保证立场连续性）。`,
          `- 按上述攻击面规则提供的其他席位材料 + 你的质询问题。`,
          `- 输出格式要求：先引原文再反驳；每条反驳以 cites: ["席位名#R1-第N点"] 收尾（引用带轮次场次）；`,
          `  被说服时明确说"接受此点"并修正立场，不许和稀泥；关键论据同样标注证据等级。`,
          ``,
          `质询材料只做排序传递，**不做语义压缩**——引用必须逐字。`,
          `**升档新增席位**（如有）：跳过 R1，直接以二轮身份入席，简报内嵌全部 R1 立场书；`,
          `补位优先取未在场的专职席（据/众为通用候补），其次跨包选调，disclosure 注明来源。`,
          ``,
        ]
      : []),
    `### 第 ${t.rounds > 1 ? 4 : 3} 步 — 合议与议定书`,
    ``,
    `汇总全部材料，输出议定书（速览 ≤300 字在前，明细在后），protocol.json 按此 schema：`,
    ``,
    `\`\`\`json`,
    `{`,
    `  "schemaVersion": 2,`,
    `  "session": "<时间戳>-<slug>",`,
    `  "tier": "<档位，含升档路径如 standard→advanced>",`,
    `  "topic": "${topic.slice(0, 60)}",`,
    `  "brief": "<≤300 字速览>",`,
    `  "seats": [{"seat": "...", "agent": "...", "model": "...", "conclusion": "...（关键论据带证据等级）"}],`,
    `  "consensus": [{"text": "...", "votes": ["支持席位名单"], "strength": "全场一致|多数|分裂（计数派生）", "stage": "R1未质询|R2已质询"}],`,
    `  "beyond_preanswer": { "count": null, "items": [] },  // 占位列（2233 P3 绊网）：恒 null，禁止回填；升格须显式改 verify 断言`,
    preOn
      ? `  "provenance": [{"clause": "P1…", "source": "preanswer_only|synthesis_only|both", "disposition": "采纳|存照|否决"}],  // 预答席启用场必填：行数=decisions 条数（机械完备判据），缺行标 provenance_incomplete:true；decision-log 非证据`
      : null,
    `  "divergence": [{"status": "未弥合|部分弥合|已解决|新发现", "text": "..."}],`,
    `  "decisions": ["<议定条款，编号 P1...>"],`,
    `  "actions": [{"item": "...", "owner": "...", "due": "..."}],`,
    `  "dissent": ["<保留意见>"],`,
    `  "disclosure": "AI 分角色推演 + 各席 provider/model + 单/多源说明 + 补位席注明",`,
    `  "degraded": false,`,
    `  "cost": {"calls": 0, "tokens_est": "...", "cap": "${t.callCap} 次委派 / ${t.tokenCap} token(参考)", "cap_hit": false, "deviation": "calls 与 tokens_est 相对 cap 的实际比值", "reassigns": 0},`,
    `  "archived": true`,
    `}`,
    `\`\`\``,
    ``,
    `硬性规则：**分歧字段为空且未注明"首轮即收敛"不得合议**（须返回补议）；缺 cites 的质询回应`,
    `标注 "cites_missing": true 入档并在议定书披露，不静默接受；跨会话引用必须标注来源会话 id。`,
    ``,
    `### 第 ${t.rounds > 1 ? 5 : 4} 步 — 归档`,
    ``,
    `用你自己的文件工具在项目工作区写入：`,
    ``,
    `\`\`\``,
    `.cabinet/<时间戳>-<slug>/`,
    `├── round-1.jsonl   # 各席立场书原文（席/agent/model/字数/证据等级）`,
    t.rounds > 1 ? `├── round-2.jsonl   # 各席质询回应（含 cites，缺失者标 cites_missing）` : null,
    `├── protocol.json   # 上文 schema v2 全字段`,
    `├── events.jsonl    # 运行日志：每行 {seq, t, phase, actor, event, detail?, delegationId?}；`,
    `│                   #   t=ISO-8601 时刻（实时记录优先；事后补录取可证实下界并标 "t_type":"lower-bound"，`,
    `│                   #   不得无标注混用）；首行允许一条 session_meta 元数据行（豁免"每行一事件"）；`,
    `│                   #   phase=intake|setup|R1|R2|steering|upgrade|synthesis|archive|close|cost；`,
    `│                   #   至少覆盖：技能/工具激活、席位映射与三维不重合检查、每次派发、送达核对、故障、`,
    `│                   #   停等与用户裁决、预算切换、归档写入与校验、成本决算`,
    `└── index.jsonl     # 追加一行：ts/session/topic/tier/seats/verdict/files/source_doc`,
    `\`\`\``,
    ``,
    `归档失败不阻断议定书输出，在议定书末尾标注 archived: false 及原因。`,
    ``,
    `### 全程预算纪律`,
    ``,
    `- **调用轨 = 执法轨**：逐次委派记账（Task 委派计数），触达 ${t.callCap} 次立即中止议事——`,
    preOn
      ? `- **双计数器（本场预答开启）**：预答席委派单独记账（预答轨 cap ${PREANSWER.calls} 次委派）；席位轨 ${t.callCap} 次与预答轨互不占用，任一轨触顶即中止对应流程。`
      : null,
    `  以已收材料合成部分议定书，不追加委派、不询问用户。余量依据：1 场实跑观测（首场：`,
    `  一次灾备恰好耗尽无余量额度）+ 1 条档案在册的自述记录（v1 原型报告，转述级，非独立核验）；`,
    `  数值在 reassigns 分母 ≥5 场前为暂定。**议程闭合时在 disclosure 记"调用轨未用 N 次"`,
    `  （N＝cap−calls；未动用额度不结转不交易、机会成本记 0，但必须写出——第六场 P6-8）。**`,
    `- **token 轨 = 参考轨（软指标）**：入账不中止；逐场写入 cost.deviation 供成本自校准；`,
    `  量测以接口口径（简报出 + 报告入）为准，子智能体内部读取不可观测时如实注明；`,
    `  R2 全文优先时简报约 ×1.8，属预期超支。`,
    `- **升档即切换预算**：重调本工具（tier="advanced"、topic 不变）取新档计划，已消耗计入新档额度。`,
    `- 429 / 配额失败：换实际同家族其他模型重试 1 次（计入委派计数），仍败按缺员处理。`,
    `- 席位失败 / 二次超时：全新委派重派，简报内嵌该席已有材料，计 reassigns——预算已留一整轮`,
    `  重派余量，属常规动作。`,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join("\n");
}

async function onLoad() {
  await pi.agent.registerTool({
    name: "start",
    description: "开启一场内阁议事：输入议题与场景，返回完整的议事编排计划（席位、模型混编规则、轮次、预算硬顶、中止点）；执行规程见技能 cabinet",
    risk: "low",
    schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "议事议题，应是一个需要权衡的决策或问题，而非事实查询",
        },
        scene: {
          type: "string",
          enum: ["coding", "writing", "research", "general"],
          description: "议题场景，决定角色包与评分卡维度；缺省 = general（roles-research 通用包），由调用方按议题自行选择",
        },
        roles: {
          type: "array",
          items: { type: "string" },
          description: "自定义席位名单，覆盖场景角色包的默认席位；红队批判官为固定席不可移除",
        },
        tier: {
          type: "string",
          enum: ["standard", "advanced", "max"],
          description: "议事档位：standard=4席×1轮（默认）、advanced=5席×2轮、max=6席×2轮；升档只能由用户显式指定",
        },
        goal: {
          type: "string",
          description: "本场议事要产出什么，如'一份可执行的迁移方案'",
        },
      },
      required: ["topic"],
    },
    execute: async (args) => {
      const topic = String(args?.topic ?? "").trim();
      if (!topic) {
        return { ok: false, error: "topic is required" };
      }
      const instruction = buildInstruction({
        topic,
        scene: args?.scene,
        roles: args?.roles,
        tier: args?.tier,
        goal: args?.goal,
      });
      return {
        ok: true,
        instruction,
        pluginId: pi.plugin.getId(),
      };
    },
  });
}

async function onUnload() {
  await pi.agent.unregisterTool("start");
}

/**
 * ===== 0.3.0 面板通道（PM 系；修订版 1.1 方案 §五）=====
 *
 * M1′ 边界说明：start 编排工具维持"纯计划文本、无 I/O"不变量不动；
 * 本段是面板功能面的 I/O 通道（onPanelInvoke），两者在文件内隔离。
 *
 * 防御闸（方案 §五，P8-02/03/07）：
 * - 文件边界唯一真源 = PANEL_FILE_RE（fs scope glob 为宿主侧宽松上界）；
 * - 分层闸：模型 key 格式正则=硬闸；命中 models.list 清单=软校验
 *   （未命中仍保存，标 notInList——宿主 key 格式系单次观察非契约，P8-02）；
 * - 路径闸：授权目录后缀非 .agents\subagents → rootPathOk=false（UI 强确认）。
 * 指纹机制（P8-04）：本 root 八件内容哈希，与 settings.lastExportHash 比对
 * 得 dirtySinceLastExport；跨轨（D 盘）读取越 scope 不可行，指纹只覆盖
 * "本 root 自上次导出以来变过没有"。lastExportHash/grantedRoot 均存插件
 * settings——非跨机真源，换机即丢（方案 §2.6）。
 */

const PANEL_FILE_RE = /^cabinet-[a-z]+\.md$/; // 文件边界唯一真源（P8-07）
const MODEL_KEY_RE = /^[^\/]+\/[^\/]+$/; // provider/model 格式硬闸（P8-02）
const AUDIT_KEY = "modelChanges"; // settings 里的审计存储键（见 writeAuditLine 说明）
const AUDIT_TAIL = 500;

// 席位中文名（面板显示用；与 ministers/README 八席一致）
const SEAT_NAMES = {
  "cabinet-feng": "锋（红队攻击手）",
  "cabinet-ju": "据（证据官）",
  "cabinet-li": "立（正方）",
  "cabinet-mou": "谋（落地官）",
  "cabinet-yuan": "远（长期席）",
  "cabinet-zhong": "众（读者代理）",
  "cabinet-shen": "审（方法检察官）",
  "cabinet-gu": "骨（结构师）",
};

/**
 * 授权目录路径闸（P8-03/F8-01）。规范化（正斜杠→反斜杠、去尾分隔、
 * 小写）后判定后缀是否为 .agents\subagents。
 * 依赖"requestDirectory 返回可规范化的真实绝对路径"——方案 §十三.1-c
 * 装机实测项；实测不成立则 UI 降级为纯展示。
 */
function checkRootPath(rootPath) {
  const norm = String(rootPath || "")
    .replace(/\//g, "\\")
    .replace(/\\+$/, "")
    .toLowerCase();
  return norm.endsWith("\\.agents\\subagents") || norm === ".agents\\subagents";
}

/**
 * frontmatter 改写纯函数（P8-01：三操作全部限定首块 frontmatter；CRLF 行尾
 * 策略；正文中的行首 model: 不受影响；字面量拼接不走 RegExp 构造防注入）。
 * @returns {{ok:true, text:string} | {ok:false, error:string}}
 */
function rewriteFrontmatterModel(raw, newModel) {
  if (typeof raw !== "string" || !raw.startsWith("---")) {
    return { ok: false, error: "no frontmatter" };
  }
  const lines = raw.split("\n");
  if (lines[0].trimEnd() !== "---") return { ok: false, error: "no frontmatter" };
  let fmEnd = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trimEnd() === "---") { fmEnd = i; break; }
  }
  if (fmEnd < 0) return { ok: false, error: "unterminated frontmatter" };

  if (newModel === null || newModel === undefined) {
    for (let i = 1; i < fmEnd; i++) {
      if (/^model:/.test(lines[i])) {
        lines.splice(i, 1); // 删除整行（含其 \r，splice 按行取走）
        return { ok: true, text: lines.join("\n") };
      }
    }
    return { ok: true, text: raw }; // 无 model 行，无可删，原样返回
  }
  if (typeof newModel !== "string" || !MODEL_KEY_RE.test(newModel)) {
    return { ok: false, error: "bad model format" };
  }
  let modelIdx = -1;
  for (let i = 1; i < fmEnd; i++) {
    if (/^model:/.test(lines[i])) { modelIdx = i; break; }
  }
  // 行尾风格：目标行原带 \r，或（插入时）块内主流行尾
  const hadCR =
    modelIdx >= 0
      ? lines[modelIdx].endsWith("\r")
      : lines.slice(1, fmEnd).some((l) => l.endsWith("\r"));
  const newLine = "model: " + newModel + (hadCR ? "\r" : "");
  if (modelIdx >= 0) lines[modelIdx] = newLine;
  else lines.splice(fmEnd, 0, newLine); // 插在收束 --- 前一行
  return { ok: true, text: lines.join("\n") };
}

/**
 * 解析阁员定义首块 frontmatter 的关键字段（行级正则，不做完整 YAML——
 * 窄接口，与改写函数同一解析口径）。
 */
function parseMinisterFrontmatter(raw) {
  if (typeof raw !== "string" || !raw.startsWith("---")) return null;
  const lines = raw.split("\n");
  let fmEnd = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trimEnd() === "---") { fmEnd = i; break; }
  }
  if (fmEnd < 0) return null;
  const out = {};
  for (let i = 1; i < fmEnd; i++) {
    const m = lines[i].match(/^(name|model|thinkingLevel):\s*(.*)$/);
    if (m && out[m[1]] === undefined) out[m[1]] = m[2].trim() || null;
  }
  return out;
}

/** 本 root 八件内容指纹（P8-04）。entries: [{file, raw}]，按文件名排序后拼接。 */
function fingerprintSeats(entries) {
  let h = "";
  for (const e of [...entries].sort((a, b) => (a.file < b.file ? -1 : 1))) {
    h += e.file + "\u0000" + e.raw + "\u0000";
  }
  return sha256Hex(h);
}

// —— 面板通道内部辅助（均经 pi 宿主 API，无插件自有 fs 写入——裁定②）——

function joinPath(dir, name) {
  const d = String(dir || "").replace(/[\\/]+$/, "");
  return d + "\\" + name;
}

async function listSeatFiles() {
  // glob 为宽松上界（可匹配 cabinet-feng2.md 等），PANEL_FILE_RE 为唯一真源（P8-07）
  const all = await pi.fs.glob("cabinet-*.md");
  return (Array.isArray(all) ? all : [])
    .map((f) => String(f).replace(/^.*[\\/]/, ""))
    .filter((f) => PANEL_FILE_RE.test(f))
    .sort();
}

async function readSeats(rootPath) {
  const files = await listSeatFiles();
  const entries = [];
  for (const file of files) {
    const raw = await pi.fs.readText(joinPath(rootPath, file));
    const fm = parseMinisterFrontmatter(raw);
    entries.push({
      file,
      seat: SEAT_NAMES[file.replace(/\.md$/, "")] || file,
      model: fm?.model ?? null,
      thinkingLevel: fm?.thinkingLevel ?? null,
      raw,
    });
  }
  return entries;
}

/**
 * 审计落盘（P8-09）：优先追加 jsonl 到插件数据目录（getDataPath，走宿主
 * writeText）；数据目录写被拒时（§十三.1-d 实测失败形态）回退 settings
 * 存储（AUDIT_KEY 数组，尾截断 AUDIT_TAIL）——两态都算完成 §16.3 追记。
 */
async function writeAuditLine(entry) {
  const line = JSON.stringify(entry);
  const dataPath = await pi.plugin.getDataPath();
  if (dataPath) {
    try {
      const auditPath = joinPath(dataPath, "model-changes.jsonl");
      let prev = "";
      try { prev = await pi.fs.readText(auditPath); } catch { /* 首行 */ }
      await pi.fs.writeText(auditPath, prev + line + "\n");
      return { store: "jsonl", path: auditPath };
    } catch { /* 数据目录写不可用 → settings 回退 */ }
  }
  const settings = await pi.plugin.getSettings();
  const arr = Array.isArray(settings?.[AUDIT_KEY]) ? settings[AUDIT_KEY] : [];
  arr.push(entry);
  await pi.plugin.setSettings({ [AUDIT_KEY]: arr.slice(-AUDIT_TAIL) });
  return { store: "settings" };
}

async function readAuditTail(n = 20) {
  const dataPath = await pi.plugin.getDataPath();
  if (dataPath) {
    try {
      const text = await pi.fs.readText(joinPath(dataPath, "model-changes.jsonl"));
      return text.split("\n").filter(Boolean).slice(-n).map((l) => JSON.parse(l));
    } catch { /* 落 settings 态 */ }
  }
  const settings = await pi.plugin.getSettings();
  return (Array.isArray(settings?.[AUDIT_KEY]) ? settings[AUDIT_KEY] : []).slice(-n);
}

function stampLocal() {
  const d = new Date();
  const p = (x, w = 2) => String(x).padStart(w, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * 面板通道入口（宿主 panel.invoke 路由至此）。五通道见方案 §五表。
 * 全通道 try/catch 包裹——异常不裸穿 IPC，一律 {ok:false, error}。
 */
async function onPanelInvoke(channel, payload) {
  try {
    switch (channel) {
      case "cabinet/state": {
        const settings = await pi.plugin.getSettings();
        const rootPath = settings?.grantedRoot || null;
        let authorized = false;
        let seats = [];
        let fingerprint = null;
        try {
          seats = await readSeats(rootPath || "");
          authorized = seats.length > 0;
          fingerprint = fingerprintSeats(seats);
        } catch { authorized = false; }
        let models = [];
        let modelsError = null;
        try { models = await pi.models.list(); } catch (e) { models = []; modelsError = e?.message || String(e); }
        let sessionModelKey = null;
        try { sessionModelKey = (await pi.session.getLlmContext())?.modelKey ?? null; } catch { sessionModelKey = null; }
        const lastExportHash = settings?.lastExportHash || null;
        return {
          ok: true,
          authorized,
          rootPath,
          rootPathOk: rootPath ? checkRootPath(rootPath) : null,
          seats: seats.map(({ file, seat, model, thinkingLevel }) => ({ file, seat, model, thinkingLevel, family: modelFamily(model) })),
          models,
          modelsError,
          sessionModelKey,
          fingerprint,
          lastExportHash,
          dirtySinceLastExport:
            authorized && fingerprint && lastExportHash
              ? fingerprint !== lastExportHash
              : authorized && !lastExportHash, // 从未导出且已有授权内容 → 视为脏
          auditTail: await readAuditTail(),
        };
      }
      case "cabinet/authorize": {
        const picked = await pi.fs.requestDirectory();
        const rootPath = picked?.path || null;
        if (!rootPath) return { ok: false, error: "no directory picked" };
        await pi.plugin.setSettings({ grantedRoot: rootPath });
        return { ok: true, rootPath, rootPathOk: checkRootPath(rootPath) };
      }
      case "cabinet/save": {
        const settings = await pi.plugin.getSettings();
        const rootPath = settings?.grantedRoot || null;
        if (!rootPath) return { ok: false, error: "unauthorized" };
        const changes = Array.isArray(payload?.changes) ? payload.changes : [];
        if (changes.length === 0) return { ok: false, error: "empty changes" };
        let models = [];
        let modelsError = null;
        try { models = await pi.models.list(); } catch (e) { models = []; modelsError = e?.message || String(e); }
        const modelsAvailable = Array.isArray(models) && models.length > 0;
        const allKeys = new Set(models.map((m) => m?.key));
        const written = [];
        const notInList = [];
        for (const c of changes) {
          const file = String(c?.file || "");
          if (!PANEL_FILE_RE.test(file)) return { ok: false, error: `rejected file: ${file}` };
          if (file.includes("/") || file.includes("\\")) return { ok: false, error: `rejected file: ${file}` };
          const model = c?.model === null ? null : c?.model;
          if (model !== null && (typeof model !== "string" || !MODEL_KEY_RE.test(model))) {
            return { ok: false, error: `bad model format: ${model}` };
          }
          const fullPath = joinPath(rootPath, file);
          const raw = await pi.fs.readText(fullPath);
          const current = parseMinisterFrontmatter(raw)?.model ?? null;
          const r = rewriteFrontmatterModel(raw, model);
          if (!r.ok) return { ok: false, error: `${file}: ${r.error}` };
          await pi.fs.writeText(fullPath, r.text);
          written.push(file);
          // 清单不可用时无法判定命中——不标 notInList（避免误标合法值），透出 modelsUnavailable
          const inList = model === null || !modelsAvailable || allKeys.has(model);
          if (!inList) notInList.push({ file, model });
          await writeAuditLine({
            ts: new Date().toISOString(),
            agent: file.replace(/\.md$/, ""),
            from: current,
            to: model,
            ...(inList ? {} : { notInList: true }),
          });
        }
        return { ok: true, written: written.length, files: written, notInList, ...(modelsAvailable ? {} : { modelsUnavailable: modelsError || "models.list empty" }) };
      }
      case "cabinet/export": {
        const settings = await pi.plugin.getSettings();
        const rootPath = settings?.grantedRoot || null;
        if (!rootPath) return { ok: false, error: "unauthorized" };
        const seats = await readSeats(rootPath);
        if (seats.length === 0) return { ok: false, error: "no seats to export" };
        // 落点（PM-15：装机实证 root 外写被宿主硬拒"path escapes the plugin's
        // root"——开发模板文档"scope 外弹原生确认"与实际行为不符，桌面/数据
        // 目录路线废止；两级均在授权 root 内）：
        // ① <root>\exports\<时间戳>\ 八件原名（依赖宿主 writeText 自动建目录——未证实，试探）
        // ② <root>\cabinet-ministers-export-<时间戳>.txt 八件拼合单文件（文件头带拆分命令）
        const stamp = stampLocal();
        const subDir = joinPath(rootPath, "exports\\" + stamp);
        try {
          await pi.fs.writeText(joinPath(subDir, seats[0].file), seats[0].raw);
          for (const s of seats.slice(1)) {
            await pi.fs.writeText(joinPath(subDir, s.file), s.raw);
          }
          await pi.plugin.setSettings({ lastExportHash: fingerprintSeats(seats) });
          return { ok: true, kind: "dir", path: subDir, files: seats.length };
        } catch { /* 落 ② */ }
        const bundleName = "cabinet-ministers-export-" + stamp + ".txt";
        const header = [
          "# cabinet ministers export " + stamp,
          "# 八件阁员定义拼合文件。拆分命令（在目标目录执行，拆出八件原名 .md）：",
          "# pwsh -NoProfile -Command \"$t=Get-Content -Raw -LiteralPath '<本文件路径>'; foreach($m in [regex]::Matches($t,'(?s)>>>.?FILE:.?(\\S+\\\\.md)\\\\r?\\\\n(.*?)(?=\\\\r?\\\\n<<<.?END|\\\\z)')){ Set-Content -LiteralPath $m.Groups[1].Value -Value $m.Groups[2].Value -NoNewline -Encoding utf8 }\"",
          "",
        ].join("\n");
        const parts = [];
        for (const s of seats) {
          parts.push(">>> FILE: " + s.file + "\n" + s.raw + (s.raw.endsWith("\n") ? "" : "\n") + "<<< END");
        }
        try {
          await pi.fs.writeText(joinPath(rootPath, bundleName), header + parts.join("\n") + "\n");
        } catch (e) {
          return { ok: false, error: "export failed (root 内两级均不可写): " + (e?.message || e) };
        }
        await pi.plugin.setSettings({ lastExportHash: fingerprintSeats(seats) });
        return { ok: true, kind: "bundle", path: joinPath(rootPath, bundleName), files: seats.length };
      }
      case "cabinet/audit": {
        return { ok: true, entries: await readAuditTail(50) };
      }
      default:
        return { ok: false, error: `unknown channel: ${channel}` };
    }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

module.exports = {
  onLoad,
  onUnload,
  TIERS,
  PREANSWER,
  modelFamily,
  checkSeatDimensions,
  onPanelInvoke,
  rewriteFrontmatterModel,
  parseMinisterFrontmatter,
  checkRootPath,
  fingerprintSeats,
};
