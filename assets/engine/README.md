# 格式塔镜映 · Gestalt Loop Mirror

一个**零依赖、可离线运行**的可视化工具，用来记录与镜映（mirror）你的**无意识自动化行为、想法、感受、躯体感觉**——
以格式塔心理学（Gestalt therapy 的 *cycle of experience* ＋ closure 动力学）为骨架，把每条自动化模式画成
**带分叉的闭合多边形环**，再把多个环**串接成非对称分形**的时间线大 loop。

> 这是核心引擎仓库（零依赖、可独立运行）。上层适配层只负责「读对话流 → 提取候选 loop → 对话里插旗」，
> 不污染本仓库。可单独 clone / 部署 / 改。

---

## 它解决什么

无意识自动化是你「看不见」的：它在意识阈值下自转，你不打断它就永远转。
本工具把这种「未闭合完形反复假性闭合」画出来——

- **回溯镜**：把累积的 loop 画成串接大图，你主动凝视自己在「哪绕、用什么防御假性闭合」。
- **前瞻旗**（适配层，本仓库不含）：对话中识别「这次正滑向哪条防御」，当场顶你一下。

看见固着本身，就松开一截 retroflection。这是**重新选择的入口，不塞「应该」**（契合 AuDHD autonomy）。

---

## 设计规格（grill 收口版 A–F ＋ G–L）

### A 原子单元
- 一个 loop = 行为＋想法＋感受＋躯体感觉 **四元耦合**（想法已并入原信念，认知层合一），不拆。
- 骨架 = Gestalt therapy 的 **cycle of experience 六阶段**（唤起→觉察→动员→行动→接触→消退）＋ **接触中断机制**
  （confluence 融合 / introjection 内摄 / projection 投射 / retroflection 转向自身）。
- 四元降级为「每条分支上的内容标签」（feeling=情绪、somatic=躯体感觉，咬 retroflection 模式：身体先于念头缩紧，记想法常漏掉身体已先紧）。
- 环本质 = **closure 动力学**：未闭合完形反复假性闭合 = 自动化。

### B 单环视觉
- 完整闭合多边形（假性闭合），**六边形脊**（六阶段 = 六顶点，相邻直连）。
- 张力不另画，假性闭合即张力。

### C 串接（chaining）
- 整体 = **大多边形容器**（边数 = episode 数量，每条边 = 一个时间区段）。
- 中心留白 = **未满足的完形需要**。
- 分叉小环**贴着多边形顶点外围**按时间均布；**小环大小 = 固着强度**（尺度不均）。

### D 捕捉机制（适配层，本仓库不含）
- AI 辅助提取 ＋ 你确认：从对话/复盘流里识别模式 → 生成候选 loop 草图 → 你修正/补内容。

### E 镜映回路（双模）
- ① 回溯镜 = 本仓库的可视化；② 前瞻旗 = 适配层在对话里当场插旗。
- 终点 = **重新选择的入口**，不塞「应该」。

### F 落地归属
- **核心引擎零依赖，可独立抽取、离线运行、单独发布。**

### G 混合（分叉模型）
- 六阶段仍是多边形脊，易卡住的**边从环线扇出多线、连同一个下一节点**（在环线上分叉，非向外凸子树）。

### H 扇出语义
- 多段都扇出（不同边扇出线数不同 → 非均匀）；扇出线 = **可能性菜单**（每次 episode 实走一条，由威胁感决定），非每次平行全走。

### I 双重闭合
- 边级（每条线都接上下一节点 = 防御也假性闭合）＋ 环级（回触发重演）。
- **持久高亮累积**：每次实走线留痕，攒成模式画像（回溯镜能镜映「我老走这条」的前提）。

### J 红分支即固着描红
- lit 粗红 + 机制名常驻；菜单细红 dim + 悬停显名；节点不额外环红。

### K 大 loop = 容器
- 大多边形（边数 = 小环数），中心留白 = 未满足完形，分叉小环贴顶点外围（否决元级决策树）。

### L closure 重锚（α）
- 中心留白 = 未满足的完形需要（无新图形元素）；需要名直接显示（本仓改为不设授权门槛）。

### M IFS 整合（方法论借用，叠加不替换）
- **本体定位**：IFS 是方法论借用（标签级），不承诺「真有多部分」；格式塔管结构容器＋身体场域，IFS 管谁发动防御＋中心是什么。
- **数据拓扑**：part 纯叠加在防御分支上（`line.part = {role, subtype?, name?}`），不替换四元 content（content=这条线说了什么，part=这条线由哪个内在部分发动）。默认独立、可选 `line.partId` 关联。
- **part 命名**：双轨——role（Manager/Firefighter/Exile 必填，跨循环聚合用）＋ subtype（可选，perfectionist/inner-critic/rage 等）＋ name（可选，个人化命名如「严厉监工」）。
  - **role / subtype 是不同层级、不重复**：role = 部件在系统里的*结构性工作*（Manager 主动提前管控 / Firefighter 被动紧急扑灭 / Exile 被压住的伤口本身，三者互斥）；subtype = 它*具体用什么策略*干这活（同一 Manager 可以是 inner-critic、pleaser、perfectionist…）。name 是个人化昵称，三层独立。
  - **「保护者 Protector」是总称，不当作 role 取值**：Manager + Firefighter 统称保护者（都护着 Self 不被 Exile 伤到），Exile 不是保护者。role 字段只取 Manager/Firefighter/Exile 三值，避免"保护者 Manager"这种 umbrella＋具体值的层级混淆。
- **Exile 安全**：中心留白＝未满足完形＝被流放的需要；本仓改为直接显示需要名，不再设授权门槛。保护者↔Exile 默认不显示、可选关联（IFS 铁律：别直接逼 Exile，从保护者入手）。
- **blending**：仅由前瞻旗（上层适配层）运行时判定，核心引擎不强制每集 `line.blending` 字段（避免图面噪音＋回溯镜事后判断不准）。
- **视图**：防御分支图面标 role 缩写徽标（M/F/E 小圆），详细 role/subtype/name 放镜映面板（分层显示）。
- **E 终点重锚**：unblending——看见「这是某个 part 在说话，不是我」＝ 格式塔觉察 × IFS 解离汇流，终点仍是重新选择的入口、不塞应该。

---

## 用法

**零构建**：直接用浏览器打开 `index.html`（双击即可，无需服务器 / 打包）。

**接入自己的数据**：在 `index.html` 末尾的示例数据处，替换为你的 loop：

```js
var myLoop = {
  name: '行动前转向自身',
  meta: { context: '职场', intensity: 0.92 },   // intensity ∈ [0,1] 决定小环大小
  edges: [
    { from: 0, to: 1, lines: [ { type:'real', lit:true } ] },
    // ... 六条边，每条 from/to = STAGES 下标(0..5)
    { from: 3, to: 4, lines: [
        { type:'real', lit:false },
        { type:'defense', mech:'retroflection 转向自身', lit:true,
          content:{ behavior:'拖延 / 自我批判', thought:'我不配争取；别惹事', feeling:'羞耻', somatic:'自我攻击的闷痛·胸口发紧' },
          note:'能量不向外，转向攻击自己——假性闭合。' }
    ]},
    { from: 5, to: 0, lines: [ { type:'real', lit:true } ] } // 环级闭合
  ]
};
renderSingleView(document.getElementById('single'), myLoop);
```

**作为模块复用**：`gestalt-loop.js` 暴露全局 `GLM` 对象（或同名全局函数），可直接在任意页面 `<script src="gestalt-loop.js">` 后调用
`renderSingleView` / `renderChain` / `renderBranched`。

### 碎片罐 · 隔三岔五积攒 → 逐渐清晰后自动整理串接
- 新增 `gestalt-journal.js`：**持久碎片罐**——把「③ 碎片录入」从一次性粘贴升级为「想起一片丢一片、跨会话积攒、逐渐清晰后自动整理」。
  - `FragmentJar`：`add(text)`（按空行切碎片→各自 `parseLoopDraft`→存 localStorage，file:// 下失败自动退内存兜底）/ `list()` / `remove(id)` / `clear()`。
  - `clarityOf(frags)`：清晰度评估 = `0.55×数量饱和(≤6) + 0.45×主导机制占比` → 0..1；`clearEnough = 数量≥3 且 score≥0.5`（碎片够多、同一模式反复出现 → 模式浮现）。
  - `organizeChain(frags)`：按时间升序取各碎片 parsed loop → 时间线大 loop。
- `gestalt-parse.js` 仍是底层引擎（同前，`parseLoopDraft` / `parseFragments`）；现在**每条碎片在丢入罐子时即被解析并存储**，整理只是把罐子按时间串起来。
- 在 `index.html` / `gestalt-test-recent.html` 的「③ 碎片罐」板块：
  - 单条或多条（空行分隔）文本 → 「丢进罐子（积攒）」→ 跨会话持久化（重开页面/刷新仍在）。
  - **清晰度条**：实时显示「碎片数 + 主导机制占比」；达到 clearEnough（变绿、提示"逐渐清晰了"）时**自动生成串接预览**，你点「载入为串接图」即提交到②。
  - 罐子列表可单条移除 / 清空；「整理并串接（从罐子）」可随时手动触发。
- **不承诺准确**：解析仍仅靠关键词，草稿需逐条确认/修改后再入图。

### 开放引导对话 · 推你走向不同的路径
- 新增 `gestalt-guide.js`：**不替你下结论**，而是用格式塔框架 + IFS 的开放提问把探索往不同方向推开。
  - `guideToday(frags)`：按日期轮换的一句「今日一问」（从池中取，当天稳定、隔天不同）。
  - `guidePaths(frags)`：路径卡——基础 5 张（身体 / 没走的路 / 哪个 part 在说话 / 未满足的需要 / 停在循环的哪步）+ 条件性 2 张（依碎片检测到的机制：内摄→「应该」的来源；投射→回收投射；转向自身→对外表达；融合→分界）。每张卡含 3 句开放式追问，点标题展开。
  - `guideContext(frags)`：读出罐中碎片的主导机制与 flag，决定条件路径。
- 在「⑤ 开放引导对话」板块：点「生成今日引导」→ 出今日一问 + 路径卡（无碎片时也会有通用引导，但喂了素材后更贴身）。
- **定位**：这是"镜映回路"的**陪伴侧**——不是诊断，是开放提问，引导你自行走向不同路径。真实环境可由外部模型根据对话动态生成更贴合的追问。

### 文本解读（框架结论 → 自然语言叙述）
- 新增 `gestalt-narrate.js`（`window.narrateLoop(loop)` / `window.narrateChain(chain)`）：与「碎片罐」（文本→草稿串接）**方向相反**——不是把文本抽成 loop，而是把**已跑完框架的 loop 数据翻译成一段人话**，方便被镜映的人理解自己的模式。
- 叙述覆盖：① 总起（事件 + 固着强度）② 体验本应如何流动 ③ 逐条解读「实走的防御线」（仅 `lit` 且 `type=defense` 的边；正常流动的 flow 线不叫"截断"）④ 四元逐层（行为 / 想法 / 感受 / 躯体）⑤ 中断机制语义（能量去哪了）⑥ IFS part（谁在说话）⑦ 菜单里没走的可能 ⑧ 中心未满足完形 ⑨ 重新选择入口（不塞应该）。
- 在「④ 文本解读」板块：选解读对象（单环 / 串接全景）→ 点「生成文本解读」→ 出段落文字。串接版额外统计「反复出现的中断机制」并逐条速览。
- **定位**：这是规格里"镜映回路"的输出侧。真实环境可由外部模型生成更贴身的叙述；本文件是零依赖的本地版，逻辑全在 `MECH_MEANING` / `ROLE_CN` 两个字典里，易改。

### 宿主页面约定
- 在文档 `:root` 定义 CSS 变量：`--fix`（红/防御）、`--accent`（蓝/真实）、`--ink`、`--muted`。
- 提供全局函数 `showLine(loop, ei, li)`：点击分支时的镜映面板回调（引擎只渲染，不负责面板）。

---

## 文件结构

```
gestalt-loop-mirror/
├── index.html        # 演示页 + UI + 镜映面板 + ③碎片罐/④文本解读/⑤开放引导 板块 + 示例数据（零构建，双击打开）
├── gestalt-loop.js   # 核心引擎（纯 classic script，file:// 可用，零依赖）
├── gestalt-parse.js  # 碎片→草稿 loop（启发式生成器，零依赖，对应规格 D；含 parseLoopDraft / parseFragments）
├── gestalt-journal.js # 碎片罐（localStorage 持久积攒 + 清晰度评估 + 整理串接，零依赖）
├── gestalt-narrate.js # 文本解读（框架结论→自然语言叙述，零依赖，对应镜映回路输出侧）
├── gestalt-guide.js   # 开放引导对话（今日一问 + 路径卡 + 开放式追问，零依赖，对应镜映回路陪伴侧）
├── README.md         # 本文档
├── LICENSE           # MIT
└── .gitignore        # 挡住 gestalt-test-*.html（含真实心理内容，不传公开仓库）与临时验证文件
```

---

## License

MIT © EDENOFLUX
