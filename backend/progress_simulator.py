"""
progress_simulator.py
Generates a realistic depth-vs-time progression for the active well.
This drives the frontend's depth timeline scrubber — same concept as
the time-based playback we built for OceanGuard, but depth instead
of hours.

Drilling rate model:
  - Starts with a surface section at fast ROP (30-40 m/hr)
  - Slows in intermediate section (10-20 m/hr)
  - Slowest in reservoir section (5-12 m/hr)
  - Adds random variation (geological heterogeneity) + occasional
    NPT (non-productive time) flat spots where depth doesn't advance.
"""
import random
import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict


def simulate_drilling_progress(
    well_id: str,
    target_depth_m: float = 3500.0,
    spud_date: datetime = None,
    seed: int = 42,
) -> List[Dict]:
    """
    Simulate hourly drilling progress from surface to total depth.

    Returns a list of {well_id, current_depth_m, timestamp} records,
    one per simulated hour (or NPT hold period).
    """
    rng = random.Random(seed)
    if spud_date is None:
        spud_date = datetime(2024, 1, 15, 6, 0, 0, tzinfo=timezone.utc)

    records: List[Dict] = []
    depth = 0.0
    t = spud_date

    # Section boundaries (m)
    SURFACE_END     = 500.0
    INTERMEDIATE_END = 2000.0
    RESERVOIR_START  = 2000.0

    def rop_for_depth(d: float) -> float:
        """Return ROP (m/hr) with noise depending on section."""
        if d < SURFACE_END:
            base = rng.uniform(28, 40)
        elif d < INTERMEDIATE_END:
            base = rng.uniform(12, 22)
        else:
            base = rng.uniform(5, 14)
        # Occasional hard formation — ROP drops sharply
        if rng.random() < 0.05:
            base *= 0.3
        return round(base, 2)

    # Record surface start
    records.append({"well_id": well_id, "current_depth_m": 0.0, "timestamp": t.isoformat()})

    while depth < target_depth_m:
        rop = rop_for_depth(depth)

        # NPT event (5% chance per step — flat period 4-24 hrs)
        if rng.random() < 0.05:
            npt_hours = rng.randint(4, 24)
            for _ in range(npt_hours):
                t += timedelta(hours=1)
                records.append({
                    "well_id": well_id,
                    "current_depth_m": round(depth, 1),
                    "timestamp": t.isoformat(),
                })
            continue  # depth doesn't advance during NPT

        # Normal drilling — advance 1 simulated hour
        advance = min(rop, target_depth_m - depth)
        depth += advance
        t += timedelta(hours=1)
        records.append({
            "well_id": well_id,
            "current_depth_m": round(depth, 1),
            "timestamp": t.isoformat(),
        })

    return records


if __name__ == "__main__":
    recs = simulate_drilling_progress("ACTIVE-WELL-01", target_depth_m=3500)
    print(f"Total records: {len(recs)}")
    print(f"Start: {recs[0]}")
    print(f"End  : {recs[-1]}")
    # Verify depth range
    depths = [r["current_depth_m"] for r in recs]
    print(f"Depth range: {min(depths):.0f}m — {max(depths):.0f}m")
