"""
BoreX / NWIS: Data Models and Structured Entities
SIH 2026 Problem Statement: eRTMAC-NWIS

Defines data classes and synthetic benchmark generators for:
- Mud properties (viscosity, yield point, fluid loss, solids, mud weight)
- Casing and cementing programs (sizes, setting depths, slurry types, integrity)
- Wellbore trajectories (MD, TVD, inclination, azimuth, coordinates, DLS)
- Document ingestion and extraction provenance
- ML risk predictions and geological correlations
"""
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
import math
import random

@dataclass
class MudPropertyRecord:
    well_id: str
    well_name: str
    depth_m: float
    formation: str
    mud_type: str
    mud_weight_sg: float
    plastic_viscosity_cp: float
    yield_point_lbf_100sqft: float
    marsh_funnel_sec: float
    fluid_loss_ml: float
    chlorides_mg_l: float
    solids_pct: float
    ph: float
    timestamp: str

@dataclass
class CasingProgramRecord:
    well_id: str
    well_name: str
    hole_section: str
    casing_size_in: float
    hole_size_in: float
    setting_depth_m: float
    casing_grade: str
    burst_rating_psi: int
    collapse_rating_psi: int
    program_stage: str
    historical_integrity_issue: Optional[str] = None

@dataclass
class CementProgramRecord:
    well_id: str
    well_name: str
    casing_size_in: float
    stage_number: int
    top_depth_m: float
    bottom_depth_m: float
    slurry_type: str
    slurry_density_sg: float
    volume_bbl: float
    job_result: str
    historical_issue: Optional[str] = None
    remedial_action: Optional[str] = None

@dataclass
class TrajectorySurveyPoint:
    well_id: str
    well_name: str
    md_m: float
    tvd_m: float
    inclination_deg: float
    azimuth_deg: float
    northing_m: float
    easting_m: float
    dogleg_severity_deg_30m: float
    build_rate_deg_30m: float
    formation: str

# ---------------------------------------------------------------------------
# SYNTHETIC BENCHMARK GENERATION FOR EXTENDED STRUCTURES (seed=42)
# ---------------------------------------------------------------------------

def generate_synthetic_mud_records(wells: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rng = random.Random(42)
    records = []
    
    for well in wells:
        w_id = well["id"]
        w_name = well["name"]
        td = int(well.get("total_depth_m", 3650))
        
        # Depths every ~300m
        for d in range(300, td + 1, 300):
            # Geological properties based on depth
            if d < 650:
                form = "Dhekiajuli Fm."
                m_type = "Bentonite Spud Mud"
                mw = round(rng.uniform(1.05, 1.10), 2)
                pv = round(rng.uniform(12.0, 16.0), 1)
                yp = round(rng.uniform(14.0, 18.0), 1)
                mf = round(rng.uniform(36.0, 42.0), 1)
                fl = round(rng.uniform(12.0, 16.0), 1)
                sol = round(rng.uniform(4.0, 6.0), 1)
            elif d < 1550:
                form = "Girujan Clay Fm."
                m_type = "KCL-Polymer Inhibitive"
                mw = round(rng.uniform(1.12, 1.18), 2)
                pv = round(rng.uniform(18.0, 24.0), 1)
                yp = round(rng.uniform(20.0, 26.0), 1)
                mf = round(rng.uniform(45.0, 54.0), 1)
                fl = round(rng.uniform(6.0, 8.5), 1)
                sol = round(rng.uniform(7.0, 10.0), 1)
            elif d < 2300:
                form = "Upper Tipam Sandstone Fm."
                m_type = "KCL-Glycol Non-Damaging"
                mw = round(rng.uniform(1.15, 1.20), 2)
                pv = round(rng.uniform(16.0, 22.0), 1)
                yp = round(rng.uniform(16.0, 22.0), 1)
                mf = round(rng.uniform(42.0, 48.0), 1)
                fl = round(rng.uniform(4.5, 6.5), 1)
                sol = round(rng.uniform(6.0, 9.0), 1)
            elif d < 2850:
                form = "Lower Tipam Sandstone Fm."
                m_type = "Low-Solids Non-Dispersed"
                mw = round(rng.uniform(1.18, 1.24), 2)
                pv = round(rng.uniform(20.0, 26.0), 1)
                yp = round(rng.uniform(18.0, 24.0), 1)
                mf = round(rng.uniform(46.0, 56.0), 1)
                fl = round(rng.uniform(4.0, 5.5), 1)
                sol = round(rng.uniform(8.0, 11.0), 1)
            elif d < 3350:
                form = "Barail Coal-Shale Fm."
                m_type = "Synthetic Oil-Based Mud (SOBM)"
                mw = round(rng.uniform(1.28, 1.36), 2)
                pv = round(rng.uniform(24.0, 32.0), 1)
                yp = round(rng.uniform(22.0, 28.0), 1)
                mf = round(rng.uniform(55.0, 68.0), 1)
                fl = round(rng.uniform(2.5, 4.0), 1)
                sol = round(rng.uniform(12.0, 16.0), 1)
            elif d < 3700:
                form = "Barail Main Sandstone Fm."
                m_type = "High-Density SOBM"
                mw = round(rng.uniform(1.32, 1.40), 2)
                pv = round(rng.uniform(26.0, 34.0), 1)
                yp = round(rng.uniform(24.0, 30.0), 1)
                mf = round(rng.uniform(60.0, 72.0), 1)
                fl = round(rng.uniform(2.0, 3.5), 1)
                sol = round(rng.uniform(14.0, 18.0), 1)
            else:
                form = "Kopili Shale Fm."
                m_type = "Invert Emulsion Mud"
                mw = round(rng.uniform(1.42, 1.50), 2)
                pv = round(rng.uniform(30.0, 38.0), 1)
                yp = round(rng.uniform(26.0, 34.0), 1)
                mf = round(rng.uniform(65.0, 80.0), 1)
                fl = round(rng.uniform(1.8, 3.0), 1)
                sol = round(rng.uniform(16.0, 21.0), 1)
                
            rec = MudPropertyRecord(
                well_id=w_id,
                well_name=w_name,
                depth_m=d,
                formation=form,
                mud_type=m_type,
                mud_weight_sg=mw,
                plastic_viscosity_cp=pv,
                yield_point_lbf_100sqft=yp,
                marsh_funnel_sec=mf,
                fluid_loss_ml=fl,
                chlorides_mg_l=round(rng.uniform(28000, 45000), 0),
                solids_pct=sol,
                ph=round(rng.uniform(9.0, 10.2), 1),
                timestamp=f"2024-0{((d // 500) % 9) + 1}-15T08:00:00Z"
            )
            records.append(asdict(rec))
    return records


def generate_synthetic_casing_programs(wells: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    casing_specs = [
        ("Conductor", 20.0, 26.0, 120.0, "K-55", 1530, 770, "Surface isolation", None),
        ("Surface Casing", 13.375, 17.5, 650.0, "N-80", 3450, 1950, "Dhekiajuli gravel protection", "Minor washouts in gravel beds"),
        ("Intermediate Casing", 9.625, 12.25, 2300.0, "P-110", 7430, 4800, "Upper Tipam thief zone isolation", "Differential wear observed during trips"),
        ("Production Liner", 7.0, 8.5, 3650.0, "Q-125", 11200, 8650, "Barail reservoir containment", None),
    ]
    programs = []
    for well in wells:
        w_id = well["id"]
        w_name = well["name"]
        for section, c_size, h_size, depth, grade, burst, collapse, stage, issue in casing_specs:
            rec = CasingProgramRecord(
                well_id=w_id,
                well_name=w_name,
                hole_section=section,
                casing_size_in=c_size,
                hole_size_in=h_size,
                setting_depth_m=depth,
                casing_grade=grade,
                burst_rating_psi=burst,
                collapse_rating_psi=collapse,
                program_stage=stage,
                historical_integrity_issue=issue if "04" in w_name or "07" in w_name else None
            )
            programs.append(asdict(rec))
    return programs


def generate_synthetic_cement_programs(wells: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    cement_specs = [
        (20.0, 1, 0, 120, "Class G Neat + 3% CaCl2", 1.84, 180, "Good surface returns", None, None),
        (13.375, 1, 0, 650, "Lead: Light-weight Pozzolanic; Tail: Class G", 1.58, 420, "100% shoe integrity", "Low TOC in annulus on offset 04", "Top-job squeeze completed"),
        (9.625, 2, 600, 2300, "Class G High Sulfate Resistant + Silica Flour", 1.68, 650, "Pressure tested to 2,800 psi", "Micro-annulus channeling on offset 09", "CBL-VDL indicated squeeze required"),
        (7.0, 1, 2200, 3650, "High-density latex modified slurry", 1.92, 310, "Complete zonal isolation verified", None, None)
    ]
    programs = []
    for well in wells:
        w_id = well["id"]
        w_name = well["name"]
        for c_size, stg, top_d, bot_d, slurry, density, vol, res, issue, remedial in cement_specs:
            rec = CementProgramRecord(
                well_id=w_id,
                well_name=w_name,
                casing_size_in=c_size,
                stage_number=stg,
                top_depth_m=top_d,
                bottom_depth_m=bot_d,
                slurry_type=slurry,
                slurry_density_sg=density,
                volume_bbl=vol,
                job_result=res,
                historical_issue=issue if "09" in w_name or "11" in w_name else None,
                remedial_action=remedial if "09" in w_name or "11" in w_name else None
            )
            programs.append(asdict(rec))
    return programs


def generate_synthetic_trajectories(wells: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generates 25 directional survey stations for active well and offset wells.
    Active well is an S-curve J-type well building to 26° in Lower Tipam and dropping to 14° at TD.
    Offsets have slight variations in kick-off points (KOP) and build rates.
    """
    rng = random.Random(42)
    survey_points = []

    for well in wells:
        w_id = well["id"]
        w_name = well["name"]
        is_active = "ACTIVE" in w_name or "IND-NWIS-01" in w_name
        td = int(well.get("total_depth_m", 3650))
        
        # Profile parameters
        kop = 1200.0 if is_active else 1050.0 + (rng.random() * 300)
        max_inc = 26.5 if is_active else 18.0 + (rng.random() * 16.0)
        target_azi = 42.0 if is_active else (rng.random() * 360.0)

        depths = list(range(0, td + 1, 150))
        if depths[-1] != td:
            depths.append(td)

        tvd = 0.0
        northing = 0.0
        easting = 0.0
        inc = 0.0
        azi = target_azi

        for i, md in enumerate(depths):
            if md <= kop:
                inc = 0.0
                dls = 0.0
                br = 0.0
            elif md < kop + 800:
                # Build section
                build_progress = (md - kop) / 800.0
                inc = max_inc * math.sin(build_progress * (math.pi / 2.0))
                dls = 1.8 + (rng.random() * 0.4)
                br = 1.9
            elif md < kop + 1800:
                # Tangent section
                inc = max_inc + (rng.random() * 0.8 - 0.4)
                dls = 0.4
                br = 0.0
            else:
                # Drop section
                drop_frac = min(1.0, (md - (kop + 1800)) / 700.0)
                inc = max(8.0, max_inc - (drop_frac * 12.0))
                dls = 1.2
                br = -1.1

            # Approximate minimum curvature integration
            if i > 0:
                delta_md = md - depths[i - 1]
                avg_inc_rad = math.radians(inc)
                avg_azi_rad = math.radians(azi)
                delta_tvd = delta_md * math.cos(avg_inc_rad)
                delta_horiz = delta_md * math.sin(avg_inc_rad)
                tvd += delta_tvd
                northing += delta_horiz * math.cos(avg_azi_rad)
                easting += delta_horiz * math.sin(avg_azi_rad)
            else:
                tvd = 0.0
                northing = 0.0
                easting = 0.0

            # Formation name
            if md < 650:
                f_name = "Dhekiajuli Fm."
            elif md < 1550:
                f_name = "Girujan Clay Fm."
            elif md < 2300:
                f_name = "Upper Tipam Sandstone Fm."
            elif md < 2850:
                f_name = "Lower Tipam Sandstone Fm."
            elif md < 3350:
                f_name = "Barail Coal-Shale Fm."
            elif md < 3700:
                f_name = "Barail Main Sandstone Fm."
            else:
                f_name = "Kopili Shale Fm."

            pt = TrajectorySurveyPoint(
                well_id=w_id,
                well_name=w_name,
                md_m=round(md, 1),
                tvd_m=round(tvd, 1),
                inclination_deg=round(inc, 2),
                azimuth_deg=round(azi, 1),
                northing_m=round(northing, 1),
                easting_m=round(easting, 1),
                dogleg_severity_deg_30m=round(dls, 2),
                build_rate_deg_30m=round(br, 2),
                formation=f_name
            )
            survey_points.append(asdict(pt))
    return survey_points
