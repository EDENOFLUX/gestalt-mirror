// 引擎冒烟测试：不起浏览器，直接跑解析/叙述/引导三条纯逻辑链
// 末尾加一段「同一份 JSON 同时喂引擎」的验证
global.window = global;
const store = {};
global.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, '..', 'assets', 'engine') + path.sep;
for (const f of ['gestalt-parse.js', 'gestalt-narrate.js', 'gestalt-guide.js', 'gestalt-journal.js']) {
  require(base + f);
}

const text = '领导说这个方案先放一放。我觉得很烦，但又觉得是不是自己太计较，胸口发闷。';
let loop = null;
try {
  loop = window.parseLoopDraft(text);
  console.log('parseLoopDraft: edges =', loop.edges.length, '| name =', loop.name);
  const mechs = loop.edges.flatMap(e => e.lines.filter(l => l.mech).map(l => l.mech));
  console.log('  检测到的机制:', mechs.length ? mechs.join(' / ') : '(无)');
} catch (e) {
  console.log('parseLoopDraft FAIL:', e.message);
}

try {
  const n = window.narrateLoop(loop);
  console.log('narrateLoop: 输出', String(n).length, '字');
} catch (e) {
  console.log('narrateLoop FAIL:', e.message);
}

try {
  console.log('guidePaths(空罐):', window.guidePaths([]).length, '张路径卡');
  console.log('guideToday:', String(window.guideToday([])).slice(0, 30));
} catch (e) {
  console.log('guide FAIL:', e.message);
}

try {
  const mk = (t) => ({ parsed: window.parseLoopDraft(t) });
  const frags = [mk('领导说这个方案先放一放。'), mk('我觉得很烦，胸口发闷。'), mk('我跟他解释，他说我顽固。')];
  const c = window.clarityOf(frags);
  console.log('clarityOf: score=' + Number(c.score).toFixed(2), 'count=' + c.count, 'clearEnough=' + c.clearEnough);
  console.log('organizeChain: loops =', (window.organizeChain(frags).loops || []).length);
} catch (e) {
  console.log('fragments FAIL:', e.message);
}

// ── 格式统一验证：磁盘上的 JSON 直接喂引擎 ──
console.log('--- 同一份 JSON 喂引擎 ---');
for (const p of [path.join(__dirname, '..', 'assets', 'loop-demo.json')]) {
  try {
    const json = JSON.parse(fs.readFileSync(p, 'utf8'));
    const n = window.narrateLoop(json);
    const defs = json.edges.flatMap(e => e.lines.filter(l => l.type === 'defense'));
    console.log(p.split('/').pop(), '| 边', json.edges.length, '| 防御', defs.length, '| 叙述', String(n).length, '字');
  } catch (e) {
    console.log(p.split('/').pop(), 'FAIL:', e.message);
  }
}
