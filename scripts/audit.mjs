#!/usr/bin/env node
/**
 * scripts/audit.mjs — Cabinet 归档对账器（最小集；v0.3.2 新增，20261013-2120 场
 * P5③ 落地，填补 2233/2312/0037 三场"audit=未跑"缺口）。
 * 用法：node scripts/audit.mjs [场目录]（缺省取 .cabinet/ 下时间戳最新场）
 * 对账项：
 *   ① dispatch: 前缀事件数 == protocol.cost.calls（审计器据此重建调用数）
 *   ② beyond_preanswer 恒 null（绊网，2233 P3）；旧档缺字段记"未采集"，不判
 *     mismatch（禁回填规则：对账不虚构）
 *   ③ 必备归档件齐备（events.jsonl / round-1.jsonl / protocol.json / index.jsonl）
 * 输出单行结论（供 index.jsonl audit 列消费）；exit 0=ok，1=mismatch。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cabinetRoot = path.join(pluginDir, '.cabinet');

let dir = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!dir) {
  const sessions = fs.existsSync(cabinetRoot)
    ? fs.readdirSync(cabinetRoot).filter((d) => /^\d{8}-\d{4}-/.test(d)).sort()
    : [];
  if (!sessions.length) {
    console.log('audit | mismatch:.cabinet 无场次目录');
    process.exit(1);
  }
  dir = path.join(cabinetRoot, sessions[sessions.length - 1]);
}

const problems = [];
const readJsonl = (p) =>
  fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  });

for (const f of ['events.jsonl', 'round-1.jsonl', 'protocol.json', 'index.jsonl']) {
  if (!fs.existsSync(path.join(dir, f))) problems.push(`缺件:${f}`);
}

const eventsPath = path.join(dir, 'events.jsonl');
const protocolPath = path.join(dir, 'protocol.json');
let dispatchCount = 0;
let calls = null;
let bpNote = '未采集';

if (fs.existsSync(eventsPath)) {
  for (const e of readJsonl(eventsPath)) {
    if (e && typeof e.event === 'string' && e.event.startsWith('dispatch:')) {
      // delegationId 多席分号分隔——按席数重建调用数（events 规范）
      const ids = String(e.delegationId || '').split(';').filter(Boolean);
      dispatchCount += ids.length || 1;
    }
  }
}

if (fs.existsSync(protocolPath)) {
  try {
    const p = JSON.parse(fs.readFileSync(protocolPath, 'utf8'));
    calls = p?.cost?.calls ?? null;
    const bp = p?.beyond_preanswer;
    if (bp === undefined) {
      bpNote = '未采集（旧档缺字段，不回填）';
    } else if (bp && bp.count === null && Array.isArray(bp.items) && bp.items.length === 0) {
      bpNote = '恒 null ✓';
    } else {
      problems.push('绊网:beyond_preanswer 非恒 null');
    }
  } catch (e) {
    problems.push(`protocol 解析失败:${e.message}`);
  }
}

if (calls !== null && dispatchCount !== calls) {
  problems.push(`calls 不符:dispatch=${dispatchCount} vs cost.calls=${calls}`);
}

const verdict = problems.length
  ? `mismatch:${problems.join(';')}`
  : `ok（dispatch=${dispatchCount}，calls=${calls}，绊网=${bpNote}）`;
console.log(`audit | ${path.basename(dir)} | ${verdict}`);
process.exit(problems.length ? 1 : 0);
