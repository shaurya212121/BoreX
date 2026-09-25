import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, AlertTriangle, Layers, BookOpen, Activity } from 'lucide-react'
import { supabase, SEVERITY_COLORS, EVENT_LABELS } from '../lib/supabase'
import type { Well, ActiveWellProgress, RiskAlert } from '../lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────
const ACTIVE_WELL_ID_KEY = 'ACTIVE: Volve-A01'

// ─── Depth Gauge ─────────────────────────────────────────────────────────────
function DepthGauge({ current, max }: { current: number; max: number }) {
  const pct = Math.min(100, (current / max) * 100)
  return (
    <div className="flex flex-col h-full">
      <div className="font-mono text-xs text-secondary mb-2 uppercase tracking-widest">Depth</div>
      <div className="flex gap-3 flex-1">
        {/* Track */}
        <div className="relative w-6 flex-1 max-w-6 depth-track rounded-sm overflow-hidden border border-hairline">
          <motion.div
            className="absolute bottom-0 left-0 right-0 bg-primary/30 border-t-2 border-primary"
            animate={{ height: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-bg"
            style={{ bottom: `calc(${100 - pct}% - 6px)` }}
            animate={{ bottom: `calc(${100 - pct}% - 6px)` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        {/* Labels */}
        <div className="flex flex-col justify-between font-mono text-xs text-secondary py-1">
          <span>0m</span>
          <span>{(max * 0.25).toFixed(0)}m</span>
          <span>{(max * 0.5).toFixed(0)}m</span>
          <span>{(max * 0.75).toFixed(0)}m</span>
          <span>{max}m</span>
        </div>
      </div>
      <div className="mt-3 font-mono text-2xl text-primary font-medium tabular-nums">
        {current.toFixed(0)}<span className="text-sm text-secondary ml-1">m MD</span>
      </div>
    </div>
  )
}

// ─── Alert Card ───────────────────────────────────────────────────────────────
function AlertCard({ alert }: { alert: RiskAlert }) {
  const color = SEVERITY_COLORS[alert.severity] || '#5C7A89'
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="border border-hairline p-3 mb-2"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`font-mono text-xs px-2 py-0.5 badge-${alert.severity}`}>
          {alert.severity.toUpperCase()}
        </span>
        <span className="font-mono text-xs text-secondary">{alert.distance_km.toFixed(1)} km</span>
      </div>
      <div className="font-grotesk text-sm text-foreground font-medium mb-1">
        {EVENT_LABELS[alert.event_type] || alert.event_type}
      </div>
      <div className="font-mono text-xs text-primary mb-1">@ {alert.matched_depth_m?.toFixed(0)}m MD</div>
      <div className="font-mono text-xs text-secondary leading-relaxed">{alert.message.slice(0, 120)}…</div>
    </motion.div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function TacticalMap() {
  const navigate = useNavigate()
  const [wells, setWells] = useState<Well[]>([])
  const [activeWell, setActiveWell] = useState<Well | null>(null)
  const [allAlerts, setAllAlerts] = useState<RiskAlert[]>([])
  const [progress, setProgress] = useState<ActiveWellProgress[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Fetch data ──
  useEffect(() => {
    async function load() {
      const { data: ws } = await supabase.from('wells').select('*')
      if (ws) {
        setWells(ws)
        const active = ws.find((w: Well) => w.name === ACTIVE_WELL_ID_KEY)
        setActiveWell(active || null)
        if (active) {
          const { data: prog } = await supabase
            .from('active_well_progress')
            .select('*')
            .eq('well_id', active.id)
            .order('timestamp', { ascending: true })
          if (prog) setProgress(prog)

          const { data: alerts } = await supabase
            .from('risk_alerts')
            .select('*')
            .eq('active_well_id', active.id)
            .order('matched_depth_m', { ascending: true })
          if (alerts) setAllAlerts(alerts)
        }
      }
    }
    load()
  }, [])

  // ── Playback ──
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

  const currentDepth = progress[currentIdx]?.current_depth_m ?? 0
  const maxDepth = activeWell?.total_depth_m ?? 3500

  // Alerts visible at or before current depth (+50m lookahead)
  const visibleAlerts = allAlerts.filter(
    (a) => a.matched_depth_m <= currentDepth + 50 && a.matched_depth_m >= 0
  ).slice(-6)

  // Historical wells with risk history at or near current depth
  const historicalWells = wells.filter((w) => w.name !== ACTIVE_WELL_ID_KEY)
  const riskyWellIds = new Set(visibleAlerts.map((a) => a.nearby_well_id))

  // Map center
  const center: [number, number] = activeWell ? [activeWell.lat, activeWell.lon] : [58.44, 1.905]

  // Severity to color for map markers
  function wellMarkerColor(well: Well): string {
    if (riskyWellIds.has(well.id)) {
      const alerts = visibleAlerts.filter((a) => a.nearby_well_id === well.id)
      const maxSev = alerts.reduce((a, b) =>
        (SEVERITY_COLORS[a.severity] ? a : b), alerts[0])
      return SEVERITY_COLORS[maxSev?.severity] || '#5C7A89'
    }
    return '#6B8F71'
  }

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Main Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Depth Gauge */}
        <div className="w-24 border-r border-hairline p-4 flex flex-col bg-panel">
          <DepthGauge current={currentDepth} max={maxDepth} />
        </div>

        {/* Center — Map */}
        <div className="flex-1 flex flex-col">
          <MapContainer
            center={center}
            zoom={10}
            style={{ flex: 1, width: '100%' }}
            className="flex-1"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution=""
            />

            {/* Search radius */}
            {activeWell && (
              <Circle
                center={[activeWell.lat, activeWell.lon]}
                radius={80000}
                pathOptions={{ color: '#00FF9D', weight: 1, fillOpacity: 0.05, dashArray: '4 6' }}
              />
            )}

            {/* Historical wells */}
            {historicalWells.map((w) => (
              <CircleMarker
                key={w.id}
                center={[w.lat, w.lon]}
                radius={riskyWellIds.has(w.id) ? 9 : 6}
                pathOptions={{ color: wellMarkerColor(w), fillColor: wellMarkerColor(w), fillOpacity: 0.8, weight: 1.5 }}
              >
                <Popup className="nwis-popup">
                  <div style={{ background: '#130C1E', color: '#F4F0FB', padding: 12, fontFamily: 'Space Grotesk', minWidth: 200 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{w.name}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#5C7A89' }}>
                      TD: {w.total_depth_m}m · {w.field_name}
                    </div>
                    <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#5C7A89', marginTop: 2 }}>
                      {w.lat.toFixed(4)}°N {w.lon.toFixed(4)}°E
                    </div>
                    {riskyWellIds.has(w.id) && (
                      <div style={{ marginTop: 8, color: '#00FF9D', fontSize: 11, fontFamily: 'IBM Plex Mono' }}>
                        ⚠ {visibleAlerts.filter(a => a.nearby_well_id === w.id).length} risk event(s) at current depth
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Active well */}
            {activeWell && (
              <CircleMarker
                center={[activeWell.lat, activeWell.lon]}
                radius={12}
                pathOptions={{ color: '#F4F0FB', fillColor: '#00FF9D', fillOpacity: 1, weight: 2 }}
              >
                <Popup>
                  <div style={{ background: '#130C1E', color: '#F4F0FB', padding: 12, fontFamily: 'Space Grotesk' }}>
                    <div style={{ fontWeight: 700 }}>⬤ ACTIVE WELL</div>
                    <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#00FF9D', marginTop: 4 }}>
                      Current Depth: {currentDepth.toFixed(0)}m MD
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )}
          </MapContainer>

          {/* ── Depth Timeline Scrubber ── */}
          <div className="border-t border-hairline px-6 py-4 shrink-0 bg-panel">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={() => setPlaying((p) => !p)}
                className="w-8 h-8 border border-primary flex items-center justify-center text-primary hover:bg-primary hover:text-bg transition-all"
              >
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>

              {/* Speed */}
              <div className="flex gap-1">
                {[1, 2, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`font-mono text-xs px-2 py-1 border transition-all ${speed === s ? 'border-primary bg-primary text-bg' : 'border-hairline text-secondary hover:border-foreground/40'}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Scrubber */}
              <div className="flex-1 flex flex-col gap-1">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, progress.length - 1)}
                  value={currentIdx}
                  onChange={(e) => { setCurrentIdx(Number(e.target.value)); setPlaying(false) }}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between font-mono text-xs text-secondary">
                  <span>0m</span>
                  <span className="text-primary font-medium">{currentDepth.toFixed(0)}m MD</span>
                  <span>{maxDepth}m TD</span>
                </div>
              </div>

              {/* Timestamp */}
              <div className="font-mono text-xs text-secondary text-right w-40 shrink-0">
                {progress[currentIdx]?.timestamp
                  ? new Date(progress[currentIdx].timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '--'}
              </div>
            </div>
          </div>
        </div>

        {/* Right — Alert Panel */}
        <div className="w-80 border-l border-hairline flex flex-col bg-panel">
          <div className="px-4 py-3 border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-primary" />
              <span className="font-grotesk text-sm font-medium text-foreground">Risk Alerts</span>
            </div>
            <span className="font-mono text-xs text-secondary">{visibleAlerts.length} active</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {visibleAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-success mb-2"><Activity size={24} /></div>
                <div className="font-mono text-xs text-secondary">No risks at current depth.</div>
                <div className="font-mono text-xs text-secondary mt-1">Advance the scrubber to drill deeper.</div>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {visibleAlerts.map((a) => (
                  <AlertCard key={a.id} alert={a} />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Stats strip */}
          <div className="border-t border-hairline p-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Nearby Wells', value: historicalWells.length },
              { label: 'Total Alerts', value: allAlerts.length },
              { label: 'Current Depth', value: `${currentDepth.toFixed(0)}m` },
              { label: 'Active Well', value: activeWell?.name.split(' ').pop() ?? '--' },
            ].map((s) => (
              <div key={s.label} className="border border-hairline p-2">
                <div className="font-mono text-lg text-primary tabular-nums">{s.value}</div>
                <div className="font-mono text-xs text-secondary mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}



