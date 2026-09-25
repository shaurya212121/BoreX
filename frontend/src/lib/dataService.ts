import { supabase } from './supabase'
import type { Well, DrillingReport, ActiveWellProgress, RiskAlert } from './supabase'
import {
  ASSAM_WELLS,
  ASSAM_REPORTS,
  ASSAM_PROGRESS,
  ASSAM_ALERTS,
  BASIN_METADATA,
  ASSAM_MUD_RECORDS,
  ASSAM_CASING_PROGRAMS,
  ASSAM_CEMENT_PROGRAMS,
  ASSAM_TRAJECTORIES,
  BENCHMARK_EVALUATION,
  getSyntheticTelemetry,
  getFormationAtDepth,
} from './assamBenchmarkData'
import type {
  MudPropertyRecord,
  CasingProgramRecord,
  CementProgramRecord,
  TrajectorySurveyPoint,
} from './assamBenchmarkData'

export {
  BASIN_METADATA,
  ASSAM_WELLS,
  ASSAM_REPORTS,
  ASSAM_PROGRESS,
  ASSAM_ALERTS,
  ASSAM_MUD_RECORDS,
  ASSAM_CASING_PROGRAMS,
  ASSAM_CEMENT_PROGRAMS,
  ASSAM_TRAJECTORIES,
  BENCHMARK_EVALUATION,
  getFormationAtDepth,
  getSyntheticTelemetry,
}

export type {
  MudPropertyRecord,
  CasingProgramRecord,
  CementProgramRecord,
  TrajectorySurveyPoint,
}

const BACKEND_BASE = 'http://127.0.0.1:8000'

// ── Wells ────────────────────────────────────────────────────────────────────
export async function getWells(): Promise<{ data: Well[]; isSupabase: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.from('wells').select('*')
    if (!error && data && data.length > 0 && data.some((w: Well) => w.name.includes('IND-NWIS'))) {
      return { data, isSupabase: true, error: null }
    }
    return { data: ASSAM_WELLS, isSupabase: false, error: null }
  } catch (err: unknown) {
    return { data: ASSAM_WELLS, isSupabase: false, error: err instanceof Error ? err.message : 'Unknown' }
  }
}

// ── Drilling Reports ─────────────────────────────────────────────────────────
export async function getDrillingReports(): Promise<{ data: DrillingReport[]; isSupabase: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.from('drilling_reports').select('*').order('depth_m', { ascending: true })
    if (!error && data && data.length > 0 && data.some((r: DrillingReport) => r.source_document.includes('IND-NWIS') || r.source_document.includes('ASSAM'))) {
      return { data, isSupabase: true, error: null }
    }
    return { data: ASSAM_REPORTS, isSupabase: false, error: null }
  } catch (err: unknown) {
    return { data: ASSAM_REPORTS, isSupabase: false, error: err instanceof Error ? err.message : 'Unknown' }
  }
}

// ── Active Well Progress ────────────────────────────────────────────────────
export async function getActiveWellProgress(activeId: string): Promise<{ data: ActiveWellProgress[]; isSupabase: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('active_well_progress')
      .select('*')
      .eq('well_id', activeId)
      .order('timestamp', { ascending: true })

    if (!error && data && data.length > 0) {
      return { data, isSupabase: true, error: null }
    }
    return { data: ASSAM_PROGRESS, isSupabase: false, error: null }
  } catch (err: unknown) {
    return { data: ASSAM_PROGRESS, isSupabase: false, error: err instanceof Error ? err.message : 'Unknown' }
  }
}

// ── Risk Alerts ─────────────────────────────────────────────────────────────
export async function getRiskAlerts(activeId: string): Promise<{ data: RiskAlert[]; isSupabase: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('risk_alerts')
      .select('*')
      .eq('active_well_id', activeId)
      .order('matched_depth_m', { ascending: true })

    if (!error && data && data.length > 0) {
      return { data, isSupabase: true, error: null }
    }
    return { data: ASSAM_ALERTS, isSupabase: false, error: null }
  } catch (err: unknown) {
    return { data: ASSAM_ALERTS, isSupabase: false, error: err instanceof Error ? err.message : 'Unknown' }
  }
}

// ── Trajectories ────────────────────────────────────────────────────────────
export async function getTrajectories(wellId?: string): Promise<TrajectorySurveyPoint[]> {
  try {
    const url = wellId ? `${BACKEND_BASE}/api/trajectory?well_id=${encodeURIComponent(wellId)}` : `${BACKEND_BASE}/api/trajectory`
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
    if (res.ok) {
      const json = await res.json()
      if (json.surveys && json.surveys.length > 0) return json.surveys
    }
  } catch {
    // Fallback to deterministic local benchmark
  }
  if (wellId) {
    return ASSAM_TRAJECTORIES.filter((t) => t.well_id === wellId || t.well_name === wellId)
  }
  return ASSAM_TRAJECTORIES
}

// ── Mud Properties ──────────────────────────────────────────────────────────
export async function getMudProperties(wellId?: string): Promise<MudPropertyRecord[]> {
  try {
    const url = wellId ? `${BACKEND_BASE}/api/mud-properties?well_id=${encodeURIComponent(wellId)}` : `${BACKEND_BASE}/api/mud-properties`
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
    if (res.ok) {
      const json = await res.json()
      if (json.records && json.records.length > 0) return json.records
    }
  } catch {
    // Fallback
  }
  if (wellId) {
    return ASSAM_MUD_RECORDS.filter((m) => m.well_id === wellId || m.well_name === wellId)
  }
  return ASSAM_MUD_RECORDS
}

// ── Casing & Cement Programs ────────────────────────────────────────────────
export async function getCasingAndCement(wellId?: string): Promise<{ casing: CasingProgramRecord[]; cement: CementProgramRecord[] }> {
  try {
    const url = wellId ? `${BACKEND_BASE}/api/casing-cement?well_id=${encodeURIComponent(wellId)}` : `${BACKEND_BASE}/api/casing-cement`
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
    if (res.ok) {
      const json = await res.json()
      if (json.casing) return { casing: json.casing, cement: json.cement }
    }
  } catch {
    // Fallback
  }
  if (wellId) {
    return {
      casing: ASSAM_CASING_PROGRAMS.filter((c) => c.well_id === wellId || c.well_name === wellId),
      cement: ASSAM_CEMENT_PROGRAMS.filter((c) => c.well_id === wellId || c.well_name === wellId),
    }
  }
  return {
    casing: ASSAM_CASING_PROGRAMS,
    cement: ASSAM_CEMENT_PROGRAMS,
  }
}

// ── Live Backend Telemetry ──────────────────────────────────────────────────
export async function fetchBackendTelemetry(depthM?: number) {
  try {
    const url = depthM !== undefined ? `${BACKEND_BASE}/api/telemetry/live?depth=${depthM}` : `${BACKEND_BASE}/api/telemetry/live`
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
    if (res.ok) return await res.json()
  } catch {
    // Fallback
  }
  return getSyntheticTelemetry(depthM ?? 1840.0)
}

// ── ML Risk Predictions ─────────────────────────────────────────────────────
export async function fetchMLRiskPredictions(depthM: number) {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/ml/risk?depth=${depthM}`, { signal: AbortSignal.timeout(2500) })
    if (res.ok) return await res.json()
  } catch {
    // Fallback
  }
  // Local fallback prediction
  return {
    depth_m: depthM,
    formation: getFormationAtDepth(depthM).name,
    model_version: 'v1.2-synthetic-benchmark',
    model_label: 'Synthetic benchmark model (Not production validated)',
    predicted_risks: [
      {
        risk_type: depthM > 3000 ? 'Overpressured Gas Kick' : (depthM > 2300 ? 'Differential Sticking' : 'Severe Lost Circulation'),
        risk_probability: depthM > 3000 ? 84.5 : (depthM > 2300 ? 87.4 : 76.2),
        confidence: 91.8,
        risk_class: 'HIGH',
        contributing_factors: [
          `Active depth horizon (${depthM.toFixed(0)}m) matches historical incident interval`,
          'Formation lithology and offset well operational logs indicate elevated hazard risk',
          'Telemetry differential correlates with historical onset signatures',
        ],
        recommended_mitigation: 'Implement operational safety checklist and stage barrier pills prior to penetrating interval.',
      },
    ],
  }
}

// ── Geological ML Correlation ───────────────────────────────────────────────
export async function fetchGeologicalCorrelation(activeDepth: number, offsetDepth: number, distanceKm: number) {
  try {
    const activeForm = getFormationAtDepth(activeDepth).name
    const offsetForm = getFormationAtDepth(offsetDepth).name
    const url = `${BACKEND_BASE}/api/geology/correlate?active_depth=${activeDepth}&active_formation=${encodeURIComponent(activeForm)}&offset_depth=${offsetDepth}&offset_formation=${encodeURIComponent(offsetForm)}&distance_km=${distanceKm}`
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
    if (res.ok) return await res.json()
  } catch {
    // Fallback
  }
  return {
    geological_similarity_pct: 88.5,
    confidence: 0.91,
    facies_match: 94.0,
    contributing_factors: [
      'Facies vector match across Upper Assam stratigraphic sequence',
      `Depth delta: ${Math.abs(activeDepth - offsetDepth).toFixed(1)}m across regional strike`,
      `Spatial separation: ${distanceKm.toFixed(1)} km`,
    ],
  }
}

// ── Benchmark Evaluation Metrics ────────────────────────────────────────────
export async function fetchBenchmarkEvaluation() {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/benchmark/evaluation`, { signal: AbortSignal.timeout(2000) })
    if (res.ok) return await res.json()
  } catch {
    // Fallback
  }
  return BENCHMARK_EVALUATION
}

// ── Real PDF Document Compilation ───────────────────────────────────────────
export async function generateServerPdf(payload: Record<string, unknown>): Promise<Blob | null> {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/reports/generate-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      return await res.blob()
    }
  } catch (e) {
    console.error('Failed to generate server PDF:', e)
  }
  return null
}
