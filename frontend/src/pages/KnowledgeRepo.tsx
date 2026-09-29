import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Bot,
  ShieldAlert,
  Database,
  ExternalLink,
} from 'lucide-react'

export interface HistoricalDoc {
  id: string
  name: string
  type: string
  event: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  formation: string
  well: string
  depth: number
  executiveSummary: string
  whyItMatters: string
  mitigation: string
  text: string
  confidence: number
  entities: { label: string; value: string }[]
}

const SAMPLE_HISTORICAL_DOCS: HistoricalDoc[] = [
  {
    id: 'doc-01',
    name: 'DDR_IND-NWIS-04_1820m.pdf',
    type: 'Daily Drilling Report',
    event: 'Lost Circulation',
    severity: 'HIGH',
    formation: 'Upper Tipam Sandstone Fm.',
    well: 'IND-NWIS-04',
    depth: 1820,
    executiveSummary: 'Total mud loss encountered at 1820m MD in porous sandstone. Standpipe pressure dropped by 280 psi with 45 bbl pit loss in 12 minutes.',
    whyItMatters: 'Uncontrolled mud losses in this porous interval can lead to hydrostatic column loss and subsequent well control risk if gas sands lie beneath.',
    mitigation: 'Mixed 35 bbl LCM nut-plug pill; pulled string into 9-5/8 casing shoe at 1450m until returns were regained at 450 gpm.',
    text: 'Total mud loss encountered at 1820m MD in porous Upper Tipam Sandstone Fm. Bit 12-1/4 PDC M1955. Pit dropped 45 bbl in 12 min. Standpipe dropped from 2800 psi to 2520 psi. Pulled into 9-5/8 casing shoe at 1450m. Mixed 35 bbl LCM nut-plug pill. Regained returns at 450 gpm on IND-NWIS-04.',
    confidence: 0.94,
    entities: [
      { label: 'WELL', value: 'IND-NWIS-04' },
      { label: 'DEPTH', value: '1820m MD' },
      { label: 'FORMATION', value: 'Upper Tipam Sandstone Fm.' },
      { label: 'EVENT', value: 'Lost Circulation' },
      { label: 'MUD LOSS', value: '45 bbl in 12 min' },
      { label: 'MITIGATION', value: '35 bbl LCM nut-plug pill' },
    ]
  },
  {
    id: 'doc-02',
    name: 'DDR_IND-NWIS-07_2480m.pdf',
    type: 'Incident Investigation Report',
    event: 'Differential Sticking',
    severity: 'CRITICAL',
    formation: 'Lower Tipam Sandstone Fm.',
    well: 'IND-NWIS-07',
    depth: 2480,
    executiveSummary: 'BHA became differentially stuck against depleted sandstone reservoir during connection at 2480m MD. 80,000 lbs overpull observed.',
    whyItMatters: 'Differential sticking is the highest NPT (non-productive time) contributor in Assam Basin drilling, frequently causing stuck pipe and sidetracks.',
    mitigation: 'Spotted 40 bbl diesel-based soaking fluid across drill collars and jarred downward at maximum safe tripping load.',
    text: 'Pipe stuck due to differential sticking at 2480m MD in Lower Tipam Sandstone Fm. Maximum overpull 80,000 lbs on IND-NWIS-07. ROP was 7.5 m/hr, torque spiked to 28.5 kft-lb, mud weight 1.22 SG. Spotting 40 bbl diesel-based soaking fluid across drill collars.',
    confidence: 0.96,
    entities: [
      { label: 'WELL', value: 'IND-NWIS-07' },
      { label: 'DEPTH', value: '2480m MD' },
      { label: 'FORMATION', value: 'Lower Tipam Sandstone Fm.' },
      { label: 'EVENT', value: 'Differential Sticking' },
      { label: 'OVERPULL', value: '80,000 lbs' },
      { label: 'SOAKING FLUID', value: '40 bbl diesel pill' },
    ]
  },
  {
    id: 'doc-03',
    name: 'DDR_IND-NWIS-06_3120m.pdf',
    type: 'Well Control Audit',
    event: 'Gas Influx / Kick',
    severity: 'CRITICAL',
    formation: 'Barail Coal-Shale Fm.',
    well: 'IND-NWIS-06',
    depth: 3120,
    executiveSummary: 'Gas influx detected in deep overpressured Barail coal sequence. 24 bbl pit gain observed with mud gas spike to 28.4%.',
    whyItMatters: 'Immediate well shut-in required to prevent influx migration and protect crew and rig integrity.',
    mitigation: 'Annular preventer shut in. Executed Driller\'s Method well kill and weighted mud from 1.28 SG to 1.41 SG.',
    text: 'Gas kick observed at 3120m MD in Barail Coal-Shale Fm. Recorded pit gain of 24 bbl on well IND-NWIS-06. Mud gas spiked to 28.4%. Shut in well on annular preventer. SIDPP 380 psi, SICP 520 psi. Executed Driller\'s Method well kill and weighted mud to 1.41 SG.',
    confidence: 0.93,
    entities: [
      { label: 'WELL', value: 'IND-NWIS-06' },
      { label: 'DEPTH', value: '3120m MD' },
      { label: 'FORMATION', value: 'Barail Coal-Shale Fm.' },
      { label: 'EVENT', value: 'Gas Influx / Kick' },
      { label: 'PIT GAIN', value: '24 bbl' },
      { label: 'KILL MUD', value: 'Weighted to 1.41 SG' },
    ]
  },
  {
    id: 'doc-04',
    name: 'EOWR_IND-NWIS-02_Summary.pdf',
    type: 'End of Well Report',
    event: 'Shale Sloughing',
    severity: 'MEDIUM',
    formation: 'Kopili Shale Formation',
    well: 'IND-NWIS-02',
    depth: 3450,
    executiveSummary: 'Substantial cavings and tight hole experienced across reactive Kopili shale sequence. Torque fluctuations up to 24 kft-lb.',
    whyItMatters: 'Chemical hydration of swelling smectite-illite clays causes borehole collapse and pack-offs if inhibited mud is not used.',
    mitigation: 'Raised KCl polymer inhibitor to 7% and conducted wiper trips prior to logging suites.',
    text: 'Drilling Kopili Shale section at 3450m encountered tight hole and cavings over shakers. Reaming required on connections. Mud treated with 7% KCl and polyamine shale stabilizer.',
    confidence: 0.91,
    entities: [
      { label: 'WELL', value: 'IND-NWIS-02' },
      { label: 'DEPTH', value: '3450m MD' },
      { label: 'FORMATION', value: 'Kopili Shale Formation' },
      { label: 'EVENT', value: 'Shale Sloughing' },
      { label: 'INHIBITOR', value: '7% KCl Polymer' },
    ]
  },
  {
    id: 'doc-05',
    name: 'DDR_IND-NWIS-03_960m.pdf',
    type: 'Daily Drilling Report',
    event: 'Bit Balling & Low ROP',
    severity: 'LOW',
    formation: 'Girujan Clay Formation',
    well: 'IND-NWIS-03',
    depth: 960,
    executiveSummary: 'Gumby clay accumulation on bit cutters reduced penetration rate to 3.2 m/hr in shallow unconsolidated section.',
    whyItMatters: 'Bit balling leads to wasted rig hours and risks premature bit pull before reaching the casing seat.',
    mitigation: 'Increased mud flow rate to 720 gpm and pumped 25 bbl high-viscosity bentonite sweep.',
    text: 'Drilling 17-1/2 section at 960m MD in Girujan Clay. ROP dropped to 3.2 m/hr due to sticky clay accumulation on bit nozzles. Pumped 25 bbl bentonite sweep and increased pump stroke to 110 spm. Normal drilling resumed at 18 m/hr.',
    confidence: 0.95,
    entities: [
      { label: 'WELL', value: 'IND-NWIS-03' },
      { label: 'DEPTH', value: '960m MD' },
      { label: 'FORMATION', value: 'Girujan Clay Formation' },
      { label: 'EVENT', value: 'Bit Balling' },
      { label: 'SWEEP', value: '25 bbl High-Vis Sweep' },
    ]
  },
]

export default function KnowledgeRepo() {
  const [selectedDoc, setSelectedDoc] = useState<HistoricalDoc>(SAMPLE_HISTORICAL_DOCS[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [showRawText, setShowRawText] = useState(false)
  const [isProcessingNLP, setIsProcessingNLP] = useState(false)

  const filteredDocs = useMemo(() => {
    return SAMPLE_HISTORICAL_DOCS.filter((doc) => {
      if (selectedCategory !== 'ALL' && doc.type !== selectedCategory) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          doc.name.toLowerCase().includes(q) ||
          doc.event.toLowerCase().includes(q) ||
          doc.formation.toLowerCase().includes(q) ||
          doc.well.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [searchQuery, selectedCategory])

  const handleSimulateNLP = () => {
    setIsProcessingNLP(true)
    setTimeout(() => {
      setIsProcessingNLP(false)
    }, 450)
  }

  return (
    <div className="w-full select-none relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-black to-black min-h-screen">
      {/* Background Neural Grid / Cyber Texture Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      <div className="page-container space-y-8 relative z-10 p-4 sm:p-8">
        {/* ── Top Header ── */}
        <div className="flex flex-wrap justify-between items-start gap-4 pb-6 border-b border-hairline">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sans drop-shadow-md">
                Document Intelligence Workspace
              </h1>
              <span className="text-xs px-3.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary-glow font-medium flex items-center gap-1.5 shadow-[0_0_10px_rgba(56,189,248,0.15)]">
                <Sparkles size={13} />
                NLP Knowledge Base
              </span>
            </div>
            <p className="text-sm text-text-muted mt-1.5 max-w-2xl leading-relaxed">
              Automated entity extraction and incident distillation from historical Assam Basin daily drilling logs, EOWRs, and well control audits.
            </p>
          </div>

          <button
            onClick={handleSimulateNLP}
            disabled={isProcessingNLP}
            className="flex items-center gap-2 px-5 py-2.5 border border-primary-glow bg-primary-glow/10 text-primary-glow rounded-xl text-xs font-medium transition-all hover:shadow-[0_0_15px_rgba(56,189,248,0.5)] hover:bg-primary-glow/20 cursor-pointer backdrop-blur-sm"
          >
            {isProcessingNLP ? (
              <>
                <Loader2 size={15} className="animate-spin text-primary-glow" /> Re-parsing OCR...
              </>
            ) : (
              <>
                <Bot size={16} className="text-primary-glow" /> Run Pipeline on Document
              </>
            )}
          </button>
        </div>

        {/* ── Main Two-Column Document Intelligence Workspace ── */}
        <div className="flex flex-col lg:flex-row gap-8 items-stretch">
          {/* Left Column: Document Browser */}
          <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col glass-card rounded-2xl overflow-hidden shrink-0 shadow-sm backdrop-blur-md bg-slate-900/40 border border-hairline">
            {/* Search Box & Filters */}
            <div className="p-6 border-b border-hairline space-y-4">
              <div className="relative flex items-center">
                <div className="absolute left-4 pointer-events-none flex items-center justify-center text-text-muted">
                  <Search size={16} className="text-primary-glow" />
                </div>
                <input
                  type="text"
                  placeholder="Search offset reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '3.25rem' }}
                  className="w-full bg-black/50 border border-hairline rounded-xl pr-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-text-muted/60 outline-none focus:border-primary-glow focus:ring-1 focus:ring-primary-glow/30 transition-all shadow-inner backdrop-blur-sm"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {['ALL', 'Daily Drilling Report', 'Incident Investigation Report', 'End of Well Report'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-[11px] px-3.5 py-1.5 rounded-lg shrink-0 font-medium transition-all ${
                      selectedCategory === cat
                        ? 'bg-primary text-white shadow-[0_0_10px_rgba(56,189,248,0.3)] border border-primary-glow/50'
                        : 'text-text-muted glass-subtle hover:text-foreground hover:bg-white/[0.06] border border-transparent'
                    }`}
                  >
                    {cat === 'Daily Drilling Report' ? 'DDR' : cat === 'Incident Investigation Report' ? 'Incident' : cat === 'End of Well Report' ? 'EOWR' : 'All'}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Items List */}
            <div className="p-4 space-y-3 flex-1 overflow-y-auto min-h-[480px] max-h-[640px]">
              {filteredDocs.map((doc) => {
                const isSelected = selectedDoc.id === doc.id
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-5 pl-7 rounded-xl cursor-pointer transition-all border relative overflow-hidden backdrop-blur-sm ${
                      isSelected
                        ? 'bg-primary-glow/5 border-primary-glow/60 shadow-[inset_0_0_15px_rgba(56,189,248,0.1)] ring-1 ring-primary-glow/30 border-l-4 border-l-primary-glow'
                        : 'border-hairline bg-black/20 hover:bg-black/40 hover:border-hairline-light'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-bold text-xs sm:text-sm text-foreground font-sans truncate">{doc.name}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                        doc.severity === 'CRITICAL' ? 'badge-critical shadow-[0_0_8px_rgba(239,68,68,0.4)]' : doc.severity === 'HIGH' ? 'badge-high shadow-[0_0_8px_rgba(249,115,22,0.4)]' : 'badge-low shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                      }`}>
                        {doc.severity}
                      </span>
                    </div>
                    <div className="text-xs text-primary-glow font-semibold mt-2 truncate">
                      {doc.event}
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-muted mt-3 pt-2.5 border-t border-hairline/60">
                      <span className="font-medium">{doc.well}</span>
                      <span className="font-mono text-foreground font-semibold">{doc.depth}m MD</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Structured Document Intelligence View */}
          <div className="flex-1 w-full flex flex-col backdrop-blur-xl bg-slate-900/40 border border-primary-glow/20 rounded-2xl p-7 sm:p-9 space-y-8 shadow-[inset_0_0_30px_rgba(56,189,248,0.05),0_0_20px_rgba(0,0,0,0.5)] overflow-hidden min-h-[640px]">
            {/* Header of Active Document */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-primary-glow/20">
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-primary/10 border border-primary-glow/50 text-primary-glow shadow-[0_0_8px_rgba(56,189,248,0.2)]">
                    {selectedDoc.type}
                  </span>
                  <span className="text-xs text-text-muted font-mono">
                    Extraction Confidence: <strong className="text-primary-glow drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]">{(selectedDoc.confidence * 100).toFixed(0)}% Macro-F1</strong>
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-sans drop-shadow-sm">{selectedDoc.name}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-text-muted">
                  <span>Well: <strong className="text-foreground">{selectedDoc.well}</strong></span>
                  <span>·</span>
                  <span>Depth: <strong className="text-foreground font-mono">{selectedDoc.depth}m MD</strong></span>
                  <span>·</span>
                  <span>Formation: <strong className="text-foreground">{selectedDoc.formation}</strong></span>
                </div>
              </div>

              <span className={`text-xs font-bold px-4 py-2 rounded-full border ${
                selectedDoc.severity === 'CRITICAL' ? 'badge-critical border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : selectedDoc.severity === 'HIGH' ? 'badge-high border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'badge-low border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
              }`}>
                {selectedDoc.event} ({selectedDoc.severity})
              </span>
            </div>

            {/* Level 1: What happened & Why it matters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 sm:p-7 pl-7 sm:pl-8 rounded-2xl bg-primary/5 border-l-4 border-l-primary-glow border-t-hairline border-r-hairline border-b-hairline shadow-[inset_0_0_20px_rgba(56,189,248,0.05)] space-y-3 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <BookOpen size={64} />
                </div>
                <div className="text-xs font-semibold text-primary-glow uppercase tracking-wider flex items-center gap-2 drop-shadow-[0_0_5px_rgba(56,189,248,0.3)]">
                  <BookOpen size={16} />
                  <span>What Happened (Operational Summary)</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-normal relative z-10">
                  {selectedDoc.executiveSummary}
                </p>
              </div>

              <div className="p-6 sm:p-7 pl-7 sm:pl-8 rounded-2xl bg-warning/5 border-l-4 border-l-warning border-t-hairline border-r-hairline border-b-hairline shadow-[inset_0_0_20px_rgba(245,158,11,0.05)] space-y-3 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <ShieldAlert size={64} />
                </div>
                <div className="text-xs font-semibold text-warning uppercase tracking-wider flex items-center gap-2 drop-shadow-[0_0_5px_rgba(245,158,11,0.3)]">
                  <ShieldAlert size={16} />
                  <span>Why It Matters (Risk Consequence)</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-normal relative z-10">
                  {selectedDoc.whyItMatters}
                </p>
              </div>
            </div>

            {/* Level 2: Extracted Key Entities & Recommended Mitigation */}
            <div className="p-7 sm:p-8 pl-8 sm:pl-9 rounded-2xl bg-black/30 border border-primary-glow/10 space-y-6 shadow-[inset_0_0_15px_rgba(0,0,0,0.4)] backdrop-blur-md">
              <div className="flex items-center justify-between pb-3.5 border-b border-primary-glow/20">
                <div className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2.5">
                  <Sparkles size={16} className="text-primary-glow drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]" />
                  <span>Extracted NER Intelligence Entities</span>
                </div>
                <span className="text-[11px] text-primary-glow/60 font-mono">Assam LithoNER Grounded</span>
              </div>

              <div className="flex flex-wrap gap-3">
                {selectedDoc.entities.map((ent, i) => (
                  <div
                    key={i}
                    className="px-4.5 py-2.5 rounded-xl border border-primary-glow/50 bg-primary-glow/10 text-primary-glow shadow-[0_0_10px_rgba(56,189,248,0.2)] text-xs flex items-center gap-2.5 backdrop-blur-sm"
                  >
                    <span className="text-[10px] opacity-70 font-mono uppercase font-semibold">{ent.label}:</span>
                    <span className="font-semibold text-white drop-shadow-sm">{ent.value}</span>
                  </div>
                ))}
              </div>

              <div className="p-5 sm:p-6 pl-7 sm:pl-8 rounded-xl bg-primary/5 border border-primary/20 space-y-2 backdrop-blur-sm">
                <div className="text-xs font-semibold text-primary-glow flex items-center gap-2 drop-shadow-[0_0_5px_rgba(56,189,248,0.3)]">
                  <CheckCircle2 size={16} />
                  <span>Executed Mitigation Action</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {selectedDoc.mitigation}
                </p>
              </div>
            </div>

            {/* Level 3: Expandable Raw Engineering Transcript */}
            <div className="border border-primary-glow/20 rounded-2xl bg-black/40 overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.3)] backdrop-blur-md">
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="w-full p-5 pl-7 sm:pl-8 flex items-center justify-between text-left hover:bg-primary-glow/5 transition-colors cursor-pointer"
              >
                <span className="text-xs sm:text-sm font-semibold text-slate-300 flex items-center gap-2.5">
                  <FileText size={16} className="text-primary-glow" />
                  Original Scanned Text & OCR Raw Output
                </span>
                <div className="flex items-center gap-2 text-xs text-primary-glow/70 font-medium">
                  <span>{showRawText ? 'Hide' : 'Show'} raw report</span>
                  {showRawText ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              <AnimatePresence>
                {showRawText && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-primary-glow/20 p-6 pl-8 bg-black/60 font-mono text-xs text-primary-glow/80 leading-relaxed"
                  >
                    {selectedDoc.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Subsurface Knowledge Base Corpus & Correlation Matrix ── */}
        <div className="backdrop-blur-md bg-slate-900/40 border border-hairline rounded-2xl p-7 sm:p-8 space-y-5 shadow-[0_0_20px_rgba(0,0,0,0.3)] relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-hairline">
            <div>
              <div className="flex items-center gap-2.5">
                <Database size={18} className="text-primary-glow drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]" />
                <h3 className="font-sans font-semibold text-base text-foreground drop-shadow-sm">
                  Assam Basin Offset Incident Corpus & Lithological Index
                </h3>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Cataloged historical offset well files indexed into the eRTMAC-NWIS unstructured document retrieval pipeline.
              </p>
            </div>
            <span className="text-xs px-3.5 py-1 rounded-full bg-primary-glow/10 border border-primary-glow/30 text-primary-glow font-medium shadow-[0_0_10px_rgba(56,189,248,0.15)]">
              5 Verified Records · LithoNER Pipeline Active
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-hairline bg-black/40">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-black/60 text-text-muted border-b border-hairline text-[11px]">
                <tr>
                  <th className="p-4 pl-6">DOCUMENT ID / FILE</th>
                  <th className="p-4">WELL</th>
                  <th className="p-4">INCIDENT EVENT</th>
                  <th className="p-4">FORMATION</th>
                  <th className="p-4">DEPTH</th>
                  <th className="p-4">SEVERITY</th>
                  <th className="p-4 pr-6 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-slate-300 font-sans">
                {SAMPLE_HISTORICAL_DOCS.map((doc) => {
                  const isSelected = selectedDoc.id === doc.id
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary-glow/10 text-foreground font-medium' : 'hover:bg-primary-glow/5'
                      }`}
                    >
                      <td className="p-4 pl-6 font-mono text-xs font-semibold text-foreground flex items-center gap-2">
                        <FileText size={15} className="text-primary-glow shrink-0" />
                        <span className="truncate max-w-[220px]">{doc.name}</span>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-200">{doc.well}</td>
                      <td className="p-4 text-primary-glow font-medium drop-shadow-[0_0_3px_rgba(56,189,248,0.3)]">{doc.event}</td>
                      <td className="p-4 text-text-muted">{doc.formation}</td>
                      <td className="p-4 font-mono text-xs font-bold text-foreground">{doc.depth}m MD</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          doc.severity === 'CRITICAL' ? 'badge-critical border-red-500/30' : doc.severity === 'HIGH' ? 'badge-high border-orange-500/30' : 'badge-low border-green-500/30'
                        }`}>
                          {doc.severity}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDoc(doc)
                          }}
                          className={`text-xs px-3 py-1 rounded-lg border transition-colors inline-flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-primary border-primary text-white shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                              : 'bg-black/30 border-hairline text-text-muted hover:text-primary-glow hover:border-primary-glow/50'
                          }`}
                        >
                          {isSelected ? 'Active' : 'Inspect'}
                          <ExternalLink size={12} />
                        </button>
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
