/* 格式塔镜映 · 新版视图（v4）
 * 六边形脊 + 折线菱形 + 编号徽标 + 我的模式面板
 * 纯字符串拼 SVG，不依赖 DOM，便于 Node 里单测。
 *   window.buildLoopSVG(loop) -> "<svg …>…</svg>"
 */
(function (root) {
  'use strict';

  var W = 1780, H = 1520;
  var CX = 660, CY = 680, R = 420, NR = 54;
  var STAGES_DEFAULT = ['唤起', '觉察', '动员', '行动', '接触', '消退'];
  /* 两套配色：light 跟页面统一（默认），dark 给深色场合 */
  var LIGHT = {
    bg: '#ffffff', text: '#1f2430', dim: '#6b7280',
    flowLit: '#1f2430', flowDim: '#b9c2d0',
    defLit: '#d1495b', defDim: '#e7aab3',
    recur: '#3b6ea5', nodeFill: '#ffffff', nodeEdge: '#d8dee9',
    hexFill: '#f7f9fc', hexEdge: '#d8dee9',
    badgeFill: '#ffffff', labelBg: '#ffffff'
  };
  var DARK = {
    bg: '#0f1216', text: '#e6edf3', dim: '#8b949e',
    flowLit: '#ecf5ff', flowDim: '#3a4854',
    defLit: '#e5383b', defDim: '#7a2b2e',
    recur: '#78c8ff', nodeFill: '#161b22', nodeEdge: '#30363d',
    hexFill: '#171d25', hexEdge: '#2c3644',
    badgeFill: '#0f1216', labelBg: '#0f1216'
  };
  function pickTheme(name) { return name === 'dark' ? DARK : LIGHT; }
  var C = LIGHT;   /* 当前渲染用的主题，由 build* 按 opt.theme 切换 */
  var FONT = 'Microsoft YaHei, "PingFang SC", sans-serif';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function pt(deg, rad) {
    var a = deg * Math.PI / 180;
    return [CX + rad * Math.cos(a), CY + rad * Math.sin(a)];
  }
  function nodePt(i, n) { return pt(-90 + 360 / n * i, R); }
  function trim(p, q, r) {
    var dx = q[0] - p[0], dy = q[1] - p[1], n = Math.hypot(dx, dy) || 1;
    return [p[0] + dx / n * r, p[1] + dy / n * r];
  }
  function f2(v) { return Math.round(v * 10) / 10; }
  function arrowPoly(p, dir, size, color) {
    var dx = dir[0], dy = dir[1], n = Math.hypot(dx, dy) || 1;
    var ux = dx / n, uy = dy / n, px = -uy, py = ux;
    return '<polygon points="' +
      f2(p[0]) + ',' + f2(p[1]) + ' ' +
      f2(p[0] - size * ux + size * 0.55 * px) + ',' + f2(p[1] - size * uy + size * 0.55 * py) + ' ' +
      f2(p[0] - size * ux - size * 0.55 * px) + ',' + f2(p[1] - size * uy - size * 0.55 * py) +
      '" fill="' + color + '"/>';
  }
  function hexPoints(x, y, r) {
    var p = [];
    for (var k = 0; k < 6; k++) {
      var a = (-90 + 60 * k) * Math.PI / 180;
      p.push(f2(x + r * Math.cos(a)) + ',' + f2(y + r * Math.sin(a)));
    }
    return p.join(' ');
  }

  /* 未满足的完形：取最早一处没走直走线的边，读它自己的 why（输入驱动） */
  function deriveNeed(items, stages) {
    var broken = items.filter(function (it) { return it.role === 'flow' && !it.lit; })
      .sort(function (a, b) { return (a.f - b.f) || (a.t - b.t); });
    if (!broken.length) return '';
    var it = broken[0];
    var why = String(it.why || '').trim();
    ['本该走的：', '本该走的:', '本该走的 '].forEach(function (p) {
      if (why.indexOf(p) === 0) why = why.slice(p.length);
    });
    why = why.replace(/[。.]\s*$/, '').trim();
    if (why) return why;
    return '在「' + stages[it.f] + '→' + stages[it.t] + '」这一段，本可以直接走过去';
  }

  function loopItems(lp) {
    var items = [];
    (lp.edges || []).forEach(function (e) {
      var f = +e.from, t = +e.to;
      (e.lines || []).forEach(function (ln) {
        var role = (t === 0 && f === 5) ? 'recur' : (ln.type === 'defense' ? 'defense' : 'flow');
        items.push({ f: f, t: t, role: role, lit: !!ln.lit, why: ln.why || '' });
      });
    });
    return items;
  }

  function deriveChainNeed(loops) {
    var seen = [];
    loops.forEach(function (lp) {
      var nd = deriveNeed(loopItems(lp), lp.stages || STAGES_DEFAULT);
      if (nd && seen.indexOf(nd) < 0) seen.push(nd);
    });
    return seen.slice(0, 3).join('／');
  }

  function buildLoopSVG(loop, opt) {
    opt = opt || {};
    C = pickTheme(opt.theme);
    var stages = (loop && loop.stages) || STAGES_DEFAULT;
    var N = stages.length;
    var meta = (loop && loop.meta) || {};
    var closures = meta.closures || [];
    var title = (loop && (loop.title || loop.name)) || '格式塔环';
    var sub = (loop && loop.subtitle) || '六边形脊＝六阶段直连；每条边的可能性折成菱形';

    // 展平
    var items = [];
    (loop.edges || []).forEach(function (e) {
      var f = +e.from, t = +e.to;
      (e.lines || []).forEach(function (ln) {
        var role = (t === 0 && f === N - 1) ? 'recur' : (ln.type === 'defense' ? 'defense' : 'flow');
        items.push({
          f: f, t: t, role: role, lit: !!ln.lit,
          mech: ln.mech || '', bend: ln.bend,
          weight: ln.weight == null ? 60 : +ln.weight,
          content: ln.content || {}, part: ln.part || {}, why: ln.why || ''
        });
      });
    });

    var out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" font-family=\'' + FONT + '\'>');
    out.push('<rect width="' + W + '" height="' + H + '" fill="' + C.bg + '"/>');
    out.push('<text x="60" y="52" fill="' + C.text + '" font-size="26" font-weight="700">' + esc(title) + '</text>');
    out.push('<text x="62" y="92" fill="' + C.dim + '" font-size="14">' + esc(sub) + '</text>');

    // 六边形底
    var hexAll = [];
    for (var i0 = 0; i0 < N; i0++) { var q0 = nodePt(i0, N); hexAll.push(f2(q0[0]) + ',' + f2(q0[1])); }
    out.push('<polygon points="' + hexAll.join(' ') + '" fill="' + C.hexFill + '" stroke="' + C.hexEdge + '" stroke-width="2"/>');

    // 脊
    items.forEach(function (it) {
      if (it.role === 'defense') return;
      var p0 = nodePt(it.f, N), p1 = nodePt(it.t, N);
      var a = trim(p0, p1, NR + 8), b = trim(p1, p0, NR + 20);
      var color = it.role === 'recur' ? C.recur : (it.lit ? C.flowLit : C.flowDim);
      if (it.lit) {
        out.push('<line x1="' + f2(a[0]) + '" y1="' + f2(a[1]) + '" x2="' + f2(b[0]) + '" y2="' + f2(b[1]) +
          '" stroke="' + color + '" stroke-width="' + (it.role === 'recur' ? 8 : 7) + '" stroke-linecap="round"/>');
        out.push(arrowPoly(b, [b[0] - a[0], b[1] - a[1]], 17, color));
      } else {
        out.push('<line x1="' + f2(a[0]) + '" y1="' + f2(a[1]) + '" x2="' + f2(b[0]) + '" y2="' + f2(b[1]) +
          '" stroke="' + color + '" stroke-width="3" stroke-dasharray="12 9"/>');
      }
      if (it.role === 'recur') {
        var mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        var mx = mid[0] - CX, my = mid[1] - CY, nn = Math.hypot(mx, my) || 1;
        out.push('<text x="' + f2(mid[0] + mx / nn * 40) + '" y="' + f2(mid[1] + my / nn * 40) +
          '" fill="' + C.recur + '" font-size="13" text-anchor="middle">重演</text>');
      }
    });

    // 防御：按 (f,t) 分组
    var groups = {}, order = [];
    items.forEach(function (it) {
      if (it.role !== 'defense') return;
      var k = it.f + '>' + it.t;
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(it);
    });

    var badges = [], badgeNo = 0;
    order.forEach(function (key) {
      var group = groups[key];
      var f = group[0].f, t = group[0].t;
      var p0 = nodePt(f, N), p1 = nodePt(t, N);
      var ux = p1[0] - p0[0], uy = p1[1] - p0[1], L = Math.hypot(ux, uy) || 1;
      ux /= L; uy /= L;
      var nx = -uy, ny = ux;
      if ((CX - (p0[0] + p1[0]) / 2) * nx + (CY - (p0[1] + p1[1]) / 2) * ny < 0) { nx = -nx; ny = -ny; }
      group.forEach(function (it, gi) {
        var depth = Math.max(60, it.weight) * 1.7;
        var inward = it.bend === 'in' ? 1 : (it.bend === 'out' ? -1 :
          (/projection|confluence/.test(it.mech) ? -1 : 1));
        var mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
        var apex = [mx + nx * depth * inward, my + ny * depth * inward];
        var a = trim(p0, p1, NR + 8), b = trim(p1, p0, NR + 8);
        var thisNo = badgeNo + 1;
        /* 偏转 / 麻木：能量直接甩出去，不折返回下一节点 → 画成一条断尾线段 */
        var isStub = it.shape === 'stub' || /deflection|desensitization/.test(it.mech);
        out.push('<g class="def-hit" style="cursor:pointer" onclick="window.__showLine&&window.__showLine(' + thisNo + ')"' +
          '><title>点击查看四元与 IFS part</title>');
        var badgePt = apex;
        if (isStub) {
          var omx = (a[0] + b[0]) / 2, omy = (a[1] + b[1]) / 2;
          var len = 52 + Math.max(0, it.weight) * 0.55;
          /* 偏转向外甩，麻木向内塌；两种都断尾、不连下一节点 */
          var dirSign = /desensitization/.test(it.mech) ? 1 : -1;
          var tip = [omx + nx * len * dirSign, omy + ny * len * dirSign];
          if (it.lit) {
            out.push('<line x1="' + f2(omx) + '" y1="' + f2(omy) + '" x2="' + f2(tip[0]) + '" y2="' + f2(tip[1]) +
              '" stroke="' + C.defLit + '" stroke-width="5" stroke-linecap="round"/>');
            out.push(arrowPoly(tip, [tip[0] - omx, tip[1] - omy], 14, C.defLit));
          } else {
            out.push('<line x1="' + f2(omx) + '" y1="' + f2(omy) + '" x2="' + f2(tip[0]) + '" y2="' + f2(tip[1]) +
              '" stroke="' + C.defDim + '" stroke-width="3" stroke-dasharray="9 7"/>');
          }
          badgePt = tip;
        } else {
          out.push('<polygon points="' + f2(a[0]) + ',' + f2(a[1]) + ' ' + f2(apex[0]) + ',' + f2(apex[1]) + ' ' +
            f2(b[0]) + ',' + f2(b[1]) + '" fill="' + (it.lit ? 'rgba(229,56,59,0.07)' : 'rgba(229,56,59,0.03)') + '"/>');
          if (it.lit) {
            out.push('<polyline points="' + f2(a[0]) + ',' + f2(a[1]) + ' ' + f2(apex[0]) + ',' + f2(apex[1]) + ' ' +
              f2(b[0]) + ',' + f2(b[1]) + '" fill="none" stroke="' + C.defLit + '" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>');
            out.push(arrowPoly(b, [b[0] - apex[0], b[1] - apex[1]], 15, C.defLit));
          } else {
            out.push('<polyline points="' + f2(a[0]) + ',' + f2(a[1]) + ' ' + f2(apex[0]) + ',' + f2(apex[1]) + ' ' +
              f2(b[0]) + ',' + f2(b[1]) + '" fill="none" stroke="' + C.defDim + '" stroke-width="3" stroke-dasharray="10 8"/>');
          }
        }
        badgeNo++;
        var col = it.lit ? C.defLit : C.defDim;
        out.push('<circle cx="' + f2(badgePt[0]) + '" cy="' + f2(badgePt[1]) + '" r="16" fill="' + C.badgeFill + '" stroke="' + col + '" stroke-width="2"/>');
        out.push('<text x="' + f2(badgePt[0]) + '" y="' + f2(badgePt[1]) + '" fill="' + col + '" font-size="13" font-weight="700" text-anchor="middle" dominant-baseline="central">' + badgeNo + '</text>');
        var rx = badgePt[0] - CX, ry = badgePt[1] - CY, rn = Math.hypot(rx, ry) || 1;
        var lblTxt = it.mech.split(' ').pop() + '·' + (it.part.name || '') + (isStub ? '（没接触）' : '');
        out.push('<text x="' + f2(badgePt[0] + rx / rn * 36) + '" y="' + f2(badgePt[1] + ry / rn * 36) +
          '" fill="' + (it.lit ? C.defLit : C.defDim) + '" font-size="11" text-anchor="middle" dominant-baseline="central">' +
          esc(lblTxt) + '</text>');
        badges.push({ no: badgeNo, it: it });
        out.push('</g>');
      });
    });

    // 节点
    var litNodes = {};
    items.forEach(function (it) { if (it.lit) { litNodes[it.f] = 1; litNodes[it.t] = 1; } });
    for (var i = 0; i < N; i++) {
      var np = nodePt(i, N);
      out.push('<polygon points="' + hexPoints(np[0], np[1], NR) + '" fill="' + C.nodeFill + '" stroke="' +
        (litNodes[i] ? C.recur : C.nodeEdge) + '" stroke-width="' + (litNodes[i] ? 4 : 2) + '"/>');
      out.push('<text x="' + f2(np[0]) + '" y="' + f2(np[1] - 6) + '" fill="' + C.text +
        '" font-size="17" font-weight="700" text-anchor="middle" dominant-baseline="central">' + esc(stages[i]) + '</text>');
      if (i < closures.length) {
        out.push('<text x="' + f2(np[0]) + '" y="' + f2(np[1] + NR - 22) + '" fill="' + C.dim +
          '" font-size="10" text-anchor="middle">' + Math.round(closures[i]) + '%</text>');
      }
    }

    // 中心：未满足的完形（need 块 > 人工值 > 从素材推）
    var needObj = meta.need || {};
    var needEv = needObj.evidence || [];
    var needVerdict = (needObj.crosscheck || {}).verdict || '';
    var need = String(needObj.text || '').trim();
    var needLabel = need ? ('未满足的完形 · 证据 ×' + needEv.length +
      ((needVerdict === 'conflict' || needVerdict === 'unusable') ? ' · 旁证不可用' : '')) : '';
    if (!need) {
      need = String(meta.missingNeed || '').trim();
      needLabel = '未满足的完形';
    }
    var needDerived = false;
    if (!need) {
      need = deriveNeed(items, stages);
      needLabel = '未满足的完形 · 从素材推得';
      needDerived = !!need;
    }
    if (need) {
      out.push('<text x="' + CX + '" y="' + (CY - 26) + '" fill="' + C.dim + '" font-size="12" text-anchor="middle">' +
        needLabel + '</text>');
      var segs = need.replace(/\//g, '／').split(/[／，,。；;、]/).map(function (s) { return s.trim(); }).filter(Boolean);
      var lines = [], cur = '';
      segs.forEach(function (s) {
        var cand = cur ? (cur + '，' + s) : s;
        if (cand.length <= 15) cur = cand;
        else { if (cur) lines.push(cur); cur = s; }
      });
      if (cur) lines.push(cur);
      if (!lines.length) lines = [need.slice(0, 15)];
      lines = lines.slice(0, 3);
      for (var li = 0; li < lines.length; li++) {
        out.push('<text x="' + CX + '" y="' + (CY + li * 23) + '" fill="' + C.text + '" font-size="15" font-weight="700" text-anchor="middle">' +
          esc(lines[li]) + '</text>');
      }
    } else {
      out.push('<text x="' + CX + '" y="' + (CY + 5) + '" fill="' + C.dim + '" font-size="15" font-weight="700" text-anchor="middle">未满足的完形</text>');
    }

    // 底部索引
    out.push('<text x="70" y="1192" fill="' + C.dim + '" font-size="12">可能性路径　顶点朝外＝能量甩向外部（投射／融合），朝内＝收回自身（内摄／转向自身）</text>');
    badges.forEach(function (b) {
      var c = b.it.content || {};
      var extra = (c.behavior || c.feeling || c.somatic)
        ? '｜' + (c.behavior || '') + '／' + (c.feeling || '') +
          (c.somatic ? ('／可能' + c.somatic) : '') : '';
      out.push('<text x="180" y="' + (1200 + b.no * 30) + '" fill="' + (b.it.lit ? C.defLit : C.defDim) + '" font-size="12">' +
        b.no + '　' + esc(b.it.mech.split(' ').pop() + ' · ' + (b.it.part.name || '')) + esc(extra) +
        (b.it.lit ? '' : '（未走）') + '</text>');
    });

    // 右侧面板
    var px = 1170, py = 300;
    out.push('<text x="' + px + '" y="' + py + '" fill="' + C.text + '" font-size="17" font-weight="700">我的模式 · 可替代</text>');
    out.push('<text x="' + px + '" y="' + (py + 32) + '" fill="' + C.dim + '" font-size="11">实线＝这次实际走的　虚线＝还能走、没走的</text>');
    var litMechs = items.filter(function (x) { return x.role === 'defense' && x.lit; }).map(function (x) { return x.mech.split(' ').pop(); });
    out.push('<text x="' + px + '" y="' + (py + 78) + '" fill="' + C.defLit + '" font-size="12">你的模式：边界上假性闭合 ' + litMechs.length + ' 次</text>');
    out.push('<text x="' + px + '" y="' + (py + 104) + '" fill="' + C.defLit + '" font-size="13" font-weight="700">' + esc(litMechs.join(' → ') || '—') + '</text>');

    var hy = py + 158;
    out.push('<text x="' + px + '" y="' + hy + '" fill="' + C.dim + '" font-size="11">边</text>');
    out.push('<text x="' + (px + 130) + '" y="' + hy + '" fill="' + C.dim + '" font-size="11">这次走</text>');
    out.push('<text x="' + (px + 285) + '" y="' + hy + '" fill="' + C.dim + '" font-size="11">可替代</text>');
    out.push('<line x1="' + px + '" y1="' + (hy + 10) + '" x2="' + (px + 480) + '" y2="' + (hy + 10) + '" stroke="' + C.nodeEdge + '" stroke-width="1"/>');

    var ry = hy + 36;
    order.forEach(function (key) {
      var grp = groups[key];
      var f = grp[0].f, t = grp[0].t;
      var actual = null, alts = [];
      items.forEach(function (it) {
        if (it.f !== f || it.t !== t) return;
        if (it.role === 'flow' && !it.lit) alts.push('直走');
        if (it.role === 'defense') {
          var nm = it.mech.split(' ').pop();
          if (it.lit) actual = nm; else alts.push(nm);
        }
      });
      out.push('<text x="' + px + '" y="' + ry + '" fill="' + C.text + '" font-size="12">' + esc(stages[f] + '→' + stages[t]) + '</text>');
      out.push('<text x="' + (px + 130) + '" y="' + ry + '" fill="' + C.defLit + '" font-size="12" font-weight="700">' + esc(actual || '直走') + '</text>');
      out.push('<text x="' + (px + 285) + '" y="' + ry + '" fill="' + C.dim + '" font-size="12">' + esc(alts.join('／') || '—') + '</text>');
      ry += 36;
    });
    out.push('<text x="' + px + '" y="' + (ry + 18) + '" fill="' + C.dim + '" font-size="11">其余 ' +
      Math.max(0, N - order.length) + ' 段一路直走，没有防御介入。</text>');

    // 图例
    var ly = 1410, lx = 70;
    var legend = [
      [C.flowLit, false, '实走的推进'],
      [C.flowDim, true, '本次没走的推进'],
      [C.defLit, false, '实走的防御（中断在边界）'],
      [C.defDim, true, '菜单里没走的防御'],
      [C.recur, false, '环级闭合：回到起点重演']
    ];
    legend.forEach(function (L) {
      if (L[1]) {
        out.push('<line x1="' + lx + '" y1="' + ly + '" x2="' + (lx + 34) + '" y2="' + ly + '" stroke="' + L[0] + '" stroke-width="5" stroke-dasharray="10 8"/>');
      } else {
        out.push('<line x1="' + lx + '" y1="' + ly + '" x2="' + (lx + 34) + '" y2="' + ly + '" stroke="' + L[0] + '" stroke-width="5" stroke-linecap="round"/>');
      }
      out.push('<text x="' + (lx + 44) + '" y="' + (ly + 5) + '" fill="' + C.dim + '" font-size="13">' + esc(L[2]) + '</text>');
      lx += 260;
    });

    out.push('</svg>');
    return out.join('');
  }

  /* 串接视图（新版风格）：大多边形容器 + 顶点小六边形环 + 中心留白
   * 规则不变：边数 = episode 数；小环大小 = 固着强度；点击小环 = 放大到单环
   */
  function buildChainSVG(chain, opt) {
    opt = opt || {};
    C = pickTheme(opt.theme);
    var CW = 900, CH = 900, cx = 450, cy = 450, RB = 292;
    var loops = (chain && chain.loops) || [];
    var N = loops.length || 1;
    var o = [];
    o.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + CW + ' ' + CH + '" font-family=\'' + FONT + '\'>');
    o.push('<rect width="' + CW + '" height="' + CH + '" fill="' + C.bg + '"/>');

    var poly = [];
    for (var i = 0; i < N; i++) {
      var a = (-90 + 360 / N * i) * Math.PI / 180;
      poly.push(f2(cx + RB * Math.cos(a)) + ',' + f2(cy + RB * Math.sin(a)));
    }
    o.push('<polygon points="' + poly.join(' ') + '" fill="none" stroke="' + C.hexEdge + '" stroke-width="3" stroke-linejoin="round"/>');

    o.push('<text x="' + cx + '" y="' + (cy - 46) + '" fill="' + C.dim + '" font-size="17" font-weight="700" text-anchor="middle">串接大 loop</text>');
    var cm = (chain && chain.meta) || {};
    var chainNeed = String((cm.need && cm.need.text) || cm.missingNeed || deriveChainNeed(loops) || '未满足的完形需要').trim();
    var chainNeedLabel = (cm.need && cm.need.text)
      ? ('未满足的完形 · 证据 ×' + (((cm.need.evidence) || []).length) +
         ((((cm.need.crosscheck) || {}).verdict === 'unusable') ? ' · 旁证不可用' : ''))
      : '未满足的完形需要';
    o.push('<text x="' + cx + '" y="' + (cy - 20) + '" fill="' + C.dim + '" font-size="11" text-anchor="middle">' + chainNeedLabel + '</text>');
    var cnSegs = chainNeed.split(/[：:，,。；;、]/).map(function (s) { return s.trim(); }).filter(Boolean);
    var cnLines = [], cnCur = '';
    cnSegs.forEach(function (s) {
      var cand = cnCur ? (cnCur + '，' + s) : s;
      if (cand.length <= 16) cnCur = cand;
      else { if (cnCur) cnLines.push(cnCur); cnCur = s; }
    });
    if (cnCur) cnLines.push(cnCur);
    if (!cnLines.length) cnLines = [chainNeed.slice(0, 16)];
    cnLines.slice(0, 3).forEach(function (ln, i) {
      o.push('<text x="' + cx + '" y="' + (cy + 4 + i * 20) + '" fill="' + C.text + '" font-size="13" font-weight="700" text-anchor="middle">' +
        esc(ln) + '</text>');
    });

    loops.forEach(function (lp, i) {
      var ang = (-90 + 360 / N * i) * Math.PI / 180;
      var px = cx + RB * Math.cos(ang), py = cy + RB * Math.sin(ang);
      var inten = (lp.meta && lp.meta.intensity != null) ? lp.meta.intensity : 0.6;
      var mr = 34 + inten * 20;

      var hex = [];
      for (var k = 0; k < 6; k++) {
        var ka = (-90 + 60 * k) * Math.PI / 180;
        hex.push([px + mr * Math.cos(ka), py + mr * Math.sin(ka)]);
      }
      var pts = hex.map(function (p) { return f2(p[0]) + ',' + f2(p[1]); }).join(' ');
      o.push('<g class="mini-loop" style="cursor:pointer" onclick="window.__pickEpisode&&window.__pickEpisode(' + i + ')"' +
        '><title>' + esc(lp.name || ('episode ' + (i + 1))) + '</title>' +
        '<polygon points="' + pts + '" fill="' + C.nodeFill + '" stroke="' + C.nodeEdge + '" stroke-width="2"/>');

      (lp.edges || []).forEach(function (e) {
        var f = +e.from, t = +e.to;
        (e.lines || []).forEach(function (ln) {
          if (!ln.lit) return;
          var isRec = (f === 5 && t === 0);
          var isDef = ln.type === 'defense';
          var col = isRec ? C.recur : (isDef ? C.defLit : C.flowLit);
          var w = isDef ? 4.5 : 2.5;
          var p0 = hex[f % 6], p1 = hex[t % 6];
          var a1 = trim(p0, p1, 3), b1 = trim(p1, p0, 3);
          o.push('<line x1="' + f2(a1[0]) + '" y1="' + f2(a1[1]) + '" x2="' + f2(b1[0]) + '" y2="' + f2(b1[1]) +
            '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>');
        });
      });

      o.push('<text x="' + f2(px) + '" y="' + f2(py + 5) + '" fill="' + C.dim + '" font-size="14" text-anchor="middle" dominant-baseline="central">' + (i + 1) + '</text>');
      o.push('</g>');

      var lx = px + Math.cos(ang) * (mr + 40), ly = py + Math.sin(ang) * (mr + 40);
      var nm = (lp.name || '').length > 22 ? (lp.name || '').slice(0, 22) + '…' : (lp.name || '');
      o.push('<text x="' + f2(lx) + '" y="' + f2(ly) + '" fill="' + C.text + '" font-size="12" text-anchor="middle">' + esc(nm) + '</text>');
      o.push('<text x="' + f2(lx) + '" y="' + f2(ly + 16) + '" fill="' + C.dim + '" font-size="11" text-anchor="middle">强度 ' + inten.toFixed(2) + '</text>');
    });

    o.push('</svg>');
    return o.join('');
  }

  root.buildLoopSVG = buildLoopSVG;
  root.buildChainSVG = buildChainSVG;
  if (typeof module !== 'undefined' && module.exports) module.exports = { buildLoopSVG: buildLoopSVG, buildChainSVG: buildChainSVG };
})(typeof window !== 'undefined' ? window : globalThis);
