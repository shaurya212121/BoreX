// ============================================================================
// BoreX / NWIS: Anomaly Detection Engine
// Rule-based telemetry analysis with rolling-window statistics
// Generates Draft DDR entries for detected anomalies
// ============================================================================

import type { TelemetryReading, FormationInfo } from './assamBenchmarkData'
import { getFormationAtDepth, ASSAM_FORMATIONS } from './assamBenchmarkData'
import { ASSAM_REPORTS, ASSAM_ALERTS } from './assamBenchmarkData'
import type { DrillingReport, RiskAlert } from './supabase'

// ─── Extended Telemetry with optional hookload/overpull ──────────────────────

export interface ExtendedTelemetryReading extends TelemetryReading {
  /** Optional hookload overpull reading in klbf above baseline */
  overpullKlbf?: number
  /** Timestamp when this reading was captured */
  readingTimestamp?: string
}

// ─── Anomaly Types ───────────────────────────────────────────────────────────

export type AnomalyType =
  | 'KICK'
  | 'MUD_LOSS'
  | 'HIGH_TORQUE'
  | 'ROP_DROP'
  | 'SPP_SPIKE'
  | 'GAS_SPIKE'
  | 'OVERPULL'

export interface DetectedAnomaly {
  anomaly_type: AnomalyType
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  parameter: string
  current_value: number
  baseline_value: number
  threshold: number
}

// ─── Draft DDR Entry ─────────────────────────────────────────────────────────

export interface MatchedOffsetEvent {
  well_name: string
  well_id: string
  event_type: string
  depth_m: number
  distance_km: number
  source_document: string
  suggested_mitigation: string
}

export interface DraftDDREntry {
  id: string
  timestamp: string
  bit_depth: number
  formation: FormationInfo
  telemetry_snapshot: ExtendedTelemetryReading
  anomaly_type: AnomalyType
  anomalies: DetectedAnomaly[]
  matched_offset_events: MatchedOffsetEvent[]
  status: 'DRAFT' | 'CONFIRMED' | 'DISCARDED'
  notes: string
}

// ─── Configuration Constants ─────────────────────────────────────────────────

export interface AnomalyDetectorConfig {
  /** Rolling window size for baseline calculations */
  windowSize: number
  /** Pit volume change threshold in bbl to flag gain/loss */
  pitVolumeThresholdBbl: number
  /** Z-score threshold for torque anomaly */
  torqueZScoreThreshold: number
  /** ROP drop percentage to flag (0-1, e.g., 0.4 = 40% drop) */
  ropDropPct: number
  /** Standpipe pressure spike in psi above rolling average */
  sppSpikeThresholdPsi: number
  /** Gas spike threshold in units above rolling average */
  gasSpikeThresholdUnits: number
  /** Overpull threshold in klbf above expected hookload */
  overpullThresholdKlbf: number
  /** Depth band tolerance for matching offset events (meters) */
  depthMatchToleranceM: number
}

export const DEFAULT_CONFIG: AnomalyDetectorConfig = {
  windowSize: 10,
  pitVolumeThresholdBbl: 8.0,
  torqueZScoreThreshold: 2.0,
  ropDropPct: 0.40,
  sppSpikeThresholdPsi: 200,
  gasSpikeThresholdUnits: 10.0,
  overpullThresholdKlbf: 30,
  depthMatchToleranceM: 100,
}

// ─── Rolling Statistics Helpers ──────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const avg = mean(values)
  const sumSq = values.reduce((sum, v) => sum + (v - avg) ** 2, 0)
  return Math.sqrt(sumSq / (values.length - 1))
}

function zScore(value: number, values: number[]): number {
  const sd = stdDev(values)
  if (sd === 0) return 0
  return (value - mean(values)) / sd
}

// ─── Offset Event Matcher ────────────────────────────────────────────────────

function findMatchedOffsetEvents(
  depthM: number,
  anomalyType: AnomalyType,
  toleranceM: number
): MatchedOffsetEvent[] {
  const matchedEvents: MatchedOffsetEvent[] = []

  // Map anomaly types to report event_types
  const eventTypeMap: Record<AnomalyType, string[]> = {
    KICK: ['kick', 'overpressure'],
    MUD_LOSS: ['mud_loss'],
    HIGH_TORQUE: ['stuck_pipe', 'drilling_problem'],
    ROP_DROP: ['drilling_problem', 'stuck_pipe'],
    SPP_SPIKE: ['kick', 'mud_loss', 'drilling_problem'],
    GAS_SPIKE: ['kick', 'overpressure'],
    OVERPULL: ['stuck_pipe'],
  }

  const relevantEventTypes = eventTypeMap[anomalyType] || []

  // Search ASSAM_REPORTS for matching events within depth tolerance
  const matchingReports = ASSAM_REPORTS.filter(
    (r: DrillingReport) =>
      Math.abs(r.depth_m - depthM) <= toleranceM &&
      relevantEventTypes.includes(r.event_type)
  )

  for (const report of matchingReports) {
    // Find corresponding alert for distance info
    const alert = ASSAM_ALERTS.find(
      (a: RiskAlert) =>
        a.nearby_well_id === report.well_id &&
        Math.abs(a.matched_depth_m - report.depth_m) <= 50
    )

    matchedEvents.push({
      well_name: report.source_document.split('_')[1] || 'Unknown',
      well_id: report.well_id,
      event_type: report.event_type,
      depth_m: report.depth_m,
      distance_km: alert?.distance_km ?? 0,
      source_document: report.source_document,
      suggested_mitigation: extractMitigation(report),
    })
  }

  // Deduplicate by well_id + event_type
  const seen = new Set<string>()
  return matchedEvents.filter((e) => {
    const key = `${e.well_id}:${e.event_type}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 5) // Limit to 5 most relevant
}

function extractMitigation(report: DrillingReport): string {
  const notes = report.notes.toLowerCase()
  if (notes.includes('lcm') || notes.includes('nut-plug')) {
    return 'Stage LCM nut-plug pill as per offset well protocol. Reduce flow rate across fractured interval.'
  }
  if (notes.includes('weight') || notes.includes('mud weight') || notes.includes('sg')) {
    return 'Increase mud weight to recommended SG before entering hazard zone. Maintain active PVT monitoring.'
  }
  if (notes.includes('stuck') || notes.includes('overpull') || notes.includes('sticking')) {
    return 'Reduce hydrostatic overbalance. Keep drillstring rotating during connections. Spot diesel soak if required.'
  }
  if (notes.includes('gas') || notes.includes('kick') || notes.includes('influx')) {
    return 'Perform flow check. If positive, shut in well and implement well control procedures per IADC guidelines.'
  }
  if (notes.includes('sweep') || notes.includes('wiper')) {
    return 'Pump high-viscosity sweeps regularly. Perform short wiper trips before making connections.'
  }
  return 'Monitor parameters closely. Implement operational checklist and stage barrier pills prior to penetrating interval.'
}

// ─── Core Anomaly Detection Engine ───────────────────────────────────────────

export function analyzeRollingWindow(
  currentReading: ExtendedTelemetryReading,
  rollingWindow: ExtendedTelemetryReading[],
  config: AnomalyDetectorConfig = DEFAULT_CONFIG
): DetectedAnomaly[] {
  const anomalies: DetectedAnomaly[] = []

  if (rollingWindow.length < 3) return anomalies

  const recentPitVols = rollingWindow.map((r) => r.pitVolumeBbl)
  const recentTorques = rollingWindow.map((r) => r.torqueKftlb)
  const recentRops = rollingWindow.map((r) => r.ropMh)
  const recentSpps = rollingWindow.map((r) => r.standpipePsi)
  const recentGas = rollingWindow.map((r) => r.gasUnits)

  // ── Rule 1: Pit Volume (Kick/Mud Loss) ──
  const pitBaseline = mean(recentPitVols)
  const pitDelta = currentReading.pitVolumeBbl - pitBaseline

  if (pitDelta > config.pitVolumeThresholdBbl) {
    anomalies.push({
      anomaly_type: 'KICK',
      severity: pitDelta > config.pitVolumeThresholdBbl * 2 ? 'CRITICAL' : 'HIGH',
      description: `Pit volume gain of ${pitDelta.toFixed(1)} bbl detected — potential kick. Baseline: ${pitBaseline.toFixed(1)} bbl, Current: ${currentReading.pitVolumeBbl.toFixed(1)} bbl.`,
      parameter: 'pitVolumeBbl',
      current_value: currentReading.pitVolumeBbl,
      baseline_value: pitBaseline,
      threshold: config.pitVolumeThresholdBbl,
    })
  } else if (pitDelta < -config.pitVolumeThresholdBbl) {
    anomalies.push({
      anomaly_type: 'MUD_LOSS',
      severity: pitDelta < -config.pitVolumeThresholdBbl * 2 ? 'HIGH' : 'MEDIUM',
      description: `Pit volume loss of ${Math.abs(pitDelta).toFixed(1)} bbl detected — potential mud loss. Baseline: ${pitBaseline.toFixed(1)} bbl, Current: ${currentReading.pitVolumeBbl.toFixed(1)} bbl.`,
      parameter: 'pitVolumeBbl',
      current_value: currentReading.pitVolumeBbl,
      baseline_value: pitBaseline,
      threshold: config.pitVolumeThresholdBbl,
    })
  }

  // ── Rule 2: Torque Z-Score ──
  const torqueZ = zScore(currentReading.torqueKftlb, recentTorques)
  if (torqueZ > config.torqueZScoreThreshold) {
    anomalies.push({
      anomaly_type: 'HIGH_TORQUE',
      severity: torqueZ > config.torqueZScoreThreshold * 1.5 ? 'CRITICAL' : 'HIGH',
      description: `Torque spike detected (Z-score: ${torqueZ.toFixed(2)}). Current: ${currentReading.torqueKftlb} kft·lb vs rolling baseline: ${mean(recentTorques).toFixed(1)} kft·lb.`,
      parameter: 'torqueKftlb',
      current_value: currentReading.torqueKftlb,
      baseline_value: mean(recentTorques),
      threshold: config.torqueZScoreThreshold,
    })
  }

  // ── Rule 3: ROP Drop ──
  const ropBaseline = mean(recentRops)
  if (ropBaseline > 0) {
    const ropDropRatio = (ropBaseline - currentReading.ropMh) / ropBaseline
    if (ropDropRatio > config.ropDropPct && ropBaseline > 3) {
      anomalies.push({
        anomaly_type: 'ROP_DROP',
        severity: ropDropRatio > 0.6 ? 'HIGH' : 'MEDIUM',
        description: `Sudden ROP drop of ${(ropDropRatio * 100).toFixed(0)}%. Current: ${currentReading.ropMh.toFixed(1)} m/hr vs baseline: ${ropBaseline.toFixed(1)} m/hr.`,
        parameter: 'ropMh',
        current_value: currentReading.ropMh,
        baseline_value: ropBaseline,
        threshold: config.ropDropPct,
      })
    }
  }

  // ── Rule 4: Standpipe Pressure Spike ──
  const sppBaseline = mean(recentSpps)
  const sppDelta = currentReading.standpipePsi - sppBaseline
  if (sppDelta > config.sppSpikeThresholdPsi) {
    anomalies.push({
      anomaly_type: 'SPP_SPIKE',
      severity: sppDelta > config.sppSpikeThresholdPsi * 1.5 ? 'HIGH' : 'MEDIUM',
      description: `Standpipe pressure spike of ${sppDelta.toFixed(0)} psi. Current: ${currentReading.standpipePsi} psi vs baseline: ${sppBaseline.toFixed(0)} psi.`,
      parameter: 'standpipePsi',
      current_value: currentReading.standpipePsi,
      baseline_value: sppBaseline,
      threshold: config.sppSpikeThresholdPsi,
    })
  }

  // ── Rule 5: Gas Spike ──
  const gasBaseline = mean(recentGas)
  const gasDelta = currentReading.gasUnits - gasBaseline
  if (gasDelta > config.gasSpikeThresholdUnits) {
    anomalies.push({
      anomaly_type: 'GAS_SPIKE',
      severity: gasDelta > config.gasSpikeThresholdUnits * 2 ? 'CRITICAL' : 'HIGH',
      description: `Gas spike of ${gasDelta.toFixed(1)} units above baseline. Current: ${currentReading.gasUnits} units vs baseline: ${gasBaseline.toFixed(1)} units.`,
      parameter: 'gasUnits',
      current_value: currentReading.gasUnits,
      baseline_value: gasBaseline,
      threshold: config.gasSpikeThresholdUnits,
    })
  }

  // ── Rule 6: Overpull (if field present) ──
  if (currentReading.overpullKlbf !== undefined && currentReading.overpullKlbf > config.overpullThresholdKlbf) {
    anomalies.push({
      anomaly_type: 'OVERPULL',
      severity: currentReading.overpullKlbf > config.overpullThresholdKlbf * 2 ? 'CRITICAL' : 'HIGH',
      description: `Overpull of ${currentReading.overpullKlbf.toFixed(0)} klbf detected — potential stuck pipe condition.`,
      parameter: 'overpullKlbf',
      current_value: currentReading.overpullKlbf,
      baseline_value: 0,
      threshold: config.overpullThresholdKlbf,
    })
  }

  return anomalies
}

// ─── Draft DDR Generator ─────────────────────────────────────────────────────

let ddrCounter = 0

export function generateDraftDDR(
  anomalies: DetectedAnomaly[],
  reading: ExtendedTelemetryReading,
  config: AnomalyDetectorConfig = DEFAULT_CONFIG
): DraftDDREntry | null {
  if (anomalies.length === 0) return null

  // Use the highest severity anomaly as the primary
  const primaryAnomaly = anomalies.sort((a, b) => {
    const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    return sevOrder[a.severity] - sevOrder[b.severity]
  })[0]

  const formation = getFormationAtDepth(reading.depthM)
  const matchedEvents = findMatchedOffsetEvents(
    reading.depthM,
    primaryAnomaly.anomaly_type,
    config.depthMatchToleranceM
  )

  ddrCounter++
  const id = `draft-ddr-${Date.now()}-${ddrCounter}`

  return {
    id,
    timestamp: reading.readingTimestamp || new Date().toISOString(),
    bit_depth: reading.depthM,
    formation,
    telemetry_snapshot: { ...reading },
    anomaly_type: primaryAnomaly.anomaly_type,
    anomalies,
    matched_offset_events: matchedEvents,
    status: 'DRAFT',
    notes: '',
  }
}

// ─── Anomaly Type Display Helpers ────────────────────────────────────────────

export const ANOMALY_TYPE_LABELS: Record<AnomalyType, string> = {
  KICK: 'Well Control / Kick',
  MUD_LOSS: 'Mud / Circulation Loss',
  HIGH_TORQUE: 'High Torque / Stuck Pipe',
  ROP_DROP: 'Sudden ROP Drop',
  SPP_SPIKE: 'Standpipe Pressure Spike',
  GAS_SPIKE: 'Gas Influx Spike',
  OVERPULL: 'Hookload Overpull',
}

export const ANOMALY_TYPE_COLORS: Record<AnomalyType, string> = {
  KICK: '#F43F5E',
  MUD_LOSS: '#F59E0B',
  HIGH_TORQUE: '#8B5CF6',
  ROP_DROP: '#0EA5E9',
  SPP_SPIKE: '#EF4444',
  GAS_SPIKE: '#F43F5E',
  OVERPULL: '#A78BFA',
}
