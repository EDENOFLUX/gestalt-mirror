/* gestalt-loop.js — 格式塔镜映核心引擎 (Gestalt Loop Mirror core engine)
 * 零外部依赖，纯 classic script（file:// 双击可用，无需打包/服务器）。
 *
 * 设计规格 grill 收口版 A–F + G–L 见 README.md。
 *
 * 全局暴露：
 *   STAGES, NSTAGE, pol, keyLineIdx, defaultEdges,
 *   renderBranched(svg, loop, opt), renderSingleView(svg, loop), renderChain(svg, loops)
 *
 * 约定（宿主页面需提供）：
 *   - 在文档 :root 定义 CSS 变量：--fix(红/防御) --accent(蓝/真实) --ink --muted
 *   - 提供全局函数 showLine(loop, ei, li)：点击分支时的镜映面板回调（本引擎只负责渲染，不负责面板）
 *
 * 数据模型（loop）：
 *   { name, meta:{context, intensity}, edges:[ { from, to, lines:[ {type, lit, mech?, content?, note?, part?} ] } ], exile? }
 *   edges[i].from / to 为 STAGES 下标；lines 为该边扇出的多条线（可能性菜单）。
 *   type: 'real' | 'defense'；lit: 本次 episode 实际走的那条（持久高亮累积）。
 *   content（防御分支上记的内容标签，四元）：
 *     { behavior 行为, thought 想法(并入原belief), feeling 感受(情绪), somatic 躯体(身体感觉) }
 *     四元不拆分；thought 已并入原 belief（认知层合一）；feeling=情绪、somatic=躯体感觉，咬 retroflection 模式（身体先于念头缩紧）。
 *   part（方法论借用 IFS，叠加层，不承诺多部分）：
 *     line.part = { role:'manager'|'firefighter'|'exile', subtype?, name? }
 *     role 必填（跨循环聚合保护者类型用），subtype（如 perfectionist/inner-critic/rage）与 name（个人化命名）可选。
 *     与四元 content 纯叠加：content=这条线"说了什么"，part=这条线"由哪个内在部分发动"。
 *   exile（loop 级，默认抽象占位，需授权才显名）：
 *     loop.exile = { need? } 中心留白＝未满足完形，语义升级为被流放的需要；核心引擎默认不渲染具体名。
 *   blending：仅由上层适配层运行时判定，核心引擎不强制每集字段（Q5：只在前瞻旗触发时判）。
 */
(function (global) {
  'use strict';

  var STAGES = ['唤起', '觉察', '动员', '行动', '接触', '消退'];
  var NSTAGE = STAGES.length;
  // IFS part 徽标（方法论借用，不承诺多部分）
  var ROLE_BADGE = { manager: 'M', firefighter: 'F', exile: 'E' };
  var ROLE_COLOR = { manager: '#6c8ebf', firefighter: '#e09f3e', exile: '#d1495b' };

  // 极坐标 → 笛卡尔（0° 在正上方，顺时针）
  function pol(cx, cy, r, deg) {
    var a = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  /* 默认示例 loop：六阶段 + 三条含扇出的易卡住边，数据模型范本。
     真实使用里应被人工确认后的候选 loop 替换。 */
  function defaultEdges() {
    return [
      { from: 0, to: 1, lines: [{ type: 'real', lit: true }] },
      { from: 1, to: 2, lines: [{ type: 'real', lit: true }] },
      { from: 2, to: 3, lines: [
        { type: 'real', lit: false },
        { type: 'defense', mech: 'introjection 内摄', lit: true,
          content: { behavior: '未经消化地吞下“应该”', thought: '我必须达到标准；标准是对的（原信念并入）', feeling: '焦虑', somatic: '被评判的紧绷·肩颈发紧' },
          note: '把外部要求内摄成自我要求，未经咀嚼便当成自己的。',
          part: { role: 'manager', subtype: 'inner-critic', name: '严厉监工' } }
      ] },
      { from: 3, to: 4, lines: [
        { type: 'real', lit: false },
        { type: 'defense', mech: 'retroflection 转向自身', lit: true,
          content: { behavior: '拖延 / 转为自我批判', thought: '我不配主动争取；别惹事，忍着', feeling: '羞耻', somatic: '自我攻击的闷痛·胸口发紧' },
          note: '能量不向外行动，转向攻击自己——假性闭合。本该「做」，却「打自己」。',
          part: { role: 'manager', subtype: 'perfectionist', name: '监工' } },
        { type: 'defense', mech: 'projection 投射', lit: false,
          content: { behavior: '把愤怒甩给别人', thought: '是别人在逼我；都是他们的错', feeling: '愤怒', somatic: '被背叛的灼烧感·胸口发热' },
          note: '把不可接受的冲动投到外部对象，回避自身责任。（菜单：本次未走）',
          part: { role: 'firefighter', subtype: 'rage', name: '喷火者' } }
      ] },
      { from: 4, to: 5, lines: [
        { type: 'real', lit: false },
        { type: 'defense', mech: 'confluence 融合', lit: true,
          content: { behavior: '边界消融、迎合', thought: '我和别人该一样；别让我独自', feeling: '被吞没的恐惧', somatic: '窒息·透不过气·胸口压' },
          note: '边界消融，与对方融合，回避真实接触——假性闭合。',
          part: { role: 'manager', subtype: 'pleaser', name: '迎合者' } }
      ] },
      { from: 5, to: 0, lines: [{ type: 'real', lit: true }] } // 环级闭合：回触发重演
    ];
  }

  // 找到某 loop 的「关键固着边 + 实走防御线」用于默认展示
  function keyLineIdx(loop) {
    for (var e = 0; e < loop.edges.length; e++) {
      var ls = loop.edges[e].lines;
      for (var l = 0; l < ls.length; l++) {
        if (ls[l].type === 'defense' && ls[l].lit) return { e: e, l: l };
      }
    }
    return { e: 0, l: 0 };
  }

  /* ---------- 分叉环渲染（单环 / 串接小环共用） ----------
     opt: { cx, cy, R, interactive=true, showLabels=true }
     主轴 = 六边形脊（六阶段＝六顶点，相邻直连）
     扇出线 = 在「from→to」连线上垂直于边方向偏移，平行排布多条（菜单）
     每条线都接到同一下一节点 = 假性闭合可视化。 */
  function renderBranched(svg, loop, opt) {
    var cx = opt.cx, cy = opt.cy, R = opt.R;
    var interactive = opt.interactive !== false;
    var showLabels = opt.showLabels !== false;
    var ns = 'http://www.w3.org/2000/svg';
    var k = R / 150;                 // 比例系数
    var spacing = 11 * k;            // 扇出线径向间距

    var nodes = STAGES.map(function (s, i) { return pol(cx, cy, R, i * 360 / NSTAGE); });

    loop.edges.forEach(function (edge, ei) {
      var p0 = nodes[edge.from], p1 = nodes[edge.to];
      var x0 = p0[0], y0 = p0[1], x1 = p1[0], y1 = p1[1];
      var dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
      var px = -dy / len, py = dx / len;        // 单位法向（垂直于边）
      var M = edge.lines.length;
      edge.lines.forEach(function (ln, li) {
        var offset = (li - (M - 1) / 2) * spacing;
        var isDef = ln.type === 'defense', lit = ln.lit;
        var ax = x0 + px * offset, ay = y0 + py * offset;
        var bx = x1 + px * offset, by = y1 + py * offset;
        var p = document.createElementNS(ns, 'path');
        p.setAttribute('d', 'M ' + ax + ' ' + ay + ' L ' + bx + ' ' + by);
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke', isDef ? 'var(--fix)' : 'var(--accent)');
        p.setAttribute('stroke-width', (isDef ? (lit ? 6 : 2.5) : (lit ? 4 : 2)) * k);
        p.setAttribute('opacity', isDef ? (lit ? 1 : 0.4) : (lit ? 0.9 : 0.35));
        if (interactive) {
          p.setAttribute('class', 'hit');
          p.addEventListener('click', function () { if (global.showLine) global.showLine(loop, ei, li); });
          if (isDef) {
            var t = document.createElementNS(ns, 'title');
            t.textContent = ln.mech + (lit ? ' · 本集实走' : ' · 菜单(本次未走)');
            p.appendChild(t);
          }
        }
        svg.appendChild(p);
        // 实走线中点：圆点 + 标签
        var mx = (x0 + x1) / 2 + px * offset, my = (y0 + y1) / 2 + py * offset;
        if (lit) {
          var dot = document.createElementNS(ns, 'circle');
          dot.setAttribute('cx', mx); dot.setAttribute('cy', my);
          dot.setAttribute('r', 3.5 * k);
          dot.setAttribute('fill', isDef ? 'var(--fix)' : 'var(--accent)');
          svg.appendChild(dot);
        }
        if (isDef && lit && showLabels) {
          var lbl = document.createElementNS(ns, 'text');
          lbl.setAttribute('x', mx); lbl.setAttribute('y', my - 9 * k);
          lbl.setAttribute('text-anchor', 'middle'); lbl.setAttribute('font-size', 10.5 * k);
          lbl.setAttribute('fill', 'var(--fix)');
          lbl.textContent = ln.mech.split(' ')[0] + ' · 本集实走';
          svg.appendChild(lbl);
        }
        // part 徽标（IFS 方法论借用）：防御线中点沿法向外移，role 缩写 + 颜色
        if (isDef && ln.part && ln.part.role && showLabels) {
          var bx = mx + px * 14 * k, by = my + py * 14 * k;
          var badge = document.createElementNS(ns, 'circle');
          badge.setAttribute('cx', bx); badge.setAttribute('cy', by);
          badge.setAttribute('r', 7 * k);
          badge.setAttribute('fill', ROLE_COLOR[ln.part.role] || '#888');
          badge.setAttribute('opacity', lit ? 1 : 0.4);
          svg.appendChild(badge);
          var bt = document.createElementNS(ns, 'text');
          bt.setAttribute('x', bx); bt.setAttribute('y', by);
          bt.setAttribute('text-anchor', 'middle'); bt.setAttribute('dominant-baseline', 'middle');
          bt.setAttribute('font-size', 8 * k); bt.setAttribute('fill', '#fff');
          bt.textContent = ROLE_BADGE[ln.part.role] || '?';
          svg.appendChild(bt);
        }
      });
    });

    STAGES.forEach(function (s, i) {
      var x = nodes[i][0], y = nodes[i][1];
      var c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 9 * k);
      c.setAttribute('fill', '#fff'); c.setAttribute('stroke', '#9fb3c8'); c.setAttribute('stroke-width', 2 * k);
      svg.appendChild(c);
      if (showLabels) {
        var t = document.createElementNS(ns, 'text');
        t.setAttribute('x', x); t.setAttribute('y', y);
        t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'middle');
        t.setAttribute('font-size', 11 * k); t.setAttribute('fill', 'var(--ink)');
        t.textContent = s;
        svg.appendChild(t);
      }
    });
  }

  /* 单环视图：六边形脊 + 边扇出 + 双重闭合；中心提示「假性闭合」。 */
  function renderSingleView(svg, loop) {
    svg.innerHTML = '';
    renderBranched(svg, loop, { cx: 240, cy: 240, R: 150, interactive: true, showLabels: true });
    var c = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    c.setAttribute('x', 240); c.setAttribute('y', 240);
    c.setAttribute('text-anchor', 'middle'); c.setAttribute('dominant-baseline', 'middle');
    c.setAttribute('font-size', 12); c.setAttribute('fill', 'var(--muted)');
    c.textContent = '假性闭合';
    svg.appendChild(c);
  }

  /* 串接视图：大多边形容器（边数 = episode 数）+ 分叉小环贴顶点外围。
     中心留白 = 未满足的完形需要（α 语义）。 */
  function renderChain(svg, loops) {
    var cx = 240, cy = 240, R_big = 108;
    var ns = 'http://www.w3.org/2000/svg';
    svg.innerHTML = '';
    var N = loops.length;
    var verts = [];
    for (var i = 0; i < N; i++) verts.push(pol(cx, cy, R_big, i * 360 / N));
    var big = document.createElementNS(ns, 'polygon');
    big.setAttribute('points', verts.map(function (v) { return v.join(','); }).join(' '));
    big.setAttribute('fill', 'none'); big.setAttribute('stroke', '#c7d0dc');
    big.setAttribute('stroke-width', '3'); big.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(big);
    // 中心：未满足的完形需要（α）
    var t1 = document.createElementNS(ns, 'text');
    t1.setAttribute('x', cx); t1.setAttribute('y', cy - 4);
    t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('dominant-baseline', 'middle');
    t1.setAttribute('font-size', 12); t1.setAttribute('fill', 'var(--muted)');
    t1.textContent = '串接大 loop';
    svg.appendChild(t1);
    var t2 = document.createElementNS(ns, 'text');
    t2.setAttribute('x', cx); t2.setAttribute('y', cy + 12);
    t2.setAttribute('text-anchor', 'middle'); t2.setAttribute('dominant-baseline', 'middle');
    t2.setAttribute('font-size', 9); t2.setAttribute('fill', 'var(--muted)');
    t2.textContent = '未满足的完形需要';
    svg.appendChild(t2);
    // 分叉小环贴多边形顶点外围（按时间均布，大小 = 固着强度）
    loops.forEach(function (lp, i) {
      var ang = (i / N) * 360;
      var inten = (lp.meta && lp.meta.intensity != null) ? lp.meta.intensity : 0.6;
      var miniR = 20 + inten * 26;
      var pos = pol(cx, cy, R_big + miniR, ang);
      var x = pos[0], y = pos[1];
      renderBranched(svg, lp, { cx: x, cy: y, R: miniR, interactive: false, showLabels: false });
      var numPos = pol(cx, cy, R_big + miniR + 13, ang);
      var num = document.createElementNS(ns, 'text');
      num.setAttribute('x', numPos[0]); num.setAttribute('y', numPos[1]);
      num.setAttribute('text-anchor', 'middle'); num.setAttribute('dominant-baseline', 'middle');
      num.setAttribute('font-size', 11); num.setAttribute('fill', 'var(--muted)');
      num.textContent = (i + 1);
      svg.appendChild(num);
      var lbl = document.createElementNS(ns, 'text');
      lbl.setAttribute('x', x); lbl.setAttribute('y', y + miniR + 12);
      lbl.setAttribute('text-anchor', 'middle'); lbl.setAttribute('font-size', 9);
      lbl.setAttribute('fill', 'var(--ink)');
      lbl.textContent = (lp.meta ? lp.meta.context : '') + ' ·' + inten.toFixed(2);
      svg.appendChild(lbl);
      var hit = document.createElementNS(ns, 'circle');
      hit.setAttribute('cx', x); hit.setAttribute('cy', y); hit.setAttribute('r', miniR + 6);
      hit.setAttribute('fill', 'transparent'); hit.setAttribute('class', 'hit');
      hit.addEventListener('click', function () {
        renderSingleView(document.getElementById('single'), lp);
        var kl = keyLineIdx(lp);
        if (global.showLine) global.showLine(lp, kl.e, kl.l);
      });
      svg.appendChild(hit);
    });
  }

  // 导出
  global.GLM = {
    STAGES: STAGES, NSTAGE: NSTAGE,
    pol: pol, keyLineIdx: keyLineIdx, defaultEdges: defaultEdges,
    renderBranched: renderBranched, renderSingleView: renderSingleView, renderChain: renderChain
  };
  // 同时挂到全局，方便直接调用
  global.STAGES = STAGES; global.NSTAGE = NSTAGE;
  global.pol = pol; global.keyLineIdx = keyLineIdx; global.defaultEdges = defaultEdges;
  global.renderBranched = renderBranched;
  global.renderSingleView = renderSingleView; global.renderChain = renderChain;

})(typeof window !== 'undefined' ? window : this);
