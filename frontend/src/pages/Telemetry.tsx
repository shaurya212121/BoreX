import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Play,
  Pause,
  AlertTriangle,
  ShieldCheck,
  Gauge,
  Zap,
  RotateCw,
  ArrowDownCircle,
  TrendingUp,
  Droplets,
  ChevronDown,
  ChevronUp,
  Sliders,
  RotateCcw, ShieldAlert,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import {
  fetchBackendTelemetry,
  fetchMLRiskPredictions,
  getMudProperties,
  getFormationAtDepth,
} from '../lib/dataService'
import type { MudPropertyRecord } from '../lib/dataService'

export default function Telemetry() {
  const [depth, setDepth] = useState(2480)
  const [isPlaying, setIsPlaying] = useState(false)
  const [telemetry, setTelemetry] = useState<any>(null)
  const [mlRisks, setMlRisks] = useState<any[]>([])
  const [mudRecords, setMudRecords] = useState<MudPropertyRecord[]>([])
  const [readingsHistory, setReadingsHistory] = useState<any[]>([])
  const [showRawLogs, setShowRawLogs] = useState(false)
  const [activeTab, setActiveTab] = useState<'trends' | 'rheology'>('trends')

  const currentFormation = getFormationAtDepth(depth)

  // Fetch telemetry & ML risks
  useEffect(() => {
    let isMounted = true
    async function update() {
      const [telem, riskRes, muds] = await Promise.all([
        fetchBackendTelemetry(depth),
        fetchMLRiskPredictions(depth),
        getMudProperties(),
      ])
      if (!isMounted) return
      setTelemetry(telem)
      if (riskRes?.predicted_risks) {
        setMlRisks(riskRes.predicted_risks)
      }
      setMudRecords(muds)

      const historyPoint = {
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        depth: depth,
        rop: telem?.rop_m_h ?? telem?.ropMh ?? 16.0,
        wob: telem?.wob_klbf ?? telem?.wobKlbf ?? 28.0,
        torque: telem?.torque_kft_lb ?? telem?.torqueKftlb ?? 21.0,
        spp: telem?.standpipe_psi ?? telem?.standpipePsi ?? 2750,
        flow: telem?.flow_rate_gpm ?? telem?.flowRateGpm ?? 620,
        gas: telem?.gas_units ?? telem?.gasUnits ?? 1.4,
      }
      setReadingsHistory((hist) => [...hist.slice(-20), historyPoint])
    }
    update()
    return () => { isMounted = false }
  }, [depth])

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      setDepth((prev) => (prev >= 3650 ? 500 : +(prev + 2.5).toFixed(1)))
    }, 450)
    return () => clearInterval(id)
  }, [isPlaying])

  const primaryRisk = mlRisks[0]
  const isHighRisk = Boolean(telemetry?.active_warning || (primaryRisk && primaryRisk.risk_class === 'CRITICAL'))

  const currentMud = mudRecords.find((m) => Math.abs(m.depth_m - depth) < 250) || mudRecords[0]

  return (
    <div className="w-full select-none">
      <div className="page-container space-y-8">
        {/* Ã¢â€â‚¬Ã¢â€â‚¬ Top Header & Depth Controls Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <div className="flex flex-wrap justify-between items-start gap-4 pb-6 border-b border-hairline">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans">
                Live Telemetry & Rig Sensor Stream
              </h1>
              <span className="text-xs px-3 py-1 rounded-full bg-accent/8 border border-accent/20 text-accent font-medium flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent"></span></span>
                Real-Time Stream
              </span>
            </div>
            <p className="text-sm text-text-muted mt-1.5 max-w-2xl leading-relaxed">
              Real-time subsurface sensor streams synthesized from Upper Assam Basin offset lithologies and real geomechanical pore pressure regimes.
            </p>
          </div>

          {/* Depth Controller Dock */}
          <div className="flex items-center gap-4 glass p-2.5 px-4 rounded-2xl">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  isPlaying
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-primary text-white hover:bg-primary-glow shadow-sm'
                }`}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>
              <button
                onClick={() => { setIsPlaying(false); setDepth(500) }}
                className="p-2 rounded-xl text-text-muted hover:text-foreground hover:bg-panel transition-colors"
                title="Reset depth to 500m"
              >
                <RotateCcw size={15} />
              </button>
            </div>

            <div className="h-6 w-[1px] bg-hairline" />

            <div className="flex items-center gap-3">
              <div className="text-xs">
                <span className="text-text-muted text-[11px]">Current Depth:</span>
                <div className="font-mono font-bold text-sm text-foreground">
                  {depth.toFixed(1)} <span className="text-[11px] text-text-muted font-normal">m MD</span>
                </div>
              </div>
              <input
                type="range"
                min={100}
                max={3650}
                value={depth}
                onChange={(e) => {
                  setIsPlaying(false)
                  setDepth(Number(e.target.value))
                }}
                className="accent-primary cursor-pointer w-36 h-2 bg-slate-800 rounded-lg"
              />
            </div>

            <div className="h-6 w-[1px] bg-hairline" />

            <div className="pr-1 text-right">
              <div className="text-[10px] text-text-muted">FORMATION</div>
              <div className="text-xs font-semibold text-primary-glow truncate max-w-[150px]">
                {currentFormation.name}
              </div>
            </div>
          </div>
        </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Level 1: Operational Status Card (What is happening right now?) Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className={`p-5 sm:p-6 rounded-2xl border transition-all duration-500 ${
        isHighRisk
          ? 'bg-danger/8 border-danger/20 text-slate-100 glow-danger'
          : 'glass-card'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isHighRisk ? 'bg-danger/20 text-danger border border-danger/40' : 'bg-accent/15 text-accent border border-accent/30'
            }`}>
              {isHighRisk ? <AlertTriangle size={22} className="animate-bounce" /> : <ShieldCheck size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  isHighRisk ? 'badge-critical' : 'badge-low'
                }`}>
                  {isHighRisk ? 'ATTENTION REQUIRED' : 'NOMINAL DRILLING ENVELOPE'}
                </span>
                <span className="text-xs text-text-muted">Horizon: {currentFormation.name}</span>
              </div>
              <div className="text-sm sm:text-base font-semibold text-foreground mt-1">
                {telemetry?.active_warning
                  ? telemetry.active_warning
                  : `Drilling operations proceeding within planned technical specifications across ${currentFormation.lithology}.`}
              </div>
            </div>
          </div>

          {primaryRisk && (
            <div className="text-right border-l border-hairline pl-5">
              <div className="text-[11px] text-text-muted">Predicted Hazard Likelihood</div>
              <div className="text-sm font-bold font-mono text-foreground flex items-center gap-2 justify-end mt-0.5">
                <span className={primaryRisk.risk_class === 'CRITICAL' ? 'text-danger' : 'text-primary-glow'}>
                  {primaryRisk.risk_type}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-panel border border-hairline">
                  {primaryRisk.risk_probability}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Level 2: 6 Primary Readable KPI Cards Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Core Drilling Dynamics (Key Parameters)
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* 1. ROP */}
          <div className="p-5 pl-6 sm:p-6 sm:pl-7 rounded-2xl stat-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted mb-3">
              <span className="text-xs font-semibold tracking-wide">ROP</span>
              <ArrowDownCircle size={18} className="text-primary-glow" />
            </div>
            <div>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-foreground">
                {(telemetry?.rop_m_h ?? telemetry?.ropMh ?? 16.0).toFixed(1)}
                <span className="text-xs font-normal text-text-muted ml-1">m/hr</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-hairline/60 text-[11px]">
                <span className="text-text-muted">Safe: 10 - 25</span>
                <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Normal</span>
              </div>
            </div>
          </div>

          {/* 2. WOB */}
          <div className="p-5 pl-6 sm:p-6 sm:pl-7 rounded-2xl stat-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted mb-3">
              <span className="text-xs font-semibold tracking-wide">WOB</span>
              <Gauge size={18} className="text-primary-glow" />
            </div>
            <div>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-foreground">
                {(telemetry?.wob_klbf ?? telemetry?.wobKlbf ?? 28.0).toFixed(1)}
                <span className="text-xs font-normal text-text-muted ml-1">klbf</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-hairline/60 text-[11px]">
                <span className="text-text-muted">Safe: 20 - 35</span>
                <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Normal</span>
              </div>
            </div>
          </div>

          {/* 3. Surface Torque */}
          <div className="p-5 pl-6 sm:p-6 sm:pl-7 rounded-2xl stat-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted mb-3">
              <span className="text-xs font-semibold tracking-wide">Torque</span>
              <Zap size={18} className="text-primary-glow" />
            </div>
            <div>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-foreground">
                {(telemetry?.torque_kft_lb ?? telemetry?.torqueKftlb ?? 21.0).toFixed(1)}
                <span className="text-xs font-normal text-text-muted ml-1">kft-lb</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-hairline/60 text-[11px]">
                <span className="text-text-muted">Threshold: &lt; 26</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${
                  (telemetry?.torque_kft_lb ?? 21.0) > 25 ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-accent'
                }`}>
                  {(telemetry?.torque_kft_lb ?? 21.0) > 25 ? 'Elevated' : 'Normal'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Rotary Speed (RPM) */}
          <div className="p-5 pl-6 sm:p-6 sm:pl-7 rounded-2xl stat-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted mb-3">
              <span className="text-xs font-semibold tracking-wide">Rotary RPM</span>
              <RotateCw size={18} className="text-primary-glow" />
            </div>
            <div>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-foreground">
                {Math.round(telemetry?.rpm ?? 105)}
                <span className="text-xs font-normal text-text-muted ml-1">RPM</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-hairline/60 text-[11px]">
                <span className="text-text-muted">Range: 90 - 120</span>
                <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Optimal</span>
              </div>
            </div>
          </div>

          {/* 5. Standpipe Pressure (SPP) */}
          <div className="p-5 pl-6 sm:p-6 sm:pl-7 rounded-2xl stat-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted mb-3">
              <span className="text-xs font-semibold tracking-wide">SPP</span>
              <Activity size={18} className="text-primary-glow" />
            </div>
            <div>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-foreground">
                {Math.round(telemetry?.standpipe_psi ?? telemetry?.standpipePsi ?? 2750)}
                <span className="text-xs font-normal text-text-muted ml-1">psi</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-hairline/60 text-[11px]">
                <span className="text-text-muted">Safe: 2400-3100</span>
                <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Normal</span>
              </div>
            </div>
          </div>

          {/* 6. Mud Flow Rate */}
          <div className="p-5 pl-6 sm:p-6 sm:pl-7 rounded-2xl stat-card flex flex-col justify-between">
            <div className="flex items-center justify-between text-text-muted mb-3">
              <span className="text-xs font-semibold tracking-wide">Flow Rate</span>
              <Droplets size={18} className="text-primary-glow" />
            </div>
            <div>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-foreground">
                {Math.round(telemetry?.flow_rate_gpm ?? telemetry?.flowRateGpm ?? 620)}
                <span className="text-xs font-normal text-text-muted ml-1">gpm</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-hairline/60 text-[11px]">
                <span className="text-text-muted">Safe: 550-700</span>
                <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Normal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Innovation #1: Automated Safe Operating Envelope (MWW) */}

      <div className="p-6 sm:p-8 rounded-2xl glass-card flex flex-col md:flex-row items-center gap-6 shadow-[0_0_20px_rgba(56,189,248,0.05)] border border-accent/30 bg-accent/5">
  <div className="flex-1">
    <div className="inline-block px-2.5 py-1 rounded-full bg-accent/20 border border-accent/40 text-[10px] font-bold text-accent tracking-widest mb-3">INNOVATION FEATURE 1</div>
    <h3 className="font-sans font-bold text-lg text-foreground mb-1.5 flex items-center gap-2.5">
      <ShieldAlert size={20} className="text-accent" />
      Real-Time Safe Mud-Weight Window
    </h3>
    <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
      Derived dynamically from virtual offset casing/cementing records. This operating envelope calculates precise margins between Formation Pore Pressure (PP) and Fracture Gradient (FG).
    </p>
  </div>
  <div className="w-full md:w-[450px] flex flex-col gap-2">
    <div className="flex justify-between text-[10px] font-mono text-text-muted px-1">
      <span>COLLAPSE RISK (PP)</span>
      <span>FRACTURE RISK (FG)</span>
    </div>
    <div className="h-7 w-full rounded-full bg-slate-900 border border-hairline relative overflow-hidden flex shadow-inner">
      {/* Left danger zone (Underbalance / Collapse) */}
      <div 
        className="h-full bg-danger/20 border-r border-danger/50 transition-all duration-500"
        style={{ width: `${((telemetry?.pore_pressure_sg || 1.1) / 2.0) * 100}%` }}
      />
      {/* Safe Operating Window */}
      <div 
        className="h-full bg-accent/20 border-r border-warning/50 relative flex items-center justify-center transition-all duration-500"
        style={{ width: `${(((telemetry?.fracture_gradient_sg || 1.4) - (telemetry?.pore_pressure_sg || 1.1)) / 2.0) * 100}%` }}
      >
        <div className="text-[10px] font-bold text-accent/60 tracking-wider">SAFE ZONE</div>
      </div>
      {/* Right danger zone (Overbalance / Fracturing) */}
      <div 
        className="h-full bg-warning/20 transition-all duration-500 flex-1"
      />
      {/* Current Live Mud Weight Indicator */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,1)] transition-all duration-500 z-10"
        style={{ left: `calc(${((telemetry?.mud_weight_sg || 1.25) / 2.0) * 100}% - 2px)` }}
      />
    </div>
    <div className="flex justify-between items-center text-xs font-mono font-semibold px-1 mt-1">
      <span className="text-danger">{telemetry?.pore_pressure_sg?.toFixed(2) || '1.10'} SG</span>
      <span className="text-white bg-slate-800 px-2.5 py-1 rounded-md border border-white/20 text-[11px] shadow-lg flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        MW: {telemetry?.mud_weight_sg?.toFixed(2) || '1.25'} SG
      </span>
      <span className="text-warning">{telemetry?.fracture_gradient_sg?.toFixed(2) || '1.40'} SG</span>
    </div>
  </div>
</div>

      {/* ? Level 3: Time-Series Trend Charts ? */}
      <div className="p-6 sm:p-8 rounded-2xl bg-panel-card border border-hairline space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-hairline">
          <div>
            <div className="flex items-center gap-2.5">
              <TrendingUp size={18} className="text-primary-glow" />
              <h3 className="font-sans font-bold text-base text-foreground">Subsurface Sensor Progression & Live Dynamics</h3>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Multi-channel real-time parameter tracking correlated with formation depth window.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-panel border border-hairline p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTab('trends')}
              className={`text-xs px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'trends' ? 'bg-panel-card text-primary-glow shadow-sm' : 'text-text-muted hover:text-foreground'
              }`}
            >
              Drilling Dynamics & Torque
            </button>
            <button
              onClick={() => setActiveTab('rheology')}
              className={`text-xs px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'rheology' ? 'bg-panel-card text-primary-glow shadow-sm' : 'text-text-muted hover:text-foreground'
              }`}
            >
              Mud System & Pressure
            </button>
          </div>
        </div>

        <div className="h-80 sm:h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'trends' ? (
              <AreaChart data={readingsHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ropGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0284C7" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="torqueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="time" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis yAxisId="left" stroke="#38BDF8" fontSize={12} tickLine={false} domain={['auto', 'auto']} />
                <YAxis yAxisId="right" orientation="right" stroke="#F59E0B" fontSize={12} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }} />
                <Area yAxisId="left" type="monotone" dataKey="rop" name="ROP (m/hr)" stroke="#0284C7" strokeWidth={2} fillOpacity={1} fill="url(#ropGrad)" />
                <Area yAxisId="right" type="monotone" dataKey="torque" name="Torque (kft-lb)" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#torqueGrad)" />
              </AreaChart>
            ) : (
              <LineChart data={readingsHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="time" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis yAxisId="spp" stroke="#10B981" fontSize={12} tickLine={false} domain={['auto', 'auto']} />
                <YAxis yAxisId="gas" orientation="right" stroke="#F43F5E" fontSize={12} tickLine={false} domain={[0, 10]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '16px' }} />
                <Line yAxisId="spp" type="monotone" dataKey="spp" name="Standpipe Pressure (psi)" stroke="#10B981" strokeWidth={2} dot={false} />
                <Line yAxisId="gas" type="monotone" dataKey="gas" name="Total Mud Gas (Units)" stroke="#F43F5E" strokeWidth={2} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Level 4: Progressive Disclosure (Collapsible Raw Sensor Logs & Mud Rheology) Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className="border border-hairline rounded-2xl bg-panel-card overflow-hidden shadow-sm">
        <button
          onClick={() => setShowRawLogs(!showRawLogs)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-panel-hover transition-colors"
        >
          <div className="flex items-center gap-3">
            <Sliders size={18} className="text-primary-glow" />
            <span className="font-semibold text-sm text-foreground">
              Engineering Diagnostics & Mud Rheology Specifications
            </span>
            <span className="text-xs text-text-muted font-mono">
              ({currentMud?.mud_type || 'KCL-Polymer Water-Based Mud'} Ã‚Â· {currentMud?.mud_weight_sg || 1.18} SG)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>{showRawLogs ? 'Collapse details' : 'Expand details'}</span>
            {showRawLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {showRawLogs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-hairline p-6 space-y-6"
            >
              {/* Detailed Mud Rheology Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-panel border border-hairline">
                  <div className="text-[11px] text-text-muted">Mud System Type</div>
                  <div className="font-semibold text-foreground mt-1 text-sm">{currentMud?.mud_type || 'KCL-Polymer WBM'}</div>
                </div>
                <div className="p-4 rounded-xl bg-panel border border-hairline">
                  <div className="text-[11px] text-text-muted">Mud Density</div>
                  <div className="font-mono font-bold text-foreground mt-1 text-sm">{currentMud?.mud_weight_sg || 1.18} SG</div>
                </div>
                <div className="p-4 rounded-xl bg-panel border border-hairline">
                  <div className="text-[11px] text-text-muted">Plastic Viscosity (PV)</div>
                  <div className="font-mono font-bold text-foreground mt-1 text-sm">{currentMud?.plastic_viscosity_cp || 18} cP</div>
                </div>
                <div className="p-4 rounded-xl bg-panel border border-hairline">
                  <div className="text-[11px] text-text-muted">Yield Point (YP)</div>
                  <div className="font-mono font-bold text-foreground mt-1 text-sm">{currentMud?.yield_point_lbf_100sqft || 22} lb/100ftÃ‚Â²</div>
                </div>
              </div>

              {/* Raw Sensor Readings Table */}
              <div className="overflow-x-auto rounded-xl border border-hairline">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-panel text-text-muted border-b border-hairline text-[11px]">
                    <tr>
                      <th className="p-3.5">TIMESTAMP</th>
                      <th className="p-3.5">DEPTH (m)</th>
                      <th className="p-3.5">ROP (m/h)</th>
                      <th className="p-3.5">WOB (klbf)</th>
                      <th className="p-3.5">TORQUE</th>
                      <th className="p-3.5">RPM</th>
                      <th className="p-3.5">SPP (psi)</th>
                      <th className="p-3.5">FLOW (gpm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline text-slate-300">
                    {readingsHistory.slice(-5).reverse().map((r, i) => (
                      <tr key={i} className="hover:bg-panel/40">
                        <td className="p-3.5 text-text-muted">{r.time}</td>
                        <td className="p-3.5 text-foreground font-bold">{r.depth.toFixed(1)}</td>
                        <td className="p-3.5">{r.rop.toFixed(1)}</td>
                        <td className="p-3.5">{r.wob.toFixed(1)}</td>
                        <td className="p-3.5">{r.torque.toFixed(1)}</td>
                        <td className="p-3.5">{Math.round(telemetry?.rpm ?? 105)}</td>
                        <td className="p-3.5">{Math.round(r.spp)}</td>
                        <td className="p-3.5">{Math.round(r.flow)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </div>
  )
}
