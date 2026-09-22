"""
report_parser.py
Regex/keyword extraction from daily drilling reports (DDRs).
Targets known risk terms and associates them with the nearest
depth number mentioned in the same line/paragraph.
Honest MVP: no trained NER model — deterministic and explainable.
"""
import re
from typing import List, Dict, Optional

# ---------------------------------------------------------------------------
# Risk keyword taxonomy
# ---------------------------------------------------------------------------
RISK_PATTERNS = {
    "stuck_pipe":    re.compile(r"stuck\s+pipe|pipe\s+stuck|freeing\s+stuck", re.I),
    "mud_loss":      re.compile(r"mud\s+loss|lost\s+circulation|loss\s+of\s+circulation|lco|seepage\s+loss", re.I),
    "kick":          re.compile(r"\bkick\b|well\s+control|influx|shut.?in", re.I),
    "overpressure":  re.compile(r"overpressure|over-pressure|abnormal\s+pressure|high\s+pressure|pore\s+pressure", re.I),
    "normal":        None,  # fallback
}

SEVERITY_MAP = {
    "stuck_pipe":   "high",
    "mud_loss":     "medium",
    "kick":         "critical",
    "overpressure": "high",
    "normal":       "low",
}

# Matches depth-like values: 2450m, 2 450 m, 2450 MD, 2,450 ft
DEPTH_RE = re.compile(
    r"(\d[\d,\s]{0,4}\d|\d{3,6})\s*(?:m\b|meters?\b|MD\b|ft\b|feet\b)",
    re.I,
)


def _extract_depth(text: str) -> Optional[float]:
    """Return the first depth value found in text, converted to metres."""
    match = DEPTH_RE.search(text)
    if not match:
        return None
    raw = match.group(1).replace(",", "").replace(" ", "")
    value = float(raw)
    # Crude ft→m if unit says ft/feet
    unit_part = text[match.start():match.end()].lower()
    if "ft" in unit_part or "feet" in unit_part:
        value = value * 0.3048
    return round(value, 1)


def _classify_event(text: str) -> str:
    for event_type, pattern in RISK_PATTERNS.items():
        if pattern and pattern.search(text):
            return event_type
    return "normal"


def parse_report_text(
    text: str,
    well_id: str,
    report_date: str,
    source_document: str,
    formation: str = "Unknown",
) -> List[Dict]:
    """
    Parse a raw drilling report text string into structured events.

    Splits by paragraph/sentence, extracts event type and depth per chunk.
    Returns a list of dicts ready for insertion into drilling_reports.
    """
    events = []
    # Split on blank lines (paragraphs) or numbered list items
    chunks = re.split(r"\n\s*\n|\n(?=\d+[\.\)])", text)
    for chunk in chunks:
        chunk = chunk.strip()
        if len(chunk) < 10:
            continue
        event_type = _classify_event(chunk)
        depth = _extract_depth(chunk)
        if depth is None and event_type == "normal":
            # Skip normal chunks without a depth — not useful
            continue
        events.append({
            "well_id":         well_id,
            "report_date":     report_date,
            "depth_m":         depth,
            "formation":       formation,
            "event_type":      event_type,
            "notes":           chunk[:500],       # truncate long notes
            "source_document": source_document,
            "severity":        SEVERITY_MAP.get(event_type, "low"),
        })
    return events


def parse_report_file(filepath: str, well_id: str, report_date: str) -> List[Dict]:
    """Read a .txt or .csv DDR file and run parse_report_text on it."""
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    return parse_report_text(
        text,
        well_id=well_id,
        report_date=report_date,
        source_document=filepath,
    )


if __name__ == "__main__":
    # Smoke test with synthetic snippet
    sample = """
    Drilling resumed from 2400 m MD. ROP 15 m/hr.

    At 2450 m severe lost circulation was observed. Pumped 50 bbl LCM pill.
    Lost circulation continued at 2450 m — reduced to seepage loss.

    At 2550 m pipe became stuck. Applied overpull. Worked pipe free after 4 hrs.

    Continued drilling to 2600 m with normal parameters.
    """
    events = parse_report_text(sample, "W-TEST", "2010-06-01T00:00:00Z", "test_report.txt")
    for e in events:
        print(f"  [{e['event_type'].upper():12s}] depth={e['depth_m']}m  severity={e['severity']}")
        print(f"    Notes: {e['notes'][:80]}")
