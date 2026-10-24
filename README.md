# Gestalt Loop Mirror · 格式塔镜映

把一次「又卡在同一个地方」的经历画成一张图，再生成一页可读的报告：**哪里被中断、没被满足的是什么、下次可以怎么做。**

六阶段（唤起 → 觉察 → 动员 → 行动 → 接触 → 消退）是六个顶点；正常推进是直边；边界上被中断的地方折出一道菱形，顶点朝向表示能量往哪走。闭环没走到「接触」，中心那块就是空的——那里写着这条环缺的东西。

零依赖，纯静态，`file://` 双击可用。

## 它做什么

- **单环图**：一次经历画成一个闭环，区分「这次实际走的路径」和「本来还能走的路径」
- **串接图**：多条 episode 叠成时间线大图，点小环切到某一条
- **文本解读**：把图上的机制翻译成一段人话，跟着当前视图自动切换
- **行动选项**：每个断点给 2–3 条可执行的替代动作，含「为什么能闭合」和「代价」
- **碎片罐**：随手丢碎片（一句话就行），攒到一定密度自动整理

四种折返式中断：内摄 / 投射 / 转向自身 / 融合；两种断尾式（甩出去就不回来）：偏转 / 麻木。

## 快速开始

```bash
# 生成完整 HTML 报告
node scripts/make_page.js out.html assets/loop-demo.json

# 多 episode 串接（第二个及之后会进串接图）
node scripts/make_page.js out.html ep1.json ep2.json ep3.json
```

打开 `out.html` 即可。

可选参数：

- `--need "共同需要"` 串接中心的共同未满足完形
- `--frag <碎片.md>` 读入主题碎片收集文档（`- ` 开头的行）

调试用 PNG（需要 Python + Pillow + 中文字体）：

```bash
python scripts/render_loop.py out.png assets/loop-demo.json
```

## 数据格式

一份 JSON 描述一个闭环：`meta` + `edges` + `lines`。完整字段、派生规则、渲染规则见 [SKILL.md](SKILL.md)。

最小例子：

```jsonc
{
  "name": "一次「该做却没做」的循环",
  "meta": { "closures": [100, 100, 30, 0, 10, 20] },
  "edges": [
    { "from": 0, "to": 1, "lines": [ { "type": "real", "lit": true, "weight": 100 } ] },
    { "from": 2, "to": 3, "lines": [
        { "type": "real", "lit": false, "weight": 25 },
        { "type": "defense", "mech": "introjection 内摄", "bend": "in", "lit": true, "weight": 70,
          "content": { "behavior": "…", "thought": "…", "feeling": "…", "somatic": "…" },
          "part": { "role": "manager", "subtype": "inner-critic", "name": "严厉监工" },
          "why": "为什么这条线成立" }
    ] }
  ]
}
```

## 目录

```
SKILL.md                 # 数据模型、渲染规则、使用流程（建议先读）
assets/
  loop-demo.json         # 示例数据
  engine/                # 交互引擎（MIT），零依赖纯静态
    index.html           # 页面模板
    gestalt-loop.js      # 图渲染
    gestalt-parse.js     # 文本 → 草稿 loop
    gestalt-journal.js   # 碎片罐
    gestalt-narrate.js   # 框架 → 自然语言
    gestalt-guide.js     # 开放提问
    gestalt-view.js      # 新版视图（六边形脊 + 折线菱形 / 串接大多边形）
scripts/
  make_page.js           # 生成完整 HTML（主入口）
  render_loop.py         # 单环 PNG（调试用）
  verify_need.py         # 证据引文校验（防编造）
  smoke_engine.js        # 引擎冒烟测试
```

## 设计约束

- **不替你下结论。** 所有内容来自你的数据；工具只读字段，不猜语义
- **证据优先。** 「未满足的完形」要求至少两条原文引文，且 `verify_need.py` 会校验引文是否真的出现在素材里
- **躯体一律写成推测。** 不是每个人都会提供身体反应，所以渲染层统一用「可能会……」措辞
- **不是诊断工具。** 这是自我观察的镜子，不替代心理咨询

## License

MIT，见 [LICENSE](LICENSE)。`assets/engine/` 下的交互引擎亦为 MIT。