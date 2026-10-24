# -*- coding: utf-8 -*-
"""校验「未满足的完形」的证据引文是否真的出现在原始素材里。

用法：
    python verify_need.py <spec.json> <source.md> [...]

规则：
- 读 spec 里 meta.need.evidence[].quote（串接文件读顶层 meta.need）
- 每条 quote 归一化（去 markdown 强调符、空白、统一标点）后，必须在任一素材里原文命中
- 全部命中 → 退出码 0；有任一未命中 → 退出码 1，并列出缺失项

这是防编的硬闸：引文必须可回溯，拼不出来就不算证据。
"""
import json
import re
import sys


def normalize(s):
    s = str(s or "")
    s = s.replace("**", "").replace("*", "").replace("`", "")
    s = re.sub(r"\s+", "", s)
    table = {"，": ",", "。": ".", "；": ";", "：": ":", "「": "", "」": "", "“": "", "”": ""}
    for a, b in table.items():
        s = s.replace(a, b)
    return s


def load_json(path):
    with open(path, "rb") as fh:
        return json.loads(fh.read().decode("utf-8"))


def need_blocks(spec):
    """返回 [(标签, need 对象)]：单环取 meta.need；串接取顶层 meta.need。"""
    out = []
    meta = spec.get("meta") or {}
    if isinstance(meta.get("need"), dict):
        out.append((spec.get("name") or "spec", meta["need"]))
    for lp in spec.get("loops") or []:
        nm = (lp.get("meta") or {}).get("need")
        if isinstance(nm, dict):
            out.append((lp.get("name") or "loop", nm))
    return out


def main(argv):
    if len(argv) < 3:
        print(__doc__)
        return 2
    spec_path, sources = argv[1], argv[2:]
    spec = load_json(spec_path)
    corpus = ""
    for p in sources:
        with open(p, "rb") as fh:
            corpus += fh.read().decode("utf-8", "ignore") + "\n"
    hay = normalize(corpus)

    blocks = need_blocks(spec)
    if not blocks:
        print("没有 need 块，跳过")
        return 0

    total = miss = 0
    for label, need in blocks:
        print("── %s → %s" % (label, need.get("text", "")))
        for ev in need.get("evidence") or []:
            q = ev.get("quote", "")
            total += 1
            ok = normalize(q) and normalize(q) in hay
            print("   %s %s  （%s）" % ("✓" if ok else "✗", q, ev.get("at", "")))
            if not ok:
                miss += 1

    print("\n引文 %d 条，命中 %d，缺失 %d" % (total, total - miss, miss))
    return 0 if miss == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
