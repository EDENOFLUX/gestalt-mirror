// 生成完整 HTML 页（默认交付形态）：v4 视图 + 引擎五块
//
// 用法：
//   node make_page.js <输出.html> <主 loop.json> [其他 episode.json ...]
//                     [--need "共同需要"] [--frag <碎片收集.md>]
//
// - 第一个 loop 作为 ① 默认展示
// - 其余 loop 一起组成 ② 串接（大多边形，边数=episode 数）
// - --need 可显式给串接中心的「共同需要」
// - --frag 读主题的碎片收集文档，作为 ③ 碎片罐的初始内容
const fs = require('fs');

const path = require('path');
const ENGINE = path.join(__dirname, '..', 'assets', 'engine') + path.sep;

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('用法: node make_page.js <输出.html> <主 loop.json> [其他 episode.json ...] [--need "共同需要"] [--frag <碎片.md>]');
  process.exit(2);
}
const NEED_FLAG = '--need';
const needIdx = args.indexOf(NEED_FLAG);
const needArg = needIdx >= 0 ? args[needIdx + 1] : '';
const FRAG_FLAG = '--frag';
const fragIdx = args.indexOf(FRAG_FLAG);
const fragPath = fragIdx >= 0 ? args[fragIdx + 1] : '';
const OUT = args[0];
const loopFiles = args.filter(function (a) {
  return a !== NEED_FLAG && a !== needArg && a !== FRAG_FLAG && a !== fragPath;
}).slice(1);

// 从碎片文档里抽 `- ` 开头的行
let seedFragments = [];
if (fragPath && fs.existsSync(fragPath)) {
  const md = fs.readFileSync(fragPath, 'utf8');
  seedFragments = md.split(/\r?\n/)
    .map(function (l) { return l.trim(); })
    .filter(function (l) { return /^-\s+/.test(l); })
    .map(function (l) { return l.replace(/^-\s+/, '').trim(); })
    .filter(Boolean);
  console.log('fragments seeded:', seedFragments.length);
}

let html = fs.readFileSync(ENGINE + 'index.html', 'utf8');
html = html.replace(/src="gestalt-/g, 'src="_Skills/gestalt-mirror/assets/engine/gestalt-');

const loops = loopFiles.map(function (p) { return JSON.parse(fs.readFileSync(p, 'utf8')); });
const loop = loops[0];
const chain = {
  name: loop.title || loop.name || '格式塔环',
  meta: { context: (loop.meta || {}).context || '' },
  loops: loops
};

// 串接的共同需要：
//   1) 命令行 --need 显式给（收敛表述）
//   2) 各 episode 自带的 need 全一致 → 用它
//   3) 否则并列各 episode 的 need（去重，最多 3 条）
// 证据永远取各 episode 里真实存在、已过校验闸的 quote，去重后计数。
const evSeen = [];
const evAll = [];
loops.forEach(function (lp) {
  (((lp.meta || {}).need || {}).evidence || []).forEach(function (ev) {
    if (ev && ev.quote && evSeen.indexOf(ev.quote) < 0) { evSeen.push(ev.quote); evAll.push(ev); }
  });
});
const needTexts = loops
  .map(function (lp) { return ((lp.meta || {}).need || {}).text || ''; })
  .filter(Boolean);
const uniq = needTexts.filter(function (t, i) { return needTexts.indexOf(t) === i; });

let chainNeedText = '';
if (needArg) chainNeedText = needArg;
else if (uniq.length === 1) chainNeedText = uniq[0];
else if (uniq.length > 1) chainNeedText = uniq.slice(0, 3).join('／');

if (chainNeedText) {
  chain.meta.need = {
    text: chainNeedText,
    source: 'llm',
    evidence: evAll,
    crosscheck: { verdict: 'unusable' },
    confidence: 0.65
  };
}

const inject = `
<script src="_Skills/gestalt-mirror/assets/engine/gestalt-view.js"></script>
<script>
var PARENTS_LOOP = ${JSON.stringify(loop)};
var PARENTS_CHAIN = ${JSON.stringify(chain)};
var SEED_FRAGMENTS = ${JSON.stringify(seedFragments)};
var FRAG_DOC = ${JSON.stringify(fragPath ? String(fragPath).split(/[\\/]/).pop() : '')};

(function () {
  document.title = PARENTS_LOOP.title || '格式塔环';

  var h1 = document.querySelector('h1');
  if (h1) h1.textContent = PARENTS_LOOP.title || '格式塔环';
  var sub = document.querySelector('.sub');
  if (sub) sub.textContent = PARENTS_LOOP.subtitle || '';

  /* ② 串接：用新版风格渲染（规则不变：边数=episode 数、小环大小=强度、中心留白、点小环放大） */
  chainData = (PARENTS_CHAIN.loops || []).slice();
  retroExample = PARENTS_LOOP;
  var ch = document.getElementById('chain');
  if (ch && window.buildChainSVG) {
    ch.innerHTML = buildChainSVG(PARENTS_CHAIN);
    var csvg = ch.querySelector('svg');
    if (csvg) { csvg.style.width = '760px'; csvg.style.height = 'auto'; }
    ch.style.display = 'block';
    ch.style.margin = '0 auto';
    ch.style.textAlign = 'center';
  }

  var orig = document.getElementById('single');
  if (!orig || !window.buildLoopSVG) return;
  var card = orig.closest('.card');

  /* 新版：整块全宽 section，插在 .wrap 之前 */
  var sec = document.createElement('section');
  sec.id = 'v4section';
  sec.style.cssText = 'margin:16px 32px 8px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px 18px;overflow-x:auto';
  sec.innerHTML =
    '<h2 id="v4title" style="margin:0 0 6px;font-size:16px">① 单环 · 新版视图（六边形脊 + 折线菱形）</h2>' +
    '<div style="margin:6px 0 10px;font-size:12px;color:#8b949e">编号对应下方清单；点任意红色折线看四元与 IFS part；右侧是「我的模式 · 可替代」，中心是未满足的完形。</div>' +
    '<div id="v4host" style="min-width:1180px"></div>' +
    '<div id="lineDetail"></div>';

  var wrap = document.querySelector('.wrap');
  wrap.parentNode.insertBefore(sec, wrap);

  var host = sec.querySelector('#v4host');
  host.innerHTML = buildLoopSVG(PARENTS_LOOP);
  var svg4 = host.querySelector('svg');
  if (svg4) { svg4.style.width = '1180px'; svg4.style.height = 'auto'; svg4.removeAttribute('width'); svg4.removeAttribute('height'); }

  /* 点红色折线 → 在 ① 下方展开该条线的四元与 IFS part */
  window.__showLine = function (n) {
    var lp = currentLoop, defs = [];
    ((lp && lp.edges) || []).forEach(function (e) {
      (e.lines || []).forEach(function (ln) {
        if (ln.type === 'defense') defs.push({ e: e, ln: ln });
      });
    });
    var d = defs[n - 1];
    var box = document.getElementById('lineDetail');
    if (!d || !box) return;
    var stages = lp.stages || ['唤起', '觉察', '动员', '行动', '接触', '消退'];
    var ln = d.ln, e = d.e;
    var c = ln.content || {}, p = ln.part || {};
    var roleMap = { manager: 'Manager 管理者', firefighter: 'Firefighter 救火者', exile: 'Exile 流放者' };
    box.innerHTML =
      '<div class="fixbox" style="margin-top:14px">' +
        '<div style="font-size:14px"><b>#' + n + ' ' + escHtml(ln.mech || '') + '</b>　' +
          escHtml(stages[+e.from] + ' → ' + stages[+e.to]) + '　' +
          (ln.lit ? '<span style="color:#d1495b">本集实走</span>' : '<span style="color:#8b949e">菜单（未走）</span>') +
        '</div>' +
        '<div class="tri" style="margin-top:8px">' +
          '<div><b>行为 behavior</b>' + escHtml(c.behavior || '—') + '</div>' +
          '<div><b>想法 thought</b>' + escHtml(c.thought || '—') + '</div>' +
          '<div><b>感受 feeling</b>' + escHtml(c.feeling || '—') + '</div>' +
          '<div><b>躯体 somatic（推测）</b>' + (c.somatic ? ('可能是：' + escHtml(c.somatic)) : '未提供（你没提身体反应，可以补）') + '</div>' +
        '</div>' +
        '<div class="tri" style="margin-top:8px;grid-template-columns:repeat(3,1fr)">' +
          '<div><b>主导 part（IFS）</b>' + escHtml(p.name ? ('「' + p.name + '」') : '—') + '</div>' +
          '<div><b>角色 role</b>' + escHtml(roleMap[p.role] || p.role || '—') + '</div>' +
          '<div><b>类型 subtype</b>' + escHtml(p.subtype || '—') + '</div>' +
        '</div>' +
        (ln.why ? '<div class="hint" style="margin-top:8px"><b>为什么这条线成立：</b>' + escHtml(ln.why) + '</div>' : '') +
      '</div>';
  };

  window.__pickEpisode = function (i) {
    var lp = (PARENTS_CHAIN.loops || [])[i];
    if (!lp || !host) return;
    host.innerHTML = buildLoopSVG(lp);
    var s = host.querySelector('svg');
    if (s) { s.style.width = '1180px'; s.style.height = 'auto'; s.removeAttribute('width'); s.removeAttribute('height'); }
    currentLoop = lp;
    var ld = document.getElementById('lineDetail');
    if (ld) ld.innerHTML = '';
    if (typeof window.renderNarrate === 'function') window.renderNarrate();
    var t = document.getElementById('v4title');
    if (t) t.textContent = '① 单环 · ' + (lp.name || ('episode ' + (i + 1)));
    if (sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ⑤ 换成「行动选项 · 走向健康闭合」：给可执行的替代动作，不是提问 */
  var secs = document.querySelectorAll('.parse-sec');
  var g5 = null;
  for (var si = 0; si < secs.length; si++) {
    var h2 = secs[si].querySelector('h2');
    if (h2 && h2.textContent.indexOf('⑤') === 0) { g5 = secs[si]; break; }
  }
  if (g5) {
    var acts = [];
    (PARENTS_CHAIN.loops || []).forEach(function (lp, i) {
      ((lp.meta || {}).actions || []).forEach(function (a) {
        acts.push({ ep: lp.name || ('episode ' + (i + 1)), a: a });
      });
    });
    var out5 = '<h2>⑤ 行动选项 · 走向健康闭合</h2>' +
      '<div class="hint" style="margin-bottom:10px">每个断点配 2–3 条<b>可执行的替代动作</b>。不是提问，是「下次可以这么做」——目标是让这一环真的闭合，而不是继续停在防御上。</div>';
    if (acts.length) {
      out5 += '<div class="path-grid">' + acts.map(function (x) {
        var a = x.a;
        return '<div class="path-card open">' +
          '<h4 style="cursor:default">' + escHtml(a.title) + '</h4>' +
          '<p class="path-q"><span style="color:#3b6ea5">' + escHtml(x.ep) + ' · ' + escHtml(a.at) + '</span><br>' + escHtml(a.step) + '</p>' +
          '<div style="font-size:12px;color:#2f7d54;margin-top:6px">为什么能闭合：' + escHtml(a.closes) + '</div>' +
          '<div style="font-size:12px;color:#8b5a2b;margin-top:6px">代价：' + escHtml(a.cost) + '</div>' +
          '</div>';
      }).join('') + '</div>';
    } else {
      out5 += '<div class="hint">这份数据没有 actions 块，无法生成行动选项。</div>';
    }
    g5.innerHTML = out5;
  }

  /* ④ 文本解读：跟着 ①/② 当前视图自动匹配，解读里带上需要与行动 */
  function needBlock(lp) {
    var nd = ((lp.meta || {}).need) || null;
    if (!nd || !nd.text) return '';
    var ev = (nd.evidence || []).length;
    return '<div class="fixbox" style="margin-top:12px"><b>未满足的完形：</b>' + escHtml(nd.text) +
      '<div class="hint" style="margin-top:4px">证据 ×' + ev + '（引文均可回溯到素材原文）</div></div>';
  }
  function actionsBlock(lp) {
    var acts = ((lp.meta || {}).actions) || [];
    if (!acts.length) return '';
    return '<div style="margin-top:14px"><b>可以怎么做（走向闭合）：</b><ul style="margin:8px 0 0;padding-left:20px">' +
      acts.map(function (a) {
        return '<li style="margin:6px 0"><b>' + escHtml(a.title) + '</b>（' + escHtml(a.at) + '）<br>' +
          escHtml(a.step) +
          '<div class="hint" style="margin-top:2px">为什么能闭合：' + escHtml(a.closes) + '｜代价：' + escHtml(a.cost) + '</div></li>';
      }).join('') + '</ul></div>';
  }
  /* 躯体一律降级成推测语气：用户不一定每次都提供身体反应
     注意叙述里标签是分开的：你<b>身体</b>：…… 所以要允许中间夹标签 */
  function softenBody(html) {
    return String(html).replace(/你(<b>)?身体(<\\/b>)?[：:]/g, function (m, o, c) {
      return '你' + (o || '') + '身体' + (c || '') + '可能会：';
    });
  }
  function narrateFor(lp) {
    var body = '';
    try { body = softenBody(window.narrateLoop(lp)); } catch (e) { body = '<p>叙述失败：' + escHtml(e.message) + '</p>'; }
    return body + needBlock(lp) + actionsBlock(lp);
  }
  function narrateChainFor(chain) {
    var body = '';
    try { body = softenBody(window.narrateChain({ name: chain.name, loops: chain.loops })); } catch (e) { body = '<p>叙述失败：' + escHtml(e.message) + '</p>'; }
    var cm = chain.meta || {};
    if (cm.need && cm.need.text) {
      body += '<div class="fixbox" style="margin-top:12px"><b>共同未满足的完形：</b>' + escHtml(cm.need.text) +
        '<div class="hint" style="margin-top:4px">证据 ×' + ((cm.need.evidence || []).length) + '</div></div>';
    }
    return body;
  }

  var currentLoop = PARENTS_LOOP;
  var secs0 = document.querySelectorAll('.parse-sec');
  var g4 = null;
  for (var s4 = 0; s4 < secs0.length; s4++) {
    var h4 = secs0[s4].querySelector('h2');
    if (h4 && h4.textContent.indexOf('④') === 0) { g4 = secs0[s4]; break; }
  }
  window.renderNarrate = function () {
    if (!g4) return;
    var sel = document.getElementById('narrateTarget');
    var mode = sel ? sel.value : 'auto';
    var out = document.getElementById('narrateOut');
    var hint = document.getElementById('narrateHint');
    if (!out) return;
    if (mode === 'chain') {
      out.innerHTML = narrateChainFor(PARENTS_CHAIN);
      if (hint) hint.textContent = '正在读：三条串接全景';
    } else {
      out.innerHTML = narrateFor(currentLoop);
      if (hint) hint.textContent = '正在读：' + (currentLoop.name || '当前单环');
    }
  };
  if (g4) {
    g4.innerHTML =
      '<h2>④ 文本解读 · 跟着 ①/② 走</h2>' +
      '<div class="hint" style="margin-bottom:10px">① 显示哪条 episode，这里就解读哪条；点 ② 的小环会一起切换。解读内容已包含<b>未满足的完形</b>与<b>可执行动作</b>，不再只是机制说明。</div>' +
      '<div class="parse-actions">' +
        '<label>解读对象：</label>' +
        '<select id="narrateTarget" onchange="renderNarrate()">' +
          '<option value="auto">跟随当前单环</option>' +
          '<option value="chain">三条串接全景</option>' +
        '</select>' +
        '<span class="hint" id="narrateHint"></span>' +
      '</div>' +
      '<div id="narrateOut" style="margin-top:14px;font-size:14px;line-height:1.8"></div>';
  }
  /* 首屏就按当前 ① 出解读 */
  if (typeof window.renderNarrate === 'function') window.renderNarrate();

  /* ③ 碎片罐：挪到页面最后 + 用主题碎片文档播种 + 可导出 */
  var secs3 = document.querySelectorAll('.parse-sec');
  var g3 = null;
  for (var s3 = 0; s3 < secs3.length; s3++) {
    var h3 = secs3[s3].querySelector('h2');
    if (h3 && h3.textContent.indexOf('③') === 0) { g3 = secs3[s3]; break; }
  }
  if (g3) {
    document.body.appendChild(g3);   /* 放最后 */

    if (window.FragmentJar && SEED_FRAGMENTS.length) {
      var have = (FragmentJar.list() || []).map(function (f) { return String(f.text || '').trim(); });
      var added = 0;
      SEED_FRAGMENTS.forEach(function (t) {
        t = String(t).trim();
        if (t && have.indexOf(t) < 0) { FragmentJar.add(t); added++; }
      });
      if (typeof renderJar === 'function') renderJar();
      if (typeof refreshClarity === 'function') refreshClarity();
      var ph = document.getElementById('parseHint');
      if (ph) ph.textContent = '已从「' + FRAG_DOC + '」读入 ' + SEED_FRAGMENTS.length + ' 片（本次新增 ' + added + ' 片）';
    }

    var bar3 = document.createElement('div');
    bar3.className = 'parse-actions';
    bar3.style.marginTop = '10px';
    bar3.innerHTML = '<button id="exportFrag">导出碎片（Markdown）</button>' +
      '<span class="hint" id="exportHint">导出后贴回「' + FRAG_DOC + '」</span>';
    g3.appendChild(bar3);
    document.getElementById('exportFrag').addEventListener('click', function () {
      var lines = (FragmentJar.list() || []).map(function (f) {
        return '- ' + String(f.text || '').replace(/\\s+/g, ' ').trim();
      });
      var old = document.getElementById('exportOut');
      if (old) old.remove();
      var ta = document.createElement('textarea');
      ta.id = 'exportOut';
      ta.value = lines.join('\\n');
      ta.style.cssText = 'width:100%;min-height:150px;margin-top:8px;border:1px solid #d8dee9;border-radius:8px;padding:8px;font-size:12px';
      bar3.parentNode.insertBefore(ta, bar3.nextSibling);
      ta.select();
      document.getElementById('exportHint').textContent = '已生成 ' + lines.length + ' 条，复制贴回「' + FRAG_DOC + '」';
    });
  }

  /* 原版分叉视图与镜映面板整体移除，只留新版视图 */
  if (card && card.parentNode) card.parentNode.removeChild(card);
  var detEl = document.getElementById('detail');
  if (detEl && detEl.parentNode) detEl.parentNode.removeChild(detEl);
})();
</script>
`;

html = html.replace('</body>', inject + '</body>');
fs.writeFileSync(OUT, html, 'utf8');
console.log('written', OUT, html.length, 'bytes |', loops.length, 'episode(s)');
