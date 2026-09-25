import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import DashboardLayout from './components/DashboardLayout'
import TacticalMap from './pages/TacticalMap'
import KnowledgeRepo from './pages/KnowledgeRepo'
import Telemetry from './pages/Telemetry'
import Reports from './pages/Reports'
import TrajectoryComparison from './pages/TrajectoryComparison'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Unified App Shell */}
        <Route path="/app" element={<DashboardLayout />}>
          <Route path="map" element={<TacticalMap />} />
          <Route path="telemetry" element={<Telemetry />} />
          <Route path="knowledge" element={<KnowledgeRepo />} />
          <Route path="reports" element={<Reports />} />
          <Route path="trajectory" element={<TrajectoryComparison />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
