"""
push_to_supabase.py
Master data generation and synchronization script for BoreX / NWIS.
SIH 2026 Problem Statement: eRTMAC-NWIS

Geographic context: Upper Assam Basin (Northeast India)
Field: ASSAM DEMONSTRATION BASIN
Label: SYNTHETIC DEMONSTRATION BENCHMARK (Not operational OIL data)

Generates:
  - 1 Active Well (ACTIVE: IND-NWIS-01)
  - 17 Historical Offset Wells (IND-NWIS-02 through IND-NWIS-18)
  - 200+ Realistic Daily Drilling Reports across 7 regional formations
  - Monotonic Active Well Depth Progression (0 to 3,650m) with realistic ROP & NPT
  - Deterministically Correlated Subsurface Risk Alerts
  - Standalone SQL Seed File (seed_indian_basin.sql)
"""
import os
import uuid
import random
import math
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

from nearby_wells import find_nearby_wells
from report_parser import parse_report_text
from risk_correlator import correlate
from progress_simulator import simulate_drilling_progress

load_dotenv()

UUID_NS = uuid.UUID("a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d")

def uid5(*parts) -> str:
    return str(uuid.uuid5(UUID_NS, "|".join(str(p) for p in parts)))

# ---------------------------------------------------------------------------
# UPPER ASSAM DEMONSTRATION BASIN WELLS
# Centered near Dibrugarh / Duliajan synthetic sector (~27.32°N, 95.32°E)
# ---------------------------------------------------------------------------
FIELD_NAME = "ASSAM DEMONSTRATION BASIN"
OPERATOR_NAME = "SYNTHETIC DEMONSTRATION ASSET"

WELLS_DATA = [
    # id_key,        name,                  lat,      lon,      field,      operator,       spud_date,    td_m
    ("IND-NWIS-01", "ACTIVE: IND-NWIS-01", 27.3250, 95.3180, FIELD_NAME, OPERATOR_NAME, "2025-02-10", 3650),
    ("IND-NWIS-02", "IND-NWIS-02",        27.3520, 95.3350, FIELD_NAME, OPERATOR_NAME, "2021-04-12", 3820),
    ("IND-NWIS-03", "IND-NWIS-03",        27.2980, 95.2780, FIELD_NAME, OPERATOR_NAME, "2020-08-25", 3710),
    ("IND-NWIS-04", "IND-NWIS-04",        27.3710, 95.2650, FIELD_NAME, OPERATOR_NAME, "2022-01-18", 3950),
    ("IND-NWIS-05", "IND-NWIS-05",        27.2450, 95.3720, FIELD_NAME, OPERATOR_NAME, "2019-11-04", 3600),
    ("IND-NWIS-06", "IND-NWIS-06",        27.4200, 95.3900, FIELD_NAME, OPERATOR_NAME, "2023-03-30", 3780),
    ("IND-NWIS-07", "IND-NWIS-07",        27.2100, 95.2100, FIELD_NAME, OPERATOR_NAME, "2018-05-15", 4050),
    ("IND-NWIS-08", "IND-NWIS-08",        27.4650, 95.2200, FIELD_NAME, OPERATOR_NAME, "2021-09-09", 3690),
    ("IND-NWIS-09", "IND-NWIS-09",        27.1500, 95.4500, FIELD_NAME, OPERATOR_NAME, "2019-02-20", 3840),
    ("IND-NWIS-10", "IND-NWIS-10",        27.5300, 95.5100, FIELD_NAME, OPERATOR_NAME, "2022-07-14", 4120),
    ("IND-NWIS-11", "IND-NWIS-11",        27.0800, 95.1200, FIELD_NAME, OPERATOR_NAME, "2017-10-08", 3700),
    ("IND-NWIS-12", "IND-NWIS-12",        27.6100, 95.1100, FIELD_NAME, OPERATOR_NAME, "2023-11-01", 3620),
    ("IND-NWIS-13", "IND-NWIS-13",        26.9500, 95.6200, FIELD_NAME, OPERATOR_NAME, "2016-06-19", 4200),
    ("IND-NWIS-14", "IND-NWIS-14",        27.7500, 95.6500, FIELD_NAME, OPERATOR_NAME, "2024-04-05", 3890),
    ("IND-NWIS-15", "IND-NWIS-15",        26.8200, 94.9500, FIELD_NAME, OPERATOR_NAME, "2015-12-11", 3750),
    ("IND-NWIS-16", "IND-NWIS-16",        27.9100, 95.0200, FIELD_NAME, OPERATOR_NAME, "2020-03-22", 3980),
    ("IND-NWIS-17", "IND-NWIS-17",        26.6800, 95.8000, FIELD_NAME, OPERATOR_NAME, "2018-09-17", 4150),
    ("IND-NWIS-18", "IND-NWIS-18",        28.0500, 95.4500, FIELD_NAME, OPERATOR_NAME, "2021-02-14", 3850),
]

# ---------------------------------------------------------------------------
# GEOLOGICAL FORMATIONS OF UPPER ASSAM BASIN
# ---------------------------------------------------------------------------
def formation_for_depth(depth_m: float) -> str:
    if depth_m < 650:
        return "Dhekiajuli Fm."
    elif depth_m < 1550:
        return "Girujan Clay Fm."
    elif depth_m < 2300:
        return "Upper Tipam Sandstone Fm."
    elif depth_m < 2850:
        return "Lower Tipam Sandstone Fm."
    elif depth_m < 3350:
        return "Barail Coal-Shale Fm."
    elif depth_m < 3700:
        return "Barail Main Sandstone Fm."
    else:
        return "Kopili Shale Fm."

# ---------------------------------------------------------------------------
# SYNTHETIC DRILLING EVENT TEMPLATES (ASSAM BASIN LITHOLOGY)
# ---------------------------------------------------------------------------
DDR_TEMPLATES = [
    # Shallow intervals: Dhekiajuli & Girujan (0 - 1550m)
    ("mud_loss", 420, "Seepage loss of 15 bbl/hr observed at {depth} m MD in coarse gravel bed of Dhekiajuli formation. Mixed 25 bbl medium nut-plug pill. Controlled loss rate to 3 bbl/hr."),
    ("drilling_problem", 880, "Severe bit balling encountered at {depth} m MD in plastic mottled clays of Girujan Clay. ROP dropped from 22 m/hr to 4 m/hr. Pumped high-viscosity sweep and elevated pump rate to 850 gpm."),
    ("stuck_pipe", 1250, "Drillstring became pack-off stuck while back-reaming at {depth} m MD in Girujan swelling claystone. Drag spiked to 75,000 lb overpull. Jarred downward with hydraulic jar; freed string after 4.5 hrs NPT."),
    ("kick", 1420, "Shallow biogenic gas pocket intersected at {depth} m MD in upper sand lense. Observed pit gain of 12 bbl. Shut-in on annular preventer. SIDPP 180 psi, SICP 240 psi. Degassed mud and resumed with 1.18 SG."),
    ("normal", 1100, "Drilled 12-1/4 hole section normally from 1050m to {depth} m MD. ROP averaged 20 m/hr. Flow checks negative. Background gas < 0.8%."),
    ("normal", 1490, "Ran and cemented 9-5/8 casing shoe at {depth} m MD. Displaced 450 sx Class G cement slurry. Good surface returns. WOC 18 hrs."),

    # Intermediate intervals: Upper & Lower Tipam (1550 - 2850m)
    ("mud_loss", 1820, "Encountered high permeability thief zone in Upper Tipam Sandstone at {depth} m MD. Total loss of circulation (120 bbl pit loss in 15 min). Mixed and squeezed 70 bbl bridging LCM pill. Full returns restored."),
    ("overpressure", 2150, "Abnormal pore pressure ramp detected at {depth} m MD in Tipam transition zone. Gas cutting mud from 1.18 to 1.08 SG. Increased active mud weight to 1.28 SG with barite."),
    ("stuck_pipe", 2480, "Differential sticking incident at {depth} m MD during connection across depleted Tipam sandstone reservoir. String stuck with 90,000 lb overpull limit. Spotted 40 bbl lubricating pipe-lax pill. String freed after 7 hrs NPT."),
    ("cementing", 2620, "Performed 7 casing shoe leak-off test (LOT) at {depth} m MD. Obtained equivalent mud weight 1.52 SG vs 1.60 SG prognosed. Performed micro-matrix squeeze cementation to reinforce shoe integrity."),
    ("normal", 1950, "Drilling 8-1/2 hole section steadily through massive quartzitic sandstones of Upper Tipam at {depth} m MD. ROP 15 m/hr. No drag noted on connections."),
    ("normal", 2380, "Logged well with LWD gamma ray and dual resistivity at {depth} m MD through Lower Tipam interval. Normal formation resistivity confirmed."),

    # Deep Reservoir & Pressure Intervals: Barail & Kopili (2850 - 4000m+)
    ("kick", 3120, "Severe formation gas kick encountered at {depth} m MD while penetrating Barail Coal-Shale sequence. Pit gain 24 bbl within 4 minutes. Well shut-in on BOP. SIDPP 480 psi, SICP 590 psi. Circulated out influx using Wait and Weight method."),
    ("stuck_pipe", 2740, "Severe hole sloughing and mechanical pack-off at {depth} m MD in laminated Barail shales. Rotary torque spiked to 24,000 ft-lb. Worked string with maximum allowable torque and jarred upward. Pipe freed after 9 hrs."),
    ("overpressure", 3380, "Overpressured gas sand penetrated in Barail Main Sandstone at {depth} m MD. Connection gas reached 18.5%. ECD reached critical tolerance. Weighting up mud system from 1.34 to 1.46 SG."),
    ("mud_loss", 2950, "Induced fracture loss at {depth} m MD in Barail carbonaceous interval due to pressure surge during casing trip. Lost 65 bbl synthetic mud. Spotted 50 bbl dual-particle LCM pill."),
    ("drilling_problem", 3280, "Severe torsional stick-slip vibration and chert stringers at {depth} m MD. Downhole vibration sensor triggered red alarm. Pulled bit; found 3 chipped PDC cutters and worn stabilizer blades."),
    ("cementing", 3450, "Encountered weak bonding across Barail gas zone during 5 liner cement job at {depth} m MD. Cement bond log (CBL) showed channeling. Performed remedial squeeze cementation through retainer."),
    ("normal", 3050, "Drilling ahead smoothly in Barail Coal-Shale at {depth} m MD. ROP controlled to 7 m/hr to prevent gas loading in annulus. Degasser operational."),
    ("normal", 3520, "Core barrel trip recovered 9m of Barail Main Sandstone reservoir core from 3511m to {depth} m MD. 100% recovery. Good oil shows and fluorescence."),
    ("normal", 3640, "Wireline logging suite completed at {depth} m MD. Hole condition stable. Maximum recorded bottom-hole temperature: 114°C."),
]

def generate_reports_for_well(well: dict, rng: random.Random) -> list:
    """Generate 12-18 realistic, coherent DDR entries for an offset well."""
    reports = []
    td_m = well["total_depth_m"]
    well_id = well["id"]

    # Sample 14-16 template events per well
    k_samples = rng.randint(13, 17)
    chosen_templates = rng.choices(DDR_TEMPLATES, k=k_samples)

    for event_type, base_depth, template in chosen_templates:
        depth = round(base_depth + rng.uniform(-60, 60), 1)
        if depth >= td_m:
            depth = round(td_m - rng.uniform(15, 80), 1)
        if depth <= 100:
            depth = 180.0

        formation = formation_for_depth(depth)
        notes = template.format(depth=f"{depth:.0f}")

        # Stagger dates between 2017 and 2024
        days_offset = rng.randint(50, 1800)
        report_date = (datetime(2018, 1, 1, tzinfo=timezone.utc) + timedelta(days=days_offset)).isoformat()
        source_doc = f"DDR_{well['name']}_{int(depth)}m_ASSAM.pdf"

        parsed = parse_report_text(
            notes,
            well_id=well_id,
            report_date=report_date,
            source_document=source_doc,
            formation=formation,
        )

        for p in parsed:
            p["id"] = uid5(well_id, int(depth), p["event_type"], report_date)
            p["depth_m"] = depth
            p["formation"] = formation

        reports.extend(parsed)

    # Sort reports chronologically
    reports.sort(key=lambda r: r.get("depth_m", 0))
    return reports

# ---------------------------------------------------------------------------
# MAIN GENERATOR & SYNCHRONIZER
# ---------------------------------------------------------------------------
def generate_all_datasets():
    rng = random.Random(42)

    # 1. WELLS
    wells_list = []
    for key, name, lat, lon, field, operator, spud, td in WELLS_DATA:
        wells_list.append({
            "id":            uid5(key),
            "key":           key,
            "name":          name,
            "lat":           lat,
            "lon":           lon,
            "field_name":    field,
            "operator":      operator,
            "spud_date":     datetime.fromisoformat(spud).replace(tzinfo=timezone.utc).isoformat(),
            "total_depth_m": td,
        })

    active_well = next(w for w in wells_list if w["key"] == "IND-NWIS-01")
    active_id = active_well["id"]
    active_lat, active_lon = active_well["lat"], active_well["lon"]
    historical_wells = [w for w in wells_list if w["id"] != active_id]

    # 2. DRILLING REPORTS
    all_reports = []
    for hw in historical_wells:
        reps = generate_reports_for_well(hw, rng)
        all_reports.extend(reps)

    # Remove duplicate IDs if any
    unique_reports = {}
    for r in all_reports:
        unique_reports[r["id"]] = r
    all_reports = list(unique_reports.values())

    # 3. ACTIVE WELL PROGRESSION
    progress_raw = simulate_drilling_progress(active_id, target_depth_m=active_well["total_depth_m"], seed=42)
    # Sample every 4th step for optimal dashboard density (~110-140 timestamps)
    progress_sampled = [p for i, p in enumerate(progress_raw) if i % 4 == 0]
    progress_rows = [{
        "id":              i + 1,
        "well_id":         p["well_id"],
        "current_depth_m": p["current_depth_m"],
        "timestamp":       p["timestamp"],
    } for i, p in enumerate(progress_sampled)]

    # 4. RISK ALERTS
    nearby = find_nearby_wells(active_lat, active_lon, historical_wells, radius_km=100.0, exclude_id=active_id)
    depth_checkpoints = list(range(400, int(active_well["total_depth_m"]) + 1, 40))
    alert_rows = []
    seen_alert_ids = set()

    for depth in depth_checkpoints:
        alerts = correlate(active_id, float(depth), nearby, all_reports)
        for alert in alerts[:3]:  # Top 3 most relevant alerts at this horizon
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

    return wells_list, all_reports, progress_rows, alert_rows

def write_sql_seed_file(wells, reports, progress, alerts, filepath="seed_indian_basin.sql"):
    """Write an executable SQL seed file that populates Supabase in one command."""
    lines = [
        "-- ============================================================",
        "-- BoreX / NWIS: Synthetic Indian Demonstration Basin Seed Data",
        "-- Field: ASSAM DEMONSTRATION BASIN (Upper Assam / Northeast India)",
        "-- Deterministically generated with seed=42",
        "-- ============================================================",
        "",
        "-- Clean old demonstration data",
        "DELETE FROM risk_alerts;",
        "DELETE FROM active_well_progress;",
        "DELETE FROM drilling_reports;",
        "DELETE FROM wells;",
        "",
        "-- 1. WELLS",
    ]

    for w in wells:
        lines.append(
            f"INSERT INTO wells (id, name, lat, lon, field_name, operator, spud_date, total_depth_m) "
            f"VALUES ('{w['id']}', '{w['name']}', {w['lat']}, {w['lon']}, '{w['field_name']}', '{w['operator']}', '{w['spud_date']}', {w['total_depth_m']}) "
            f"ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, lat=EXCLUDED.lat, lon=EXCLUDED.lon, total_depth_m=EXCLUDED.total_depth_m;"
        )

    lines.append("\n-- 2. DRILLING REPORTS")
    for r in reports:
        clean_notes = r['notes'].replace("'", "''")
        lines.append(
            f"INSERT INTO drilling_reports (id, well_id, report_date, depth_m, formation, event_type, notes, source_document) "
            f"VALUES ('{r['id']}', '{r['well_id']}', '{r['report_date']}', {r['depth_m']}, '{r['formation']}', '{r['event_type']}', '{clean_notes}', '{r['source_document']}') "
            f"ON CONFLICT (id) DO NOTHING;"
        )

    lines.append("\n-- 3. ACTIVE WELL PROGRESS")
    for p in progress:
        lines.append(
            f"INSERT INTO active_well_progress (well_id, current_depth_m, timestamp) "
            f"VALUES ('{p['well_id']}', {p['current_depth_m']}, '{p['timestamp']}');"
        )

    lines.append("\n-- 4. RISK ALERTS")
    for a in alerts:
        clean_msg = a['message'].replace("'", "''")
        lines.append(
            f"INSERT INTO risk_alerts (id, active_well_id, nearby_well_id, matched_depth_m, event_type, distance_km, severity, message, created_at) "
            f"VALUES ('{a['id']}', '{a['active_well_id']}', '{a['nearby_well_id']}', {a['matched_depth_m']}, '{a['event_type']}', {a['distance_km']}, '{a['severity']}', '{clean_msg}', '{a['created_at']}') "
            f"ON CONFLICT (id) DO NOTHING;"
        )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"SQL seed written successfully to: {filepath}")

def main():
    print("Generating Assam Synthetic Demonstration Basin dataset...")
    wells, reports, progress, alerts = generate_all_datasets()
    print(f"Generated:")
    print(f"  - Wells: {len(wells)} (1 Active + {len(wells)-1} Historical)")
    print(f"  - Drilling Reports: {len(reports)}")
    print(f"  - Active Progress Points: {len(progress)}")
    print(f"  - Risk Alerts: {len(alerts)}")

    sql_path = os.path.join(os.path.dirname(__file__), "seed_indian_basin.sql")
    write_sql_seed_file(wells, reports, progress, alerts, sql_path)

    # If backend credentials are present, push directly to Supabase
    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")

    if supabase_url and supabase_key:
        print("\nPushing to Supabase using backend service credentials...")
        try:
            from supabase import create_client
            client = create_client(supabase_url, supabase_key)
            # Upsert wells
            well_rows = [{k: v for k, v in w.items() if k != "key"} for w in wells]
            client.table("wells").upsert(well_rows).execute()
            print("  - Wells pushed.")
            # Upsert reports
            client.table("drilling_reports").upsert(reports).execute()
            print("  - Drilling reports pushed.")
            # Progress
            active_id = next(w["id"] for w in wells if w["key"] == "IND-NWIS-01")
            client.table("active_well_progress").delete().eq("well_id", active_id).execute()
            client.table("active_well_progress").insert(progress).execute()
            print("  - Progress pushed.")
            # Alerts
            client.table("risk_alerts").upsert(alerts).execute()
            print("  - Risk alerts pushed.")
            print("All datasets pushed successfully to Supabase.")
        except Exception as e:
            print(f"Supabase push notice: {e}")
    else:
        print("\nNote: Service key not present in environment. The standalone SQL seed file is generated and ready for the Supabase SQL editor.")

if __name__ == "__main__":
    main()
