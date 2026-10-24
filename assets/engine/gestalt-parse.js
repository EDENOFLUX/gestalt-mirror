/* gestalt-parse.js — 格式塔镜映 · 文本解析（启发式草稿生成器）
 * 零外部依赖，纯 classic script（file:// 双击可用）。
 * 定位：「AI 辅助提取 + 用户确认」流程的离线启发式替身。
 *       真实环境里由 LLM 做提取；此文件提供本地可跑的草稿版，
 *       产出后必须由用户逐条确认/修改（不承诺准确）。
 *
 * 全局暴露：
 *   window.parseLoopDraft(text, opts) → 单条草稿 loop 对象
 *   window.parseFragments(text, opts) → 多条碎片→各自草稿→自动串接 {name, loops, fragments, _parse}
 *   （若 GLM 已存在，也挂到 GLM.parseLoopDraft / GLM.parseFragments）
 *
 * draft loop 结构 = 与核心引擎一致的 loop 数据模型：
 *   { name, meta:{context,intensity}, edges:[ {from,to,lines:[{type,lit,mech?,content?,note?,part?}]} ] }
 *   edges 为 6 阶段闭合环（0→1→…→5→0）。
 */
(function (global) {
  'use strict';

  /* —— 四元关键词（启发式，覆盖常见中文表达；可按需增删） —— */
  var KW = {
    // 感受 feeling（情绪）
    feeling: ['羞耻', '焦虑', '愤怒', '怒', '无力', '委屈', '害怕', '恐惧', '悲伤', '孤独',
              '难过', '烦躁', '紧张', '失落', '绝望', '内疚', '愧疚', '嫉妒', '屈辱',
              '崩溃', '慌', '压抑', '空洞', '麻木', '心碎', '不安'],
    // 躯体 somatic（身体感觉）
    somatic: ['胸口', '发紧', '紧绷', '肩颈', '肩', '胃', '头痛', '心跳', '呼吸', '身体',
              '肌肉', '发沉', '颤', '出汗', '脸红', '手抖', '肚子', '喉咙', '哽', '灼热',
              '发麻', '心悸', '胸闷', '透不过气', '压', '僵硬', '酸'],
    // 想法 thought（认知层，已并入原信念）
    thought: ['应该', '必须', '不配', '没用', '不够', '不行', '别', '万一', '以为', '觉得',
              '认为', '标准', '错了', '怪自己', '凭什么', '反正', '都是', '他们', '我太',
              '完蛋', '失败', '丢人', '丢脸', '活该', '不值得', '配不上', '注定', '本该'],
    // 行为 behavior（可观察动作）
    behavior: ['沉默', '不追问', '不投', '拖延', '躺', '刷手机', '改简历', '回避', '逃跑', '哭',
              '骂', '摔', '吃', '喝', '睡', '熬夜', '发消息', '删除', '拉黑', '躲', '闭嘴',
              '忍', '憋', '讨好', '迎合', '答应', '妥协', '逃避', '装', '假装', '硬撑', '躲起来']
  };

  /* —— 中断机制（IFS 式防御）关键词 —— */
  var MECH = {
    retroflection: ['忍', '憋', '自我', '攻击自己', '自我批判', '自我怀疑', '打自己',
                    '不吭声', '内耗', '怪自己', '憋着', '硬撑', '假装没事', '咽下去'],
    projection:   ['都是他们', '甩锅', '怪别人', '是他们', '外部环境', '不是我的错',
                    '都是', '别人逼', '甩给', '怪他', '都怪'],
    introjection: ['应该', '必须', '标准', '社会', '别人说', '听话', '规矩',
                    '应该这样', '理所当然', '本该', '人家都'],
    confluence:   ['融', '黏', '不分', '迎合', '讨好', '怕落下', '别让我独自',
                    '一样', '边界', '消融', '黏在一起', '跟他们']
  };

  // 机制 → 建议卡点边（体验循环 from→to）
  var MECH_EDGE = {
    retroflection: [3, 4],   // 行动→接触：能量转向自身
    projection:    [4, 5],   // 接触→消退：甩给外部
    introjection:  [2, 3],   // 动员→行动：内摄卡住行动
    confluence:    [3, 4]    // 行动→接触：边界消融
  };
  var MECH_NAME = {
    retroflection: 'retroflection 转向自身',
    projection:    'projection 投射',
    introjection:  'introjection 内摄',
    confluence:    'confluence 融合'
  };
  // 机制 → 建议 IFS part（role/subtype/name）
  var PART = {
    retroflection: { role: 'manager',    subtype: 'inner-critic', name: '严厉监工' },
    introjection:  { role: 'manager',    subtype: 'inner-critic', name: '严厉监工' },
    projection:    { role: 'firefighter', subtype: 'rage',        name: '喷火者' },
    confluence:    { role: 'manager',    subtype: 'pleaser',      name: '迎合者' }
  };

  // 四元分类优先级（同分时取靠前的，避免把情绪误归行为）
  var CAT_PRIORITY = ['somatic', 'feeling', 'thought', 'behavior'];

  function splitSentences(t) {
    return t.split(/[。！？;；\n\r]+/).map(function (s) { return s.trim(); })
            .filter(function (s) { return s.length > 1; });
  }

  function classify(sent) {
    var score = { behavior: 0, thought: 0, feeling: 0, somatic: 0 };
    for (var cat in KW) {
      KW[cat].forEach(function (k) { if (sent.indexOf(k) >= 0) score[cat]++; });
    }
    var best = null, bestN = 0;
    CAT_PRIORITY.forEach(function (cat) {
      if (score[cat] > bestN) { bestN = score[cat]; best = cat; }
    });
    return bestN > 0 ? best : null;
  }

  function detectMech(t) {
    var score = { retroflection: 0, projection: 0, introjection: 0, confluence: 0 };
    for (var m in MECH) {
      MECH[m].forEach(function (k) { if (t.indexOf(k) >= 0) score[m]++; });
    }
    var best = 'introjection', bestN = 0; // 默认 introjection（最泛）
    for (var m2 in score) { if (score[m2] > bestN) { bestN = score[m2]; best = m2; } }
    return { mech: best, score: bestN };
  }

  function pick(sents, cat) {
    var hit = sents.filter(function (s) { return classify(s) === cat; });
    if (!hit.length) return '—';
    return hit.slice(0, 2).join(' / ');
  }

  /* 主入口 */
  function parseLoopDraft(text, opts) {
    opts = opts || {};
    var sents = splitSentences(text);
    if (!sents.length) return null;

    var mechInfo = detectMech(text);
    var mech = mechInfo.mech;
    var edge = MECH_EDGE[mech];

    var content = {
      behavior: pick(sents, 'behavior'),
      thought:  pick(sents, 'thought'),
      feeling:  pick(sents, 'feeling'),
      somatic:  pick(sents, 'somatic')
    };

    // 强度：句子数 + 有情绪/躯体命中加权（0.6–0.95）
    var inten = 0.6 + Math.min(0.35, sents.length * 0.03
                   + (content.feeling !== '—' ? 0.1 : 0)
                   + (content.somatic !== '—' ? 0.1 : 0));
    inten = Math.round(inten * 100) / 100;

    var name = opts.name || (sents[0] ? sents[0].slice(0, 12) : '未命名经历');
    var part = PART[mech];

    // 构建 6 边闭合环
    var edges = [];
    for (var i = 0; i < 6; i++) {
      var f = i, t = (i + 1) % 6;
      if (f === edge[0] && t === edge[1]) {
        edges.push({
          from: f, to: t,
          lines: [
            { type: 'real', lit: false },
            { type: 'defense', mech: MECH_NAME[mech], lit: true,
              content: content,
              note: '（启发式草稿）由文本关键词推断的中断机制＝' + MECH_NAME[mech]
                    + '。请逐条确认四元内容、卡点边与 part，再决定是否入图。',
              part: part }
          ]
        });
      } else {
        edges.push({ from: f, to: t, lines: [{ type: 'real', lit: true }] });
      }
    }

    return {
      name: name,
      meta: { context: opts.context || '碎片录入', intensity: inten },
      edges: edges,
      _draft: true,
      _parse: { mech: mech, mechScore: mechInfo.score, sentences: sents.length }
    };
  }

  /* 剥离碎片编号前缀（碎片1：/ 1. / ① / 一、 等），让草稿 name 更干净 */
  function stripLeader(s) {
    return s.replace(/^(碎片\s*)?([\d一二三四五六七八九十]+|[①②③④⑤⑥⑦⑧⑨⑩])\s*[、.．:：)\]]\s*/, '');
  }

  /* 碎片录入：多条经历碎片 → 各自抽草稿 → 按粘贴顺序自动串接成时间线大 loop */
  function parseFragments(text, opts) {
    opts = opts || {};
    // 按空行切分碎片（一段＝一个 episode）
    var frags = text.split(/\n\s*\n+/).map(function (s) { return s.trim(); })
                     .filter(function (s) { return s.length > 0; });
    if (!frags.length) {
      // 退化：整段作为一个碎片（不强制空行也能跑）
      frags = [text.trim()].filter(function (s) { return s.length > 0; });
    }
    var loops = [];
    frags.forEach(function (frag, i) {
      var clean = stripLeader(frag); // 编号前缀只用于人读，不进关键词/命名
      var d = parseLoopDraft(clean, {
        context: opts.context || '碎片录入',
        name: (opts.names && opts.names[i]) || undefined
      });
      if (d) loops.push(d);
    });
    // 共性中断机制统计（跨碎片高频，帮用户看见「反复走哪条」）
    var mechCount = {};
    loops.forEach(function (lp) {
      lp.edges.forEach(function (e) {
        e.lines.forEach(function (l) {
          if (l.type === 'defense' && l.lit && l.mech) {
            var key = l.mech.split(' ')[0]; // 取英文键（retroflection/projection/...）
            mechCount[key] = (mechCount[key] || 0) + 1;
          }
        });
      });
    });
    return {
      name: opts.name || '碎片串接时间线',
      loops: loops,
      fragments: frags,
      _draft: true,
      _parse: { count: loops.length, mechCount: mechCount }
    };
  }

  global.parseLoopDraft = parseLoopDraft;
  global.parseFragments = parseFragments;
  if (global.GLM) {
    global.GLM.parseLoopDraft = parseLoopDraft;
    global.GLM.parseFragments = parseFragments;
  }
})(typeof window !== 'undefined' ? window : this);
