#!/usr/bin/env node
/**
 * tests/verify.mjs — Cabinet 发布门（v0.4 方案 §二"门规八条"的落地件，替代 verify.ps1）
 * 用法：node tests/verify.mjs [--plugin-dir=<目录>] [--out=<留档目录，默认包外 ../evidence-out>]
 * 门规映射：①执行被验对象（node --check + smoke 阻断）②JSON 语义消费 ③措辞巡逻不入门
 * （仅保留结构/数值/阻断类）④方案文档嵌入块暂缓（M2′ 数据件落地后启）⑤六字段零容忍
 * ⑥resume 白名单分级 ⑦Node 单文件跨平台 ⑧漂移捕获为发布流程常设演示。
 * v0.2.4：V-01 结构漂移受控 FAIL ＋ 崩溃兜底输出（检查体包顶层 try，结果
 * 未打印前的异常也留档）；R5-05 roles 三卡"首选专职席"循环断言（映射行
 * 从记录变护栏）；P1 smoke 自报数与落盘断言数比对；R5-06 导出检查。
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const pluginDir = path.resolve(arg('plugin-dir') || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const outDir = path.resolve(arg('out') || path.join(pluginDir, '..', 'evidence-out'));

const results = [];
let failed = 0;
let warned = 0;
function check(name, ok, detail = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ` | ${detail}` : ''}`);
  if (!ok) failed++;
}
function warn(name, detail) {
  results.push(`WARN | ${name}${detail ? ` | ${detail}` : ''}`);
  warned++;
}

const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null);

async function runChecks() {
  const manifestSrc = read(path.join(pluginDir, 'manifest.json'));
  const mainSrc = read(path.join(pluginDir, 'main.js'));
  const skillSrc = read(path.join(pluginDir, 'skills', 'cabinet.md'));
  const readmeSrc = read(path.join(pluginDir, 'README.md'));

  // —— 1. manifest 结构 ——
  check('文件齐全', manifestSrc && mainSrc && skillSrc && readmeSrc);
  let manifest = null;
  try {
    manifest = JSON.parse(manifestSrc);
    check('manifest 可解析 · 版本 0.4.0', manifest.version === '0.4.0', manifest.version);
    check('manifest 权限 = 六值（0.3.0 面板面；inject 不可删）', JSON.stringify(manifest.permissions) === '["agent.prompt.inject","agent.tool.register","ui.view","models.list","fs.read","fs.write"]');
    check('manifest engines ≥0.16.0', manifest.engines.piDesktop === '>=0.16.0');
    check('manifest 技能文件全部存在', manifest.contributes.skills.every((s) => fs.existsSync(path.join(pluginDir, s.path))));
    // —— PM（0.3.0 面板）——
    const v = manifest.contributes?.views?.[0];
    check('PM · views[0] 五字段齐备（id/models·bot·entry·双语 title·order）', !!v && v.id === 'models' && v.icon === 'bot' && v.entry === 'views/models.html' && v.title?.['zh-CN'] && v.title?.en && typeof v.order === 'number');
    const fr = manifest.fs?.read; const fw = manifest.fs?.write;
    check('PM · fs read=userSelected+["cabinet-*.md"]（PM-15）', !!fr && fr.root === 'userSelected' && JSON.stringify(fr.scope) === '["cabinet-*.md"]');
    check('PM · fs write=userSelected+三 scope（cabinet-*.md/exports/**/拼合 txt，PM-15）', !!fw && fw.root === 'userSelected' && JSON.stringify(fw.scope) === JSON.stringify(['cabinet-*.md', 'exports/**', 'cabinet-ministers-export-*.txt']));
    check('PM · views entry 文件存在', fs.existsSync(path.join(pluginDir, 'views', 'models.html')));
  } catch (e) {
    check('manifest 可解析', false, e.message);
  }

  // —— 2. 执行被验对象：node --check ——
  const syntax = spawnSync(process.execPath, ['--check', path.join(pluginDir, 'main.js')], { encoding: 'utf8' });
  check('门规1 · node --check main.js', syntax.status === 0, (syntax.stderr || '').split('\n')[0]);

  // —— 3. 执行被验对象：smoke 阻断 ——
  const smoke = spawnSync(process.execPath, [path.join(pluginDir, 'tests', 'smoke.mjs'), `--out=${outDir}`], { encoding: 'utf8' });
  check('门规1 · smoke.mjs 全过（阻断）', smoke.status === 0, `exit=${smoke.status} ${(smoke.stdout || '').split('\n').find((l) => l.startsWith('结果')) || ''}`);

  // —— 3b. 门规④：数据件真源一致性（generate --check 阻断；v0.2.7 批次 D 首件）——
  // 嵌入块==生成产物即门规④落地；原 8 条数值看守断言（cabinet.md/README 含
  // 19K/54K/65K×6、公式文字含+1、次均成本表）随之退役——生成链覆盖其防护面。
  const genCandidates = [path.join(pluginDir, 'scripts', 'generate.mjs'), path.resolve(pluginDir, '..', '..', 'scripts', 'generate.mjs')];
  const genPath = genCandidates.find((p) => fs.existsSync(p));
  const gen = genPath
    ? spawnSync(process.execPath, [genPath, '--check'], { encoding: 'utf8' })
    : { status: 1, stdout: '', stderr: 'generate.mjs 缺失（包内 scripts/ 与插件级 scripts/ 均不在——v0.3.2 起树内优先、树外兜底，2120 场 P5③）' };
  check('门规4 · generate --check 三件与 tiers.json 一致（阻断）', gen.status === 0, (gen.stdout || gen.stderr || '').split('\n').filter((l) => l.includes('不一致') || l.includes('缺失')).join('; ').slice(0, 80));

  // —— 3c. 数据件结构（BOM 容错同 generate.mjs）——
  try {
    const tiersData = JSON.parse((read(path.join(pluginDir, 'config', 'tiers.json')) || '').replace(/^\uFEFF/, ''));
    check('数据件 · config/tiers.json 三档齐', ['standard', 'advanced', 'max'].every((k) => tiersData.tiers?.[k]));
    const schemaData = JSON.parse((read(path.join(pluginDir, 'schemas', 'protocol-v2.json')) || '').replace(/^\uFEFF/, ''));
    check('数据件 · protocol-v2.json eventsEnum 10 值', schemaData.eventsEnum?.length === 10);
    check('数据件 · protocol-v2.json reassigns since=2.1', schemaData.fields?.cost?.fields?.reassigns?.since === '2.1');
    check('数据件 · protocol-v2.json consensus since=2.2', schemaData.fields?.consensus?.since === '2.2');
    check('数据件 · consensus 注记含禁回填+只读', (schemaData.fields?.consensus?.note || '').includes('禁止默认值回填') && (schemaData.fields?.consensus?.note || '').includes('不构成跳轮依据'));
    check('数据件 · protocol-v2.json beyond_preanswer since=2.2（绊网）', schemaData.fields?.beyond_preanswer?.since === '2.2');
    check('数据件 · beyond_preanswer 注记含恒 null+禁止回填', (schemaData.fields?.beyond_preanswer?.note || '').includes('恒 {count:null,items:[]}') && (schemaData.fields?.beyond_preanswer?.note || '').includes('禁止回填'));
    check('数据件 · protocol-v2.json provenance since=2.3（预答席溯源块）', schemaData.fields?.provenance?.since === '2.3');
  } catch (e) {
    check('数据件 · 可解析', false, e.message);
  }

  // —— 3d. P1 · smoke 自报数与落盘断言数比对（防"自报数"漂移）——
  try {
    const smokeFiles = fs.readdirSync(outDir).filter((f) => /^smoke-output-\d+\.txt$/.test(f)).sort();
    const latestSmoke = fs.readFileSync(path.join(outDir, smokeFiles[smokeFiles.length - 1]), 'utf8');
    const m = latestSmoke.match(/结果：(\d+) 项检查，(\d+) 项失败/);
    const bodyCount = latestSmoke.split('\n').filter((l) => /^(PASS|FAIL) \| /.test(l)).length;
    check('P1 · smoke 自报数 = 落盘断言行数', !!m && Number(m[1]) === bodyCount, `自报 ${m?.[1]} vs 落盘 ${bodyCount}`);
    check('P1 · smoke 自报失败数 = 0', !!m && Number(m[2]) === 0, `自报失败 ${m?.[2]}`);
  } catch (e) {
    check('P1 · smoke 输出可解析', false, e.message);
  }

  // —— 4. 加载 main.js 语义比对（F-14：执行后比对，不做源码正则）——
  const pmTmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cabinet-verify-'));
  const pmTmpData = fs.mkdtempSync(path.join(os.tmpdir(), 'cabinet-verify-data-'));
  const pmSettings = {};
  try {
    globalThis.pi = {
      agent: { registerTool: async (t) => { globalThis.__tool = t; }, unregisterTool: async () => {} },
      plugin: {
        getId: () => manifest?.id || 'local.cabinet',
        getSettings: async () => pmSettings,
        setSettings: async (p) => Object.assign(pmSettings, p),
        getDataPath: async () => pmTmpData,
      },
      fs: {
        readText: async (p) => fs.readFileSync(p, 'utf8'),
        writeText: async (p, c) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c, 'utf8'); },
        glob: async () => fs.readdirSync(pmTmpRoot).filter((f) => /^cabinet-.*\.md$/.test(f)),
        requestDirectory: async () => ({ path: pmTmpRoot, name: 'verify' }),
      },
      models: { list: async () => [{ key: 'prov-a/m1', label: 'm1 (A)', availableForSubagents: true }, { key: 'prov-a/m2', label: 'm2 (A)', availableForSubagents: false }] },
      session: { getLlmContext: async () => ({ modelKey: 'zai-coding-plan/glm-5.3' }) },
    };
    const require = createRequire(import.meta.url);
    const main = require(path.join(pluginDir, 'main.js'));
    await main.onLoad();
    const tool = globalThis.__tool;
    const mTool = manifest.contributes.agentTools[0];
    check('门规2 · 工具名一致', tool?.name === mTool.name, `${tool?.name} vs ${mTool.name}`);
    check('门规2 · 工具描述一致（manifest = main.js）', tool?.description === mTool.description);
    check('门规2 · schema 语义一致（深度比较）', JSON.stringify(tool?.schema) === JSON.stringify(mTool.schema));
    // —— 5. TIERS 公式机检（自数据件真源派生，v0.2.7 起读 config/tiers.json）——
    const { TIERS } = main;
    let tiersFile = null;
    let preFile = null;
    try {
      const tiersRoot = JSON.parse((read(path.join(pluginDir, 'config', 'tiers.json')) || '').replace(/^\uFEFF/, ''));
      tiersFile = tiersRoot.tiers;
      preFile = tiersRoot.preanswer || null;
    } catch { /* 结构断言已在 3c 报 FAIL */ }
    if (tiersFile) {
      const order2 = ['standard', 'advanced', 'max'];
      const fields = ['seats', 'rounds', 'nominalTokens', 'tokenCap', 'callCap', 'nominal', 'estimate'];
      const diffs = [];
      for (const k of order2) for (const f of fields) {
        if (TIERS[k]?.[f] !== tiersFile[k]?.[f]) diffs.push(`${k}.${f}: ${JSON.stringify(TIERS[k]?.[f])} vs ${JSON.stringify(tiersFile[k]?.[f])}`);
      }
      check('门规4 · main.TIERS == config/tiers.json（逐字段）', diffs.length === 0, diffs.slice(0, 3).join('; '));
      check('门规4 · main.PREANSWER == config/tiers.json preanswer（双端）', !!preFile && JSON.stringify(main.PREANSWER) === JSON.stringify({ enabled: !!preFile.enabled, calls: preFile.calls, tokens: preFile.tokens }), JSON.stringify(main.PREANSWER));
    }
    const order = ['standard', 'advanced', 'max'];
    check('门规2 · TIERS 三档齐备', order.every((k) => TIERS[k]));
    for (const k of order) {
      const t = TIERS[k];
      const nominalCalls = t.seats * t.rounds;
      check(`${k} 调用轨公式`, t.callCap === nominalCalls + t.seats + 1, `${t.callCap}`);
      const expectToken = Math.round((t.nominalTokens * 1.1 + t.nominalTokens / nominalCalls) / 1000) * 1000;
      check(`${k} token 参考轨公式`, t.tokenCap === expectToken, `${t.tokenCap}`);
    }
    // —— 5b. R5-06 · 三维检查纯函数导出 ——
    check('R5-06 · checkSeatDimensions 导出且空名单 FAIL', typeof main.checkSeatDimensions === 'function' && main.checkSeatDimensions([]).pass === false);
    check('R5-06 · modelFamily 导出且取 provider 前缀', main.modelFamily('zai-coding-plan/glm-5.3-flash') === 'zai-coding-plan');

    // —— 5c. PM · rewriteFrontmatterModel 纯函数（P8-01：切段封口+CRLF+注入防护）——
    const rw = main.rewriteFrontmatterModel;
    check('PM · 改写函数导出', typeof rw === 'function');
    const sample = '---\nname: cabinet-feng\ndescription: 测试\nmodel: a/b\ntools: [Read]\n---\n正文第一行\nmodel: 正文里的伪行 zzz\n结尾\n';
    const rep = rw(sample, 'c/d');
    check('PM · 替换：块内 model 行换值', rep.ok === true && rep.text.includes('model: c/d') && !rep.text.includes('model: a/b'));
    check('PM · 替换：其余行逐字节不变（正文伪行不受影响）', rep.ok && rep.text.split('\n').filter((l) => l !== 'model: c/d').join('\n') === sample.split('\n').filter((l) => l !== 'model: a/b').join('\n') && rep.text.includes('model: 正文里的伪行 zzz'));
    const del = rw(sample, null);
    check('PM · 删除：null 删块内整行，正文伪行保留', del.ok === true && !/^model:/m.test(del.text.split('---')[1]) && del.text.includes('model: 正文里的伪行 zzz'));
    const noModel = '---\nname: x\ntools: [Read]\n---\n正文\n';
    const ins = rw(noModel, 'p/q');
    check('PM · 插入：无 model 行时插在收束 --- 前', ins.ok === true && ins.text.includes('model: p/q') && /^model: p\/q$/m.test(ins.text.split('---')[1]) && ins.text.trimEnd().endsWith('正文'));
    const crlf = '---\r\nname: x\r\nmodel: a/b\r\n---\r\n正文\r\n';
    const cr = rw(crlf, 'c/d');
    check('PM · CRLF：替换行以 \\r 收尾且其余 \\r 保留', cr.ok === true && cr.text.includes('model: c/d\r\n') && (cr.text.match(/\r/g) || []).length === 5);
    const crDel = rw(crlf, null);
    check('PM · CRLF：删除行后 \\r 计数减一', crDel.ok === true && (crDel.text.match(/\r/g) || []).length === 4);
    const meta = rw(sample, 'x+/y');
    check('PM · 元字符：值含 + 不被 RegExp 注入破坏', meta.ok === true && meta.text.includes('model: x+/y'));
    check('PM · 负向：无 frontmatter 报错', rw('没有 frontmatter 的文件\n', 'a/b').ok === false);
    check('PM · 负向：非法 model 格式（无斜杠）报错', rw(sample, 'noSlash').ok === false);
    check('PM · 负向：frontmatter 未收束报错', rw('---\nname: x\n', 'a/b').ok === false);
    check('PM · parseMinisterFrontmatter 三字段提取', (() => { const f = main.parseMinisterFrontmatter(sample); return f?.name === 'cabinet-feng' && f?.model === 'a/b' && f?.thinkingLevel == null; })());

    // —— 5d. PM · 路径闸与指纹（P8-03/P8-04）——
    const crp = main.checkRootPath;
    check('PM · 路径闸：.agents\\subagents 后缀通过（正/反斜杠/尾斜杠）', crp('C:\\Users\\u\\.agents\\subagents') === true && crp('C:/Users/u/.agents/subagents') === true && crp('C:\\Users\\u\\.agents\\subagents\\') === true);
    check('PM · 路径闸：D 轨 ministers/ 与其他目录拒', crp('D:\\ZCode\\cabinet\\ministers') === false && crp('C:\\Users\\u\\Desktop\\cabinet\\ministers') === false && crp('') === false);
    const fp1 = main.fingerprintSeats([{ file: 'a.md', raw: 'x' }, { file: 'b.md', raw: 'y' }]);
    const fp2 = main.fingerprintSeats([{ file: 'b.md', raw: 'y' }, { file: 'a.md', raw: 'x' }]);
    const fp3 = main.fingerprintSeats([{ file: 'a.md', raw: 'x' }, { file: 'b.md', raw: 'z' }]);
    check('PM · 指纹：与顺序无关、内容变即变', fp1 === fp2 && fp1 !== fp3 && /^[0-9a-f]{64}$/.test(fp1));

    // —— 5e. PM · onPanelInvoke 防御闸（P8-02/P8-07，mock pi）——
    const panel = main.onPanelInvoke;
    check('PM · onPanelInvoke 导出', typeof panel === 'function');
    check('PM · 防御闸：cabinet-feng2.md 拒（glob 可匹配、正则真源拒）', (await panel('cabinet/save', { changes: [{ file: 'cabinet-feng2.md', model: 'prov-a/m1' }] })).ok === false);
    check('PM · 防御闸：路径分隔注入拒（../cabinet-feng.md）', (await panel('cabinet/save', { changes: [{ file: '../cabinet-feng.md', model: 'prov-a/m1' }] })).ok === false);
    check('PM · 防御闸：非法 model 格式拒（硬闸）', (await panel('cabinet/save', { changes: [{ file: 'cabinet-feng.md', model: 'noSlash' }] })).ok === false);
    check('PM · 防御闸：未授权 save 拒 unauthorized', (await panel('cabinet/save', { changes: [{ file: 'cabinet-feng.md', model: 'prov-a/m1' }] })).error === 'unauthorized');
    check('PM · 防御闸：未授权 export 拒 unauthorized', (await panel('cabinet/export', {})).error === 'unauthorized');
    const auth = await panel('cabinet/authorize', {});
    check('PM · authorize：落 grantedRoot；临时目录（非 .agents\\subagents 后缀）rootPathOk=false 报警', auth.ok === true && auth.rootPathOk === false && pmSettings.grantedRoot === pmTmpRoot);
    fs.writeFileSync(path.join(pmTmpRoot, 'cabinet-feng.md'), sample, 'utf8');
    const saveIn = await panel('cabinet/save', { changes: [{ file: 'cabinet-feng.md', model: 'prov-other/m9' }] });
    check('PM · notInList 软放行：合法格式不在清单仍保存并标记', saveIn.ok === true && saveIn.notInList?.length === 1 && saveIn.notInList[0].model === 'prov-other/m9');
    const saveOk = await panel('cabinet/save', { changes: [{ file: 'cabinet-feng.md', model: 'prov-a/m1' }] });
    check('PM · 命中清单：notInList 空', saveOk.ok === true && saveOk.notInList?.length === 0);
    const st = await panel('cabinet/state', {});
    check('PM · state：席位/指纹/脏标齐备', st.ok === true && st.seats.length === 1 && st.fingerprint && st.dirtySinceLastExport === true);
    const exp = await panel('cabinet/export', {});
    check('PM · export 子目录分支（mock 自动建目录）+lastExportHash 更新', exp.ok === true && exp.kind === 'dir' && exp.path.includes('exports') && fs.existsSync(path.join(exp.path, 'cabinet-feng.md')) && pmSettings.lastExportHash === st.fingerprint);
    check('PM · export 后 state 脏标清除', (await panel('cabinet/state', {})).dirtySinceLastExport === false);
    const audit = await panel('cabinet/audit', {});
    check('PM · 审计：jsonl 落数据目录且含 notInList 行', audit.ok === true && audit.entries.length >= 2 && audit.entries.some((e) => e.notInList === true) && fs.existsSync(path.join(pmTmpData, 'model-changes.jsonl')));

    // —— 5f. PM · views/models.html 体检 + 同源断言（D3-b 裁定）——
    const htmlSrc = read(path.join(pluginDir, 'views', 'models.html')) || '';
    check('PM · 面板体积 < 64KB', htmlSrc.length > 0 && htmlSrc.length < 64 * 1024, `${htmlSrc.length}B`);
    check('PM · 面板无外链资源（src/href 无 http）', !/(src|href)\s*=\s*["']https?:\/\//i.test(htmlSrc));
    check('PM · 面板含 pluginBridge.invoke 调用点', htmlSrc.includes('pluginBridge.invoke'));
    const suggMatch = htmlSrc.match(/const SUGGEST = \{([\s\S]*?)\};/);
    const suggFromHtml = {};
    if (suggMatch) {
      for (const m of suggMatch[1].matchAll(/"cabinet-([a-z]+)":\s*\{\s*family:\s*"([^"]+)",\s*thinking:\s*(?:"([^"]+)"|null)/g)) {
        suggFromHtml['cabinet-' + m[1]] = { family: m[2], thinking: m[3] ?? null };
      }
    }
    const ministersReadme = read(path.resolve(pluginDir, '..', '..', 'ministers', 'README.md')) || '';
    const famSection = (ministersReadme.split('## 家族分配参考')[1] || '').split('##')[0];
    const suggFromReadme = {};
    for (const line of famSection.split('\n')) {
      const m = line.match(/^\|\s*(cabinet-[a-z]+)\b/);
      if (!m) continue;
      const cols = line.split('|').map((c) => c.trim());
      if (cols.length >= 5) suggFromReadme[m[1]] = { family: cols[2], thinking: cols[3] === '—' ? null : cols[3] };
    }
    check('PM · 同源断言：面板 SUGGEST 与 ministers/README 家族表逐字一致（D3-b）', JSON.stringify(suggFromHtml) === JSON.stringify(suggFromReadme) && Object.keys(suggFromReadme).length === 8, `html=${Object.keys(suggFromHtml).length} readme=${Object.keys(suggFromReadme).length}`);
    await main.onUnload();
  } catch (e) {
    check('门规2 · main.js 可加载执行', false, e.message);
  }

  // —— 6. 数值看守（退役记录：原"文档数值一致"8 条断言——cabinet.md/README
  // 含 19K/54K/65K×6、公式文字含+1、次均成本表——已由 3b 生成链（嵌入块==
  // 生成产物）覆盖防护面，v0.2.7 退役；README 盲评 19K 出处句属叙事引用保留）。——

  // —— 7. resume 白名单分级（门规6）＋ R5-05 映射循环断言；V-01 受控 FAIL ——
  const allowCore = ['不使用 resume', '不要使用 resume', '误用而断链', 'resume 白名单'];
  const specs = [
    { file: 'manifest.json', src: manifestSrc, allow: [] },
    { file: 'main.js', src: mainSrc, allow: allowCore },
    { file: 'skills/cabinet.md', src: skillSrc, allow: allowCore },
    { file: 'README.md', src: readmeSrc, allow: [...allowCore, '跨回合 resume', '残留 resume', 'resume 白名单'] },
  ];
  for (const s of specs) {
    const bad = (s.src || '').split('\n').filter((l) => l.includes('resume') && !s.allow.some((a) => l.includes(a)));
    check(`resume 白名单 · ${s.file}`, bad.length === 0, bad[0]?.trim().slice(0, 60));
  }
  const rolesDir = path.join(pluginDir, 'skills', 'roles');
  const builtinRoles = new Set(['coding.md', 'writing.md', 'research.md']);
  const roleSeatExpect = {
    'coding.md': ['cabinet-yuan', 'cabinet-mou', 'cabinet-zhong'],
    'research.md': ['cabinet-li', 'cabinet-feng', 'cabinet-shen', 'cabinet-ju'],
    'writing.md': ['cabinet-yuan', 'cabinet-gu', 'cabinet-zhong', 'cabinet-ju'],
  };
  if (!fs.existsSync(rolesDir)) {
    check('V-01 · skills/roles 目录存在（受控 FAIL，非崩溃）', false, '目录缺失——roles 相关断言全部跳过，门仍留档输出');
  } else {
    const roleFiles = fs.readdirSync(rolesDir).filter((f) => f.endsWith('.md'));
    check('V-01 · 自带三角色卡在位', ['coding.md', 'writing.md', 'research.md'].every((f) => roleFiles.includes(f)), roleFiles.join(','));
    for (const f of roleFiles) {
      const src = read(path.join(rolesDir, f)) || '';
      const hits = src.split('\n').filter((l) => l.includes('resume'));
      if (builtinRoles.has(f)) {
        check(`resume 零容忍 · 自带角色包 ${f}`, hits.length === 0, hits[0]?.slice(0, 60));
        check(`R5-05 · ${f} 首选专职席映射行`, roleSeatExpect[f].every((n) => src.includes(n)), roleSeatExpect[f].join(' / '));
      } else if (hits.length) warn(`用户新增角色卡含 resume（仅警告，门规6 分级）· ${f}`, `${hits.length} 处`);
    }
  }

  // —— 7b. 场景表映射护栏（R6-03，v0.2.6：场景表=第四个映射载体）——
  // 分行期望（⊇）：每场景行必须含对应卡的全部映射名；幽灵检查（⊆）：
  // 场景表出现的阁员名必须在 8 件名集内（防废弃/错拼名入表）。
  const sceneExpect = [
    ['roles-coding', ['cabinet-yuan', 'cabinet-mou', 'cabinet-zhong']],
    ['roles-writing', ['cabinet-yuan', 'cabinet-gu', 'cabinet-zhong', 'cabinet-ju']],
    ['roles-research', ['cabinet-li', 'cabinet-feng', 'cabinet-shen', 'cabinet-ju']],
  ];
  const sceneSection = (skillSrc.split('## 角色体系')[1] || '').split('##')[0];
  for (const [pack, names] of sceneExpect) {
    const row = sceneSection.split('\n').find((l) => l.includes(`\`${pack}\``)) || '';
    check(`R6-03 · 场景表 ${pack} 行映射名齐备`, names.every((n) => row.includes(n)), names.join(' / '));
  }
  const knownNames = new Set(Object.values(roleSeatExpect).flat());
  const ghosts = [...new Set((sceneSection.match(/cabinet-[a-z]+/g) || []))].filter((n) => !knownNames.has(n));
  check('R6-03 · 场景表无幽灵阁员名（⊆ 8 件名集）', ghosts.length === 0, ghosts.join(','));

  // —— 8. 其余结构断言 ——
  check('门规5 · README 无"六字段"残留', !readmeSrc.includes('六字段'));
  check('E15 · scene 描述诚实化', manifestSrc.includes('缺省 = general') && !manifestSrc.includes('按议题内容推断'));
  check('n≥40 带出处（README 引用设计方案）', readmeSrc.includes('n≥40') && readmeSrc.includes('v0.4'));
  check('首选专职席进文档（cabinet.md + README）', skillSrc.includes('cabinet-feng') && readmeSrc.includes('cabinet-feng'));
  check('phase 枚举 10 值进文档（cabinet.md）', skillSrc.includes('steering') && skillSrc.includes('upgrade'));
  check('R5-03 · 超限政策句进文档（cabinet.md，标注不截断）', skillSrc.includes('如实标注 over_limit') && skillSrc.includes('不截断归档') && !skillSrc.includes('超限截断'));
  check('门规7 · 旧 verify.ps1 已退役', !fs.existsSync(path.join(pluginDir, 'tests', 'verify.ps1')));

  // —— 8b. 共识面两栏速览＋检索纪律（议定 20261013-0037 P1/P6 · v0.3.1；C8 验算不验真）——
  const canonDerive = 'strength 由计数机械派生（分母=到场且显式涉及该命题的席数；未涉及者单列「未表态」，不入分母不计支持；缺席席枚举名单）：全同→[全场一致]；严格过半非全同→[多数 n/m]；无严格过半（2:2、2:1:1 等并列）→[分裂]';
  check('两栏速览 · 双件含共识面/分歧面对举', mainSrc.includes('共识面') && mainSrc.includes('分歧面') && skillSrc.includes('共识面') && skillSrc.includes('分歧面'));
  check('两栏速览 · 强度派生规则句双件逐字一致', mainSrc.includes(canonDerive) && skillSrc.includes(canonDerive));
  check('两栏速览 · 只读/空面/警示/阶段条款双件在册', ['共识面只读、不构成跳轮依据——跳轮仍只看实质分歧条数', '禁止由 0 分歧推强度', '伪多样性警示（全场一致≠正确，先查席位异源性）', '[R1 未质询]/[R2 已质询]'].every((s) => mainSrc.includes(s) && skillSrc.includes(s)));
  check('两栏速览 · main.js schema 模板含 consensus 行', mainSrc.includes('"consensus"'));
  check('P6 · 检索纪律双件在册（排除 .cabinet 归档目录）', mainSrc.includes('排除 .cabinet 归档目录') && skillSrc.includes('排除 .cabinet 归档目录'));

  // —— 8c. beyond_preanswer 绊网三件同步＋语料纪律＋scripts 包内在位（议定 20261012-2233 P3 补装 pi 轨 / 2120 场 P5②③④ · v0.3.2）——
  check('绊网 · main.js schema 模板含 beyond_preanswer 且值恒 null', mainSrc.includes('"beyond_preanswer": { "count": null, "items": [] }'));
  check('绊网 · cabinet.md 字段清单含 beyond_preanswer 绊网注记', skillSrc.includes('beyond_preanswer') && skillSrc.includes('禁止回填'));
  check('语料纪律 · 两条入册（cabinet.md）', skillSrc.includes('2312 据席主张') && skillSrc.includes('其枚举内最高档'));
  check('门规8 · scripts/generate.mjs 与 audit.mjs 包内在位（v0.3.2）', fs.existsSync(path.join(pluginDir, 'scripts', 'generate.mjs')) && fs.existsSync(path.join(pluginDir, 'scripts', 'audit.mjs')));

  // —— 8d. 预答席三门＋放弃声明（v0.4.0，2120 场 v3 §四-1；机制默认关，断言守"默认关+条款在册"）——
  check('预答门1 · provenance 规程在册（main.js 模板含块与完备判据）', mainSrc.includes('"provenance"') && mainSrc.includes('provenance_incomplete:true') && mainSrc.includes('行数=decisions 条数'));
  check('预答门2 · 封存哈希链条款在册（phash/tamper/四元组）', mainSrc.includes('phash') && mainSrc.includes('tamper') && mainSrc.includes('{sha256, 字数, model, effort}'));
  check('预答门3 · 双计数器执法文本在册（预答轨独立计数）', mainSrc.includes('双计数器') && mainSrc.includes('预答轨'));
  check('预答门 · 放弃声明成文（main.js+cabinet.md 双件）', mainSrc.includes('明示放弃而非回答') && skillSrc.includes('明示放弃而非回答') && skillSrc.includes('不计印证'));
  check('预答门 · cabinet.md 规程节在册（默认关闭+停用判据）', skillSrc.includes('预答席（默认关闭') && skillSrc.includes('stop:ritual-3zero'));
}

// V-01：检查体包顶层 try——结果未打印前的任何异常（结构漂移、文件缺失竞态）
// 都转为一条受控 FAIL 并保证下方留档输出照常发生（漂移捕获，不是漂移崩溃）。
try {
  await runChecks();
} catch (e) {
  check('门崩溃兜底（V-01）· 结构漂移下受控 FAIL', false, e?.message || String(e));
}

// —— 输出（默认写包外，门规6；崩溃亦留档——V-01）——
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
const outFile = path.join(outDir, `verify-output-${stamp}.txt`);
const out = [
  `Cabinet verify.mjs — ${new Date().toISOString()}`,
  `PluginDir: ${pluginDir}`,
  `结果：${results.length} 项检查，${failed} 项失败，${warned} 项警告`,
  '----------------------------------------',
  ...results,
];
fs.writeFileSync(outFile, out.join('\n'), 'utf8');
console.log(out.join('\n'));
console.log(`\n留档：${outFile}`);
process.exit(failed > 0 ? 1 : 0);
