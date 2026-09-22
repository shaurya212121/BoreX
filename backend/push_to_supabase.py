"""
push_to_supabase.py
Master push script for NWIS (SIH26121).

Data sources (in order of preference):
  1. Real Volve dataset files in ./volve_data/ (if present)
  2. Realistic synthetic data based on North Sea / Assam field parameters

Uses uuid5 (deterministic) for all IDs so re-running upserts cleanly.
"""
import os
import uuid
import random
import math
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

from nearby_wells import find_nearby_wells
from report_parser import parse_report_text
from risk_correlator import correlate, SEVERITY_SCORE
from progress_simulator import simulate_drilling_progress

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

UUID_NS = uuid.UUID("12345678-1234-5678-1234-567812345678")

def uid5(*parts) -> str:
    return str(uuid.uuid5(UUID_NS, "|".join(str(p) for p in parts)))

# ---------------------------------------------------------------------------
# VOLVE-INSPIRED WELL DATA
# Based on public Equinor Volve field coordinates (North Sea, ~58.4°N 1.9°E)
# with synthetic names / depths modelled on published field data.
# ---------------------------------------------------------------------------
WELLS_DATA = [
    # id_key,  name,              lat,     lon,     field,        operator,   spud_date,    td_m
    ("F-15",   "F-15",            58.3830, 1.8900, "Volve",      "Equinor",  "2004-06-15", 3755),
    ("F-12",   "F-12",            58.4350, 1.8740, "Volve",      "Equinor",  "2002-03-01", 3812),
    ("F-11",   "F-11",            58.4210, 1.9100, "Volve",      "Equinor",  "2001-09-20", 3690),
    ("F-10",   "F-10",            58.4500, 1.9300, "Volve",      "Equinor",  "2003-05-12", 3940),
    ("F-09",   "F-09",            58.4100, 1.8650, "Volve",      "Equinor",  "2005-01-30", 3820),
    ("F-16",   "F-16",            58.3950, 1.9450, "Volve",      "Equinor",  "2007-08-10", 3610),
    ("F-14",   "F-14",            58.4600, 1.9000, "Volve",      "Equinor",  "2006-11-05", 3720),
    ("F-13",   "F-13",            58.4280, 1.8820, "Volve",      "Equinor",  "2006-04-22", 3880),
    # Active well — the one currently drilling
    ("ACTIVE-VOLVE-01", "ACTIVE: Volve-A01", 58.4400, 1.9050, "Volve", "Equinor", "2024-01-15", 3500),
]

# ---------------------------------------------------------------------------
# SYNTHETIC DRILLING REPORTS
# Realistic DDR snippets for each historical well, keyed by depth ranges
# ---------------------------------------------------------------------------
DDR_TEMPLATES = [
    # (event_type, depth_m, text_template)
    ("mud_loss",     2450, "Lost circulation encountered at {depth} m MD. Pumped 50 bbl LCM pill. Circulation lost to formation — likely fractured limestone zone. Reduced pump rate and monitored."),
    ("stuck_pipe",   2550, "Drill string became stuck at {depth} m MD. Applied overpull up to 80,000 lb. Worked pipe free after 6 hours NPT. Formation: shale/sandstone transition."),
    ("kick",         2800, "Observed pit gain of 15 bbl at {depth} m MD. Shut-in well. SIDPP 350 psi, SICP 420 psi. Kill weight mud calculated. Well killed by driller's method."),
    ("overpressure", 3100, "Overpressure zone encountered at {depth} m MD. Mud weight increased from 1.45 to 1.62 SG. Formation pressure gradient higher than prognosed."),
    ("mud_loss",     1800, "Seepage loss observed at {depth} m MD in Utsira formation. Pumped LCM pill. Loss reduced to acceptable levels."),
    ("stuck_pipe",   3200, "Tight hole at {depth} m MD. String rotation required. Torque spikes noted. Worked pipe for 3 hrs before making connection."),
    ("kick",         1950, "Shallow gas warning at {depth} m MD. Flow check confirmed. Shut in and circulated out gas influx."),
    ("overpressure", 2200, "Abnormal formation pressure at {depth} m MD. ECD increased. Adjusted mud weight. Continued drilling with caution."),
    ("mud_loss",     2700, "Total circulation loss at {depth} m MD. Set blind cement plug. Waited 24 hrs WOC."),
    ("normal",       2100, "Drilling normal parameters at {depth} m MD. ROP 12 m/hr. Mud weight 1.38 SG. No incidents."),
    ("normal",       2900, "Logging while drilling data acquired at {depth} m MD. Formation evaluation in progress. Normal operations."),
]

def generate_reports_for_well(well_id: str, td_m: float, rng: random.Random) -> list:
    """Generate 5-10 realistic DDR entries for a historical well."""
    reports = []
    chosen = rng.sample(DDR_TEMPLATES, k=min(8, len(DDR_TEMPLATES)))
    for event_type, base_depth, template in chosen:
        # Vary depth slightly per well
        depth = round(base_depth + rng.uniform(-80, 80), 1)
        depth = min(depth, td_m)
        text = template.format(depth=f"{depth:.0f}")
        date_offset = rng.randint(0, 500)
        report_date = (datetime(2010, 1, 1, tzinfo=timezone.utc) + timedelta(days=date_offset)).isoformat()
        parsed = parse_report_text(
            text,
            well_id=well_id,
            report_date=report_date,
            source_document=f"DDR_{well_id}_{int(depth)}m.txt",
            formation="Hugin Fm." if depth > 2000 else "Utsira Fm.",
        )
        for p in parsed:
            p["id"] = uid5(well_id, depth, event_type, report_date)
        reports.extend(parsed)
    return reports

# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
def main():
    rng = random.Random(42)

    # --- 1. WELLS ---
    print("Pushing wells...")
    well_rows = []
    for key, name, lat, lon, field, operator, spud, td in WELLS_DATA:
        well_rows.append({
            "id":           uid5(key),
            "name":         name,
            "lat":          lat,
            "lon":          lon,
            "field_name":   field,
            "operator":     operator,
            "spud_date":    datetime.fromisoformat(spud).replace(tzinfo=timezone.utc).isoformat(),
            "total_depth_m": td,
        })
    supabase.table("wells").upsert(well_rows).execute()
    print(f"  {len(well_rows)} wells pushed.")

    # Map name→id for reference
    name_to_id = {r["name"]: r["id"] for r in well_rows}
    active_id  = name_to_id["ACTIVE: Volve-A01"]
    active_lat, active_lon = 58.4400, 1.9050

    # Historical wells (all except active)
    historical = [r for r in well_rows if r["id"] != active_id]

    # --- 2. DRILLING REPORTS ---
    print("Pushing drilling reports...")
    all_reports = []
    for well in historical:
        reports = generate_reports_for_well(well["id"], well["total_depth_m"], rng)
        all_reports.extend(reports)

    report_rows = [{
        "id":              r["id"],
        "well_id":         r["well_id"],
        "report_date":     r["report_date"],
        "depth_m":         r["depth_m"],
        "formation":       r["formation"],
        "event_type":      r["event_type"],
        "notes":           r["notes"],
        "source_document": r["source_document"],
    } for r in all_reports]

    if report_rows:
        supabase.table("drilling_reports").upsert(report_rows).execute()
    print(f"  {len(report_rows)} drilling report records pushed.")

    # --- 3. ACTIVE WELL PROGRESS ---
    print("Simulating drilling progress...")
    progress = simulate_drilling_progress(active_id, target_depth_m=3500, seed=7)
    # Limit to every 6th record to keep row count manageable (~100-200 rows)
    progress_sampled = [p for i, p in enumerate(progress) if i % 6 == 0]
    progress_rows = [{
        "well_id":         p["well_id"],
        "current_depth_m": p["current_depth_m"],
        "timestamp":       p["timestamp"],
    } for p in progress_sampled]

    # Delete existing progress for clean reload
    supabase.table("active_well_progress").delete().eq("well_id", active_id).execute()
    supabase.table("active_well_progress").insert(progress_rows).execute()
    print(f"  {len(progress_rows)} progress records pushed.")

    # --- 4. RISK ALERTS ---
    print("Generating risk alerts...")
    nearby = find_nearby_wells(active_lat, active_lon, historical, radius_km=80, exclude_id=active_id)

    # Simulate alert generation as depth advances (sample every 50m)
    depth_checkpoints = list(range(500, 3501, 50))
    alert_rows = []
    seen_alert_ids = set()

    for depth in depth_checkpoints:
        alerts = correlate(active_id, float(depth), nearby, all_reports)
        for alert in alerts[:3]:  # top-3 alerts per depth checkpoint
            alert_id = uid5(active_id, alert["nearby_well_id"], alert["event_type"], int(alert["matched_depth_m"]), depth)
            if alert_id in seen_alert_ids:
                continue
            seen_alert_ids.add(alert_id)
            alert_rows.append({
                "id":              alert_id,
                "active_well_id":  alert["active_well_id"],
                "nearby_well_id":  alert["nearby_well_id"],
                "matched_depth_m": alert["matched_depth_m"],
                "event_type":      alert["event_type"],
                "distance_km":     alert["distance_km"],
                "severity":        alert["severity"],
                "message":         alert["message"],
                "created_at":      datetime.now(timezone.utc).isoformat(),
            })

    if alert_rows:
        supabase.table("risk_alerts").upsert(alert_rows).execute()
    print(f"  {len(alert_rows)} risk alerts pushed.")

    # --- 5. FINAL COUNT ---
    print("\n" + "="*50)
    print("FINAL TABLE ROW COUNTS")
    print("="*50)
    for table in ["wells", "drilling_reports", "active_well_progress", "risk_alerts"]:
        count = supabase.table(table).select("id", count="exact").execute().count
        print(f"  {table:<25} | {count}")
    print("="*50)
    print("\nNOTE: All data is synthetic but modelled on real Volve field parameters.")
    print("      To use real Volve DDR text files, place them in ./volve_data/ and")
    print("      update generate_reports_for_well() to call parse_report_file() instead.")


if __name__ == "__main__":
    main()
