import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { ChevronDown, Layers, AlertTriangle, Map } from 'lucide-react'

// ─── Geological Strata Scene ────────────────────────────────────────────────
const STRATA_LAYERS = [
  { y: 1.8,  h: 0.5,  color: '#8B7355', label: 'Overburden / Soil' },
  { y: 1.1,  h: 0.6,  color: '#6B5040', label: 'Clay & Silt' },
  { y: 0.3,  h: 0.7,  color: '#4A3728', label: 'Shale' },
  { y: -0.5, h: 0.7,  color: '#5C4A38', label: 'Limestone / Chalk' },
  { y: -1.3, h: 0.7,  color: '#3A2A1C', label: 'Deep Shale' },
  { y: -2.1, h: 0.7,  color: '#2A1A0C', label: 'Reservoir Sandstone' },
  { y: -2.9, h: 0.7,  color: '#1A0A04', label: 'Basement Rock' },
]

function StrataLayer({ y, h, color }: { y: number; h: number; color: string }) {
  return (
    <mesh position={[0, y, 0]}>
      <boxGeometry args={[8, h, 2]} />
      <meshStandardMaterial color={color} roughness={0.95} metalness={0.05} />
    </mesh>
  )
}

function DrillBit() {
  const ref = useRef<THREE.Mesh>(null)
  const t = useRef(0)
  useFrame((_, delta) => {
    t.current += delta * 0.15
    if (ref.current) {
      // Loop: 2.2 (surface) → -3.2 (TD), then snap back
      const y = 2.2 - ((t.current % 6) / 6) * 5.4
      ref.current.position.y = y
    }
  })
  return (
    <mesh ref={ref} position={[0, 2.2, 0.5]}>
      <coneGeometry args={[0.06, 0.25, 8]} />
      <meshStandardMaterial color="#C1622B" emissive="#C1622B" emissiveIntensity={0.4} />
    </mesh>
  )
}

function WellboreLine() {
  const points = [new THREE.Vector3(0, 2.4, 0.5), new THREE.Vector3(0, -3.4, 0.5)]
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  const mat = new THREE.LineBasicMaterial({ color: "#EDE0D0", linewidth: 1, opacity: 0.3, transparent: true })
  
  return (
    <primitive object={new THREE.Line(geo, mat)} />
  )
}

function DustParticles() {
  const ref = useRef<THREE.Points>(null)
  const count = 200
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 10
    positions[i * 3 + 1] = (Math.random() - 0.5) * 8
    positions[i * 3 + 2] = (Math.random() - 0.5) * 3
  }
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.015} color="#C1622B" opacity={0.4} transparent />
    </points>
  )
}

// ─── Landing Page ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#1A120B' }}>
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-5 border-b border-hairline">
        <div className="flex items-center gap-3">
          <Layers size={20} className="text-rust" />
          <span className="font-grotesk font-600 text-parchment tracking-wider text-sm uppercase">NWIS</span>
          <span className="text-hairline mx-2">|</span>
          <span className="font-mono text-xs text-slate">Nearby Wells Intelligence System</span>
        </div>
        <nav className="flex items-center gap-6">
          <button onClick={() => navigate('/knowledge')} className="font-mono text-xs text-slate hover:text-parchment transition-colors">
            Knowledge Repo
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="font-mono text-xs px-4 py-2 border border-rust text-rust hover:bg-rust hover:text-bg transition-all"
          >
            OPEN DASHBOARD →
          </button>
        </nav>
      </header>

      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 6], fov: 50 }} shadows>
          <ambientLight intensity={0.3} />
          <directionalLight position={[3, 5, 3]} intensity={0.8} color="#EDE0D0" />
          <pointLight position={[-3, -2, 2]} intensity={0.4} color="#C1622B" />

          {STRATA_LAYERS.map((l) => (
            <StrataLayer key={l.y} {...l} />
          ))}
          <WellboreLine />
          <DrillBit />
          <DustParticles />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.4}
            maxPolarAngle={Math.PI / 2.1}
            minPolarAngle={Math.PI / 3}
          />
        </Canvas>

        {/* Dark overlay gradient so text is legible */}
        <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/50 to-transparent pointer-events-none" />
      </div>

      {/* Hero Text */}
      <div className="relative z-10 flex flex-col justify-center min-h-screen px-16 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-px bg-rust" />
            <span className="font-mono text-xs text-rust tracking-widest uppercase">Oil India Limited · SIH26121</span>
          </div>

          <h1 className="font-grotesk text-5xl font-semibold leading-tight text-parchment mb-6">
            See What's Beneath —<br />
            <span className="text-rust">Before You Drill There.</span>
          </h1>

          <p className="font-grotesk text-lg text-slate leading-relaxed mb-10 max-w-xl">
            NWIS correlates historical drilling data from offset wells with your
            active well's real-time depth, surfacing mud loss, stuck pipe, and
            overpressure risks before you encounter them.
          </p>

          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => navigate('/dashboard')}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.15 }}
              className="font-mono text-sm px-8 py-4 bg-rust text-bg font-medium tracking-wide hover:bg-rust/90 transition-colors"
            >
              OPEN INTELLIGENCE DASHBOARD →
            </motion.button>
            <button
              onClick={() => navigate('/knowledge')}
              className="font-mono text-sm px-8 py-4 border border-hairline text-parchment/70 hover:border-parchment/50 hover:text-parchment transition-all"
            >
              Knowledge Repository
            </button>
          </div>
        </motion.div>
      </div>

      {/* Feature Strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="absolute bottom-0 left-0 right-0 z-10 border-t border-hairline"
        style={{ background: 'rgba(26,18,11,0.85)' }}
      >
        <div className="grid grid-cols-3 divide-x divide-hairline">
          {[
            { icon: <Map size={16} />, title: 'Geospatial Well Map', desc: 'Nearby wells plotted within your defined radius' },
            { icon: <AlertTriangle size={16} />, title: 'Real-Time Risk Alerts', desc: 'Alerts triggered as depth approaches danger zones' },
            { icon: <Layers size={16} />, title: 'Formation Correlation', desc: 'Historical events matched by depth band across wells' },
          ].map((f) => (
            <div key={f.title} className="px-8 py-5 flex items-start gap-4">
              <div className="text-rust mt-0.5 shrink-0">{f.icon}</div>
              <div>
                <div className="font-grotesk text-sm font-medium text-parchment mb-1">{f.title}</div>
                <div className="font-mono text-xs text-slate">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-32 left-1/2 -translate-x-1/2 z-10 text-parchment/30"
      >
        <ChevronDown size={20} />
      </motion.div>
    </div>
  )
}
