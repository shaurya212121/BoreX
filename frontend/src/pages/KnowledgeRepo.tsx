import { useEffect, useState } from 'react'

import { motion } from 'framer-motion'
import { Search, Filter, FileText, Layers } from 'lucide-react'
import { supabase, SEVERITY_COLORS, EVENT_LABELS } from '../lib/supabase'
import type { DrillingReport, Well } from '../lib/supabase'

const EVENT_TYPES = ['all', 'stuck_pipe', 'mud_loss', 'kick', 'overpressure', 'normal']

export default function KnowledgeRepo() {
  
  const [reports, setReports] = useState<DrillingReport[]>([])
  const [wells, setWells] = useState<Record<string, Well>>({})
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [minDepth, setMinDepth] = useState('')
  const [maxDepth, setMaxDepth] = useState('')
  const [selected, setSelected] = useState<DrillingReport | null>(null)

  useEffect(() => {
    async function load() {
      const { data: ws } = await supabase.from('wells').select('*')
      if (ws) {
        const map: Record<string, Well> = {}
        ws.forEach((w: Well) => { map[w.id] = w })
        setWells(map)
      }
      const { data: rs } = await supabase
        .from('drilling_reports')
        .select('*')
        .order('depth_m', { ascending: true })
      if (rs) setReports(rs)
    }
    load()
  }, [])

  const filtered = reports.filter((r) => {
    const matchSearch = search === '' ||
      r.notes?.toLowerCase().includes(search.toLowerCase()) ||
      wells[r.well_id]?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.formation?.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || r.event_type === filterType
    const matchMin = minDepth === '' || (r.depth_m ?? 0) >= Number(minDepth)
    const matchMax = maxDepth === '' || (r.depth_m ?? 99999) <= Number(maxDepth)
    return matchSearch && matchType && matchMin && matchMax
  })

  return (
    <div className="flex flex-col h-full bg-bg">


      <div className="flex flex-1 overflow-hidden">
        {/* Filters sidebar */}
        <div className="w-64 border-r border-hairline p-4 flex flex-col gap-4 shrink-0 bg-panel">
          <div>
            <div className="font-mono text-xs text-secondary uppercase tracking-widest mb-2 flex items-center gap-1">
              <Search size={11} /> Search
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Keywords, well name…"
              className="w-full bg-bg border border-hairline px-3 py-2 font-mono text-xs text-foreground placeholder-secondary/50 outline-none focus:border-primary/60 transition-colors"
            />
          </div>

          <div>
            <div className="font-mono text-xs text-secondary uppercase tracking-widest mb-2 flex items-center gap-1">
              <Filter size={11} /> Event Type
            </div>
            <div className="flex flex-col gap-1">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`font-mono text-xs px-3 py-1.5 text-left border transition-all ${
                    filterType === t
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-hairline text-secondary hover:border-foreground/40 hover:text-foreground'
                  }`}
                >
                  {t === 'all' ? 'All Events' : EVENT_LABELS[t] || t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="font-mono text-xs text-secondary uppercase tracking-widest mb-2">Depth Range (m)</div>
            <div className="flex gap-2">
              <input
                type="number"
                value={minDepth}
                onChange={(e) => setMinDepth(e.target.value)}
                placeholder="Min"
                className="w-1/2 bg-bg border border-hairline px-2 py-2 font-mono text-xs text-foreground placeholder-secondary/50 outline-none focus:border-primary/60"
              />
              <input
                type="number"
                value={maxDepth}
                onChange={(e) => setMaxDepth(e.target.value)}
                placeholder="Max"
                className="w-1/2 bg-bg border border-hairline px-2 py-2 font-mono text-xs text-foreground placeholder-secondary/50 outline-none focus:border-primary/60"
              />
            </div>
          </div>

          <button
            onClick={() => { setSearch(''); setFilterType('all'); setMinDepth(''); setMaxDepth('') }}
            className="font-mono text-xs text-secondary border border-hairline px-3 py-2 hover:text-foreground hover:border-foreground/40 transition-all mt-auto"
          >
            Clear Filters
          </button>
        </div>

        {/* Report list */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full text-secondary font-mono text-sm">
              No records match your filters.
            </div>
          ) : (
            <div className="grid gap-2">
              {filtered.map((r, i) => {
                const color = SEVERITY_COLORS[r.event_type === 'stuck_pipe' || r.event_type === 'kick' ? 'high' : r.event_type === 'mud_loss' ? 'medium' : r.event_type === 'overpressure' ? 'high' : 'low'] || '#5C7A89'
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    onClick={() => setSelected(r.id === selected?.id ? null : r)}
                    className="border border-hairline p-4 cursor-pointer hover:border-primary/40 transition-all"
                    style={{ borderLeftColor: r.event_type !== 'normal' ? color : '#3A2A1C', borderLeftWidth: 3 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <FileText size={13} className="text-secondary shrink-0" />
                        <span className="font-grotesk text-sm font-medium text-foreground">
                          {wells[r.well_id]?.name || r.well_id}
                        </span>
                        <span className={`font-mono text-xs px-2 py-0.5 badge-${r.event_type === 'kick' ? 'critical' : r.event_type === 'stuck_pipe' || r.event_type === 'overpressure' ? 'high' : r.event_type === 'mud_loss' ? 'medium' : 'low'}`}>
                          {EVENT_LABELS[r.event_type] || r.event_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="font-mono text-xs text-primary">{r.depth_m?.toFixed(0) ?? '--'}m MD</span>
                        <span className="font-mono text-xs text-secondary">{r.formation}</span>
                        <span className="font-mono text-xs text-secondary/60">
                          {r.report_date ? new Date(r.report_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '--'}
                        </span>
                      </div>
                    </div>

                    {/* Expanded notes */}
                    {selected?.id === r.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-hairline"
                      >
                        <div className="font-mono text-xs text-secondary leading-relaxed mb-2">{r.notes}</div>
                        <div className="font-mono text-xs text-secondary/50">Source: {r.source_document}</div>
                      </motion.div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


