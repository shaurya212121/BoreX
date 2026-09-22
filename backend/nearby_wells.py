"""
nearby_wells.py
Given an active well lat/lon and a radius_km, return all wells
within that radius sorted by distance (closest first).
Uses haversine distance — deterministic and explainable.
"""
import math
from typing import List, Dict


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance in km between two lat/lon points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def find_nearby_wells(
    active_lat: float,
    active_lon: float,
    all_wells: List[Dict],
    radius_km: float = 50.0,
    exclude_id: str = None,
) -> List[Dict]:
    """
    Filter wells within radius_km of the active well.

    Args:
        active_lat: Latitude of the active well
        active_lon: Longitude of the active well
        all_wells: List of well dicts (must have 'lat', 'lon', 'id')
        radius_km: Search radius in km (default 50)
        exclude_id: ID of the active well to exclude from results

    Returns:
        List of dicts with original well fields + 'distance_km', sorted ascending.
    """
    results = []
    for well in all_wells:
        if well.get("id") == exclude_id:
            continue
        dist = haversine_km(active_lat, active_lon, well["lat"], well["lon"])
        if dist <= radius_km:
            results.append({**well, "distance_km": round(dist, 2)})
    results.sort(key=lambda w: w["distance_km"])
    return results


if __name__ == "__main__":
    # Quick smoke test
    wells = [
        {"id": "W1", "name": "Volve-1", "lat": 58.43, "lon": 1.89},
        {"id": "W2", "name": "Volve-2", "lat": 58.45, "lon": 1.92},
        {"id": "W3", "name": "Far-Well", "lat": 60.00, "lon": 3.00},
    ]
    active = {"id": "ACTIVE", "lat": 58.44, "lon": 1.90}
    nearby = find_nearby_wells(active["lat"], active["lon"], wells, radius_km=50, exclude_id="ACTIVE")
    for w in nearby:
        print(f"  {w['name']} — {w['distance_km']} km")
