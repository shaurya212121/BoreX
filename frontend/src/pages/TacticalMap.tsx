import React, { useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Popup, Circle, useMap, Polyline, Marker, Tooltip, useMapEvents } from 'react-leaflet'
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
  Layers,
  CheckCircle2,
  Key,
  
  
  
  
  Compass
} from 'lucide-react'
import type { Well, ActiveWellProgress, RiskAlert } from '../lib/supabase'
import { getWells, getActiveWellProgress, getRiskAlerts, generateServerPdf } from '../lib/dataService'
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

// Ã¢â€â‚¬Ã¢â€â‚¬ Leaflet Auto-Resize & Viewport Controller Ã¢â€â‚¬Ã¢â€â‚¬
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

const customProposedIcon = L.divIcon({
  className: 'bg-transparent',
  html: `
    <div class="relative w-8 h-8 -ml-4 -mt-8 flex items-center justify-center pointer-events-none">
      <div class="absolute inset-0 bg-accent/20 rounded-full animate-ping"></div>
      <div class="w-4 h-4 bg-accent border-2 border-white rounded-full shadow-[0_0_15px_rgba(56,189,248,1)]"></div>
    </div>
  `
})

function PlanningModeController({ enabled, onPinDrop }: { enabled: boolean; onPinDrop: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onPinDrop(e.latlng.lat, e.latlng.lng)
      }
    }
  })
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
  const [showFaults, setShowFaults] = useState(true)
  const [showTrajectories, setShowTrajectories] = useState(true)
  const [showPressure, setShowPressure] = useState(true)
  const [showProximity, setShowProximity] = useState(true)
  
  // Pre-Spud Planning Mode State
  const [planningMode, setPlanningMode] = useState(false)
  const [proposedWell, setProposedWell] = useState<{lat: number, lng: number} | null>(null)
  const [generatingPreSpud, setGeneratingPreSpud] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Ã¢â€â‚¬Ã¢â€â‚¬ Load Data Ã¢â€â‚¬Ã¢â€â‚¬
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Scrubber Playback Ã¢â€â‚¬Ã¢â€â‚¬
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



  // Ã¢â€â‚¬Ã¢â€â‚¬ Custom Markers & Overlays Ã¢â€â‚¬Ã¢â€â‚¬
  const activeWellIcon = L.divIcon({
    className: 'bg-transparent border-none',
    html: `<div class="relative w-16 h-16 flex items-center justify-center">
      <div class="absolute inset-0 rounded-full border-2 border-[#10B981]/40 radar-sweep"></div>
      <div class="absolute w-8 h-8 rounded-full bg-[#10B981]/20 animate-pulse"></div>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" class="relative z-10 drop-shadow-[0_0_8px_#10B981]">
         <path d="M12 2v20M8 22h8M6 10l6-8 6 8M4 14l8-12 8 12" />
      </svg>
    </div>`,
    iconSize: [64, 64],
    iconAnchor: [32, 32],
  })

  const getOffsetIcon = (isRisky: boolean) => L.divIcon({
    className: 'bg-transparent border-none',
    html: `<div class="relative w-8 h-8 flex items-center justify-center">
      ${isRisky ? '<div class="absolute inset-0 rounded-full bg-[#F43F5E]/30 animate-ping" style="animation-duration: 2s;"></div>' : ''}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${isRisky ? '#F43F5E' : '#38BDF8'}" stroke-width="2.5" class="relative z-10 ${isRisky ? 'drop-shadow-[0_0_5px_#F43F5E]' : 'drop-shadow-[0_0_3px_#38BDF8]'}">
         <circle cx="12" cy="12" r="8" />
         <path d="M12 4v16M4 12h16" />
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })

  const getTrajectory = (well: Well) => {
     const hash = (well.lat * well.lon * 10000) % 360;
     const angle = hash * (Math.PI / 180);
     const lengthKm = ((well.total_depth_m || 2000) / 1000) * 0.8;
     const dx = Math.cos(angle) * lengthKm;
     const dy = Math.sin(angle) * lengthKm;
     const destLat = well.lat + (dy / 111);
     const destLon = well.lon + (dx / (111 * Math.cos(well.lat * Math.PI/180)));
     return [[well.lat, well.lon] as [number, number], [well.lat + (dy/222), well.lon + (dx/222)] as [number, number], [destLat, destLon] as [number, number]];
  }

  const FAULTS = [
    { name: 'Naga Thrust Front', coords: [[27.4, 95.2], [27.35, 95.3], [27.25, 95.4]] as [number, number][], color: '#F43F5E' },
    { name: 'Jorhat Fault', coords: [[27.25, 95.1], [27.3, 95.35]] as [number, number][], color: '#F59E0B' },
    { name: 'Mikir Hills Lineament', coords: [[27.45, 95.35], [27.3, 95.45]] as [number, number][], color: '#F59E0B' },
    { name: 'Disang Thrust', coords: [[27.2, 95.25], [27.3, 95.5]] as [number, number][], color: '#F43F5E' },
  ]

  const center: [number, number] = activeWell ? [activeWell.lat, activeWell.lon] : [27.3250, 95.3180]
  const currentProvider = BASEMAP_PROVIDERS[activeBasemap]

  // Well selected details
  const selectedWellAlerts = selectedWell ? allAlerts.filter((a) => a.nearby_well_id === selectedWell.id) : []
  const selectedWellDist = selectedWell && activeWell ? haversineKm(activeWell.lat, activeWell.lon, selectedWell.lat, selectedWell.lon) : null

  return (
    <div className="flex flex-col h-full w-full text-foreground select-none relative overflow-hidden" style={{ background: '#050508' }}>
      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Top Floating Tactical HUD Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className="absolute top-5 left-5 right-5 sm:top-6 sm:left-6 sm:right-6 z-[1000] flex flex-wrap items-center justify-between gap-3.5 pointer-events-none">
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

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Main Map Canvas Ã¢â€â‚¬Ã¢â€â‚¬ */}
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

            <TileLayer
              key={`${activeBasemap}-${currentProvider.url}`}
              url={currentProvider.url}
              subdomains={currentProvider.subdomains}
              attribution={currentProvider.attribution}
            />

            {/* Proximity Perimeter Circle */}
            {showProximity && activeWell && (
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

            {/* Structural Fault Lines */}
            {showFaults && FAULTS.map((fault, i) => (
              <Polyline key={`fault-${i}`} positions={fault.coords} pathOptions={{ color: fault.color, weight: 3, dashArray: '10 15', opacity: 0.4 }}>
                <Tooltip sticky className="glass-panel text-xs font-mono">{fault.name}</Tooltip>
              </Polyline>
            ))}

            {/* Pore Pressure Risk Heatmap */}
            {showPressure && activeWell && [1, 2, 3, 4, 5].map(idx => (
              <Circle
                key={`pressure-${idx}`}
                center={[activeWell.lat, activeWell.lon]}
                radius={idx * 1800}
                pathOptions={{
                  color: idx <= 2 ? '#F43F5E' : idx === 3 ? '#F59E0B' : idx === 4 ? '#EAB308' : '#10B981',
                  fillColor: idx <= 2 ? '#F43F5E' : idx === 3 ? '#F59E0B' : idx === 4 ? '#EAB308' : '#10B981',
                  fillOpacity: 0.15 / idx,
                  stroke: false
                }}
              />
            ))}

                        {/* Offset Wells */}
            {offsetWellsInRadius.map((w) => {
              const distance = activeWell ? haversineKm(activeWell.lat, activeWell.lon, w.lat, w.lon) : 0
              const isRisky = riskyWellIds.has(w.id)
              const wellAlerts = visibleAlerts.filter((a) => a.nearby_well_id === w.id)
              const trajectory = getTrajectory(w)

              return (
                <React.Fragment key={w.id}>
                  {showTrajectories && (
                    <Polyline
                      positions={trajectory}
                      pathOptions={{
                        color: isRisky ? '#F59E0B' : '#38BDF8',
                        weight: 2,
                        dashArray: '4 8',
                        opacity: 0.6
                      }}
                    />
                  )}
                  <Marker
                    position={[w.lat, w.lon]}
                    icon={getOffsetIcon(isRisky)}
                    eventHandlers={{ click: () => setSelectedWell(w) }}
                  >
                    <Popup className="nwis-popup">
                      <div className="p-1 min-w-[220px]">
                        <div className="flex items-center justify-between pb-1.5 border-b border-hairline mb-2">
                          <span className="font-bold text-xs text-primary-glow font-sans">{w.name}</span>
                          <span className="text-[10px] text-text-muted font-mono">OFFSET</span>
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
                            View Full Intelligence Ã¢â€ â€™
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              )
            })}
                        {/* Active Drilling Well Marker */}
            {activeWell && (
              <Marker
                position={[activeWell.lat, activeWell.lon]}
                icon={activeWellIcon}
                eventHandlers={{ click: () => setSelectedWell(activeWell) }}
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
              </Marker>
            )}
          
              {planningMode && (
                <PlanningModeController 
                  enabled={planningMode} 
                  onPinDrop={(lat, lng) => setProposedWell({lat, lng})} 
                />
              )}

              {proposedWell && (
                <>
                  <Circle
                    center={[proposedWell.lat, proposedWell.lng]}
                    radius={15 * 1000}
                    pathOptions={{
                      color: '#38BDF8',
                      fillColor: '#38BDF8',
                      fillOpacity: 0.05,
                      dashArray: '5, 10',
                      weight: 1
                    }}
                  />
                  <Marker 
                    position={[proposedWell.lat, proposedWell.lng]}
                    icon={customProposedIcon}
                  >
                    <Popup className="nwis-popup">
                      <div className="p-2 min-w-[240px]">
                        <div className="flex items-center gap-2 font-bold text-xs text-accent mb-2 border-b border-hairline pb-2">
                          <Target size={14} className="animate-pulse" />
                          PROPOSED WELL TARGET
                        </div>
                        <div className="text-xs text-slate-300 font-mono mb-1">LAT: {proposedWell.lat.toFixed(4)}Â°</div>
                        <div className="text-xs text-slate-300 font-mono mb-3">LNG: {proposedWell.lng.toFixed(4)}Â°</div>
                        <button
                          onClick={async () => {
                            setGeneratingPreSpud(true)
                            const nearby = wells.filter(w => haversineKm(proposedWell.lat, proposedWell.lng, w.lat, w.lon) <= 15)
                            try {
                              const blob = await generateServerPdf({
                                active_well_name: "PROPOSED TARGET (VIRTUAL)",
                                current_depth_m: 0,
                                formation: "Pre-Spud Estimation",
                                overall_risk_state: "PRE-SPUD EVALUATION",
                                overall_risk_probability: "N/A",
                                overall_confidence: "95.0%",
                                telemetry: {},
                                predicted_risks: [
                                  {
                                    risk_type: "Offset Well Anomaly Proximity",
                                    risk_class: nearby.length > 0 ? "HIGH" : "LOW",
                                    risk_probability: 85,
                                    confidence: 90,
                                    contributing_factors: ["Geospatial Proximity", "Historical Offset Incidents", "Simulated Lithology"]
                                  }
                                ],
                                nearby_wells: nearby.map(w => ({
                                  name: w.name,
                                  distance_km: haversineKm(proposedWell.lat, proposedWell.lng, w.lat, w.lon),
                                  direction: "TBD",
                                  total_depth_m: w.total_depth_m,
                                  formation: "Assam Strata"
                                }))
                              })
                              if (blob) {
                                const url = window.URL.createObjectURL(blob)
                                const a = document.createElement("a")
                                a.href = url
                                a.download = `NWIS_PreSpud_Dossier_Target.pdf`
                                document.body.appendChild(a)
                                a.click()
                                window.URL.revokeObjectURL(url)
                                document.body.removeChild(a)
                              }
                            } finally {
                              setGeneratingPreSpud(false)
                            }
                          }}
                          disabled={generatingPreSpud}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent/20 hover:bg-accent/40 text-accent font-semibold text-[11px] rounded-lg border border-accent/50 transition-colors"
                        >
                          {generatingPreSpud ? "Compiling Dossier..." : "Generate Risk Dossier"}
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                </>
              )}
            </MapContainer>
        )}
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Slide-Over Well Intelligence Inspector Drawer Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <AnimatePresence>
        {selectedWell && (
          <motion.div
            initial={{ opacity: 0, x: 340 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 340 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute top-20 right-5 sm:right-6 bottom-24 w-full max-w-[420px] glass-panel border-hairline-light rounded-2xl shadow-2xl p-6 z-[1500] flex flex-col overflow-hidden"
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
                    {selectedWell.lat.toFixed(4)}Ã‚Â°N, {selectedWell.lon.toFixed(4)}Ã‚Â°E
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

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Floating Layer Control Panel Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className="absolute bottom-28 left-5 sm:bottom-28 sm:left-6 z-[1000] glass px-4 py-3 rounded-2xl shadow-xl flex flex-col gap-2.5 pointer-events-auto w-48">
        <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1 flex items-center gap-1.5 border-b border-hairline pb-2">
          <Layers size={12} className="text-primary-glow" /> 
          Tactical Layers
        </div>
        {[
          { label: 'Fault Lines', state: showFaults, set: setShowFaults },
          { label: 'Trajectories', state: showTrajectories, set: setShowTrajectories },
          { label: 'Pore Pressure', state: showPressure, set: setShowPressure },
          { label: 'Proximity Grid', state: showProximity, set: setShowProximity }
        ].map(l => (
          <label key={l.label} className="flex items-center justify-between cursor-pointer group">
            <span className="text-xs text-foreground font-medium group-hover:text-primary-glow transition-colors">{l.label}</span>
            <input 
              type="checkbox" 
              checked={l.state} 
              onChange={e => l.set(e.target.checked)} 
              className="accent-primary w-3.5 h-3.5 cursor-pointer rounded-sm bg-panel border-hairline"
            />
          </label>
        ))}

        <div className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1 mt-2 flex items-center gap-1.5 border-b border-hairline pb-2">
          <Compass size={12} className="text-accent" /> 
          Intelligence Tools
        </div>
        <label className="flex items-center justify-between cursor-pointer group">
          <span className="text-xs text-accent font-medium group-hover:text-primary-glow transition-colors">Pre-Spud Mode</span>
          <input 
            type="checkbox" 
            checked={planningMode}
            onChange={(e) => {
              setPlanningMode(e.target.checked)
              if (!e.target.checked) setProposedWell(null)
            }}
            className="accent-accent w-3.5 h-3.5 cursor-pointer rounded-sm bg-panel border-hairline"
          />
        </label>
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Sleek Bottom Horizon Scrubber & Depth Control Dock Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className="absolute bottom-5 left-5 right-5 sm:bottom-6 sm:left-6 sm:right-6 z-[1000] flex justify-center pointer-events-none">
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
