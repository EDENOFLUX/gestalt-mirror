/* gestalt-journal.js — 格式塔镜映 · 碎片罐（隔三岔五积攒 + 逐渐清晰后自动整理）
 * 零外部依赖，纯 classic script（file:// 双击可用）。
 *
 * 定位：把「③ 碎片录入」从「一次性粘贴→立刻串接」升级为——
 *   隔三岔五丢一片进去 → 慢慢积攒（跨会话持久化）→ 等到逐渐清晰 → 自动整理串接。
 *
 * 全局暴露：
 *   window.FragmentJar     持久碎片罐（localStorage，file:// 下失败自动退内存兜底）
 *   window.clarityOf(frags) 清晰度评估 {score, count, dominant, dominantRatio, clearEnough}
 *   window.organizeChain(frags) 从碎片罐整理出串接 {name, loops, _parse}
 *   （若 GLM 已存在，也挂到 GLM.*）
 *
 * 碎片对象：
 *   { id, text, createdAt(ms), parsed(草稿 loop) }
 *   草稿 loop 结构同核心引擎（见 gestalt-parse.js）。
 */
(function (global) {
  'use strict';

  var KEY = 'glm_fragments_v1';
  var memFallback = null; // file:// localStorage 不可用时退此

  function lsGet() {
    try {
      var raw = global.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return memFallback ? memFallback.slice() : [];
    }
  }
  function lsSet(arr) {
    memFallback = arr.slice();
    try { global.localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) { /* 静默退内存 */ }
  }

  /* 取某草稿 loop 的主导防御机制英文键 */
  function domMechOf(loop) {
    var best = null;
    (loop.edges || []).forEach(function (e) {
      (e.lines || []).forEach(function (l) {
        if (l.type === 'defense' && l.lit && l.mech) {
          var k = l.mech.split(' ')[0];
          if (!best) best = k;
        }
      });
    });
    return best;
  }

  var FragmentJar = {
    list: function () { return lsGet(); },

    /* 丢入：按空行切碎片，每条 parseLoopDraft 后存入；返回新增条数 */
    add: function (text) {
      var frags = (text || '').split(/\n\s*\n+/).map(function (s) { return s.trim(); })
                        .filter(function (s) { return s.length > 0; });
      if (!frags.length) {
        frags = [(text || '').trim()].filter(function (s) { return s.length > 0; });
      }
      var store = lsGet();
      var added = 0;
      var self = this;
      frags.forEach(function (f) {
        var parsed = (global.parseLoopDraft ? global.parseLoopDraft(f, { context: '碎片罐' }) : null);
        if (!parsed) return;
        store.push({
          id: 'f' + Date.now() + '_' + added + '_' + Math.floor(Math.random() * 1e4),
          text: f,
          createdAt: Date.now(),
          parsed: parsed
        });
        added++;
      });
      lsSet(store);
      return added;
    },

    remove: function (id) {
      var store = lsGet().filter(function (f) { return f.id !== id; });
      lsSet(store);
    },

    clear: function () { lsSet([]); }
  };

  /* 清晰度评估：数量饱和(≤6) + 主导机制占比 → 0..1；clearEnough = 数量≥3 且 score≥0.5 */
  function clarityOf(frags) {
    frags = frags || [];
    var count = frags.length;
    if (!count) return { score: 0, count: 0, dominant: null, dominantRatio: 0, clearEnough: false };
    var c = {};
    frags.forEach(function (f) {
      var m = domMechOf(f.parsed);
      if (m) c[m] = (c[m] || 0) + 1;
    });
    var dominant = null, domN = 0;
    Object.keys(c).forEach(function (k) { if (c[k] > domN) { domN = c[k]; dominant = k; } });
    var dominantRatio = domN / count;
    var base = Math.min(count, 6) / 6;          // 数量带来的清晰度
    var coherence = dominantRatio;               // 模式浮现带来的清晰度
    var score = Math.round((0.55 * base + 0.45 * coherence) * 100) / 100;
    return {
      score: score,
      count: count,
      dominant: dominant,
      dominantRatio: Math.round(dominantRatio * 100) / 100,
      clearEnough: count >= 3 && score >= 0.5
    };
  }

  /* 从碎片罐整理出串接：按时间升序取 parsed loop */
  function organizeChain(frags) {
    frags = (frags || []).slice().sort(function (a, b) { return a.createdAt - b.createdAt; });
    var loops = frags.map(function (f) { return f.parsed; });
    var mechCount = {};
    loops.forEach(function (lp) {
      var m = domMechOf(lp);
      if (m) mechCount[m] = (mechCount[m] || 0) + 1;
    });
    return {
      name: '我的碎片串接（' + loops.length + ' 片）',
      loops: loops,
      fragments: frags.map(function (f) { return f.text; }),
      _draft: true,
      _parse: { count: loops.length, mechCount: mechCount }
    };
  }

  global.FragmentJar = FragmentJar;
  global.clarityOf = clarityOf;
  global.organizeChain = organizeChain;
  if (global.GLM) {
    global.GLM.FragmentJar = FragmentJar;
    global.GLM.clarityOf = clarityOf;
    global.GLM.organizeChain = organizeChain;
  }
})(typeof window !== 'undefined' ? window : this);
