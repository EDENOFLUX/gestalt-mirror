---
name: gestalt-mirror
description: 格式塔镜映——把一次体验循环画成六边形执行图（六阶段为顶点、防御退回为折线菱形、中心是未满足的完形），并生成带串接、文本解读与行动选项的完整 HTML 页。用于看见「同一个地方总是断」的重复模式、区分已走路径与可替代路径、并给出走向健康闭合的具体动作。触发词：格式塔镜映、loop 图、体验循环、未闭合、假性闭合、防御、中断机制、我老是这样、又是这一步、复盘这次循环、画个环。
---

# 格式塔镜映 · Gestalt Loop Mirror

> 独立 skill。视觉词汇借自黏菌图谱（六边形节点、直线边、浅色调），**但数据、脚本、文档各自独立**，不引用对方任何文件。

## 一句话

把一个 episode 画成闭环：六阶段是六个顶点，正常推进是直边，边界上被中断的地方折出一道菱形。闭环没走到「接触」，中心那块就空着，那里写着这条环没被满足的东西。

## 何时用

- 复盘一次「又卡在同一个地方」的经历
- 区分：这次实际走的路径 vs 本来还能走的路径
- 指认中断机制（内摄／投射／转向自身／融合）发生在哪条边界上
- 把多条 episode 串起来，看反复出现的是哪条防御、共同缺的是什么
- 想要「下次可以怎么做」的具体动作，而不只是解释

**不用于：** 临床诊断、替人下结论、单次情绪发作的即时干预（那走 `行为触发库`）。

## 交付形态

**默认交付 = 一个自包含 HTML 页**（不单独出 PNG）。

```powershell
& "<node>" scripts/make_page.js <输出.html> <主loop.json> [其他episode.json ...] [--need "共同需要"] [--frag <主题碎片.md>]
```

- 第一个 loop 是 ① 默认展示；其余组成 ② 串接（边数 = episode 数，**点小环把 ① 切到那条**）
- `--need` 可选：串接中心的「共同需要」；不给则取各 episode 的 `meta.need`（一致就用，不一致并列最多 3 条）
- `--frag` 可选：读主题碎片文档（`- ` 开头的行），播种到 ③ 碎片罐

**PNG 只作调试**（要贴到别处时才出）：

```powershell
& "<python>" scripts/render_loop.py <输出.png> [spec.json]
```

调试时可用环境变量复刻历史几何：`LOOP_RING=arc|hex`、`LOOP_DEF=line|fold`、`LOOP_BEND=in|spec`（默认 `hex/fold/spec` = v4）。日常不用。

## 页面结构（五块）

| 板块 | 位置 | 内容 |
|---|---|---|
| ① 单环 | 顶部全宽 | v4 视图：六边形脊 + 折线菱形 + 编号清单 + 右侧「我的模式 · 可替代」。**点任意红色折线**，下方展开那条线的四元、IFS part、机制与 why |
| ② 串接 | ① 之后 | 大多边形容器 + 顶点小六边形环（大小 = 固着强度），点小环切换 ① |
| ④ 文本解读 | 中段 | **自动跟随当前视图**：① 显示哪条就解读哪条；含机制+四元+IFS part，并附「未满足的完形」与「可以怎么做」 |
| ⑤ 行动选项 | 中段 | 每个断点 2–3 条可执行动作（动作 / 为什么能闭合 / 代价） |
| ③ 碎片罐 | **页尾** | 从主题碎片文档读入、页面积攒、可导出 Markdown 贴回文档 |

**原版分叉视图与镜映面板已移除**，DOM 里不再有，只有 v4 视图。

## 数据模型（唯一格式 = 引擎原生 loop）

```jsonc
{
  "name": "2026-09-13 · 条件性善意",
  "title": "…", "subtitle": "…",                       // 可选，页面标题
  "stages": ["唤起","觉察","动员","行动","接触","消退"],   // 可选，缺省标准六阶段
  "meta": {
    "context": "来源：…",
    "intensity": 0.65,
    "closures": [100,100,80,70,0,25],
    "need": {                                            // 未满足的完形（见下节）
      "text": "说出的需要能被对症接住，而不是被替换成他们的想法",
      "source": "llm",
      "evidence": [ { "quote": "素材原文一句", "at": "出处", "element": "它证明什么" } ],
      "crosscheck": { "vad": "…", "verdict": "unusable" },
      "confidence": 0.62
    },
    "actions": [                                         // 走向健康闭合的动作（见下节）
      { "at": "行动→接触", "title": "…", "step": "…", "closes": "为什么能闭合", "cost": "代价" }
    ]
  },
  "edges": [
    { "from": 0, "to": 1, "lines": [ { "type": "real", "lit": true, "weight": 100, "why": "…" } ] },
    { "from": 2, "to": 3, "lines": [
        { "type": "real", "lit": false, "weight": 25, "why": "本该走的：…" },
        { "type": "defense", "mech": "projection 投射", "bend": "out", "lit": true, "weight": 60,
          "content": { "behavior": "", "thought": "", "feeling": "", "somatic": "" },
          "part": { "role": "firefighter", "subtype": "avoidant", "name": "关门者" },
          "why": "为什么这条线成立" }
    ] }
  ]
}
```

`from`/`to` 是阶段下标（0..5）。一条边可挂多条 `lines`：一条 `real` ＋若干 `defense`。

| 字段 | 取值 | 含义 |
|---|---|---|
| `type` | `real` / `defense` | 推进 / 边界中断 |
| `lit` | bool | 这次实际走的那条；false = 菜单里没走 |
| `bend` | `in` / `out` | 顶点朝内＝能量收回自身；朝外＝甩向外部 |
| `weight` | 0–100 | 固着强度，同时决定折多深 |
| `mech` | 中断机制 | 折返四类：内摄 / 投射 / 转向自身 / 融合；**断尾两类**：偏转 deflection / 麻木 desensitization |
| `shape` | `stub`（可选） | 断尾类专用：画成一条甩出去就结束的线段，不连下一节点。写 `mech: "deflection 偏转"` 或 `desensitization 麻木` 会自动触发，不必手动填 |
| `part` | Manager / Firefighter / Exile | IFS 借用，标「谁在发动这条线」 |
| `content` | 四元 | 行为 / 想法 / 感受 / 躯体 |

**躯体（somatic）一律写成推测，不写成断言。** 用户不一定每次都提供身体反应，所以：

- 数据里写症状名即可（如「胸口发沉」），不要写死成事实
- 渲染层统一加缓和措辞：图上是「可能…」，点击详情是「躯体 somatic（推测）可能是：…」，叙述里是「你身体可能会：…」
- 数据没写 somatic 时显示「未提供（你没提身体反应，可以补）」，不要留空也不要编

派生规则（渲染器负责，不写进数据）：

- `from==5 && to==0` → 环级闭合 `recur`
- **未满足的完形**优先级：`meta.need.text`（带证据）> `meta.missingNeed`（人工旧字段）> 从最早一处未走直走的边读它的 `why`（图上标「从素材推得」）

**硬规则：** 渲染器只读字段，不猜语义。方向看 `bend`，深度看 `weight`。

## 从素材抽「未满足的完形」

四步，中间有硬闸：

1. **建 loop**：读素材，落六阶段 + 边界 + 四元
2. **写 need 块**：`text` + ≥2 条 `evidence`，每条 `quote` 必须是素材**原文**
3. **过校验闸**：

```powershell
& "<python>" scripts/verify_need.py <spec.json> <素材.md> [...]
```

退出码 **0 = 全部命中**；**1 = 有引文搜不到**，那就是编的，改掉重跑。校验会剥掉 markdown 强调符与标点差异，但原文没有就不放行。

4. **出页**：`make_page.js`

**旁证怎么用**：NRC-VAD 对口语原话实测不可用（6 条引文覆盖率 14%–47%，主导情绪一律判成「敬畏」）。替代判据是**多条独立素材是否收敛到同一个上层需要**——收敛才是证据，单条不算。

## 行动选项（⑤）

`meta.actions` 每条四段：`title` / `step` / `closes`（为什么能闭合）/ `cost`（代价）。

**必须写代价**——只给动作不给代价，等于另一种「加油」。目标写「闭合」不写「赢」：闭合可以不经过对方（例如把「被理解」分流出去）。

## 碎片收集（③）

每个主题一份 `<主题目录>/<主题>·碎片.md`，格式：

```markdown
- 一片一句话，不用完整
- 另一片
```

页面启动时读入并去重（提示「已从…读入 N 片」），页面上继续攒的用「导出碎片（Markdown）」导出，贴回文档。

**已知坑**：碎片罐的「清晰度」是关键词启发式。短碎片会被全判成同一机制，导致假的 100%。片段长起来（两三句以上）再看这个数。

## 图怎么读

- **深色实线**：这次走过的推进
- **浅灰虚线**：没走的推进（替代路径之一）
- **红色折线菱形**：边界上的中断；实心=走了，虚线=没走
- **红色断尾线段**：偏转／麻木——能量甩出去或塌进来就没了，**不连下一节点**，因为压根没走到接触。**偏转朝外**（把注意力岔开去别处），**麻木朝内**（关掉自己的感受）；标签带「（没接触）」
- **顶点朝向**：外＝投射／融合（能量甩出去），内＝内摄／转向自身（收回来）
- **菱形深浅**：由 weight 定，越深越固着
- **蓝色箭头**：环级闭合，回到起点重演
- **中心**：未满足的完形 + 证据条数；旁证不可用会标出来

## 与其它技能的接口

- `dream-iea`：那边用 Gestalt 闭合检测（同一组合 ≥3 次共现）。本 skill 的"模式浮现"阈值应与它对齐
- `gol-coach`：`gestalt-mirror` 是它的下游出口之一，那边识别卡点 loop，这边负责出图与动作
- IFS：只借用 role/subtype/name 三层标签，不承诺"真有多部分"

## 已知限制

- 证据只校验「引文在素材里能搜到」，**不校验结论对不对**；需要你确认
- VAD 旁证对口语素材不可用，目前靠「多素材收敛」代替
- 碎片罐的清晰度阈值仍是启发式，短碎片会误报
- 与黏菌图谱共用可视化词汇，但**不做渲染器合并**；黏菌图谱的 `kind` 列表里没有 `loop`

## 文件

```
_Skills/gestalt-mirror/
├── SKILL.md
├── assets/
│   ├── loop-demo.json          # 示例 spec
│   └── engine/                 # 原引擎（MIT）+ 新版视图
│       ├── index.html          # 页面模板
│       ├── gestalt-loop.js     # renderBranched / renderSingleView / renderChain
│       ├── gestalt-parse.js    # 文本 → 草稿 loop
│       ├── gestalt-journal.js  # FragmentJar / clarityOf / organizeChain
│       ├── gestalt-narrate.js  # narrateLoop / narrateChain
│       ├── gestalt-guide.js    # guideToday / guidePaths
│       └── gestalt-view.js     # buildLoopSVG / buildChainSVG（v4 视图）
└── scripts/
    ├── make_page.js            # 主入口：生成完整 HTML
    ├── render_loop.py          # 调试用：单环 PNG
    ├── verify_need.py          # 引文硬闸
    └── smoke_engine.js         # 引擎冒烟测试（Node）
```
