import { Activity } from 'lucide-react'

export default function Telemetry() {
  return (
    <div className="p-8 h-full flex flex-col">
      <h1 className="font-grotesk text-2xl font-bold mb-2">Live Telemetry</h1>
      <p className="font-mono text-xs text-secondary mb-8">Active drilling parameters and sensor readings.</p>
      
      <div className="flex-1 border border-hairline bg-panel flex flex-col items-center justify-center">
        <Activity size={48} className="text-primary/20 mb-4" />
        <p className="font-mono text-sm text-secondary">Awaiting real-time sensor integration...</p>
      </div>
    </div>
  )
}
