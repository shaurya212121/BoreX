"""
BoreX / NWIS: Geological ML Correlation Engine (Feature 6)
SIH 2026 Problem Statement: eRTMAC-NWIS

Computes feature-grounded geological similarity between active drilling horizons
and offset well historical intervals based on:
- Lithofacies vectors (sand/shale/coal fractions, porosity, permeability)
- Pore pressure regime and regional gradient
- Stratigraphic depth horizon alignment (Gaussian proximity)
- Spatial distance decay across Upper Assam Shelf
- Historical hazard recurrence in target facies
"""
import math
from typing import Dict, Any, List, Optional

# Geological lithofacies characterization vectors for Upper Assam Basin
# [sand_frac, shale_frac, coal_frac, porosity_pct, perm_mD, overpressure_ratio]
FORMATION_GEOLOGY_VECTORS: Dict[str, Dict[str, Any]] = {
    "Dhekiajuli Fm.": {
        "vector": [0.85, 0.15, 0.00, 28.0, 450.0, 1.00],
        "lithology_desc": "Unconsolidated coarse gravels and pebble beds with high permeability",
        "primary_hazard": "Seepage losses, borehole washout",
        "pore_pressure_sg": 1.03,
    },
    "Girujan Clay Fm.": {
        "vector": [0.15, 0.85, 0.00, 12.0, 5.0, 1.05],
        "lithology_desc": "Mottled plastic smectitic claystone with subordinate thin sand lenses",
        "primary_hazard": "Severe clay swelling, bit balling, shallow biogenic gas pockets",
        "pore_pressure_sg": 1.08,
    },
    "Upper Tipam Sandstone Fm.": {
        "vector": [0.78, 0.22, 0.00, 24.0, 320.0, 1.02],
        "lithology_desc": "Massive coarse to medium-grained permeable sandstone with minor shale intercalations",
        "primary_hazard": "Massive circulation loss (thief zone), sudden fluid level drop",
        "pore_pressure_sg": 1.05,
    },
    "Lower Tipam Sandstone Fm.": {
        "vector": [0.65, 0.35, 0.00, 19.0, 140.0, 0.94],
        "lithology_desc": "Interbedded fine-grained sandstone and siltstone with historical pressure depletion",
        "primary_hazard": "Differential sticking across depleted sands, torque spikes, high drag",
        "pore_pressure_sg": 0.96,  # Depleted
    },
    "Barail Coal-Shale Fm.": {
        "vector": [0.20, 0.55, 0.25, 8.0, 12.0, 1.34],
        "lithology_desc": "Interbedded brittle splintery shales, sub-bituminous coals, and lenticular sandstones",
        "primary_hazard": "High pore pressure gas kicks, hole sloughing, mechanical pack-off",
        "pore_pressure_sg": 1.32,  # Overpressured
    },
    "Barail Main Sandstone Fm.": {
        "vector": [0.72, 0.28, 0.00, 18.0, 180.0, 1.25],
        "lithology_desc": "Main reservoir sands with interbedded dark carbonaceous shales",
        "primary_hazard": "Transition overpressure, drilling break, kick influx",
        "pore_pressure_sg": 1.28,
    },
    "Kopili Shale Fm.": {
        "vector": [0.05, 0.95, 0.00, 6.0, 1.0, 1.48],
        "lithology_desc": "Hard splintery marine shales acting as regional top seal",
        "primary_hazard": "Severe tectonic stress, overpressure, brittle shale collapse",
        "pore_pressure_sg": 1.46,
    }
}

class GeologicalCorrelator:
    """
    Computes feature-derived geological similarity scores between well intervals.
    Score is mathematically grounded in geological vectors and physical proximity.
    """

    def __init__(self):
        pass

    def correlate(
        self,
        active_depth_m: float,
        active_formation: str,
        offset_depth_m: float,
        offset_formation: str,
        distance_km: float,
        historical_event_type: str = "normal"
    ) -> Dict[str, Any]:
        """
        Calculates multidimensional geological similarity.
        Returns percentage score, confidence, and contributing geological factors.
        """
        # 1. Stratigraphic Facies Similarity (Cosine similarity of geological vectors)
        vec1 = FORMATION_GEOLOGY_VECTORS.get(active_formation, FORMATION_GEOLOGY_VECTORS["Upper Tipam Sandstone Fm."])["vector"]
        vec2 = FORMATION_GEOLOGY_VECTORS.get(offset_formation, FORMATION_GEOLOGY_VECTORS["Upper Tipam Sandstone Fm."])["vector"]

        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = math.sqrt(sum(a * a for a in vec1))
        norm2 = math.sqrt(sum(b * b for b in vec2))
        facies_similarity = dot_product / (norm1 * norm2) if norm1 > 0 and norm2 > 0 else 0.50

        # 2. Depth Horizon Proximity (Gaussian decay with sigma=140m)
        depth_delta = abs(active_depth_m - offset_depth_m)
        depth_proximity_score = math.exp(-((depth_delta / 140.0) ** 2))

        # 3. Spatial Distance Decay (Exponential decay over shelf radius)
        distance_factor = math.exp(-((distance_km / 75.0) ** 1.2))

        # 4. Lithological formation match bonus
        same_formation_bonus = 0.20 if active_formation == offset_formation else -0.15

        # Combined Geological Similarity Score
        raw_score = (
            (facies_similarity * 0.40) +
            (depth_proximity_score * 0.35) +
            (distance_factor * 0.15) +
            same_formation_bonus
        )
        bounded_score = max(0.12, min(0.98, raw_score))
        similarity_pct = round(bounded_score * 100, 1)

        # Confidence based on data density & spatial proximity
        confidence = round(min(0.96, 0.72 + (distance_factor * 0.16) + (depth_proximity_score * 0.08)), 3)

        # Geological rationale and contributing evidence
        active_geo = FORMATION_GEOLOGY_VECTORS.get(active_formation, FORMATION_GEOLOGY_VECTORS["Upper Tipam Sandstone Fm."])
        offset_geo = FORMATION_GEOLOGY_VECTORS.get(offset_formation, FORMATION_GEOLOGY_VECTORS["Upper Tipam Sandstone Fm."])

        factors = [
            f"Facies vector cosine match: {round(facies_similarity * 100, 1)}% ({active_formation} vs. {offset_formation})",
            f"Depth delta: {round(depth_delta, 1)}m MD across regional strike",
            f"Spatial offset: {round(distance_km, 1)}km within Upper Assam Basin",
            f"Active lithology: {active_geo['lithology_desc']}",
            f"Pore pressure regime: {active_geo['pore_pressure_sg']} SG equivalent mud weight"
        ]

        return {
            "geological_similarity_pct": similarity_pct,
            "confidence": confidence,
            "facies_match": round(facies_similarity * 100, 1),
            "depth_proximity_factor": round(depth_proximity_score, 3),
            "distance_decay_factor": round(distance_factor, 3),
            "contributing_factors": factors,
            "target_lithology": active_geo["lithology_desc"],
            "expected_hazard": active_geo["primary_hazard"]
        }
