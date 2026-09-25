import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Map, Activity, Database, FileText, Settings, LogOut, Layers } from 'lucide-react'

export default function DashboardLayout() {
  const location = useLocation()

  const navItems = [
    { path: '/app/map', icon: <Map size={18} />, label: 'Tactical Map' },
    { path: '/app/telemetry', icon: <Activity size={18} />, label: 'Live Telemetry' },
    { path: '/app/knowledge', icon: <Database size={18} />, label: 'Knowledge Base' },
    { path: '/app/reports', icon: <FileText size={18} />, label: 'Risk Reports' },
  ]

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-hairline bg-panel flex flex-col z-[2000]">
        <div className="h-16 flex items-center px-6 border-b border-hairline">
          <Layers className="text-primary mr-3" size={24} />
          <div className="flex flex-col">
            <span className="font-grotesk font-bold tracking-widest text-sm">NWIS</span>
            <span className="font-mono text-[9px] text-primary">COMMAND CENTER</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all font-mono text-xs tracking-wide
                  ${isActive 
                    ? 'bg-primary/10 text-primary border border-primary/30 shadow-[0_0_15px_rgba(0,255,157,0.1)]' 
                    : 'text-secondary hover:text-foreground hover:bg-white/5 border border-transparent'
                  }`}
              >
                {item.icon}
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-4 border-t border-hairline flex flex-col gap-2">
          <button className="flex items-center gap-3 px-4 py-2 text-secondary hover:text-foreground font-mono text-xs transition-colors">
            <Settings size={16} /> Settings
          </button>
          <NavLink to="/" className="flex items-center gap-3 px-4 py-2 text-danger hover:text-danger/80 font-mono text-xs transition-colors">
            <LogOut size={16} /> Terminate Session
          </NavLink>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col min-w-0">
        {/* Top Status Bar */}
        <header className="h-16 border-b border-hairline bg-panel/50 backdrop-blur-sm flex justify-between items-center px-8 z-10 shrink-0">
          <div className="font-mono text-xs text-secondary">
            ACTIVE WELL: <span className="text-primary font-bold">Volve-A01</span>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-success">SYSTEM SECURE</span>
            </div>
            <div className="text-secondary">
              LAT: 58.44°N | LON: 1.90°E
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <div className="flex-1 overflow-hidden relative">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
