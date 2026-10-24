/*
 * gestalt-narrate.js — 文本解读 / 镜映叙述生成器
 * 输入：已跑完框架的 loop（或 chain）数据，输出自然语言解读文字（HTML 段落）。
 * 定位：把 SVG 图里的结构化信息整合成一段「人话」，方便被镜映的人理解自己的模式。
 * 与 gestalt-parse.js 的区别：parse = 文本→loop 草稿（输入提取）；narrate = loop→文本（输出叙述）。
 * 零依赖、纯 classic script，file:// 可用。
 */
(function () {
  'use strict';

  // 防御机制语义（mech 中文名 → 一句话解释能量去哪了）
  var MECH_MEANING = {
    'introjection 内摄': '未经消化地吞下外部的标准或「应该」，把它变成对自己的要求——你不是在活自己的需要，是在替别人活。',
    'retroflection 转向自身': '本该向外表达或行动的能量，被掉头朝向了自己：攻击、压抑、自我怀疑，而不是去触碰真实的阻碍。',
    'projection 投射': '把自己不想认的那部分甩到别人身上，以为是别人的问题——这样就不必面对自己里面的东西。',
    'confluence 融合': '边界消融，分不清自己与他人、与材料。你黏在里面，既没法分离，也没法真正完成接触。'
  };
  // 兜底：mech 里可能只含英文或别名，做模糊匹配
  function mechMeaning(mech) {
    if (!mech) return '';
    if (MECH_MEANING[mech]) return MECH_MEANING[mech];
    var m = mech.toLowerCase();
    if (m.indexOf('introj') >= 0) return MECH_MEANING['introjection 内摄'];
    if (m.indexOf('retro') >= 0) return MECH_MEANING['retroflection 转向自身'];
    if (m.indexOf('proj') >= 0) return MECH_MEANING['projection 投射'];
    if (m.indexOf('conflu') >= 0) return MECH_MEANING['confluence 融合'];
    return '这是一种中断机制：能量在接触现实之前被改了道。';
  }

  // IFS role 中文（与引擎/UI 一致）
  var ROLE_CN = {
    manager: 'Manager 管理者',
    firefighter: 'Firefighter 救火者',
    exile: 'Exile 流放者'
  };
  function roleCN(role) { return ROLE_CN[role] || role || ''; }

  // 强度 → 文字
  function intensityWord(v) {
    v = (typeof v === 'number') ? v : parseFloat(v);
    if (isNaN(v)) return '';
    if (v >= 0.85) return '很强（约 ' + v.toFixed(2) + '）';
    if (v >= 0.6) return '中等偏强（约 ' + v.toFixed(2) + '）';
    if (v >= 0.4) return '中等（约 ' + v.toFixed(2) + '）';
    return '较轻（约 ' + v.toFixed(2) + '）';
  }

  // 取一条边上的「本集实走的防御线」（lit 的 defense）与「菜单线」（未 lit）
  function splitLines(edge) {
    var lines = (edge && edge.lines) || [];
    var lit = [], menu = [];
    lines.forEach(function (ln) {
      if (ln.lit) lit.push(ln); else menu.push(ln);
    });
    return { lit: lit, menu: menu };
  }

  function esc(s) {
    return (s == null) ? '' : String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 单条防御线的四元叙述
  function contentNarrative(c) {
    if (!c) return '';
    var parts = [];
    if (c.behavior) parts.push('你<b>做了</b>：' + esc(c.behavior));
    if (c.thought) parts.push('你<b>想</b>：' + esc(c.thought));
    if (c.feeling) parts.push('你<b>感受到</b>：' + esc(c.feeling));
    if (c.somatic) parts.push('你<b>身体</b>：' + esc(c.somatic));
    return parts.join('；');
  }

  function partNarrative(part) {
    if (!part || !part.role) return '';
    var bits = [];
    if (part.name) bits.push('「' + esc(part.name) + '」');
    bits.push(roleCN(part.role));
    if (part.subtype) bits.push('（' + esc(part.subtype) + '）');
    return '真正在说话的，是一个 ' + bits.join(' ') +
      '——它用这套方式把你护在安全的壳里，好让更深的痛不必被碰。';
  }

  // 单环解读
  function narrateLoop(loop) {
    if (!loop) return '<p>没有可解读的 loop。</p>';
    var STAGES = (typeof window !== 'undefined' && window.STAGES) || global.STAGES ||
      ['唤起', '觉察', '动员', '行动', '接触', '消退'];
    var name = loop.name || '未命名循环';
    var meta = loop.meta || {};
    var intensity = intensityWord(meta.intensity);

    var html = '';
    // ① 总起
    html += '<p><b>【' + esc(name) + '】</b>';
    if (intensity) html += ' 这是一条固着强度' + intensity + '的循环。';
    html += '</p>';

    // ② 环本应怎么流
    html += '<p>体验本应沿「' + STAGES.join(' → ') +
      '」自然流动、闭合、再消退。但在这条环里，流动在某个节点被截断了。</p>';

    // ③ 逐边：找 lit 的防御线做重点解读
    var edges = loop.edges || [];
    var anyKey = false;
    edges.forEach(function (edge) {
      // 只解读「实走的防御线」（lit 且 type=defense）；正常流动的 flow 线不算截断
      var def = (edge.lines || []).filter(function (l) { return l.lit && l.type === 'defense'; });
      if (!def.length) return;
      anyKey = true;
      var fromS = STAGES[edge.from] || ('阶段' + edge.from);
      var toS = STAGES[edge.to] || ('阶段' + edge.to);
      def.forEach(function (ln) {
        html += '<p>在<b>『' + esc(fromS) + ' → ' + esc(toS) + '』</b>之间，流动被截断了。';
        if (ln.mech) html += '这里发生了 <b>' + esc(ln.mech) + '</b>：' + esc(mechMeaning(ln.mech)) + '</p>';
        var cn = contentNarrative(ln.content);
        if (cn) html += '<p>' + cn + '。</p>';
        var pn = partNarrative(ln.part);
        if (pn) html += '<p>' + pn + '</p>';
      });
    });

    if (!anyKey) {
      html += '<p>这条环里目前没有标出「实走的固着边」——它可能是一次相对完整、未被中断的体验循环，' +
        '或还有待你标注哪里卡住了。</p>';
    } else {
      // ④ 菜单（没走的可能性）
      var menuLines = [];
      edges.forEach(function (edge) {
        var sp = splitLines(edge);
        sp.menu.forEach(function (ln) {
          if (ln.mech) menuLines.push(esc(ln.mech));
        });
      });
      if (menuLines.length) {
        html += '<p>当时还出现过别的可能（菜单里没走的）：' + menuLines.join('、') +
          '。它们同样是你的保护在别处的样子。</p>';
      }
    }

    // ⑤ 中心留白（未满足完形）
    html += '<p>环照常转，却没有真正闭合。中心那片留白，是这条环没被满足的<b>完形需要</b>——' +
      '一个还没被看见、没被接住的部分。</p>';

    // ⑥ 重新选择入口（不塞应该）
    html += '<p>看见这些，不必马上改。先让它被看见——对自动化模式来说，被看见本身，就是松动的开始。' +
      '你随时可以回到任意一个阶段，换一种走法。</p>';

    return html;
  }

  // 串接（时间线大 loop）解读
  function narrateChain(chain) {
    if (!chain || !chain.loops || !chain.loops.length)
      return '<p>没有可解读的串接。</p>';
    var loops = chain.loops;
    var html = '';
    html += '<p><b>【' + esc(chain.name || '时间线串接') + '】</b> 以下 ' + loops.length +
      ' 条循环被串接成一个更大的时间线容器。它们各自是一个未闭合的完形，又彼此呼应。</p>';

    // 共性防御统计
    var mechCount = {};
    loops.forEach(function (lp) {
      (lp.edges || []).forEach(function (edge) {
        (edge.lines || []).forEach(function (ln) {
          if (ln.lit && ln.mech) {
            var key = ln.mech;
            mechCount[key] = (mechCount[key] || 0) + 1;
          }
        });
      });
    });
    var keys = Object.keys(mechCount);
    if (keys.length) {
      var sorted = keys.slice().sort(function (a, b) { return mechCount[b] - mechCount[a]; });
      html += '<p>反复出现的中断机制：' +
        sorted.map(function (k) { return '<b>' + esc(k) + '</b>×' + mechCount[k]; }).join('、') +
        '。同一条防御在多个事件里轮番上台，说明它不是某次的特殊反应，而是一个稳定的保护剧本。</p>';
    }

    // 逐条一句话概括
    html += '<p>逐条速览：</p>';
    loops.forEach(function (lp, i) {
      var meta = lp.meta || {};
      var litMechs = [];
      (lp.edges || []).forEach(function (edge) {
        (edge.lines || []).forEach(function (ln) {
          if (ln.lit && ln.mech) litMechs.push(ln.mech);
        });
      });
      var desc = (lp.name || ('循环' + (i + 1))) + '：固着强度约 ' +
        (meta.intensity != null ? meta.intensity : '—');
      if (litMechs.length) desc += '，主要卡在 ' + litMechs.join('、');
      html += '<p>　' + (i + 1) + '. ' + esc(desc) + '。</p>';
    });

    html += '<p>中心那片更大的留白，是这些事件共同没被满足的完形——也许是一种贯穿的、' +
      '「被公正地看见」或「被允许按自己的节奏存在」的需要。三条环都绕着它转，却都没能落进去。</p>';
    html += '<p>这不是要你一次性修好所有环。挑一条最想先看懂的，回到它的单环解读里，慢慢来。</p>';
    return html;
  }

  // 暴露
  var api = { narrateLoop: narrateLoop, narrateChain: narrateChain, mechMeaning: mechMeaning };
  if (typeof window !== 'undefined') {
    window.narrateLoop = narrateLoop;
    window.narrateChain = narrateChain;
    window.GN = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof global !== 'undefined') {
    global.narrateLoop = narrateLoop;
    global.narrateChain = narrateChain;
  }
})();
