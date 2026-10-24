/* gestalt-guide.js — 格式塔镜映 · 开放引导对话（引导你走向不同的路径）
 * 零外部依赖，纯 classic script（file:// 双击可用）。
 *
 * 定位：不是替你下结论，而是用格式塔框架 + IFS 的开放提问，把探索往
 *   不同方向推开——身体 / 没走的路 / 哪个 part 在说话 / 未满足的需要 /
 *   停在循环的哪一步 / 条件性（内摄来源·投射回收·转向自身对外·融合边界）。
 *   每次给「今日一问」+ 若干「路径卡」，点开卡是开放式追问。
 *
 * 全局暴露：
 *   window.guideContext(frags) → {count, dominant, flags:{introjection,projection,retroflexion,confluence}}
 *   window.guideToday(frags)   → 一句今日开放提问（按日期轮换）
 *   window.guidePaths(frags)   → [{id, title, question, followups:[...]}]
 *   （若 GLM 已存在，也挂到 GLM.*）
 */
(function (global) {
  'use strict';

  function domMechOf(loop) {
    var set = {};
    (loop.edges || []).forEach(function (e) {
      (e.lines || []).forEach(function (l) {
        if (l.type === 'defense' && l.lit && l.mech) set[l.mech.split(' ')[0]] = true;
      });
    });
    return set;
  }

  function guideContext(frags) {
    frags = frags || [];
    var flags = { introjection: false, projection: false, retroflection: false, confluence: false };
    var dom = {};
    frags.forEach(function (f) {
      var s = domMechOf(f.parsed || {});
      Object.keys(s).forEach(function (k) { flags[k] = true; dom[k] = (dom[k] || 0) + 1; });
    });
    var dominant = null, dn = 0;
    Object.keys(dom).forEach(function (k) { if (dom[k] > dn) { dn = dom[k]; dominant = k; } });
    return { count: frags.length, dominant: dominant, flags: flags };
  }

  /* 今日一问池（按日期取模轮换，保证同一天稳定、隔天不同） */
  var TODAY_POOL = [
    '如果这段经历里，你身体先知道、念头后到——它先说了什么？',
    '那个没被满足的完形，如果开口，它想要的是哪一句话？',
    '你说「我」的时候，其实有几个部分同时在说话？',
    '如果当时你走的是另一条没选的路，现在的你会站在哪？',
    '这个循环里，哪一格是你从不肯停留、总是跳过的？',
    '那个批判你的声音，最早是从谁的嘴里听来的？',
    '假如身体不是「发紧」而是「被听见」，接下来会怎样？',
    '你卡住的地方，是不是恰好是你最想被接住的地方？'
  ];
  function guideToday(frags) {
    var d = new Date();
    var seed = d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
    var pool = TODAY_POOL;
    if (!frags || !frags.length) return pool[seed % pool.length];
    return pool[seed % pool.length];
  }

  /* 路径卡：每条 = 一个可被推开的方向 + 3 句开放式追问 */
  function basePaths() {
    return [
      {
        id: 'somatic', title: '往身体走',
        question: '身体先于念头——当时身体先知道了什么？',
        followups: [
          '那个感觉卡在身体的哪个位置？它是什么形状/温度/重量？',
          '在「想清楚」之前，身体已经紧了多久？',
          '如果顺着那股身体感觉而不是压住它，会冒出什么？'
        ]
      },
      {
        id: 'menu', title: '往没走的路走',
        question: '在那个卡住的点，另一种没走的路是什么？',
        followups: [
          '当时如果真的说出来/做出来，你最怕发生什么？',
          '那条没走的路，以前有没有某次走过？那次怎样？',
          '如果「现在的你」回到那个节点，会替「当时的你」选哪条？'
        ]
      },
      {
        id: 'part', title: '往 part 走',
        question: '此刻替你说话的，是哪一个内在部分？它在替你挡开什么？',
        followups: [
          '如果请那个部分退后一步，留下的是谁？',
          '它在保护你躲开哪种痛？这个痛你认得吗？',
          '它小时候是怎么学会这套保护的？'
        ]
      },
      {
        id: 'need', title: '往中心走（未满足的完形）',
        question: '那个没闭合的中心，真正没被满足的是什么需要？',
        followups: [
          '如果那个需要被接住了，你身上会有什么松下来？',
          '这个需要，是你一直不敢说出口的，还是一直没人问过的？',
          '它底下，是不是一个很古老、很小的时候就没被满足的东西？'
        ]
      },
      {
        id: 'stage', title: '往循环走',
        question: '你此刻停在了体验循环的哪一步？下一步本来可以是什么？',
        followups: [
          '唤起→觉察→动员→行动→接触→消退——你总是卡在同一格吗？',
          '如果允许自己只走到下一格、不逼自己闭合，会怎样？',
          '这个循环，最近一次从哪里重新开始了？'
        ]
      }
    ];
  }

  function conditionalPaths(ctx) {
    var f = ctx.flags, out = [];
    if (f.introjection) out.push({
      id: 'source', title: '往「应该」的来源走',
      question: '这个「应该」，最初是谁的声音？你真的同意吗？',
      followups: [
        '如果把那句「应该」换成你自己的话，它会怎么说？',
        '是谁最早把它种进你身体的？那时你几岁？',
        '有没有一处，你其实并不认同，却一直替它执行着？'
      ]
    });
    if (f.projection) out.push({
      id: 'takeback', title: '往「回收投射」走',
      question: '如果有一部分其实是自己的，会是什么？',
      followups: [
        '你指责对方的那个点，自己身上有没有一点点影子？',
        '甩出去的那部分，是不是你最不想承认的自己？',
        '若把它收回，你会对自己说什么？'
      ]
    });
    if (f.retroflection) out.push({
      id: 'outward', title: '往「转向自身」的外面走',
      question: '攻击自己的那些话，如果对外说出来，会对谁说？',
      followups: [
        '那股劲，原本是冲着谁的？为什么拐回了自己？',
        '如果当时真的对外表达了，关系会怎样——是更近还是更碎？',
        '把「怪自己」换成「我当时真的很___」，空格填什么？'
      ]
    });
    if (f.confluence) out.push({
      id: 'boundary', title: '往「分界」走',
      question: '你和对方的分界在哪里？哪里该是你，哪里是对方？',
      followups: [
        '你说的「我们」，有多少其实只是「我怕一个人」？',
        '如果允许自己跟对方不一样，你会不一样在哪？',
        '那个被融合吞掉的部分，它本来想长成什么样？'
      ]
    });
    return out;
  }

  function guidePaths(frags) {
    var ctx = guideContext(frags);
    var paths = basePaths();
    // 条件路径放在 base 之后，最多再补 2 条，避免一次给太多
    conditionalPaths(ctx).slice(0, 2).forEach(function (p) { paths.push(p); });
    return paths;
  }

  global.guideContext = guideContext;
  global.guideToday = guideToday;
  global.guidePaths = guidePaths;
  if (global.GLM) {
    global.GLM.guideContext = guideContext;
    global.GLM.guideToday = guideToday;
    global.GLM.guidePaths = guidePaths;
  }
})(typeof window !== 'undefined' ? window : this);
