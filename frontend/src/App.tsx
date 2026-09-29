import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import LandingPage from './pages/LandingPage'
import DashboardLayout from './components/DashboardLayout'
import TacticalMap from './pages/TacticalMap'
import KnowledgeRepo from './pages/KnowledgeRepo'
import Telemetry from './pages/Telemetry'
import Reports from './pages/Reports'
import TrajectoryComparison from './pages/TrajectoryComparison'
import { DDRStoreProvider } from './lib/ddrStore'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
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
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <DDRStoreProvider>
      <BrowserRouter>
        <div className="noise-overlay">
          <AnimatedRoutes />
        </div>
      </BrowserRouter>
    </DDRStoreProvider>
  )
}
