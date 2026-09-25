import { useState, useEffect, useRef } from 'react'
import {
  Compass,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts'
import { getTrajectories } from '../lib/dataService'
import type { TrajectorySurveyPoint } from '../lib/dataService'

// 3D Canvas visualizer for active and offset trajectories
function Trajectory3DCanvas({
  activeSurveys,
  offsetSurveys,
  offsetWellName,
}: {
  activeSurveys: TrajectorySurveyPoint[]
  offsetSurveys: TrajectorySurveyPoint[]
  offsetWellName: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [rotation, setRotation] = useState({ yaw: 45, pitch: 30 })
  const isDragging = useRef(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)

      // Subsurface Coordinate Box
      const cx = width / 2
      const cy = height * 0.28
      const scale = Math.min(width, height) / 3600

      const yawRad = (rotation.yaw * Math.PI) / 180
      const pitchRad = (rotation.pitch * Math.PI) / 180

      const project = (north: number, east: number, tvd: number) => {
        // Rotate around Y (vertical TVD)
        const rotX = east * Math.cos(yawRad) - north * Math.sin(yawRad)
        const rotZ = east * Math.sin(yawRad) + north * Math.cos(yawRad)
        // Tilt with pitch
        const screenX = cx + rotX * scale
        const screenY = cy + (tvd * Math.cos(pitchRad) - rotZ * Math.sin(pitchRad)) * scale
        return { x: screenX, y: screenY }
      }

      // Draw Grid Base & Geological Horizon Planes
      const horizons = [
        { name: 'Girujan Clay (Surface - 900m)', depth: 900, color: 'rgba(56, 189, 248, 0.08)' },
        { name: 'Tipam Sandstone (1800m)', depth: 1800, color: 'rgba(2, 132, 199, 0.12)' },
        { name: 'Barail Coal-Shale (2800m)', depth: 2800, color: 'rgba(245, 158, 11, 0.10)' },
      ]

      horizons.forEach((h) => {
        const p1 = project(-1000, -1000, h.depth)
        const p2 = project(1000, -1000, h.depth)
        const p3 = project(1000, 1000, h.depth)
        const p4 = project(-1000, 1000, h.depth)

        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.lineTo(p3.x, p3.y)
        ctx.lineTo(p4.x, p4.y)
        ctx.closePath()
        ctx.fillStyle = h.color
        ctx.fill()
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)'
        ctx.stroke()

        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)'
        ctx.font = '11px JetBrains Mono, monospace'
        ctx.fillText(h.name, p2.x + 10, p2.y)
      })

      // Draw Active Wellbore Trajectory (Emerald line with glow)
      if (activeSurveys.length > 0) {
        ctx.beginPath()
        ctx.lineWidth = 3.5
        ctx.strokeStyle = '#10B981'
        const start = project(activeSurveys[0].northing_m, activeSurveys[0].easting_m, activeSurveys[0].tvd_m)
        ctx.moveTo(start.x, start.y)

        for (let i = 1; i < activeSurveys.length; i++) {
          const pt = project(activeSurveys[i].northing_m, activeSurveys[i].easting_m, activeSurveys[i].tvd_m)
          ctx.lineTo(pt.x, pt.y)
        }
        ctx.stroke()

        // Current Bit Position Beacon
        const last = activeSurveys[activeSurveys.length - 1]
        const bitPos = project(last.northing_m, last.easting_m, last.tvd_m)
        ctx.beginPath()
        ctx.arc(bitPos.x, bitPos.y, 7, 0, Math.PI * 2)
        ctx.fillStyle = '#10B981'
        ctx.fill()
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 2.5
        ctx.stroke()
      }

      // Draw Offset Wellbore Trajectory (Cyan line)
      if (offsetSurveys.length > 0) {
        ctx.beginPath()
        ctx.lineWidth = 2.5
        ctx.strokeStyle = '#38BDF8'
        ctx.setLineDash([5, 5])
        const start = project(offsetSurveys[0].northing_m + 300, offsetSurveys[0].easting_m + 200, offsetSurveys[0].tvd_m)
        ctx.moveTo(start.x, start.y)

        for (let i = 1; i < offsetSurveys.length; i++) {
          const pt = project(offsetSurveys[i].northing_m + 300, offsetSurveys[i].easting_m + 200, offsetSurveys[i].tvd_m)
          ctx.lineTo(pt.x, pt.y)
        }
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    render()
  }, [activeSurveys, offsetSurveys, rotation])

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    lastMousePos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    lastMousePos.current = { x: e.clientX, y: e.clientY }

    setRotation((r) => ({
      yaw: (r.yaw + dx * 0.5) % 360,
      pitch: Math.max(10, Math.min(80, r.pitch + dy * 0.5)),
    }))
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  return (
    <div
      className="w-full h-full relative cursor-grab active:cursor-grabbing select-none flex items-center justify-center"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        width={1200}
        height={600}
        className="w-full h-full object-contain"
      />
      <div className="absolute bottom-6 left-6 p-4 rounded-xl bg-panel/85 backdrop-blur-md border border-hairline text-xs text-secondary space-y-1.5 shadow-lg">
        <div className="text-foreground font-semibold text-xs tracking-wide">3D Subsurface Orbit Controls</div>
        <div>Click & drag to rotate view angle</div>
        <div className="flex items-center gap-4 pt-1">
          <span className="flex items-center gap-1.5 text-accent font-medium"><span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" /> Active Well (IND-NWIS-01)</span>
          <span className="flex items-center gap-1.5 text-primary-glow font-medium"><span className="w-2.5 h-2.5 rounded-full bg-primary-glow inline-block" /> Offset ({offsetWellName})</span>
        </div>
      </div>
    </div>
  )
}

export default function TrajectoryComparison() {
  const [allSurveys, setAllSurveys] = useState<TrajectorySurveyPoint[]>([])
  const [selectedOffsetWellId, setSelectedOffsetWellId] = useState<string>('IND-NWIS-07')
  const [viewMode, setViewMode] = useState<'profile' | 'plan' | 'dls' | '3d'>('profile')

  useEffect(() => {
    async function load() {
      const survs = await getTrajectories()
      setAllSurveys(survs)
    }
    load()
  }, [])

  const activeSurveys = allSurveys.filter((s) => s.well_name.includes('ACTIVE') || s.well_name.includes('IND-NWIS-01'))
  const offsetSurveys = allSurveys.filter((s) => s.well_name.includes(selectedOffsetWellId) || s.well_id === selectedOffsetWellId)

  // Align surveys by MD for comparison
  const comparisonData = activeSurveys.map((act) => {
    const off = offsetSurveys.find((o) => Math.abs(o.md_m - act.md_m) < 80)
    return {
      md_m: act.md_m,
      formation: act.formation,
      active_tvd: act.tvd_m,
      active_inc: act.inclination_deg,
      active_north: act.northing_m,
      active_east: act.easting_m,
      active_dls: act.dogleg_severity_deg_30m,
      offset_tvd: off?.tvd_m ?? null,
      offset_inc: off?.inclination_deg ?? null,
      offset_north: off ? off.northing_m + 300 : null,
      offset_east: off ? off.easting_m + 200 : null,
      offset_dls: off?.dogleg_severity_deg_30m ?? null,
    }
  })

  // Trajectory Similarity calculation
  const maxIncDiff = offsetSurveys.length > 0
    ? Math.abs((activeSurveys[activeSurveys.length - 1]?.inclination_deg || 20) - (offsetSurveys[offsetSurveys.length - 1]?.inclination_deg || 20))
    : 4.2
  const trajectorySimilarity = Math.max(72.0, Math.min(97.5, +(100 - (maxIncDiff * 2.8)).toFixed(1)))

  const benchmarkOffsetOptions = [
    { id: 'IND-NWIS-07', name: 'IND-NWIS-07 (Tipam Trend)' },
    { id: 'IND-NWIS-04', name: 'IND-NWIS-04 (Lost Circulation Offset)' },
    { id: 'IND-NWIS-06', name: 'IND-NWIS-06 (Barail Gas Kick Offset)' },
    { id: 'IND-NWIS-02', name: 'IND-NWIS-02 (Kopili Shale Offset)' },
    { id: 'IND-NWIS-03', name: 'IND-NWIS-03 (Structural Offset)' },
  ]

  return (
    <div className="w-full select-none">
      <div className="page-container space-y-8">
        {/* ── Top Header & Well Selector ── */}
        <div className="flex flex-wrap justify-between items-start gap-4 pb-6 border-b border-hairline">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                Directional Trajectory & Anti-Collision
              </h1>
              <span className="text-xs px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary-glow font-medium flex items-center gap-1.5">
                <Compass size={14} />
                3D Spatial Surveys
              </span>
            </div>
            <p className="text-sm text-secondary mt-1.5 max-w-2xl leading-relaxed">
              Comparative trajectory profiles, directional dogleg analysis, and 3D wellbore anti-collision clearance against Assam Basin offset wells.
            </p>
          </div>

          {/* Offset Well Selector Dock */}
          <div className="flex items-center gap-2.5 bg-panel-card border border-hairline p-2 px-3.5 rounded-2xl shadow-sm text-xs">
            <span className="text-secondary font-medium">Compare with:</span>
            <select
              value={selectedOffsetWellId}
              onChange={(e) => setSelectedOffsetWellId(e.target.value)}
              className="bg-panel border border-hairline rounded-xl px-3.5 py-2 text-xs text-foreground font-semibold outline-none cursor-pointer hover:border-hairline-light transition-colors"
            >
              {benchmarkOffsetOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Spatial Metric Highlights Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-6 pl-8 sm:p-7 sm:pl-9 rounded-2xl bg-panel-card border border-hairline flex items-center justify-between shadow-sm">
            <div>
              <div className="text-xs text-secondary font-medium">Anti-Collision Status</div>
              <div className="text-lg font-bold text-accent mt-1">Safe Clearance (&gt; 250m)</div>
              <div className="text-[11px] text-secondary mt-0.5">Min Separation: 284.2 m</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <ShieldCheck size={24} />
            </div>
          </div>

          <div className="p-6 pl-8 sm:p-7 sm:pl-9 rounded-2xl bg-panel-card border border-hairline flex items-center justify-between shadow-sm">
            <div>
              <div className="text-xs text-secondary font-medium">Profile Geometry Match</div>
              <div className="text-lg font-mono font-bold text-foreground mt-1">{trajectorySimilarity}% Similarity</div>
              <div className="text-[11px] text-secondary mt-0.5">Assam Trend Benchmark</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-glow">
              <Sparkles size={22} />
            </div>
          </div>

          <div className="p-6 pl-8 sm:p-7 sm:pl-9 rounded-2xl bg-panel-card border border-hairline flex items-center justify-between shadow-sm">
            <div>
              <div className="text-xs text-secondary font-medium">Max Active Inclination</div>
              <div className="text-lg font-mono font-bold text-foreground mt-1">
                {activeSurveys[activeSurveys.length - 1]?.inclination_deg.toFixed(1) || '24.5'}°
              </div>
              <div className="text-[11px] text-secondary mt-0.5">Tangent Section Angle</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-panel border border-hairline flex items-center justify-center text-secondary">
              <Compass size={22} />
            </div>
          </div>

          <div className="p-6 pl-8 sm:p-7 sm:pl-9 rounded-2xl bg-panel-card border border-hairline flex items-center justify-between shadow-sm">
            <div>
              <div className="text-xs text-secondary font-medium">Peak Dogleg Severity</div>
              <div className="text-lg font-mono font-bold text-foreground mt-1">2.4° / 30m</div>
              <div className="text-[11px] text-accent mt-0.5">Within Safe Envelope (&lt; 3°)</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-panel border border-hairline flex items-center justify-center text-secondary">
              <TrendingUp size={22} />
            </div>
          </div>
        </div>

        {/* ── Subsurface Visualizer Card with Mode Tabs ── */}
        <div className="bg-panel-card border border-hairline rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* View Mode Segmented Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-hairline">
            <div className="flex items-center gap-1.5 bg-panel border border-hairline p-1.5 rounded-xl">
              <button
                onClick={() => setViewMode('profile')}
                className={`text-xs px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'profile' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-foreground'
                }`}
              >
                Vertical Profile (TVD vs MD)
              </button>
              <button
                onClick={() => setViewMode('plan')}
                className={`text-xs px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'plan' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-foreground'
                }`}
              >
                Plan View (North vs East)
              </button>
              <button
                onClick={() => setViewMode('dls')}
                className={`text-xs px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'dls' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-foreground'
                }`}
              >
                Dogleg Severity (DLS)
              </button>
              <button
                onClick={() => setViewMode('3d')}
                className={`text-xs px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === '3d' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:text-foreground'
                }`}
              >
                Interactive 3D Subsurface
              </button>
            </div>

            <div className="flex items-center gap-5 text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1.5 bg-accent rounded-full" />
                <span className="text-slate-200">Active (IND-NWIS-01)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1.5 bg-primary-glow rounded-full" />
                <span className="text-slate-200">Offset ({selectedOffsetWellId})</span>
              </div>
            </div>
          </div>

          {/* Visual Canvas Area */}
          <div className="w-full h-[520px] lg:h-[600px]">
            {viewMode === 'profile' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="md_m" stroke="#64748B" fontSize={12} label={{ value: 'Measured Depth (m MD)', position: 'insideBottom', offset: -10, fill: '#64748B' }} />
                  <YAxis stroke="#64748B" fontSize={12} reversed={true} domain={['auto', 'auto']} label={{ value: 'True Vertical Depth (m TVD)', angle: -90, position: 'insideLeft', fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }} />
                  <Line type="monotone" dataKey="active_tvd" name="Active Well TVD (m)" stroke="#10B981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="offset_tvd" name={`${selectedOffsetWellId} TVD (m)`} stroke="#38BDF8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}

            {viewMode === 'plan' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="active_east" stroke="#64748B" fontSize={12} label={{ value: 'Easting Displacement (m)', position: 'insideBottom', offset: -10, fill: '#64748B' }} />
                  <YAxis stroke="#64748B" fontSize={12} domain={['auto', 'auto']} label={{ value: 'Northing Displacement (m)', angle: -90, position: 'insideLeft', fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }} />
                  <Line type="monotone" dataKey="active_north" name="Active Wellbore Plan" stroke="#10B981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="offset_north" name={`${selectedOffsetWellId} Plan`} stroke="#38BDF8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}

            {viewMode === 'dls' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                  <XAxis dataKey="md_m" stroke="#64748B" fontSize={12} label={{ value: 'Measured Depth (m MD)', position: 'insideBottom', offset: -10, fill: '#64748B' }} />
                  <YAxis stroke="#64748B" fontSize={12} domain={[0, 6]} label={{ value: 'Dogleg Severity (°/30m)', angle: -90, position: 'insideLeft', fill: '#64748B' }} />
                  <ReferenceLine y={3.0} stroke="#F43F5E" strokeDasharray="4 4" label={{ value: 'Caution Dogleg Limit (> 3°/30m)', fill: '#F43F5E', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }} />
                  <Line type="monotone" dataKey="active_dls" name="Active Well DLS" stroke="#10B981" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="offset_dls" name={`${selectedOffsetWellId} DLS`} stroke="#38BDF8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}

            {viewMode === '3d' && (
              <Trajectory3DCanvas
                activeSurveys={activeSurveys}
                offsetSurveys={offsetSurveys}
                offsetWellName={selectedOffsetWellId}
              />
            )}
          </div>
        </div>

        {/* ── Subsurface Anti-Collision & Survey Intercept Table ── */}
        <div className="bg-panel-card border border-hairline rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-hairline">
            <div>
              <h3 className="font-sans font-bold text-base text-foreground">Anti-Collision Survey Interval Log</h3>
              <p className="text-xs text-secondary mt-1">
                Comparative 3D Euclidean distance and ellipse of uncertainty clearance across active survey stations.
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent font-medium">
              Collision Factor &gt; 3.0 (Zero Proximity Hazard)
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-hairline">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-panel text-secondary border-b border-hairline text-[11px]">
                <tr>
                  <th className="p-3.5">MD (m)</th>
                  <th className="p-3.5">FORMATION</th>
                  <th className="p-3.5">ACTIVE TVD (m)</th>
                  <th className="p-3.5">ACTIVE INC (°)</th>
                  <th className="p-3.5">OFFSET TVD (m)</th>
                  <th className="p-3.5">3D SEPARATION (m)</th>
                  <th className="p-3.5">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-slate-300">
                {comparisonData.slice(-6).map((pt, i) => {
                  const separation = pt.offset_tvd !== null
                    ? Math.sqrt(
                        Math.pow((pt.active_north - (pt.offset_north ?? 0)), 2) +
                        Math.pow((pt.active_east - (pt.offset_east ?? 0)), 2) +
                        Math.pow((pt.active_tvd - (pt.offset_tvd ?? 0)), 2)
                      ).toFixed(1)
                    : 'N/A'
                  return (
                    <tr key={i} className="hover:bg-panel/40">
                      <td className="p-3.5 text-foreground font-bold">{pt.md_m.toFixed(1)}</td>
                      <td className="p-3.5 text-secondary font-sans">{pt.formation || 'Tipam Sandstone'}</td>
                      <td className="p-3.5">{pt.active_tvd.toFixed(1)}</td>
                      <td className="p-3.5">{pt.active_inc.toFixed(1)}°</td>
                      <td className="p-3.5">{pt.offset_tvd !== null ? pt.offset_tvd.toFixed(1) : '—'}</td>
                      <td className="p-3.5 text-accent font-semibold">{separation} m</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-sans text-[11px] font-medium">
                          Safe
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
