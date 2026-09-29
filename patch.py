with open('C:/Users/Shaurya/OneDrive/Desktop/SIH2/frontend/src/pages/Telemetry.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re
match = re.search(r'(\s+)\{/\* .*?Level 3: Time-Series Trend Charts.*?\*/\}', content)
if match:
    indent = match.group(1)
    replacement = indent + '{/* Innovation #1: Automated Safe Operating Envelope (MWW) */}' + indent + r'''<div className="p-6 sm:p-8 rounded-2xl glass-card flex flex-col md:flex-row items-center gap-6 shadow-[0_0_20px_rgba(56,189,248,0.05)] border border-accent/30 bg-accent/5">
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
        style={{ width: \\%\ }}
      />
      {/* Safe Operating Window */}
      <div 
        className="h-full bg-accent/20 border-r border-warning/50 relative flex items-center justify-center transition-all duration-500"
        style={{ width: \\%\ }}
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
        style={{ left: \calc(\% - 2px)\ }}
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
</div>''' + indent + '{/* ? Level 3: Time-Series Trend Charts ? */}'

    new_content = content[:match.start()] + replacement + content[match.end():]
    with open('C:/Users/Shaurya/OneDrive/Desktop/SIH2/frontend/src/pages/Telemetry.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
