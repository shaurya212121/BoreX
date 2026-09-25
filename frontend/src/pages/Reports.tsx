import { Download } from 'lucide-react'

export default function Reports() {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="font-grotesk text-2xl font-bold mb-2">Risk Reports</h1>
          <p className="font-mono text-xs text-secondary">Generate exportable dossiers for operational review.</p>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-bg font-bold font-mono text-xs hover:bg-primary/90 transition-colors"
        >
          <Download size={14} /> EXPORT PDF DOSSIER
        </button>
      </div>
      
      {/* Mock Dossier Preview */}
      <div className="flex-1 bg-white text-black p-8 overflow-y-auto max-w-4xl mx-auto w-full shadow-2xl printable-area">
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">NWIS RISK DOSSIER</h2>
            <p className="font-mono text-sm">Well: VOLVE-A01 | Sector: North Sea</p>
          </div>
          <div className="text-right font-mono text-xs text-gray-500">
            Generated: {new Date().toLocaleDateString()}
          </div>
        </div>
        
        <p className="text-sm leading-relaxed mb-6">
          This document summarizes the correlated risks encountered and anticipated based on nearby offset wells. Ensure all drillers review the High and Critical warnings before continuing past 3500m True Vertical Depth (TVD).
        </p>

        <h3 className="font-bold text-lg border-b border-gray-300 pb-2 mb-4">IDENTIFIED RISKS</h3>
        <table className="w-full text-left font-mono text-sm mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">DEPTH (m)</th>
              <th className="p-2">SEVERITY</th>
              <th className="p-2">TYPE</th>
              <th className="p-2">OFFSET WELL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 border-b">1250</td>
              <td className="p-2 border-b font-bold text-red-600">CRITICAL</td>
              <td className="p-2 border-b">Well Control / Kick</td>
              <td className="p-2 border-b">Volve-A05</td>
            </tr>
            <tr>
              <td className="p-2 border-b">2100</td>
              <td className="p-2 border-b font-bold text-orange-500">HIGH</td>
              <td className="p-2 border-b">Mud Loss</td>
              <td className="p-2 border-b">Volve-A02</td>
            </tr>
            <tr>
              <td className="p-2 border-b">3400</td>
              <td className="p-2 border-b font-bold text-red-600">CRITICAL</td>
              <td className="p-2 border-b">Stuck Pipe</td>
              <td className="p-2 border-b">Volve-A11</td>
            </tr>
          </tbody>
        </table>
        
        <div className="text-xs text-gray-500 text-center mt-12 border-t pt-4">
          AUTOMATED INTELLIGENCE REPORT · DO NOT DISTRIBUTE UNSECURED
        </div>
      </div>
    </div>
  )
}

