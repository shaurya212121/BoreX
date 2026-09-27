"""
BoreX / NWIS: Telemetry Provider Architecture (Features 7 & 8)
SIH 2026 Problem Statement: eRTMAC-NWIS

Provides:
- ITelemetryProvider interface (adapter pattern)
- SyntheticTelemetryProvider: Coherent physical parameters responding to depth & lithology
- FutureERTMACProvider: Standardized adapter interface ready for real WITSML/eRTMAC streaming
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
import math
import time

class ITelemetryProvider(ABC):
    """
    Abstract Telemetry Provider Interface.
    Enables pluggable switching between Synthetic Simulation and Future eRTMAC / WITSML connectors.
    """

    @abstractmethod
    def get_provider_name(self) -> str:
        """Returns the human-readable identifier of the provider."""
        pass

    @abstractmethod
    def get_provider_type(self) -> str:
        """Returns 'SYNTHETIC' or 'eRTMAC'."""
        pass

    @abstractmethod
    def get_current_telemetry(self, depth_m: Optional[float] = None) -> Dict[str, Any]:
        """Returns a single instantaneous snapshot of all rig telemetry sensors."""
        pass

    @abstractmethod
    def get_stream_chunk(self, start_depth_m: float, end_depth_m: float, step_m: float = 5.0) -> List[Dict[str, Any]]:
        """Returns a contiguous stream of telemetry values between two depths."""
        pass

    @abstractmethod
    def is_connected(self) -> bool:
        """Indicates if live data stream is active."""
        pass


class SyntheticTelemetryProvider(ITelemetryProvider):
    """
    Physically-coherent synthetic telemetry simulation calibrated for the Upper Assam Basin.
    Parameters evolve monotonically with depth, lithology changes, and offset hazard zones.
    """

    def __init__(self, active_well_name: str = "ACTIVE: IND-NWIS-01", target_td: float = 3650.0):
        self.active_well_name = active_well_name
        self.target_td = target_td
        self._current_depth = 1840.0
        self._start_time = time.time()

    def get_provider_name(self) -> str:
        return "NWIS Synthetic Telemetry Engine (Assam Basin Benchmark)"

    def get_provider_type(self) -> str:
        return "SYNTHETIC"

    def is_connected(self) -> bool:
        return True

    def _calculate_parameters_at_depth(self, depth_m: float) -> Dict[str, Any]:
        # Geological formation lookup
        if depth_m < 650:
            form = "Dhekiajuli Fm."
            base_rop = 32.0
            base_wob = 18.0
            base_rpm = 120
            base_torque = 14.5
            base_spp = 2100
            base_flow = 750
            base_mw = 1.08
            base_ecd = 1.13
            base_gas = 0.4
        elif depth_m < 1550:
            form = "Girujan Clay Fm."
            base_rop = 22.0
            base_wob = 24.0
            base_rpm = 110
            base_torque = 18.0
            base_spp = 2500
            base_flow = 680
            base_mw = 1.15
            base_ecd = 1.21
            base_gas = 1.2
        elif depth_m < 2300:
            form = "Upper Tipam Sandstone Fm."
            base_rop = 18.5
            base_wob = 28.0
            base_rpm = 100
            base_torque = 21.0
            base_spp = 2750
            base_flow = 620
            base_mw = 1.18
            base_ecd = 1.25
            base_gas = 2.1
        elif depth_m < 2850:
            form = "Lower Tipam Sandstone Fm."
            base_rop = 14.0
            base_wob = 32.0
            base_rpm = 95
            base_torque = 24.5
            base_spp = 2950
            base_flow = 580
            base_mw = 1.22
            base_ecd = 1.29
            base_gas = 3.5
        elif depth_m < 3350:
            form = "Barail Coal-Shale Fm."
            base_rop = 10.5
            base_wob = 36.0
            base_rpm = 85
            base_torque = 28.0
            base_spp = 3200
            base_flow = 520
            base_mw = 1.32
            base_ecd = 1.39
            base_gas = 6.8
        elif depth_m < 3700:
            form = "Barail Main Sandstone Fm."
            base_rop = 8.5
            base_wob = 38.0
            base_rpm = 80
            base_torque = 29.5
            base_spp = 3350
            base_flow = 500
            base_mw = 1.36
            base_ecd = 1.44
            base_gas = 8.5
        else:
            form = "Kopili Shale Fm."
            base_rop = 6.0
            base_wob = 42.0
            base_rpm = 75
            base_torque = 32.0
            base_spp = 3500
            base_flow = 480
            base_mw = 1.45
            base_ecd = 1.54
            base_gas = 4.2

        # Smooth cyclic micro-variation (deterministic by depth)
        wave = math.sin(depth_m * 0.15)
        rop = round(max(1.0, base_rop + wave * 2.5), 1)
        wob = round(base_wob + math.cos(depth_m * 0.1) * 1.5, 1)
        rpm = int(base_rpm + wave * 4)
        torque = round(base_torque + wave * 1.8, 1)
        spp = int(base_spp + wave * 60)
        flow = int(base_flow + wave * 15)
        mw = round(base_mw, 2)
        ecd = round(base_ecd + (wave * 0.01), 2)
        gas = round(max(0.1, base_gas + wave * 0.4), 1)
        pit_vol = round(450.0 + wave * 3.0, 1)
        hookload = round(160.0 + (depth_m * 0.045) + (wob * 0.2), 1)

        status_text = f"Drilling ahead smoothly in {form}"
        active_warning = None
        hazard_code = None

        # Coherent Physical Anomalies Linked to Offset Incidents
        if 1780 <= depth_m <= 1860:
            # Upper Tipam thief zone: Mud loss event
            flow -= 45
            spp -= 180
            pit_vol = round(pit_vol - 18.5, 1)
            status_text = "Seepage / partial loss detected in porous Upper Tipam sandstone"
            active_warning = "PROXIMITY WARNING: Offset IND-NWIS-04 recorded severe mud loss at 1,820m MD"
            hazard_code = "MUD_LOSS"
        elif 2440 <= depth_m <= 2520:
            # Lower Tipam depleted sandstone: Differential sticking risk
            torque = round(torque + 5.2, 1)
            rop = round(max(1.0, rop - 6.0), 1)
            status_text = "Elevated drag and torque spikes across depleted sand interval"
            active_warning = "PROXIMITY WARNING: Offset IND-NWIS-07 experienced stuck pipe at 2,480m MD"
            hazard_code = "STUCK_PIPE"
        elif 2700 <= depth_m <= 2780:
            # Barail Transition: Mechanical pack-off / tight hole
            torque = round(torque + 6.5, 1)
            rop = round(max(1.0, rop - 4.5), 1)
            status_text = "Sloughing shale and mechanical pack-off tendency observed"
            active_warning = "PROXIMITY WARNING: Offset IND-NWIS-02 reported severe pack-off at 2,740m MD"
            hazard_code = "PACK_OFF"
        elif 3080 <= depth_m <= 3160:
            # Barail Coal-Shale: Gas kick / influx
            gas = round(gas + 34.5, 1)
            pit_vol = round(pit_vol + 14.0, 1)
            spp += 140
            status_text = "Gas influx detected; flow check required immediately"
            active_warning = "CRITICAL ALERT: Offset IND-NWIS-06 took 24 bbl gas kick at 3,120m MD"
            hazard_code = "GAS_KICK"

        return {
            "well_name": self.active_well_name,
            "depth_m": round(depth_m, 1),
            "formation": form,
            "rop_m_h": rop,
            "wob_klbf": wob,
            "rpm": rpm,
            "torque_kft_lb": torque,
            "standpipe_psi": spp,
            "flow_rate_gpm": flow,
            "mud_weight_sg": mw,
            "ecd_sg": ecd,
            "gas_units": gas,
            "pit_volume_bbl": pit_vol,
            "hookload_klbf": hookload,
            "status_text": status_text,
            "active_warning": active_warning,
            "hazard_code": hazard_code,
            "provider": "SYNTHETIC_BENCHMARK",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

    def get_current_telemetry(self, depth_m: Optional[float] = None) -> Dict[str, Any]:
        if depth_m is None:
            depth_m = self._current_depth
        return self._calculate_parameters_at_depth(depth_m)

    def get_stream_chunk(self, start_depth_m: float, end_depth_m: float, step_m: float = 5.0) -> List[Dict[str, Any]]:
        points = []
        d = start_depth_m
        while d <= end_depth_m:
            points.append(self._calculate_parameters_at_depth(d))
            d += step_m
        return points


class FutureERTMACProvider(ITelemetryProvider):
    """
    Production-ready architectural adapter for future real-world eRTMAC / WITSML integration.
    Clearly marked as SIMULATED / DISCONNECTED for student prototype demonstration.
    """

    def __init__(self, endpoint_url: str = "witsml://ertmac.oil.internal/stream", rig_id: str = "RIG-ASSAM-04"):
        self.endpoint_url = endpoint_url
        self.rig_id = rig_id

    def get_provider_name(self) -> str:
        return "OIL eRTMAC Enterprise WITSML Adapter (Production Interface)"

    def get_provider_type(self) -> str:
        return "eRTMAC_ADAPTER"

    def is_connected(self) -> bool:
        # Real OIL/eRTMAC network is strictly disconnected in student environment
        return False

    def get_current_telemetry(self, depth_m: Optional[float] = None) -> Dict[str, Any]:
        return {
            "error": "Real OIL/eRTMAC operational data stream is disconnected in demonstration environment.",
            "provider": "FUTURE_eRTMAC_ADAPTER",
            "rig_id": self.rig_id,
            "status": "AWAITING_PRODUCTION_CREDENTIALS",
            "fallback_available": True
        }

    def get_stream_chunk(self, start_depth_m: float, end_depth_m: float, step_m: float = 5.0) -> List[Dict[str, Any]]:
        return []
