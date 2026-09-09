#!/usr/bin/env python3
"""Scan mobile/web/admin UI sources for corrupted Hangul / mojibake."""
from __future__ import annotations

from collections import Counter
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [
    ROOT / "apps" / "mobile" / "lib",
    ROOT / "apps" / "web",
    ROOT / "apps" / "admin",
]
SKIP_DIRS = {"node_modules", ".next", "build", ".dart_tool", "dist"}
EXTS = {".dart", ".tsx", ".ts", ".jsx", ".js"}

BAD_FRAGMENTS = [
    "삸고",
    "삵고",
    "占쏙옙",
    "\ufffd",
]

STRING_RE = re.compile(r"""['"]([^'"\n]{0,120})['"]""")


def iter_source_files():
    for base in TARGETS:
        if not base.exists():
            continue
        for p in base.rglob("*"):
            if not p.is_file() or p.suffix not in EXTS:
                continue
            if any(part in SKIP_DIRS for part in p.parts):
                continue
            yield p


def main() -> None:
    out_lines: list[str] = []
    hits: list[str] = []
    syllable_count: Counter[str] = Counter()
    examples: dict[str, tuple[str, int, str]] = {}

    for path in iter_source_files():
        try:
            text = path.read_text(encoding="utf-8")
        except Exception as exc:
            hits.append(f"READ_ERR {path}: {exc}")
            continue

        rel = path.relative_to(ROOT).as_posix()
        for i, line in enumerate(text.splitlines(), 1):
            for frag in BAD_FRAGMENTS:
                if frag in line:
                    hits.append(f"{rel}:{i}: {line.strip()[:160]}")

            for m in STRING_RE.finditer(line):
                s = m.group(1)
                if not any("\uac00" <= c <= "\ud7a3" for c in s):
                    continue
                for ch in s:
                    if "\uac00" <= ch <= "\ud7a3":
                        syllable_count[ch] += 1
                        examples.setdefault(ch, (rel, i, s[:80]))

    out_lines.append("=== Direct bad fragment hits ===")
    out_lines.extend(hits if hits else ["(none)"])
    out_lines.append("")
    out_lines.append("=== Hangul syllables appearing only once ===")
    rare = sorted((ch for ch, n in syllable_count.items() if n == 1))
    for ch in rare:
        rel, i, s = examples[ch]
        out_lines.append(f"U+{ord(ch):04X} {ch} @ {rel}:{i} :: {s}")

    report = ROOT / "scripts" / "_mojibake_report.txt"
    report.write_text("\n".join(out_lines) + "\n", encoding="utf-8")
    print(f"wrote {report} ({len(hits)} bad hits, {len(rare)} rare syllables)")

    # Verify the known fix
    pg = ROOT / "apps/mobile/lib/features/home/presentation/pages/price_guide_page.dart"
    text = pg.read_text(encoding="utf-8")
    for i, line in enumerate(text.splitlines(), 1):
        if "안내" in line and ("참고" in line or "삸고" in line or "삵고" in line):
            print(f"verify {i}: {line.strip()}")


if __name__ == "__main__":
    main()
