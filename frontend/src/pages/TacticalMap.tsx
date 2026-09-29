import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  AlertTriangle,
  ShieldAlert,
  X,
  Target,
  RotateCcw,
  CheckCircle2,
  Key,
  MapPin,
  Download,
  Loader2,
  Clock,
  Crosshair,
  Layers,
  Gauge,
  Droplets,
  Wrench,
  FileText,
} from 'lucide-react'
import type { Well, ActiveWellProgress, RiskAlert, DrillingReport } from '../lib/supabase'
import { getWells, getActiveWellProgress, getRiskAlerts, generateServerPdf, getCasingAndCement, getMudProperties, ASSAM_REPORTS, ASSAM_ALERTS } from '../lib/dataService'
import { getFormationAtDepth, ASSAM_FORMATIONS, getSyntheticTelemetry } from '../lib/assamBenchmarkData'
import type { FormationInfo, CasingProgramRecord, CementProgramRecord, MudPropertyRecord } from '../lib/assamBenchmarkData'
import { useDDRStore } from '../lib/ddrStore'
import { analyzeRollingWindow, generateDraftDDR, ANOMALY_TYPE_LABELS } from '../lib/anomalyDetector'
import type { ExtendedTelemetryReading } from '../lib/anomalyDetector'

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const ACTIVE_WELL_KEY = 'ACTIVE: IND-NWIS-01'

const mapApiKey: string = import.meta.env.VITE_MAP_API_KEY || import.meta.env.VITE_MAPS_API_KEY || 'cb1_3ygq_1_566c1fe0e6827f317aeb61d2'
const cartoKeyParam = mapApiKey ? `?key=${mapApiKey}` : ''

// Basemap Providers with Authenticated CARTO & Satellite Basemaps
const BASEMAP_PROVIDERS = {
  DARK: {
    name: 'Subsurface Dark Matter (CARTO)',
    url: `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png${cartoKeyParam}`,
    subdomains: 'abcd',
    attribution: '&copy; CARTO, OpenStreetMap',
    label: 'Dark Subsurface',
  },
  VOYAGER: {
    name: 'Geospatial Topo & Roads (CARTO)',
    url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png${cartoKeyParam}`,
    subdomains: 'abcd',
    attribution: '&copy; CARTO, OpenStreetMap',
    label: 'Geospatial Topo',
  },
  SATELLITE: {
    name: 'Satellite Topo & Surface Relief',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    subdomains: '',
    attribution: 'Esri, Maxar, Earthstar Geographics',
    label: 'Satellite Topo',
  },
  LIGHT: {
    name: 'Subsurface Light (Positron)',
    url: `https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png${cartoKeyParam}`,
    subdomains: 'abcd',
    attribution: '&copy; CARTO, OpenStreetMap',
    label: 'Subsurface Light',
  },
}

type BasemapKey = keyof typeof BASEMAP_PROVIDERS

// ── Custom Proposed Well Icon ──
const proposedWellIcon = L.divIcon({
  className: 'proposed-well-icon',
  html: `<div style="
    width: 24px; height: 24px; 
    background: linear-gradient(135deg, #a78bfa, #7c3aed);
    border: 3px solid #fff; 
    border-radius: 50%; 
    box-shadow: 0 0 16px rgba(167,139,250,0.7), 0 0 32px rgba(167,139,250,0.3);
    animation: pulse-proposed 2s infinite;
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

// ── Proposed Well coordinates type ──
interface ProposedWellCoords {
  lat: number
  lon: number
}

// ── Depth band for trouble grouping ──
interface TroubleDepthBand {
  event_type: string
  depthBand: string
  depthMin: number
  depthMax: number
  count: number
  nearestDistanceKm: number
}

// ── Leaflet Auto-Resize & Viewport Controller ──
function MapController({ center }: { center: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    // Invalidate size immediately and after layout stabilization
    map.invalidateSize()
    const t1 = setTimeout(() => map.invalidateSize(), 150)
    const t2 = setTimeout(() => map.invalidateSize(), 500)

    const handleResize = () => map.invalidateSize()
    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', handleResize)
    }
  }, [map])

  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])

  return null
}

// ── Map Click Handler Component ──
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// ─── Hazard Time Estimation ─────────────────────────────────────────────────

interface UpcomingHazard {
  alert: RiskAlert
  metresToGo: number
  timeMinEst: string
  timeMaxEst: string
  timeBestEst: string
  progressPct: number
  isUrgent: boolean // < 1 hour at best estimate
}

export default function TacticalMap() {
  const [wells, setWells] = useState<Well[]>([])
  const [activeWell, setActiveWell] = useState<Well | null>(null)
  const [selectedWell, setSelectedWell] = useState<Well | null>(null)
  const [allAlerts, setAllAlerts] = useState<RiskAlert[]>([])
  const [progress, setProgress] = useState<ActiveWellProgress[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [searchRadiusKm, setSearchRadiusKm] = useState(80)
  const [activeBasemap, setActiveBasemap] = useState<BasemapKey>('DARK')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Phase 1: Proposed Well State ──
  const [proposedWell, setProposedWell] = useState<ProposedWellCoords | null>(null)
  const [proposedWellPanelOpen, setProposedWellPanelOpen] = useState(false)
  const [proposedWellCasing, setProposedWellCasing] = useState<{ casing: CasingProgramRecord[]; cement: CementProgramRecord[] }>({ casing: [], cement: [] })
  const [proposedWellMud, setProposedWellMud] = useState<MudPropertyRecord[]>([])
  const [generatingPreSpud, setGeneratingPreSpud] = useState(false)

  // ── Phase 2: Anomaly Detection Telemetry Window ──
  const telemetryWindowRef = useRef<ExtendedTelemetryReading[]>([])
  const { addDraft } = useDDRStore()

  // ── Load Data ──
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const { data: ws, error: wsError } = await getWells()
        if (wsError) throw new Error(wsError)
        setWells(ws)

        const active = ws.find((w: Well) => w.name.includes('IND-NWIS-01') || w.name === ACTIVE_WELL_KEY) || ws[0]
        setActiveWell(active || null)

        if (active) {
          const [progRes, alertsRes] = await Promise.all([
            getActiveWellProgress(active.id),
            getRiskAlerts(active.id),
          ])

          if (progRes.error) throw new Error(progRes.error)
          if (alertsRes.error) throw new Error(alertsRes.error)

          setProgress(progRes.data)
          setAllAlerts(alertsRes.data)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Database query error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Scrubber Playback ──
  const tick = useCallback(() => {
    setCurrentIdx((i) => {
      if (i >= progress.length - 1) { setPlaying(false); return i }
      return i + 1
    })
  }, [progress.length])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (playing) intervalRef.current = setInterval(tick, 500 / speed)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing, speed, tick])

  const currentDepth = progress[currentIdx]?.current_depth_m ?? 2480
  const maxDepth = activeWell?.total_depth_m ?? 3650
  const currentFormation = getFormationAtDepth(currentDepth)

  // ── Phase 2: Run anomaly detection on depth change ──
  useEffect(() => {
    const telemetry = getSyntheticTelemetry(currentDepth) as ExtendedTelemetryReading
    telemetry.readingTimestamp = new Date().toISOString()

    const window = telemetryWindowRef.current
    window.push(telemetry)
    if (window.length > 15) window.shift()

    if (window.length >= 5) {
      const anomalies = analyzeRollingWindow(telemetry, window.slice(0, -1))
      if (anomalies.length > 0) {
        const draft = generateDraftDDR(anomalies, telemetry)
        if (draft) {
          addDraft(draft)
        }
      }
    }
  }, [currentDepth, addDraft])

  // ── Get current telemetry for "Time to Hazard" panel ──
  const currentTelemetry = useMemo(() => getSyntheticTelemetry(currentDepth), [currentDepth])

  // Alerts visible at current depth with a lookahead window
  const visibleAlerts = allAlerts.filter(
    (a) =>
      a.matched_depth_m <= currentDepth + 60 &&
      a.matched_depth_m >= currentDepth - 120 &&
      a.distance_km <= searchRadiusKm
  )

  const activeWellId = activeWell?.id
  const offsetWellsInRadius = wells.filter((w) => {
    if (w.id === activeWellId) return false
    if (!activeWell) return true
    return haversineKm(activeWell.lat, activeWell.lon, w.lat, w.lon) <= searchRadiusKm
  })

  const riskyWellIds = new Set(visibleAlerts.map((a) => a.nearby_well_id))
  const riskyWellsInRadiusCount = offsetWellsInRadius.filter((w) => riskyWellIds.has(w.id)).length

  // ── Phase 1: Proposed Well offset wells ──
  const proposedOffsetWells = useMemo(() => {
    if (!proposedWell) return []
    return wells.filter((w) => {
      const dist = haversineKm(proposedWell.lat, proposedWell.lon, w.lat, w.lon)
      return dist <= searchRadiusKm && dist > 0
    }).map((w) => ({
      ...w,
      distanceKm: haversineKm(proposedWell!.lat, proposedWell!.lon, w.lat, w.lon),
    })).sort((a, b) => a.distanceKm - b.distanceKm)
  }, [proposedWell, wells, searchRadiusKm])

  // ── Phase 1: Expected Formation Tops (distance-weighted) ──
  const expectedFormationTops = useMemo(() => {
    // Use ASSAM_FORMATIONS as fallback / baseline
    return ASSAM_FORMATIONS.map((f) => ({
      name: f.name,
      expectedTopM: f.topM,
      expectedBottomM: f.bottomM,
      lithology: f.lithology,
      hazards: f.primaryHazards,
    }))
  }, [])

  // ── Phase 1: Historical Trouble Depths ──
  const troubleDepthBands = useMemo((): TroubleDepthBand[] => {
    if (!proposedWell || proposedOffsetWells.length === 0) return []
    const offsetIds = new Set(proposedOffsetWells.map((w) => w.id))
    const relevantReports = ASSAM_REPORTS.filter((r: DrillingReport) => offsetIds.has(r.well_id))

    // Group by event_type and 500m depth bands
    const bandMap = new Map<string, TroubleDepthBand>()
    for (const r of relevantReports) {
      const bandStart = Math.floor(r.depth_m / 500) * 500
      const bandEnd = bandStart + 500
      const key = `${r.event_type}:${bandStart}-${bandEnd}`
      const offsetWell = proposedOffsetWells.find((w) => w.id === r.well_id)
      const dist = offsetWell?.distanceKm ?? 999

      if (bandMap.has(key)) {
        const existing = bandMap.get(key)!
        existing.count++
        existing.nearestDistanceKm = Math.min(existing.nearestDistanceKm, dist)
      } else {
        bandMap.set(key, {
          event_type: r.event_type,
          depthBand: `${bandStart}–${bandEnd}m`,
          depthMin: bandStart,
          depthMax: bandEnd,
          count: 1,
          nearestDistanceKm: dist,
        })
      }
    }

    return Array.from(bandMap.values()).sort((a, b) => a.depthMin - b.depthMin)
  }, [proposedWell, proposedOffsetWells])

  // ── Phase 1: Load casing & mud for nearest offset ──
  useEffect(() => {
    if (!proposedWell || proposedOffsetWells.length === 0) return
    const nearestWell = proposedOffsetWells[0]

    async function loadAnalog() {
      const [casingRes, mudRes] = await Promise.all([
        getCasingAndCement(nearestWell.id),
        getMudProperties(nearestWell.id),
      ])
      setProposedWellCasing(casingRes)
      setProposedWellMud(mudRes)
    }
    loadAnalog()
  }, [proposedWell, proposedOffsetWells])

  // ── Phase 1: Map click handler ──
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setProposedWell({ lat, lon: lng })
    setProposedWellPanelOpen(true)
    setSelectedWell(null) // Close existing well panel
  }, [])

  // ── Phase 1: Pre-Spud Brief Download ──
  const handlePreSpudDownload = useCallback(async () => {
    if (!proposedWell) return
    setGeneratingPreSpud(true)

    try {
      const payload = {
        type: 'PRE_SPUD_BRIEF',
        proposed_well: {
          lat: proposedWell.lat,
          lon: proposedWell.lon,
        },
        offset_wells: proposedOffsetWells.slice(0, 8).map((w) => ({
          name: w.name,
          distance_km: w.distanceKm,
          total_depth_m: w.total_depth_m,
        })),
        expected_formations: expectedFormationTops,
        trouble_depth_bands: troubleDepthBands,
        casing_program: proposedWellCasing.casing.slice(0, 5),
        mud_program: proposedWellMud.slice(0, 5),
        generated_at: new Date().toISOString(),
      }

      const blob = await generateServerPdf(payload)
      if (blob) {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `BoreX_PreSpud_Brief_${proposedWell.lat.toFixed(3)}_${proposedWell.lon.toFixed(3)}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        return
      }

      // Fallback: client-side print
      window.print()
    } catch {
      // Fallback: trigger browser print
      window.print()
    } finally {
      setGeneratingPreSpud(false)
    }
  }, [proposedWell, proposedOffsetWells, expectedFormationTops, troubleDepthBands, proposedWellCasing, proposedWellMud])

  // ── Phase 4: Time to Hazard (upcoming hazards beyond current depth) ──
  const upcomingHazards = useMemo((): UpcomingHazard[] => {
    const currentRop = currentTelemetry.ropMh
    const window = telemetryWindowRef.current
    const recentRops = window.length >= 2 ? window.slice(-10).map((r) => r.ropMh) : [currentRop]
    const minRop = Math.max(1, Math.min(...recentRops))
    const maxRop = Math.max(1, Math.max(...recentRops))

    // Find unique alerts ahead (matched_depth_m > currentDepth)
    const ahead = allAlerts
      .filter((a) => a.matched_depth_m > currentDepth && a.distance_km <= searchRadiusKm)
      .sort((a, b) => a.matched_depth_m - b.matched_depth_m)

    // Deduplicate by depth band
    const seen = new Set<string>()
    const unique: RiskAlert[] = []
    for (const a of ahead) {
      const band = `${Math.floor(a.matched_depth_m / 50)}-${a.event_type}`
      if (!seen.has(band)) {
        seen.add(band)
        unique.push(a)
      }
    }

    return unique.slice(0, 3).map((alert) => {
      const metresToGo = alert.matched_depth_m - currentDepth
      const timeBestHrs = currentRop > 0 ? metresToGo / currentRop : Infinity
      const timeMinHrs = maxRop > 0 ? metresToGo / maxRop : Infinity
      const timeMaxHrs = minRop > 0 ? metresToGo / minRop : Infinity
      const maxVisibleDepth = Math.max(currentDepth + 300, alert.matched_depth_m)
      const progressPct = Math.min(100, Math.max(0, ((alert.matched_depth_m - currentDepth) / (maxVisibleDepth - currentDepth)) * 100))

      const formatTime = (hrs: number) => {
        if (!isFinite(hrs)) return '∞'
        if (hrs < 1) return `${Math.round(hrs * 60)}min`
        return `${hrs.toFixed(1)}hr`
      }

      return {
        alert,
        metresToGo,
        timeMinEst: formatTime(timeMinHrs),
        timeMaxEst: formatTime(timeMaxHrs),
        timeBestEst: formatTime(timeBestHrs),
        progressPct: 100 - progressPct,
        isUrgent: timeBestHrs < 1,
      }
    })
  }, [allAlerts, currentDepth, currentTelemetry, searchRadiusKm])

  function getWellMarkerStyle(well: Well) {
    const isSelected = selectedWell?.id === well.id
    const isRisky = riskyWellIds.has(well.id)

    if (isSelected) {
      return { color: '#38BDF8', fillColor: '#38BDF8', radius: 10, weight: 3, fillOpacity: 0.9 }
    }
    if (isRisky) {
      const alert = visibleAlerts.find((a) => a.nearby_well_id === well.id)
      const color = alert?.severity === 'CRITICAL' ? '#F43F5E' : '#F59E0B'
      return { color: color, fillColor: color, radius: 8, weight: 2, fillOpacity: 0.85 }
    }
    return { color: '#0EA5E9', fillColor: '#0EA5E9', radius: 6, weight: 1.5, fillOpacity: 0.75 }
  }

  // Check if well is a proposed offset well (highlighted)
  function isProposedOffset(well: Well): boolean {
    if (!proposedWell) return false
    return proposedOffsetWells.some((w) => w.id === well.id)
  }

  function getProposedOffsetStyle(well: Well) {
    if (isProposedOffset(well)) {
      return { color: '#A78BFA', fillColor: '#A78BFA', radius: 8, weight: 2.5, fillOpacity: 0.85 }
    }
    return null
  }

  const center: [number, number] = activeWell ? [activeWell.lat, activeWell.lon] : [27.3250, 95.3180]
  const currentProvider = BASEMAP_PROVIDERS[activeBasemap]

  // Well selected details
  const selectedWellAlerts = selectedWell ? allAlerts.filter((a) => a.nearby_well_id === selectedWell.id) : []
  const selectedWellDist = selectedWell && activeWell ? haversineKm(activeWell.lat, activeWell.lon, selectedWell.lat, selectedWell.lon) : null

  // Event type label mapping
  const eventLabel = (et: string) => {
    const map: Record<string, string> = {
      kick: 'Well Control / Kick',
      stuck_pipe: 'Stuck Pipe',
      overpressure: 'Overpressure',
      mud_loss: 'Mud / Circ. Loss',
      cementing: 'Cementing Issue',
      drilling_problem: 'Hole Instability',
      normal: 'Routine',
    }
    return map[et] || et
  }

  return (
    <div className="flex flex-col h-full w-full text-foreground select-none relative overflow-hidden print-container" style={{ background: '#050508' }}>
      {/* ── Top Floating Tactical HUD ── */}
      <div className="absolute top-5 left-5 right-5 sm:top-6 sm:left-6 sm:right-6 z-[1000] flex flex-wrap items-center justify-between gap-3.5 pointer-events-none print-hide">
        {/* Left Stats Pill */}
        <div className="pointer-events-auto flex items-center gap-3.5 glass px-4.5 py-3 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2.5 pr-3.5 border-r border-hairline">
            <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span></span>
            <div className="flex flex-col">
              <span className="text-[10px] text-text-muted font-medium uppercase tracking-[0.15em]">Active Horizon</span>
              <span className="font-mono text-sm font-bold text-foreground">
                {currentDepth.toFixed(0)}m <span className="text-xs text-text-muted font-normal font-sans">({currentFormation.name})</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 text-xs">
            <div className="flex items-center gap-1.5 text-text-muted">
              <Target size={14} className="text-primary-glow" />
              <span><strong className="text-foreground">{offsetWellsInRadius.length}</strong> offsets in {searchRadiusKm}km</span>
            </div>
            <div className="h-4 w-[1px] bg-hairline" />
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={14} className={riskyWellsInRadiusCount > 0 ? 'text-danger' : 'text-accent'} />
              <span className={riskyWellsInRadiusCount > 0 ? 'text-danger font-semibold' : 'text-accent font-medium'}>
                {riskyWellsInRadiusCount > 0 ? `${riskyWellsInRadiusCount} hazard correlation(s)` : 'No active proximity hazards'}
              </span>
            </div>
            {proposedWell && (
              <>
                <div className="h-4 w-[1px] bg-hairline" />
                <div className="flex items-center gap-1.5 text-accent-warm">
                  <MapPin size={14} />
                  <span className="font-semibold">Proposed Well Active</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Controls: Key Status, Radius & Basemap Selector */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {mapApiKey && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-accent text-xs font-mono shadow-xl">
              <Key size={13} className="text-accent" />
              <span>Map Key: Configured</span>
            </div>
          )}

          {/* Radius Selector */}
          <div className="flex items-center gap-1 glass p-1 rounded-xl shadow-xl">
            <span className="text-[10px] text-text-muted font-medium px-2">Radius:</span>
            {[25, 50, 80, 120].map((r) => (
              <button
                key={r}
                onClick={() => setSearchRadiusKm(r)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all duration-300 font-mono ${
                  searchRadiusKm === r
                    ? 'bg-primary/90 text-white font-semibold shadow-sm shadow-primary/20'
                    : 'text-text-muted hover:text-foreground hover:bg-white/[0.05]'
                }`}
              >
                {r}km
              </button>
            ))}
          </div>

          {/* Basemap Toggle */}
          <div className="flex items-center gap-1 glass p-1 rounded-xl shadow-xl">
            {(Object.keys(BASEMAP_PROVIDERS) as BasemapKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveBasemap(key)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all duration-300 ${
                  activeBasemap === key
                    ? 'bg-white/[0.08] text-primary-glow font-semibold border border-hairline-light'
                    : 'text-text-muted hover:text-foreground'
                }`}
              >
                {BASEMAP_PROVIDERS[key].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Map Canvas ── */}
      <div className="flex-1 w-full h-full relative">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4" style={{ background: '#050508' }}>
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-0 w-12 h-12 rounded-full bg-primary/5 blur-xl" />
            </div>
            <p className="text-xs text-text-muted font-mono tracking-wider">Loading Assam Basin Offset Geometry...</p>
          </div>
        ) : error ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-danger p-6 text-center" style={{ background: '#050508' }}>
            <AlertTriangle size={36} />
            <div className="font-grotesk font-semibold text-sm">Map Initialization Error</div>
            <div className="text-xs text-text-muted max-w-sm">{error}</div>
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={10}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%' }}
            className="w-full h-full"
          >
            <MapController center={center} />
            <MapClickHandler onMapClick={handleMapClick} />

            <TileLayer
              key={`${activeBasemap}-${currentProvider.url}`}
              url={currentProvider.url}
              subdomains={currentProvider.subdomains}
              attribution={currentProvider.attribution}
            />

            {/* Proximity Perimeter Circle */}
            {activeWell && (
              <>
                <Circle
                  center={[activeWell.lat, activeWell.lon]}
                  radius={searchRadiusKm * 1000}
                  pathOptions={{
                    color: '#38BDF8',
                    weight: 1.5,
                    fillOpacity: 0.03,
                    dashArray: '6 8',
                  }}
                />
                <Circle
                  center={[activeWell.lat, activeWell.lon]}
                  radius={25000}
                  pathOptions={{
                    color: '#0284C7',
                    weight: 1,
                    fillOpacity: 0.02,
                    dashArray: '3 6',
                  }}
                />
              </>
            )}

            {/* Proposed Well Proximity Circle */}
            {proposedWell && (
              <>
                <Circle
                  center={[proposedWell.lat, proposedWell.lon]}
                  radius={searchRadiusKm * 1000}
                  pathOptions={{
                    color: '#A78BFA',
                    weight: 1.5,
                    fillOpacity: 0.04,
                    dashArray: '4 6',
                  }}
                />
                <Marker
                  position={[proposedWell.lat, proposedWell.lon]}
                  icon={proposedWellIcon}
                >
                  <Popup className="nwis-popup">
                    <div className="p-1 min-w-[200px]">
                      <div className="flex items-center gap-2 font-bold text-xs mb-1" style={{ color: '#A78BFA' }}>
                        <MapPin size={14} />
                        PROPOSED WELL
                      </div>
                      <div className="text-xs text-slate-300 space-y-1">
                        <div>Lat: <span className="font-mono">{proposedWell.lat.toFixed(4)}°N</span></div>
                        <div>Lon: <span className="font-mono">{proposedWell.lon.toFixed(4)}°E</span></div>
                        <div>Offsets in range: <strong>{proposedOffsetWells.length}</strong></div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}

            {/* Offset Wells */}
            {offsetWellsInRadius.map((w) => {
              const distance = activeWell ? haversineKm(activeWell.lat, activeWell.lon, w.lat, w.lon) : 0
              const isRisky = riskyWellIds.has(w.id)
              const proposedStyle = getProposedOffsetStyle(w)
              const markerStyle = proposedStyle || getWellMarkerStyle(w)
              const wellAlerts = visibleAlerts.filter((a) => a.nearby_well_id === w.id)

              return (
                <CircleMarker
                  key={w.id}
                  center={[w.lat, w.lon]}
                  radius={markerStyle.radius}
                  eventHandlers={{
                    click: () => setSelectedWell(w),
                  }}
                  pathOptions={{
                    color: markerStyle.color,
                    fillColor: markerStyle.fillColor,
                    fillOpacity: markerStyle.fillOpacity,
                    weight: markerStyle.weight,
                  }}
                >
                  <Popup className="nwis-popup">
                    <div className="p-1 min-w-[220px]">
                      <div className="flex items-center justify-between pb-1.5 border-b border-hairline mb-2">
                        <span className="font-bold text-xs text-primary-glow font-sans">{w.name}</span>
                        <span className="text-[10px] text-text-muted font-mono">
                          {isProposedOffset(w) ? 'PROPOSED OFFSET' : 'OFFSET'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 space-y-1">
                        <div>Proximity: <strong className="text-foreground">{distance.toFixed(1)} km</strong></div>
                        <div>Total Depth: <span className="font-mono">{w.total_depth_m}m</span></div>
                        <div className="text-[11px] text-text-muted">{w.field_name}</div>
                      </div>
                      {isRisky && (
                        <div className="mt-2.5 p-2 rounded-lg bg-danger/10 border border-danger/30 text-danger text-[11px] font-medium flex items-center gap-1.5">
                          <AlertTriangle size={13} className="shrink-0" />
                          <span>{wellAlerts.length} correlated hazard(s) at current horizon</span>
                        </div>
                      )}
                      <div className="mt-2 text-right">
                        <button
                          onClick={() => setSelectedWell(w)}
                          className="text-[10px] text-primary-glow hover:underline font-medium"
                        >
                          View Full Intelligence →
                        </button>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}

            {/* Active Drilling Well Marker */}
            {activeWell && (
              <>
                <CircleMarker
                  center={[activeWell.lat, activeWell.lon]}
                  radius={18}
                  pathOptions={{ color: '#10B981', fillColor: '#10B981', fillOpacity: 0.18, weight: 1.5 }}
                />
                <CircleMarker
                  center={[activeWell.lat, activeWell.lon]}
                  radius={9}
                  eventHandlers={{
                    click: () => setSelectedWell(activeWell),
                  }}
                  pathOptions={{ color: '#FFFFFF', fillColor: '#10B981', fillOpacity: 1, weight: 2.5 }}
                >
                  <Popup className="nwis-popup">
                    <div className="p-1 min-w-[200px]">
                      <div className="flex items-center gap-2 font-bold text-xs text-accent mb-1">
                        <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                        ACTIVE DRILLING TARGET
                      </div>
                      <div className="text-sm font-bold text-foreground">{activeWell.name}</div>
                      <div className="text-xs text-text-muted mt-1">Current Depth: <strong className="text-foreground font-mono">{currentDepth.toFixed(0)}m MD</strong></div>
                      <div className="text-xs text-text-muted">Target Depth: <span className="font-mono">{activeWell.total_depth_m}m</span></div>
                    </div>
                  </Popup>
                </CircleMarker>
              </>
            )}
          </MapContainer>
        )}
      </div>

      {/* ── Phase 4: Time to Hazard Panel ── */}
      {upcomingHazards.length > 0 && (
        <div className="absolute top-24 left-5 sm:left-8 z-[1100] pointer-events-auto print-hide">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl p-5 w-[340px]"
          >
            <div className="flex items-center gap-2 pb-4 border-b border-slate-700 mb-4">
              <Clock size={20} className="text-warning" />
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Time to Hazard</h3>
              <span className="ml-auto text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-1 rounded">ROP: {currentTelemetry.ropMh} m/h</span>
            </div>

            <div className="space-y-4">
              {upcomingHazards.map((h, idx) => (
                <div key={`${h.alert.id}-${idx}`} className={`p-4 rounded-xl space-y-3 shadow-sm ${h.isUrgent ? 'hazard-flash bg-danger/5 border border-danger/30' : 'bg-slate-800/40 border border-slate-700/50'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      h.alert.severity === 'CRITICAL' ? 'bg-danger/20 text-danger border border-danger/30' : h.alert.severity === 'HIGH' ? 'bg-warning/20 text-warning border border-warning/30' : 'bg-primary/20 text-primary-glow border border-primary/30'
                    }`}>
                      {h.alert.severity}
                    </span>
                    <span className="font-mono text-slate-400 text-xs">{h.alert.matched_depth_m}m MD</span>
                  </div>

                  <div className="text-slate-100 font-semibold text-sm leading-snug">{eventLabel(h.alert.event_type)}</div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">⬇ <strong className="text-slate-200">{h.metresToGo.toFixed(0)}m</strong> to go</span>
                    <span className="flex items-center gap-1">⏱ <strong className={h.isUrgent ? 'text-danger' : 'text-slate-200'}>{h.timeBestEst}</strong></span>
                    <span className="text-slate-500 text-[11px]">({h.timeMinEst}–{h.timeMaxEst})</span>
                  </div>

                  {/* Progress bar colored by severity */}
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        h.alert.severity === 'CRITICAL' ? 'bg-danger' : h.alert.severity === 'HIGH' ? 'bg-warning' : 'bg-primary'
                      }`}
                      style={{ width: `${h.progressPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Slide-Over Well Intelligence Inspector Drawer ── */}
      <AnimatePresence>
        {selectedWell && !proposedWellPanelOpen && (
          <motion.div
            initial={{ opacity: 0, x: 340 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 340 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute top-20 right-5 sm:right-6 bottom-24 w-full max-w-[420px] glass-panel border-hairline-light rounded-2xl shadow-2xl p-6 z-[1500] flex flex-col overflow-hidden print-hide"
          >
            <div className="flex items-start justify-between pb-3.5 border-b border-hairline">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    selectedWell.id === activeWell?.id ? 'bg-accent/15 text-accent border border-accent/30' : 'bg-primary/15 text-primary-glow border border-primary/30'
                  }`}>
                    {selectedWell.id === activeWell?.id ? 'Active Well' : 'Historical Offset'}
                  </span>
                  {selectedWellDist !== null && selectedWell.id !== activeWell?.id && (
                    <span className="text-[11px] font-mono text-text-muted">
                      {selectedWellDist.toFixed(1)} km away
                    </span>
                  )}
                </div>
                <h3 className="font-sans font-bold text-lg text-foreground mt-1">{selectedWell.name}</h3>
                <p className="text-xs text-text-muted">{selectedWell.field_name}</p>
              </div>

              <button
                onClick={() => setSelectedWell(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-foreground hover:glass-card transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Well Technical Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl glass-card">
                  <div className="text-[10px] text-text-muted">Total Depth</div>
                  <div className="font-mono font-bold text-foreground text-sm">{selectedWell.total_depth_m}m MD</div>
                </div>
                <div className="p-3 rounded-xl glass-card">
                  <div className="text-[10px] text-text-muted">Spud Year</div>
                  <div className="font-mono font-bold text-foreground text-sm">{selectedWell.spud_date ? new Date(selectedWell.spud_date).getFullYear() : '2023'}</div>
                </div>
                <div className="p-3 rounded-xl glass-card col-span-2">
                  <div className="text-[10px] text-text-muted">Geospatial Coordinates</div>
                  <div className="font-mono text-xs text-slate-300">
                    {selectedWell.lat.toFixed(4)}°N, {selectedWell.lon.toFixed(4)}°E
                  </div>
                </div>
              </div>

              {/* Offset Hazard History */}
              <div>
                <div className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
                  <span>Correlated Hazard Catalog</span>
                  <span className="text-[10px] text-text-muted">{selectedWellAlerts.length} total event(s)</span>
                </div>

                {selectedWellAlerts.length === 0 ? (
                  <div className="p-4 rounded-xl glass-card text-center text-xs text-text-muted">
                    <CheckCircle2 size={18} className="mx-auto mb-1 text-accent" />
                    No historical drilling incidents reported for this offset well.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedWellAlerts.map((alt) => (
                      <div
                        key={alt.id}
                        className="p-3.5 rounded-xl glass-card text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            alt.severity === 'CRITICAL' ? 'badge-critical' : alt.severity === 'HIGH' ? 'badge-high' : 'badge-medium'
                          }`}>
                            {alt.severity}
                          </span>
                          <span className="font-mono text-[11px] text-text-muted font-semibold">
                            {alt.matched_depth_m}m MD
                          </span>
                        </div>
                        <div className="font-semibold text-foreground">{alt.event_type}</div>
                        <p className="text-[11px] text-text-muted leading-relaxed">{alt.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-hairline flex items-center justify-between text-xs">
              <span className="text-[11px] text-text-muted">Assam Basin Benchmark Suite</span>
              <button
                onClick={() => setSelectedWell(null)}
                className="px-3.5 py-1.5 rounded-xl glass-card hover:bg-panel-hover text-foreground font-medium text-xs border border-hairline transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase 1: Proposed Well Side Panel ── */}
      <AnimatePresence>
        {proposedWell && proposedWellPanelOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute top-5 right-5 sm:right-6 bottom-24 w-full max-w-[440px] glass-panel border border-hairline-light rounded-2xl shadow-2xl z-[1500] flex flex-col overflow-hidden print-panel"
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-slate-700/80 flex items-start justify-between shrink-0 bg-slate-900/50">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-accent-warm/20 text-accent-warm border border-accent-warm/30 uppercase tracking-wider">
                    Proposed Well
                  </span>
                  <span className="text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded">
                    {proposedOffsetWells.length} offsets in range
                  </span>
                </div>
                <h3 className="font-sans font-bold text-2xl text-slate-100 tracking-tight">Well Plan Analysis</h3>
                <p className="text-sm text-slate-400 font-mono mt-1">
                  {proposedWell.lat.toFixed(4)}°N, {proposedWell.lon.toFixed(4)}°E
                </p>
              </div>
              <button
                onClick={() => { setProposedWellPanelOpen(false); setProposedWell(null) }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 pr-4">

              {/* Section 1: Expected Formation Tops */}
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                  <Layers size={18} className="text-primary-glow" />
                  <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Expected Formation Tops</span>
                </div>
                <div className="space-y-3">
                  {expectedFormationTops.map((f, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 shadow-sm flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-slate-200 text-sm">{f.name}</div>
                        <div className="text-slate-400 text-xs mt-1 leading-relaxed">{f.lithology}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-slate-200 text-sm font-bold bg-slate-900/50 px-2 py-1 rounded border border-slate-800">{f.expectedTopM}–{f.expectedBottomM}m</div>
                        <div className="text-xs text-slate-500 mt-1">{f.hazards[0]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2: Historical Trouble Depths */}
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
                  <AlertTriangle size={18} className="text-warning" />
                  <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Historical Trouble Depths</span>
                </div>
                {troubleDepthBands.length === 0 ? (
                  <div className="p-5 rounded-xl bg-slate-800/20 border border-slate-700/30 text-center text-sm text-slate-500">
                    No offset incident data available in range.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {troubleDepthBands.map((band, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50 shadow-sm flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className={`w-3 h-3 rounded-full shrink-0 shadow-sm ${
                            band.event_type === 'kick' || band.event_type === 'overpressure' ? 'bg-danger' :
                            band.event_type === 'mud_loss' ? 'bg-warning' :
                            band.event_type === 'stuck_pipe' ? 'bg-accent-warm' : 'bg-primary'
                          }`} />
                          <div>
                            <div className="font-semibold text-slate-200 text-sm">{eventLabel(band.event_type)}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{band.depthBand}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-slate-100 text-sm font-bold">{band.count} events</div>
                          <div className="text-xs text-slate-500 mt-0.5">nearest: {band.nearestDistanceKm.toFixed(1)} km</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 3: Suggested Casing & Mud Program */}
              <div className="bg-slate-900/40 rounded-xl p-5 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                  <Wrench size={18} className="text-accent" />
                  <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Suggested Casing & Mud Program</span>
                </div>
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning font-medium mb-5 flex items-center gap-3">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>Analog suggestion, engineer approval required</span>
                </div>

                {/* Casing */}
                {proposedWellCasing.casing.length > 0 && (
                  <div className="mb-5">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                      Casing Program (Nearest Analog)
                    </div>
                    <div className="space-y-2">
                      {proposedWellCasing.casing.slice(0, 4).map((c, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm flex justify-between shadow-sm">
                          <div>
                            <span className="text-slate-200 font-semibold">{c.hole_section}</span>
                            <span className="text-slate-400 ml-3 text-xs">{c.casing_size_in}" / {c.hole_size_in}" hole</span>
                          </div>
                          <span className="font-mono text-slate-200 font-bold">{c.setting_depth_m}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mud */}
                {proposedWellMud.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                      Mud Properties (Nearest Analog)
                    </div>
                    <div className="space-y-2">
                      {proposedWellMud.slice(0, 3).map((m, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm flex justify-between shadow-sm">
                          <div>
                            <span className="text-slate-200 font-semibold">{m.mud_type}</span>
                            <span className="text-slate-400 ml-3 text-xs truncate max-w-[120px] sm:max-w-none inline-block align-bottom">{m.formation}</span>
                          </div>
                          <span className="font-mono text-slate-200 font-bold">{m.mud_weight_sg} SG</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with Pre-Spud Brief download */}
            <div className="p-6 border-t border-slate-700/80 flex items-center justify-between shrink-0 bg-slate-900/80">
              <button
                onClick={() => { setProposedWellPanelOpen(false); setProposedWell(null) }}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm border border-slate-600 transition-colors shadow-sm"
              >
                Close
              </button>
              <button
                onClick={handlePreSpudDownload}
                disabled={generatingPreSpud}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent-warm hover:bg-accent-warm/90 text-slate-900 font-bold text-sm rounded-xl transition-all shadow-md disabled:opacity-50"
              >
                {generatingPreSpud ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Download size={16} /> Download Pre-Spud Brief
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sleek Bottom Horizon Scrubber & Depth Control Dock ── */}
      <div className="absolute bottom-5 left-5 right-5 sm:bottom-6 sm:left-6 sm:right-6 z-[1000] flex justify-center pointer-events-none print-hide">
        <div className="pointer-events-auto glass px-6 py-3.5 rounded-2xl shadow-2xl flex flex-wrap items-center gap-5 max-w-4xl w-full">
          {/* Play / Pause & Speed Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaying(!playing)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                playing
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                  : 'bg-primary text-white hover:bg-primary-glow shadow-sm'
              }`}
            >
              {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>

            <button
              onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 5 : 1))}
              className="px-2.5 py-1 rounded-lg glass-card text-xs font-mono text-text-muted hover:text-foreground transition-colors"
            >
              {speed}x
            </button>
          </div>

          {/* Depth Slider with Formation Label */}
          <div className="flex-1 flex flex-col gap-1 min-w-[240px]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted font-medium">
                Depth Scrubber: <strong className="text-foreground font-mono">{currentDepth.toFixed(0)}m</strong> / {maxDepth}m MD
              </span>
              <span className="text-[11px] font-medium text-primary-glow">
                {currentFormation.name}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={progress.length - 1}
              value={currentIdx}
              onChange={(e) => {
                setPlaying(false)
                setCurrentIdx(Number(e.target.value))
              }}
              className="accent-primary cursor-pointer w-full h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Reset Control */}
          <button
            onClick={() => { setPlaying(false); setCurrentIdx(0) }}
            className="p-2 rounded-xl text-text-muted hover:text-foreground hover:glass-card transition-colors"
            title="Reset to surface (0m)"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
