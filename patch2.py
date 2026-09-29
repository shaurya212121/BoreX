import re

with open('C:/Users/Shaurya/OneDrive/Desktop/SIH2/frontend/src/pages/Reports.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'(\s+)\{/\* .*?Level 2: Search & Filter Toolbar.*?\*/\}', content)
if match:
    indent = match.group(1)
    replacement = indent + '{/* Innovation #2: Automated Event Logging (DDR Auto-Drafts) */}' + indent + r'''{autoDrafts.length > 0 && (
  <div className="rounded-2xl glass-card flex flex-col p-6 sm:p-8 shadow-[0_0_20px_rgba(16,185,129,0.05)] border border-primary/30 bg-primary/5">
    <div className="flex justify-between items-start mb-6">
      <div>
        <div className="inline-block px-2.5 py-1 rounded-full bg-primary/20 border border-primary/40 text-[10px] font-bold text-primary-glow tracking-widest mb-3">INNOVATION FEATURE 2</div>
        <h3 className="font-sans font-bold text-lg text-foreground mb-1.5 flex items-center gap-2.5">
          <FileText size={20} className="text-primary-glow" />
          AI-Automated Daily Drilling Reports (DDR)
        </h3>
        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
          When the telemetry stream detects an active anomaly (e.g. mud loss, stuck pipe), the system automatically drafts a structured DDR entry pre-populated with exact depth, formation, and sensor snapshots.
        </p>
      </div>
      <div className="text-xs font-mono font-bold text-primary-glow px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
        {autoDrafts.length} DRAFTS PENDING REVIEW
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {autoDrafts.map((draft, idx) => (
        <div key={idx} className="bg-panel border border-hairline rounded-xl p-4 hover:border-primary/50 transition-colors group cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 bg-primary/20 rounded-bl-xl border-b border-l border-primary/30 text-[10px] font-bold text-primary-glow">
            {draft.hazard_code}
          </div>
          <div className="text-[10px] font-mono text-text-muted mb-1">{new Date(draft.timestamp || Date.now()).toLocaleDateString()}</div>
          <div className="font-bold text-sm text-foreground mb-3">{draft.formation}</div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div>
              <div className="text-[10px] text-text-muted">Depth</div>
              <div className="font-mono">{draft.depth_m}m</div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted">Standpipe</div>
              <div className="font-mono">{draft.standpipe_psi} psi</div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted">ROP</div>
              <div className="font-mono">{draft.rop_m_h} m/hr</div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted">Mud Wt.</div>
              <div className="font-mono">{draft.mud_weight_sg} SG</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-300 italic mb-4 line-clamp-2">
            "Auto-detected telemetry anomaly: {draft.status_text}"
          </p>
          <button className="w-full py-2 bg-primary/10 group-hover:bg-primary/20 text-primary-glow border border-primary/30 rounded-lg text-xs font-bold transition-colors">
            Review & Approve
          </button>
        </div>
      ))}
    </div>
  </div>
)}''' + indent + match.group(0).strip()

    new_content = content[:match.start()] + replacement + content[match.end():]
    with open('C:/Users/Shaurya/OneDrive/Desktop/SIH2/frontend/src/pages/Reports.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
