# -*- coding: utf-8 -*-
"""格式塔镜映 · loop 渲染器（静态版）

数据格式 = 引擎原生 loop 格式（与 assets/engine/*.js 同一份）：
    { name, title?, subtitle?,
      meta: { context?, intensity?, closures?: [6 个数] },
      edges: [ { from: 0..5, to: 0..5,
                 lines: [ { type: "real"|"defense", lit, weight?, bend?: "in"|"out",
                            mech?, content?{behavior,thought,feeling,somatic}, part?{role,subtype,name}, why? } ] } ] }

用法：
    python render_loop.py <输出.png> [spec.json]
    LOOP_RING=hex|arc  LOOP_DEF=fold|line  LOOP_BEND=spec|in
"""
import json
import math
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "..", "assets", "loop-demo.json")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "..", "gestalt-loop.png")

RING = os.environ.get("LOOP_RING", "hex")
DEF = os.environ.get("LOOP_DEF", "fold")
BEND_MODE = os.environ.get("LOOP_BEND", "spec")

S = 2
W, H = 1780, 1520
BG = (15, 18, 22)
TEXT = (230, 237, 243)
DIM = (139, 148, 158)
FLOW_LIT = (236, 245, 255)
FLOW_DIM = (58, 72, 84)
DEF_LIT = (229, 56, 59)
DEF_DIM = (122, 43, 46)
RECUR = (120, 200, 255)
NODE_FILL = (22, 27, 34)
NODE_EDGE = (48, 54, 61)
FONT = r"C:\Windows\Fonts\msyh.ttc"
FONT_B = r"C:\Windows\Fonts\msyhbd.ttc"
STAGES_DEFAULT = ["唤起", "觉察", "动员", "行动", "接触", "消退"]


def font(size, bold=False):
    return ImageFont.truetype(FONT_B if bold else FONT, int(size * S))


# ── 读数据（唯一格式：引擎原生 loop） ──────────────────────────
with open(SPEC, "r", encoding="utf-8") as fh:
    spec = json.load(fh)

STAGES = spec.get("stages") or STAGES_DEFAULT
N = len(STAGES)
meta = spec.get("meta") or {}
closures = meta.get("closures") or []
TITLE = spec.get("title") or spec.get("name") or "格式塔环 · loop"
SUB = spec.get("subtitle") or "六边形脊＝六阶段直连；每条边的可能性折成菱形"

ITEMS = []  # 展平后的线
for e in spec.get("edges", []):
    f, t = int(e["from"]), int(e["to"])
    for ln in e.get("lines", []):
        if t == 0 and f == N - 1:
            role = "recur"
        elif ln.get("type") == "defense":
            role = "defense"
        else:
            role = "flow"
        ITEMS.append({
            "f": f, "t": t, "role": role,
            "lit": bool(ln.get("lit")),
            "mech": ln.get("mech", ""),
            "bend": ln.get("bend"),
            "weight": float(ln.get("weight", 60)),
            "content": ln.get("content") or {},
            "part": ln.get("part") or {},
            "why": ln.get("why", ""),
            "shape": ln.get("shape", ""),
        })


def derive_need(items, stages):
    """未满足的完形：取最早一处没走直走线的那条边，读它自己的 why。
    数据里没写 why 时，退化成按阶段名生成的句子（仍是输入相关，不是固定文案）。
    """
    broken = sorted([it for it in items if it["role"] == "flow" and not it["lit"]],
                    key=lambda it: (it["f"], it["t"]))
    if not broken:
        return ""
    it = broken[0]
    why = (it.get("why") or "").strip()
    for prefix in ("本该走的：", "本该走的:", "本该走的 "):
        if why.startswith(prefix):
            why = why[len(prefix):]
            break
    why = why.strip().rstrip("。")
    if why:
        return why
    return "在「%s→%s」这一段，本可以直接走过去" % (stages[it["f"]], stages[it["t"]])


need_obj = meta.get("need") or {}
need_ev = need_obj.get("evidence") or []
need_check = (need_obj.get("crosscheck") or {}).get("verdict", "")

need = str(need_obj.get("text") or "").strip()
need_source = "llm" if need else "none"
if not need:
    need = str(meta.get("missingNeed") or "").strip()
    need_source = "manual" if need else "none"
if not need:
    need = derive_need(ITEMS, STAGES)
    need_source = "derived" if need else "none"

img = Image.new("RGB", (W * S, H * S), BG)
d = ImageDraw.Draw(img)

CX, CY, R, NR = 660.0 * S, 680.0 * S, 420.0 * S, 54.0 * S


def pt(deg, rad):
    a = math.radians(deg)
    return (CX + rad * math.cos(a), CY + rad * math.sin(a))


def node_pt(i):
    return pt(-90 + 360.0 / N * i, R)


def trim_toward(p, q, r):
    dx, dy = q[0] - p[0], q[1] - p[1]
    n = math.hypot(dx, dy) or 1
    return (p[0] + dx / n * r, p[1] + dy / n * r)


def tlen(text, f):
    b = d.textbbox((0, 0), text, font=f)
    return b[2] - b[0], b[3] - b[1]


def arrow(p, direction, color, size):
    dx, dy = direction
    n = math.hypot(dx, dy)
    if n < 1e-6:
        return
    ux, uy = dx / n, dy / n
    px, py = -uy, ux
    d.polygon([p, (p[0] - size * ux + size * 0.55 * px, p[1] - size * uy + size * 0.55 * py),
               (p[0] - size * ux - size * 0.55 * px, p[1] - size * uy - size * 0.55 * py)], fill=color)


def dashed_line(p0, p1, color, width, dash=12 * S, gap=9 * S):
    total = math.dist(p0, p1)
    if total <= 0:
        return
    ux, uy = (p1[0] - p0[0]) / total, (p1[1] - p0[1]) / total
    t = 0.0
    while t < total:
        e = min(t + dash, total)
        d.line([(p0[0] + ux * t, p0[1] + uy * t), (p0[0] + ux * e, p0[1] + uy * e)],
               fill=color, width=int(width))
        t = e + gap


# ── 标题 ──
d.text((60 * S, 30 * S), TITLE, font=font(26, True), fill=TEXT)
d.text((62 * S, 82 * S), SUB, font=font(14), fill=DIM)

# ── 六边形底色 ──
d.polygon([node_pt(i) for i in range(N)], fill=(23, 29, 37), outline=(44, 54, 68), width=int(2 * S))

# ── 脊：flow / recur ──
for it in ITEMS:
    if it["role"] == "defense":
        continue
    i, f, t = it["f"], it["f"], it["t"]
    p0, p1 = node_pt(f), node_pt(t)
    color = RECUR if it["role"] == "recur" else (FLOW_LIT if it["lit"] else FLOW_DIM)
    if RING == "arc":
        a0 = -90 + 360.0 / N * f
        a1 = a0 + 360.0 / N
        rad = R + (26 * S if it["role"] == "recur" else 0)
        pad = math.degrees((NR + 8 * S) / rad)
        pts = [pt(a0 + pad + (a1 - a0 - 2 * pad) * k / 44.0, rad) for k in range(45)]
        if it["lit"]:
            d.line(pts, fill=color, width=int((8 if it["role"] == "recur" else 7) * S), joint="curve")
            arrow(pts[-1], (pts[-1][0] - pts[-3][0], pts[-1][1] - pts[-3][1]), color, 17 * S)
        else:
            for k in range(0, len(pts) - 1, 2):
                d.line([pts[k], pts[min(k + 1, len(pts) - 1)]], fill=color, width=int(3 * S))
        a, b = pts[0], pts[-1]
    else:
        a = trim_toward(p0, p1, NR + 8 * S)
        b = trim_toward(p1, p0, NR + 20 * S)
        if it["lit"]:
            d.line([a, b], fill=color, width=int((8 if it["role"] == "recur" else 7) * S))
            arrow(b, (b[0] - a[0], b[1] - a[1]), color, 17 * S)
        else:
            dashed_line(a, b, color, 3 * S)
    if it["role"] == "recur":
        mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        mx, my = mid[0] - CX, mid[1] - CY
        nn = math.hypot(mx, my) or 1
        lp = (mid[0] + mx / nn * 40 * S, mid[1] + my / nn * 40 * S)
        f13 = font(13)
        tw, th = tlen("重演", f13)
        d.text((lp[0] - tw / 2, lp[1] - th / 2), "重演", font=f13, fill=RECUR)

# ── 防御：折线菱形 / 平行直线 ──
groups = {}
for it in ITEMS:
    if it["role"] == "defense":
        groups.setdefault((it["f"], it["t"]), []).append(it)

badges = []
badge_no = 0
for (f, t), group in groups.items():
    p0, p1 = node_pt(f), node_pt(t)
    ux, uy = p1[0] - p0[0], p1[1] - p0[1]
    L = math.hypot(ux, uy) or 1
    ux, uy = ux / L, uy / L
    nx, ny = -uy, ux
    if (CX - (p0[0] + p1[0]) / 2) * nx + (CY - (p0[1] + p1[1]) / 2) * ny < 0:
        nx, ny = -nx, -ny
    for gi, it in enumerate(group):
        depth = max(60.0, it["weight"]) * 1.7 * S
        bend = it["bend"]
        if bend == "in":
            inward = 1.0
        elif bend == "out":
            inward = -1.0
        else:
            inward = -1.0 if ("projection" in it["mech"] or "confluence" in it["mech"]) else 1.0
        if BEND_MODE == "in":
            inward = 1.0
        a = trim_toward(p0, p1, NR + 8 * S)
        b = trim_toward(p1, p0, NR + 8 * S)
        # 偏转 / 麻木：能量直接甩出去，不折返回下一节点 → 断尾线段
        is_stub = it.get("shape") == "stub" or ("deflection" in it["mech"] or "desensitization" in it["mech"])
        if is_stub:
            omx, omy = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            length = (52 + max(0.0, it["weight"]) * 0.55) * S
            # 偏转向外甩，麻木向内塌；两种都断尾、不连下一节点
            dir_sign = 1.0 if "desensitization" in it["mech"] else -1.0
            tip = (omx + nx * length * dir_sign, omy + ny * length * dir_sign)
            if it["lit"]:
                d.line([(omx, omy), tip], fill=DEF_LIT, width=int(5 * S))
                arrow(tip, (tip[0] - omx, tip[1] - omy), DEF_LIT, 14 * S)
            else:
                dashed_line((omx, omy), tip, DEF_DIM, 3 * S)
            mid = tip
        elif DEF == "line":
            off = (34 + 30 * gi) * S * inward
            a2 = (a[0] + nx * off, a[1] + ny * off)
            b2 = (b[0] + nx * off, b[1] + ny * off)
            if it["lit"]:
                d.line([a2, b2], fill=DEF_LIT, width=int(6 * S))
                arrow(b2, (b2[0] - a2[0], b2[1] - a2[1]), DEF_LIT, 15 * S)
            else:
                dashed_line(a2, b2, DEF_DIM, 3 * S)
            mid = ((a2[0] + b2[0]) / 2, (a2[1] + b2[1]) / 2)
        else:
            apex = ((a[0] + b[0]) / 2 + nx * depth * inward,
                    (a[1] + b[1]) / 2 + ny * depth * inward)
            d.polygon([a, apex, b], fill=(27, 20, 23) if it["lit"] else (21, 18, 20))
            if it["lit"]:
                d.line([a, apex, b], fill=DEF_LIT, width=int(6 * S), joint="curve")
                arrow(b, (b[0] - apex[0], b[1] - apex[1]), DEF_LIT, 15 * S)
            else:
                dashed_line(a, apex, DEF_DIM, 3 * S)
                dashed_line(apex, b, DEF_DIM, 3 * S)
            mid = apex
        badge_no += 1
        rc = 16 * S
        d.ellipse([mid[0] - rc, mid[1] - rc, mid[0] + rc, mid[1] + rc],
                  fill=(15, 18, 22), outline=(DEF_LIT if it["lit"] else (110, 52, 56)), width=int(2 * S))
        d.text(mid, str(badge_no), font=font(13, True),
               fill=(DEF_LIT if it["lit"] else (150, 90, 95)), anchor="mm")
        badges.append((badge_no, it))
        rx, ry = mid[0] - CX, mid[1] - CY
        rn = math.hypot(rx, ry) or 1
        label = "%s·%s%s" % (it["mech"].split(" ")[-1], (it["part"] or {}).get("name", ""),
                             "（没接触）" if is_stub else "")
        d.text((mid[0] + rx / rn * 36 * S, mid[1] + ry / rn * 36 * S), label,
               font=font(11), fill=(229, 56, 59) if it["lit"] else (150, 90, 95), anchor="mm")

# ── 节点 ──
lit_nodes = set()
for it in ITEMS:
    if it["lit"]:
        lit_nodes.add(it["f"])
        lit_nodes.add(it["t"])
for i in range(N):
    x, y = node_pt(i)
    hexp = [(x + NR * math.cos(math.radians(-90 + 360.0 / N * k)),
             y + NR * math.sin(math.radians(-90 + 360.0 / N * k))) for k in range(N)]
    d.polygon(hexp, fill=NODE_FILL, outline=(RECUR if i in lit_nodes else NODE_EDGE),
              width=int((4 if i in lit_nodes else 2) * S))
    d.text((x, y - 6 * S), STAGES[i], font=font(17, True), fill=TEXT, anchor="mm")
    if i < len(closures):
        d.text((x, y + NR - 26 * S), "{:.0f}%".format(closures[i]), font=font(10), fill=DIM, anchor="mm")

# ── 中心：未满足的完形（直接显示；优先人工覆盖，否则从素材推） ──
if need:
    if need_source == "llm":
        label = "未满足的完形 · 证据 ×%d" % len(need_ev)
        if need_check in ("conflict", "unusable"):
            label += " · 旁证不可用"
    elif need_source == "derived":
        label = "未满足的完形 · 从素材推得"
    else:
        label = "未满足的完形"
    d.text((CX, CY - 28 * S), label, font=font(12), fill=DIM, anchor="mm")
    # 折行：先按标点切段，再贪心拼到每行 ≤15 字
    segs = [s.strip() for s in re.split(r"[／/，,。；;、]", need) if s.strip()]
    lines, cur = [], ""
    for s in segs:
        cand = (cur + "，" + s) if cur else s
        if len(cand) <= 15:
            cur = cand
        else:
            if cur:
                lines.append(cur)
            cur = s
    if cur:
        lines.append(cur)
    if not lines:
        lines = [need[:15]]
    chunks = lines[:3]
    for li, ch in enumerate(chunks):
        d.text((CX, CY + (0 + li * 23) * S), ch, font=font(15, True), fill=TEXT, anchor="mm")
else:
    d.text((CX, CY), "未满足的完形", font=font(15, True), fill=DIM, anchor="mm")

# ── 底部索引 ──
fx, fy = 70 * S, 1200 * S
d.text((fx, fy), "可能性路径　顶点朝外＝能量甩向外部（投射／融合），朝内＝收回自身（内摄／转向自身）", font=font(12), fill=DIM)
for n, it in badges:
    c = it["content"] or {}
    extra = "｜%s／%s／%s" % (c.get("behavior", ""), c.get("feeling", ""), c.get("somatic", "")) if c else ""
    line = "%d　%s · %s%s%s" % (n, it["mech"].split(" ")[-1], (it["part"] or {}).get("name", ""), extra,
                                "" if it["lit"] else "（未走）")
    d.text((fx + 110 * S, fy + n * 30 * S), line, font=font(12),
           fill=(DEF_LIT if it["lit"] else (150, 95, 100)))

# ── 右侧：我的模式 · 可替代 ──
px, py = 1170 * S, 300 * S
d.text((px, py), "我的模式 · 可替代", font=font(17, True), fill=TEXT)
d.text((px, py + 32 * S), "实线＝这次实际走的　虚线＝还能走、没走的", font=font(11), fill=DIM)
lit_mechs = [it["mech"].split(" ")[-1] for it in ITEMS if it["role"] == "defense" and it["lit"]]
d.text((px, py + 78 * S), "你的模式：边界上假性闭合 %d 次" % len(lit_mechs), font=font(12), fill=(229, 56, 59))
d.text((px, py + 104 * S), " → ".join(lit_mechs) if lit_mechs else "—", font=font(13, True), fill=(229, 56, 59))

hy = py + 158 * S
d.text((px, hy), "边", font=font(11), fill=DIM)
d.text((px + 130 * S, hy), "这次走", font=font(11), fill=DIM)
d.text((px + 285 * S, hy), "可替代", font=font(11), fill=DIM)
d.line([(px, hy + 28 * S), (px + 480 * S, hy + 28 * S)], fill=(48, 54, 61), width=int(1 * S))

rows = []
for key in groups.keys():
    grp = [it for it in ITEMS if (it["f"], it["t"]) == key]
    actual, alts = None, []
    for it in grp:
        if it["role"] == "flow" and not it["lit"]:
            alts.append("直走")
        if it["role"] == "defense":
            name = it["mech"].split(" ")[-1]
            if it["lit"]:
                actual = name
            else:
                alts.append(name)
    rows.append((key[0], key[1], actual or "直走", alts))

ry = hy + 56 * S
for f, t, actual, alts in rows:
    d.text((px, ry), "%s→%s" % (STAGES[f], STAGES[t]), font=font(12), fill=TEXT)
    d.text((px + 130 * S, ry), actual, font=font(12, True), fill=(229, 56, 59))
    d.text((px + 285 * S, ry), "／".join(alts) if alts else "—", font=font(12), fill=DIM)
    ry += 36 * S

clean_edges = max(0, N - len(groups))
d.text((px, ry + 26 * S), "其余 %d 段一路直走，没有防御介入。" % clean_edges, font=font(11), fill=DIM)

# ── 图例 ──
ly = 1410 * S
items = [
    (FLOW_LIT, False, "实走的推进"),
    (FLOW_DIM, True, "本次没走的推进"),
    (DEF_LIT, False, "实走的防御（中断在边界）"),
    (DEF_DIM, True, "菜单里没走的防御"),
    (RECUR, False, "环级闭合：回到起点重演"),
]
lx = 70 * S
for color, dash, text in items:
    if dash:
        x = lx
        while x < lx + 34 * S:
            d.line([(x, ly), (min(x + 5 * S, lx + 34 * S), ly)], fill=color, width=int(5 * S))
            x += 10 * S
    else:
        d.line([(lx, ly), (lx + 34 * S, ly)], fill=color, width=int(5 * S))
    d.text((lx + 44 * S, ly - 12 * S), text, font=font(13), fill=DIM)
    lx += 260 * S

img = img.resize((W, H), Image.LANCZOS)
img.save(OUT, "PNG")
print("saved:", OUT)
