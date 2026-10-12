#!/usr/bin/env node
/**
 * tests/smoke.mjs — Cabinet 发布门冒烟（F-02 修复件）
 * 固定 topic、逐项 PASS/FAIL 留档；被 tests/verify.mjs 作为阻断断言执行。
 * v0.2.4：默认留档改包外（V-02，与 verify 对齐）；增 R5-03 计划文本断言与
 * R5-06 三维检查纯函数正/负向用例（构造不出 FAIL 用例的检查不得宣称存在）。
 * 用法：node tests/smoke.mjs [--out=<目录>，默认包外 ../evidence-out]
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = (process.argv.find((a) => a.startsWith('--out=')) || '').slice(6) || path.join(pluginDir, '..', 'evidence-out');
const TOPIC = '发布门冒烟'; // 固定 topic：v0.2.1 字符数不可复现的根因是未记录 topic（F-02）

globalThis.pi = {
  agent: {
    registerTool: async (t) => { globalThis.__tool = t; },
    unregisterTool: async () => {},
  },
  plugin: { getId: () => 'local.cabinet' },
};

const require = createRequire(import.meta.url);
const main = require(path.join(pluginDir, 'main.js'));

const results = [];
let failed = 0;
function check(name, ok, detail = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`);
  if (!ok) failed++;
}

const plans = {};
await main.onLoad();
for (const tier of [undefined, 'advanced', 'max']) {
  const r = await globalThis.__tool.execute({ topic: TOPIC, scene: 'coding', tier });
  check(`计划生成 ${tier || 'standard'}`, r.ok === true && typeof r.instruction === 'string' && r.instruction.length > 3000);
  if (r.ok) plans[tier || 'standard'] = r.instruction;
}
const all = Object.values(plans).join('\n');
const { TIERS } = main;
const order = ['standard', 'advanced', 'max'];

// —— 数据件真源（批次 D 首件）：main.TIERS 与 config/tiers.json 双端一致 ——
const tiersFile = JSON.parse(fs.readFileSync(path.join(pluginDir, 'config', 'tiers.json'), 'utf8').replace(/^\uFEFF/, '')).tiers;
{
  const fields = ['seats', 'rounds', 'nominalTokens', 'tokenCap', 'callCap', 'nominal', 'estimate'];
  const diffs = [];
  for (const k of order) for (const f of fields) {
    if (TIERS[k]?.[f] !== tiersFile[k]?.[f]) diffs.push(`${k}.${f}`);
  }
  check('批次D① · main.TIERS == config/tiers.json（双端）', diffs.length === 0, diffs.join(','));
}
check('批次D① · 生成标记区在位（main.js）', fs.readFileSync(path.join(pluginDir, 'main.js'), 'utf8').includes('GENERATED FROM config/tiers.json'));

// —— TIERS 语义机检（公式即断言，F-14）——
for (const k of order) {
  const t = TIERS[k];
  const nominalCalls = t.seats * t.rounds;
  check(`${k} 调用轨公式 cap=名义+一整轮重派+1`, t.callCap === nominalCalls + t.seats + 1, `${t.callCap} vs ${nominalCalls + t.seats + 1}`);
  const expectToken = Math.round((t.nominalTokens * 1.1 + t.nominalTokens / nominalCalls) / 1000) * 1000;
  check(`${k} token 参考轨公式 标称×1.1+次均(四舍五入至千位)`, t.tokenCap === expectToken, `${t.tokenCap} vs ${expectToken}`);
}

// —— 计划内容断言（v0.2.3 关键规则）——
const C = {
  '调用轨执法轨定性': all.includes('调用轨（执法轨，触顶即中止）'),
  'token 参考轨软指标': all.includes('参考轨，软指标，入账不中止'),
  '两级映射：首选专职席': all.includes('首选专职席') && all.includes('cabinet-feng') && all.includes('cabinet-zhong'),
  '同一专职席不兼任两席': all.includes('同一专职席同场不兼任两席'),
  '零配置回退': all.includes('零配置回退'),
  '三维不重合检查': all.includes('三维不重合检查') && all.includes('气质维') && all.includes('模型维'),
  'N1 实际解析模型判定': all.includes('实际解析到的模型') && all.includes('委派目录为空 ≠ 单源'),
  'N2 超时≠失败+续等一次': all.includes('超时 ≠ 席位失败') && all.includes('续等一次'),
  'N4 全文优先摘录兜底': plans.advanced?.includes('全文优先、摘录兜底') && plans.advanced?.includes('摘录选择权'),
  'E7 提前收敛边界 0/1': all.includes('恰 1 条') && all.includes('0 条'),
  'E7 优先级裁定': all.includes('R1 后必停 > 提前收敛自动跳轮 > 预算切换'),
  'E8 升档重调 start': plans.standard?.includes('重新调用 plugin_local_cabinet_start') && plans.standard?.includes('tier="advanced"'),
  'E6 schemaVersion 2': all.includes('"schemaVersion": 2'),
  'E6 degraded 字段': all.includes('"degraded": false'),
  'E6 deviation + reassigns': all.includes('"deviation":') && all.includes('"reassigns": 0'),
  '分歧为空含豁免': all.includes('分歧字段为空且未注明'),
  'events v1.1 枚举10值': all.includes('steering|upgrade') && all.includes('intake|setup|R1|R2|steering|upgrade|synthesis|archive|close|cost'),
  'events seq0 豁免': all.includes('session_meta 元数据行'),
  'events t_type 下界锚': all.includes('lower-bound'),
  '内嵌片段优先（简报工程1）': all.includes('把关键片段直接内嵌进简报'),
  '不使用 resume 警告保留': plans.advanced?.includes('不要使用 resume'),
  '点名全新委派': all.includes('全新委派该席'),
  'reassigns 记账提示': all.includes('计 reassigns'),
  'R5-03 超限标注不截断（§六政策）': all.includes('超限如实标注 over_limit、不截断归档') && !all.includes('超限会被截断'),
  'R5-06 三维检查判据为纯函数': all.includes('checkSeatDimensions') && all.includes('可测'),
  'R5-06 开场披露含设计钉扎对照': all.includes('设计钉扎 model') && all.includes('不算 diff'),
  'R6-08 未用 N 次入披露（第六场 P6-8）': all.includes('调用轨未用 N 次') && all.includes('机会成本记 0'),
  '空 topic 拒绝': (await globalThis.__tool.execute({ topic: '' })).ok === false,
  'onUnload 生命周期': await main.onUnload().then(() => true, () => false),
};

// —— R5-06 三维不重合检查纯函数：正/负向用例（负向用例是检查存在的证明）——
const dimBad = main.checkSeatDimensions(
  [
    { seat: '架构官', temperament: '攻击', stance: '锚点A', model: 'zai-coding-plan/glm-5.3', isRedTeam: true },
    { seat: '工程官', temperament: '攻击', stance: '锚点A', model: 'zai-coding-plan/glm-5.3-flash' },
    { seat: '成本官', temperament: '攻击', stance: '锚点A', model: 'zai-coding-plan/glm-5.3' },
  ],
  'zai-coding-plan/glm-5.3'
);
check(
  'R5-06 负向：气质/立场/模型全重合＋红队同源 → FAIL（4 条）',
  dimBad.pass === false && dimBad.failures.length === 4,
  JSON.stringify(dimBad.failures)
);
const dimGood = main.checkSeatDimensions(
  [
    { seat: '架构官', temperament: '长期', stance: '锚点A', model: 'zai-coding-plan/glm-5.3' },
    { seat: '成本官', temperament: '资源', stance: '锚点B', model: 'deepseek/deepseek-flash' },
    { seat: '红队批判官', temperament: '攻击', stance: '锚点C', model: 'kimi-for-coding/k3', isRedTeam: true },
  ],
  'zai-coding-plan/glm-5.3'
);
check('R5-06 正向：三家族＋红队异源 → PASS', dimGood.pass === true, JSON.stringify(dimGood.failures));
check('R5-06 边界：空名单 → FAIL', main.checkSeatDimensions([]).pass === false);
check('R5-06 家族口径：modelFamily 取 provider 前缀', main.modelFamily('zai-coding-plan/glm-5.3-flash') === 'zai-coding-plan' && main.modelFamily('deepseek/deepseek-flash') === 'deepseek');
for (const [k, v] of Object.entries(C)) check(k, v === true);

// —— 0.3.0 面板通道完整往返（PM 系；mock pi 走真实临时目录读写；writeText 不建目录 → 平铺分支）——
{
  const os = await import('node:os');
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cabinet-smoke-'));
  const tmpData = fs.mkdtempSync(path.join(os.tmpdir(), 'cabinet-smoke-data-'));
  const settings = {};
  globalThis.pi = {
    agent: { registerTool: async () => {}, unregisterTool: async () => {} },
    plugin: {
      getId: () => 'local.cabinet',
      getSettings: async () => settings,
      setSettings: async (p) => Object.assign(settings, p),
      getDataPath: async () => tmpData,
    },
    fs: {
      readText: async (p) => fs.readFileSync(p, 'utf8'),
      writeText: async (p, c) => fs.writeFileSync(p, c, 'utf8'), // 刻意不建目录：export 应落平铺分支
      glob: async () => fs.readdirSync(tmpRoot).filter((f) => /^cabinet-.*\.md$/.test(f)),
      requestDirectory: async () => ({ path: tmpRoot, name: 'smoke' }),
    },
    models: { list: async () => [
      { key: 'kimi-for-coding/k3', label: 'k3 (Kimi)', availableForSubagents: true },
      { key: 'prov-a/m1', label: 'm1 (A)', availableForSubagents: true },
      { key: 'prov-a/m2', label: 'm2 (A)', availableForSubagents: false },
    ] },
    session: { getLlmContext: async () => ({ modelKey: 'zai-coding-plan/glm-5.3' }) },
  };
  const panel = main.onPanelInvoke;
  const fengSample = '---\r\nname: cabinet-feng\r\ndescription: d\r\nmodel: kimi-for-coding/k3\r\nthinkingLevel: high\r\ntools: [Read, Glob, Grep]\r\n---\r\n你是内阁议事中的专职攻击手。\r\nmodel: 伪行\r\n';
  const mouSample = '---\nname: cabinet-mou\ndescription: d\ntools: [Read]\n---\n你是内阁议事中的专职落地官。\n';

  const st0 = await panel('cabinet/state', {});
  check('PM-smoke · 未授权 state：authorized=false', st0.ok === true && st0.authorized === false && st0.seats.length === 0);
  check('PM-smoke · 未授权 save 拒', (await panel('cabinet/save', { changes: [{ file: 'cabinet-feng.md', model: 'prov-a/m1' }] })).error === 'unauthorized');

  const auth = await panel('cabinet/authorize', {});
  check('PM-smoke · authorize 落 grantedRoot', auth.ok === true && settings.grantedRoot === tmpRoot);
  fs.writeFileSync(path.join(tmpRoot, 'cabinet-feng.md'), fengSample, 'utf8');
  fs.writeFileSync(path.join(tmpRoot, 'cabinet-mou.md'), mouSample, 'utf8');

  const st1 = await panel('cabinet/state', {});
  check('PM-smoke · state 两席+指纹+脏标（从未导出）', st1.ok === true && st1.authorized === true && st1.seats.length === 2 && /^[0-9a-f]{64}$/.test(st1.fingerprint) && st1.dirtySinceLastExport === true);
  check('PM-smoke · 路径闸：临时目录 rootPathOk=false', st1.rootPathOk === false);

  const s1 = await panel('cabinet/save', { changes: [{ file: 'cabinet-mou.md', model: 'prov-a/m1' }] });
  const mouAfter = fs.readFileSync(path.join(tmpRoot, 'cabinet-mou.md'), 'utf8');
  check('PM-smoke · save 插入（无 model 行→插在收束 --- 前）并命中清单', s1.ok === true && s1.notInList.length === 0 && mouAfter.includes('model: prov-a/m1') && mouAfter.split('\n').indexOf('model: prov-a/m1') === 4);

  const s2 = await panel('cabinet/save', { changes: [{ file: 'cabinet-feng.md', model: 'deepseek/deepseek-flash' }] });
  const fengAfter = fs.readFileSync(path.join(tmpRoot, 'cabinet-feng.md'), 'utf8');
  check('PM-smoke · save CRLF 样本：\\r 全保留+伪行不动', s2.ok === true && fengAfter.includes('model: deepseek/deepseek-flash\r\n') && (fengAfter.match(/\r/g) || []).length === (fengSample.match(/\r/g) || []).length && fengAfter.includes('model: 伪行'));

  const s3 = await panel('cabinet/save', { changes: [{ file: 'cabinet-feng.md', model: 'prov-x/unknown' }] });
  check('PM-smoke · notInList 软放行（smoke 端到端）', s3.ok === true && s3.notInList.length === 1 && s3.notInList[0].model === 'prov-x/unknown');

  const s4 = await panel('cabinet/save', { changes: [{ file: 'cabinet-mou.md', model: null }] });
  const mouDel = fs.readFileSync(path.join(tmpRoot, 'cabinet-mou.md'), 'utf8');
  check('PM-smoke · save null 删除 model 行', s4.ok === true && !/^model:/m.test(mouDel.split('---')[1]));

  const st2 = await panel('cabinet/state', {});
  const exp = await panel('cabinet/export', {});
  const bundles = fs.readdirSync(tmpRoot).filter((f) => /^cabinet-ministers-export-.*\.txt$/.test(f));
  check('PM-smoke · export 拼合分支（writeText 不建目录→单 txt 落 root，PM-15）', exp.ok === true && exp.kind === 'bundle' && bundles.length === 1 && exp.path.endsWith(bundles[0]), JSON.stringify({ kind: exp.kind, bundles: bundles.length }));
  const bundleTxt = fs.readFileSync(path.join(tmpRoot, bundles[0]), 'utf8');
  check('PM-smoke · 拼合文件含拆分命令与段标记（2 件场景）', bundleTxt.includes('pwsh -NoProfile -Command') && (bundleTxt.match(/>>> FILE: /g) || []).length === 2 && bundleTxt.includes('cabinet-feng.md') && bundleTxt.includes('cabinet-mou.md'));
  check('PM-smoke · export 更新 lastExportHash=当前指纹', settings.lastExportHash === st2.fingerprint);
  check('PM-smoke · export 后脏标清除', (await panel('cabinet/state', {})).dirtySinceLastExport === false);

  const audit = await panel('cabinet/audit', {});
  const auditRaw = fs.readFileSync(path.join(tmpData, 'model-changes.jsonl'), 'utf8');
  check('PM-smoke · 审计 jsonl 四行且含 notInList', audit.entries.length === 4 && auditRaw.split('\n').filter(Boolean).length === 4 && audit.entries.some((e) => e.notInList === true));
  check('PM-smoke · 未知通道拒', (await panel('cabinet/none', {})).ok === false);
}

// —— 长度记录（不设断言，仅留档可复现口径：固定 topic）——
const lens = order.map((k) => `${k}=${plans[k]?.length ?? 'N/A'}`).join(' / ');

fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
const outFile = path.join(outDir, `smoke-output-${stamp}.txt`);
const out = [
  `Cabinet smoke.mjs — ${new Date().toISOString()}`,
  `PluginDir: ${pluginDir}`,
  `Topic（固定）: ${TOPIC}`,
  `计划长度: ${lens}`,
  `结果：${results.length} 项检查，${failed} 项失败`,
  '----------------------------------------',
  ...results,
];
fs.writeFileSync(outFile, out.join('\n'), 'utf8');
console.log(out.join('\n'));
console.log(`\n留档：${outFile}`);
process.exit(failed > 0 ? 1 : 0);
