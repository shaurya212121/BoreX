import { useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  X,
  Target,
  RotateCcw,
  CheckCircle2,
  Key,
} from 'lucide-react'
import type { Well, ActiveWellProgress, RiskAlert } from '../lib/supabase'
import { getWells, getActiveWellProgress, getRiskAlerts } from '../lib/dataService'
import { getFormationAtDepth } from '../lib/assamBenchmarkData'

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

  const center: [number, number] = activeWell ? [activeWell.lat, activeWell.lon] : [27.3250, 95.3180]
  const currentProvider = BASEMAP_PROVIDERS[activeBasemap]

  // Well selected details
  const selectedWellAlerts = selectedWell ? allAlerts.filter((a) => a.nearby_well_id === selectedWell.id) : []
  const selectedWellDist = selectedWell && activeWell ? haversineKm(activeWell.lat, activeWell.lon, selectedWell.lat, selectedWell.lon) : null

  return (
    <div className="flex flex-col h-full w-full bg-bg text-foreground select-none relative overflow-hidden">
      {/* ── Top Floating Tactical HUD ── */}
      <div className="absolute top-5 left-5 right-5 sm:top-6 sm:left-6 sm:right-6 z-[1000] flex flex-wrap items-center justify-between gap-3.5 pointer-events-none">
        {/* Left Stats Pill */}
        <div className="pointer-events-auto flex items-center gap-3.5 bg-panel/90 backdrop-blur-md border border-hairline px-4.5 py-3 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2.5 pr-3.5 border-r border-hairline">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] text-secondary font-medium uppercase tracking-wider">Active Horizon</span>
              <span className="font-mono text-sm font-bold text-foreground">
                {currentDepth.toFixed(0)}m <span className="text-xs text-secondary font-normal font-sans">({currentFormation.name})</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 text-xs">
            <div className="flex items-center gap-1.5 text-secondary">
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
          </div>
        </div>

        {/* Right Controls: Key Status, Radius & Basemap Selector */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {mapApiKey && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-panel/90 backdrop-blur-md border border-hairline text-accent text-xs font-mono shadow-xl">
              <Key size={13} className="text-accent" />
              <span>Map Key: Configured</span>
            </div>
          )}

          {/* Radius Selector */}
          <div className="flex items-center gap-1 bg-panel/90 backdrop-blur-md border border-hairline p-1 rounded-xl shadow-xl">
            <span className="text-[10px] text-secondary font-medium px-2">Radius:</span>
            {[25, 50, 80, 120].map((r) => (
              <button
                key={r}
                onClick={() => setSearchRadiusKm(r)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all font-mono ${
                  searchRadiusKm === r
                    ? 'bg-primary text-white font-semibold shadow-sm'
                    : 'text-secondary hover:text-foreground hover:bg-panel-card'
                }`}
              >
                {r}km
              </button>
            ))}
          </div>

          {/* Basemap Toggle */}
          <div className="flex items-center gap-1 bg-panel/90 backdrop-blur-md border border-hairline p-1 rounded-xl shadow-xl">
            {(Object.keys(BASEMAP_PROVIDERS) as BasemapKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveBasemap(key)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                  activeBasemap === key
                    ? 'bg-panel-card text-primary-glow font-semibold border border-hairline-light'
                    : 'text-secondary hover:text-foreground'
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
          <div className="w-full h-full flex flex-col items-center justify-center bg-bg gap-3">
            <Loader2 size={32} className="animate-spin text-primary-glow" />
            <p className="text-xs text-secondary font-mono">Loading Assam Basin Offset Geometry...</p>
          </div>
        ) : error ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-bg gap-2 text-danger p-6 text-center">
            <AlertTriangle size={36} />
            <div className="font-semibold text-sm">Map Initialization Error</div>
            <div className="text-xs text-secondary max-w-sm">{error}</div>
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

            {/* Offset Wells */}
            {offsetWellsInRadius.map((w) => {
              const distance = activeWell ? haversineKm(activeWell.lat, activeWell.lon, w.lat, w.lon) : 0
              const isRisky = riskyWellIds.has(w.id)
              const markerStyle = getWellMarkerStyle(w)
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
                        <span className="text-[10px] text-secondary font-mono">OFFSET</span>
                      </div>
                      <div className="text-xs text-slate-300 space-y-1">
                        <div>Proximity: <strong className="text-foreground">{distance.toFixed(1)} km</strong></div>
                        <div>Total Depth: <span className="font-mono">{w.total_depth_m}m</span></div>
                        <div className="text-[11px] text-secondary">{w.field_name}</div>
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
                      <div className="text-xs text-secondary mt-1">Current Depth: <strong className="text-foreground font-mono">{currentDepth.toFixed(0)}m MD</strong></div>
                      <div className="text-xs text-secondary">Target Depth: <span className="font-mono">{activeWell.total_depth_m}m</span></div>
                    </div>
                  </Popup>
                </CircleMarker>
              </>
            )}
          </MapContainer>
        )}
      </div>

      {/* ── Slide-Over Well Intelligence Inspector Drawer ── */}
      <AnimatePresence>
        {selectedWell && (
          <motion.div
            initial={{ opacity: 0, x: 340 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 340 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute top-20 right-5 sm:right-6 bottom-24 w-full max-w-[420px] bg-panel/95 backdrop-blur-md border border-hairline-light rounded-2xl shadow-2xl p-6 z-[1500] flex flex-col overflow-hidden"
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
                    <span className="text-[11px] font-mono text-secondary">
                      {selectedWellDist.toFixed(1)} km away
                    </span>
                  )}
                </div>
                <h3 className="font-sans font-bold text-lg text-foreground mt-1">{selectedWell.name}</h3>
                <p className="text-xs text-secondary">{selectedWell.field_name}</p>
              </div>

              <button
                onClick={() => setSelectedWell(null)}
                className="p-1.5 rounded-lg text-secondary hover:text-foreground hover:bg-panel-card transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Well Technical Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-panel-card border border-hairline">
                  <div className="text-[10px] text-secondary">Total Depth</div>
                  <div className="font-mono font-bold text-foreground text-sm">{selectedWell.total_depth_m}m MD</div>
                </div>
                <div className="p-3 rounded-xl bg-panel-card border border-hairline">
                  <div className="text-[10px] text-secondary">Spud Year</div>
                  <div className="font-mono font-bold text-foreground text-sm">{selectedWell.spud_date ? new Date(selectedWell.spud_date).getFullYear() : '2023'}</div>
                </div>
                <div className="p-3 rounded-xl bg-panel-card border border-hairline col-span-2">
                  <div className="text-[10px] text-secondary">Geospatial Coordinates</div>
                  <div className="font-mono text-xs text-slate-300">
                    {selectedWell.lat.toFixed(4)}°N, {selectedWell.lon.toFixed(4)}°E
                  </div>
                </div>
              </div>

              {/* Offset Hazard History */}
              <div>
                <div className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
                  <span>Correlated Hazard Catalog</span>
                  <span className="text-[10px] text-secondary">{selectedWellAlerts.length} total event(s)</span>
                </div>

                {selectedWellAlerts.length === 0 ? (
                  <div className="p-4 rounded-xl bg-panel-card border border-hairline text-center text-xs text-secondary">
                    <CheckCircle2 size={18} className="mx-auto mb-1 text-accent" />
                    No historical drilling incidents reported for this offset well.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedWellAlerts.map((alt) => (
                      <div
                        key={alt.id}
                        className="p-3.5 rounded-xl bg-panel-card border border-hairline text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            alt.severity === 'CRITICAL' ? 'badge-critical' : alt.severity === 'HIGH' ? 'badge-high' : 'badge-medium'
                          }`}>
                            {alt.severity}
                          </span>
                          <span className="font-mono text-[11px] text-secondary font-semibold">
                            {alt.matched_depth_m}m MD
                          </span>
                        </div>
                        <div className="font-semibold text-foreground">{alt.event_type}</div>
                        <p className="text-[11px] text-secondary leading-relaxed">{alt.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-hairline flex items-center justify-between text-xs">
              <span className="text-[11px] text-secondary">Assam Basin Benchmark Suite</span>
              <button
                onClick={() => setSelectedWell(null)}
                className="px-3.5 py-1.5 rounded-xl bg-panel-card hover:bg-panel-hover text-foreground font-medium text-xs border border-hairline transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sleek Bottom Horizon Scrubber & Depth Control Dock ── */}
      <div className="absolute bottom-5 left-5 right-5 sm:bottom-6 sm:left-6 sm:right-6 z-[1000] flex justify-center pointer-events-none">
        <div className="pointer-events-auto bg-panel/95 backdrop-blur-md border border-hairline px-6 py-3.5 rounded-2xl shadow-2xl flex flex-wrap items-center gap-5 max-w-4xl w-full">
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
              className="px-2.5 py-1 rounded-lg bg-panel-card border border-hairline text-xs font-mono text-secondary hover:text-foreground transition-colors"
            >
              {speed}x
            </button>
          </div>

          {/* Depth Slider with Formation Label */}
          <div className="flex-1 flex flex-col gap-1 min-w-[240px]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary font-medium">
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
            className="p-2 rounded-xl text-secondary hover:text-foreground hover:bg-panel-card transition-colors"
            title="Reset to surface (0m)"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
