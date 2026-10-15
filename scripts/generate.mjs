#!/usr/bin/env node
/**
 * scripts/generate.mjs — 数据件→生成物渲染器（批次 D 首件，v0.4 §十二 M2′①）
 * 真源：<包根>/config/tiers.json
 * 生成物（标记区替换）：
 *   ① main.js TIERS 字面量块（>>> TIERS … <<< TIERS）——运行时无 I/O（M1′ 不变量保持）；
 *   ② skills/cabinet.md §五 嵌入表（<!-- tiers-table:begin … end -->，门规④）；
 *   ③ README.md 档位表（同标记）。
 * 用法：node scripts/generate.mjs          写入渲染（改 tiers.json 后跑）
 *       node scripts/generate.mjs --check  只校验三件与数据件一致（verify 阻断调用）
 * 注：本副本为包内版（v0.3.2，20261013-2120 场 P5③ 收进包内）——pluginDir 解析为
 *     包根（..）。插件级适配版位于 plugins/scripts/generate.mjs（解析 ../installed/
 *     local.cabinet）；开发仓原版位于 D:\ZCode\cabinet\scripts\generate.mjs。
 *     verify.mjs 门规④ 解析顺序：包内优先、插件级兜底。
 *     另：安装位 cabinet.md 为 CRLF 行尾（Windows 工具链），比较前对两侧做
 *     CRLF→LF 归一——只容忍平台行尾差，数值/文本内容仍逐字比对。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
// BOM 容错：Windows 工具链（记事本/PS5.1 Set-Content）编辑数据件会带 BOM，
// JSON.parse 不吃——读入前剥除（v0.2.7 漂移演示实测引入的坑）。
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(new RegExp('^' + String.fromCharCode(0xFEFF)), ''));
const rootCfg = readJson(path.join(pluginDir, 'config', 'tiers.json'));
const tiers = rootCfg.tiers;
const preanswerCfg = rootCfg.preanswer || null; // v0.4.0：预答席独立预算轨（2120 场 v3 §二-2）

const suffix = { standard: '（默认）', advanced: '（手动）', max: '（手动）' };
const callCapNote = {
  standard: ' // 名义 4 + 一整轮重派 4 + 1（F2 级联）',
  advanced: ' // 名义 10（5席×2轮）+ 一整轮重派 5 + 1（F2 级联）',
  max: ' // 名义 12（6席×2轮）+ 一整轮重派 6 + 1（F2 级联）',
};

function renderTiersBlock() {
  const body = Object.keys(tiers).map((k) => {
    const t = tiers[k];
    return `  ${k}: {
    seats: ${t.seats},
    rounds: ${t.rounds},
    nominalTokens: ${t.nominalTokens},
    tokenCap: ${t.tokenCap},
    callCap: ${t.callCap},${callCapNote[k]}
    nominal: ${JSON.stringify(t.nominal)},
    estimate: ${JSON.stringify(t.estimate)},
  },`;
  }).join('\n');
  return [
    '// >>> TIERS — GENERATED FROM config/tiers.json by scripts/generate.mjs — DO NOT EDIT',
    '// （数值由数据件渲染，运行时不读文件——M1′ 无 I/O 不变量保持）',
    'const TIERS = {',
    body,
    '};',
    ...(preanswerCfg ? [
      '',
      '// 预答席独立预算轨（默认关；v0.4.0＝2120 场重启设计 v3 §二-2）',
      `const PREANSWER = ${JSON.stringify({ enabled: !!preanswerCfg.enabled, calls: preanswerCfg.calls, tokens: preanswerCfg.tokens })};`,
    ] : []),
    '// <<< TIERS',
  ].join('\n');
}

function renderTable(variant) {
  const head = variant === 'full'
    ? '| 档位 | 配置 | 名义 token / 次数 | 次均成本 | 调用轨（执法轨，硬顶） | token 轨（参考轨，软指标） |\n|------|------|------------------|---------|------------------------|---------------------------|'
    : '| 档位 | 配置 | 名义 token / 次数 | 次均成本 | 调用轨（执法轨） | token 轨（参考轨） |\n|------|------|------------------|---------|------------------|-------------------|';
  const bold = variant === 'full';
  const rows = Object.keys(tiers).map((k) => {
    const t = tiers[k];
    const cap = bold ? `**${t.callCap} 次委派**` : `${t.callCap} 次委派`;
    return `| ${k}${suffix[k]} | ${t.seats} 席 × ${t.rounds} 轮 | ${t.nominalTokens / 1000}K / ${t.nominal} | ${t.perCallDisplay} | ${cap} | ${t.tokenCap / 1000}K |`;
  });
  return [head, ...rows].join('\n');
}

const targets = [
  {
    file: path.join(pluginDir, 'main.js'),
    regex: /\/\/ >>> TIERS[\s\S]*?\/\/ <<< TIERS/,
    render: () => renderTiersBlock(),
    label: 'main.js TIERS 块',
  },
  {
    file: path.join(pluginDir, 'skills', 'cabinet.md'),
    regex: /<!-- tiers-table:begin[\s\S]*?tiers-table:end -->/,
    render: () => `<!-- tiers-table:begin GENERATED FROM config/tiers.json — scripts/generate.mjs -->\n${renderTable('full')}\n<!-- tiers-table:end -->`,
    label: 'cabinet.md §五 嵌入表',
  },
  {
    file: path.join(pluginDir, 'README.md'),
    regex: /<!-- tiers-table:begin[\s\S]*?tiers-table:end -->/,
    render: () => `<!-- tiers-table:begin GENERATED FROM config/tiers.json — scripts/generate.mjs -->\n${renderTable('short')}\n<!-- tiers-table:end -->`,
    label: 'README 档位表',
  },
];

let bad = 0;
const stripEol = (s) => s.replace(/\r\n/g, '\n');
for (const t of targets) {
  const src = fs.readFileSync(t.file, 'utf8');
  if (!t.regex.test(src)) {
    console.error(`[generate] ${t.label}: 标记区缺失`);
    bad++;
    continue;
  }
  const expected = t.render();
  if (stripEol(src.match(t.regex)[0]) === stripEol(expected)) {
    console.log(`[generate] ${t.label}: 一致`);
  } else if (checkOnly) {
    console.error(`[generate] ${t.label}: 与 config/tiers.json 不一致（跑 node scripts/generate.mjs 重渲）`);
    bad++;
  } else {
    fs.writeFileSync(t.file, src.replace(t.regex, expected), 'utf8');
    console.log(`[generate] ${t.label}: 已重渲`);
  }
}
process.exit(bad > 0 ? 1 : 0);
