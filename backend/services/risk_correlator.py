"""
risk_correlator.py
Given an active well's current depth and a list of nearby wells,
correlate their historical drilling_reports within a depth tolerance
band. Score matches by proximity, depth closeness, and event severity.
Returns ranked list of risk alerts.
"""
from typing import List, Dict
import math

DEPTH_TOLERANCE_M = 50.0  # ±50m band

SEVERITY_SCORE = {
    "critical": 10,
    "high":     7,
    "medium":   4,
    "low":      1,
}

EVENT_LABELS = {
    "kick":             "Well Control / Kick",
    "stuck_pipe":       "Stuck Pipe Incident",
    "overpressure":     "Overpressure Zone",
    "mud_loss":         "Mud / Circulation Loss",
    "cementing":        "Cementing / Casing Integrity",
    "drilling_problem": "Hole Instability / Vibration",
    "normal":           "Routine Drilling",
}


def _proximity_weight(distance_km: float) -> float:
    """Closer wells get a higher weight. Exponential decay beyond 20 km."""
    if distance_km <= 1:
        return 1.0
    return max(0.1, math.exp(-distance_km / 20.0))


def _depth_closeness_score(current_depth: float, event_depth: float) -> float:
    """Returns 1.0 at exact match, 0.0 at ±DEPTH_TOLERANCE_M boundary."""
    diff = abs(current_depth - event_depth)
    if diff >= DEPTH_TOLERANCE_M:
        return 0.0
    return 1.0 - (diff / DEPTH_TOLERANCE_M)


def correlate(
    active_well_id: str,
    current_depth_m: float,
    nearby_wells: List[Dict],
    drilling_reports: List[Dict],
    depth_tolerance_m: float = DEPTH_TOLERANCE_M,
) -> List[Dict]:
    """
    Find risk alerts by matching current drilling depth against
    historical events in nearby wells.

    Args:
        active_well_id: ID of the currently drilling well
        current_depth_m: Current drilling depth in metres
        nearby_wells: Output of nearby_wells.find_nearby_wells (includes distance_km)
        drilling_reports: All parsed reports from DB (list of dicts)
        depth_tolerance_m: Matching depth band

    Returns:
        List of alert dicts, sorted by composite score descending.
    """
    # Index reports by well_id for fast lookup
    reports_by_well: Dict[str, List[Dict]] = {}
    for r in drilling_reports:
        reports_by_well.setdefault(r["well_id"], []).append(r)

    alerts = []
    for well in nearby_wells:
        wid = well["id"]
        dist = well["distance_km"]
        prox_w = _proximity_weight(dist)

        for report in reports_by_well.get(wid, []):
            event_depth = report.get("depth_m")
            if event_depth is None:
                continue
            depth_score = _depth_closeness_score(current_depth_m, event_depth)
            if depth_score == 0.0:
                continue
            event_type = report.get("event_type", "normal")
            if event_type == "normal":
                continue  # don't alert on normal events

            severity = report.get("severity", "low")
            composite = (
                SEVERITY_SCORE.get(severity, 1) *
                depth_score *
                prox_w
            )

            alerts.append({
                "active_well_id":  active_well_id,
                "nearby_well_id":  wid,
                "nearby_well_name": well.get("name", wid),
                "matched_depth_m": event_depth,
                "event_type":      event_type,
                "distance_km":     dist,
                "severity":        severity,
                "composite_score": round(composite, 4),
                "message": (
                    f"{EVENT_LABELS.get(event_type, event_type)} reported at "
                    f"{event_depth:.0f}m in {well.get('name', wid)} "
                    f"({dist:.1f} km away). "
                    f"Current depth {current_depth_m:.0f}m is within "
                    f"{abs(current_depth_m - event_depth):.0f}m of this event."
                ),
                "why_flagged": report.get("notes", "")[:200],
            })

    alerts.sort(key=lambda a: a["composite_score"], reverse=True)
    return alerts


if __name__ == "__main__":
    from nearby_wells import find_nearby_wells
    wells = [
        {"id": "W1", "name": "Volve-1", "lat": 58.43, "lon": 1.89},
        {"id": "W2", "name": "Volve-2", "lat": 58.45, "lon": 1.92},
    ]
    nearby = find_nearby_wells(58.44, 1.90, wells, exclude_id="ACTIVE")
    reports = [
        {"well_id": "W1", "depth_m": 2450, "event_type": "mud_loss",   "severity": "medium", "notes": "Severe lost circulation at 2450m"},
        {"well_id": "W1", "depth_m": 2550, "event_type": "stuck_pipe", "severity": "high",   "notes": "Stuck pipe at 2550m"},
        {"well_id": "W2", "depth_m": 2460, "event_type": "kick",       "severity": "critical","notes": "Well control event at 2460m"},
    ]
    results = correlate("ACTIVE", 2440, nearby, reports)
    for a in results:
        print(f"  [{a['severity'].upper():8s}] score={a['composite_score']:.3f} | {a['message']}")
