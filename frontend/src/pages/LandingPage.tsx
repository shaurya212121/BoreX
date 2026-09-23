import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Edges } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { ChevronDown, Layers, AlertTriangle, Map, Target, Database, FileText } from 'lucide-react'

// ─── Seismic Strata Scene ────────────────────────────────────────────────
const STRATA_LAYERS = [
  { y: 1.8,  h: 0.5,  color: '#1A102A' },
  { y: 1.2,  h: 0.6,  color: '#150D22' },
  { y: 0.4,  h: 0.7,  color: '#100A1A' },
  { y: -0.4, h: 0.7,  color: '#0B0612' },
  { y: -1.2, h: 0.7,  color: '#08040E' },
  { y: -2.0, h: 0.7,  color: '#040206' },
]

function StrataLayer({ y, h, color }: { y: number; h: number; color: string }) {
  return (
    <mesh position={[0, y, 0]} castShadow receiveShadow>
      {/* Tapered geometry for a cooler look, or just standard box with better lighting */}
      <boxGeometry args={[10, h - 0.1, 4]} />
      {/* Glossy material so it catches the directional light */}
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
      {/* Glowing sonar edges */}
      <Edges linewidth={1.5} threshold={15} color="#3E2563" />
    </mesh>
  )
}

function DrillBit() {
  const ref = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.PointLight>(null)
  const t = useRef(0)
  
  useFrame((_, delta) => {
    t.current += delta * 0.15
    if (ref.current) {
      // Loop: 2.2 (surface) → -3.2 (TD), then snap back
      const y = 2.2 - ((t.current % 6) / 6) * 5.4
      ref.current.position.y = y
      if (glowRef.current) glowRef.current.position.y = y
    }
  })
  
  return (
    <>
      <mesh ref={ref} position={[0, 2.2, 0.5]} castShadow>
        <sphereGeometry args={[0.08, 32, 32]} />
        <meshBasicMaterial color="#00FF9D" />
      </mesh>
      {/* Intense green light illuminating the rock faces as it goes down */}
      <pointLight ref={glowRef} color="#00FF9D" intensity={4} distance={4} />
    </>
  )
}

function WellboreLine() {
  const points = [new THREE.Vector3(0, 2.4, 0.5), new THREE.Vector3(0, -3.4, 0.5)]
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  const mat = new THREE.LineBasicMaterial({ color: "#00FF9D", linewidth: 2, opacity: 0.7, transparent: true })
  
  return (
    <primitive object={new THREE.Line(geo, mat)} />
  )
}

function GridOverlay() {
  return (
    <gridHelper args={[20, 30, '#00FF9D', '#2A1C3F']} position={[0, -2.8, 0]} />
  )
}

// ─── Landing Page ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: '#090610' }}>
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 opacity-40 mix-blend-screen"
        style={{ backgroundImage: 'url(/bg_seismic.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-5 border-b border-hairline bg-bg/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Layers size={20} className="text-primary" />
          <span className="font-grotesk font-600 text-foreground tracking-wider text-sm uppercase">NWIS</span>
          <span className="text-hairline mx-2">|</span>
          <span className="font-mono text-xs text-secondary">Nearby Wells Intelligence System</span>
        </div>
        <nav className="flex items-center gap-6">
          <button onClick={() => navigate('/knowledge')} className="font-mono text-xs text-secondary hover:text-foreground transition-colors">
            Knowledge Repo
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="font-mono text-xs px-4 py-2 border border-primary text-primary hover:bg-primary/10 transition-all"
          >
            OPEN DASHBOARD →
          </button>
        </nav>
      </header>

      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [5, 4, 8], fov: 45 }} shadows>
          <ambientLight intensity={0.4} color="#8B7EC8" />
          {/* Main directional light to cast strong shadows and show 3D depth */}
          <directionalLight position={[5, 8, 5]} intensity={1.5} color="#EAE6EF" castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-5, 3, -5]} intensity={0.5} color="#00FF9D" />

          {STRATA_LAYERS.map((l) => (
            <StrataLayer key={l.y} {...l} />
          ))}
          <WellboreLine />
          <DrillBit />
          <GridOverlay />
          
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.8}
            maxPolarAngle={Math.PI / 2.2}
            minPolarAngle={Math.PI / 4}
          />
        </Canvas>

        {/* Dark overlay gradient so text is legible */}
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-transparent pointer-events-none" />
      </div>

      {/* Hero Text */}
      <div className="relative z-10 flex flex-col justify-center min-h-screen px-16 max-w-3xl pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-px bg-primary" />
            <span className="font-mono text-xs text-primary tracking-widest uppercase">Oil India Limited · SIH26121</span>
          </div>

          <h1 className="font-grotesk text-5xl font-semibold leading-tight text-foreground mb-6">
            See What's Beneath —<br />
            <span className="text-primary">Before You Drill There.</span>
          </h1>

          <p className="font-grotesk text-lg text-foreground/90 leading-relaxed mb-10 max-w-xl">
            NWIS correlates historical drilling data from offset wells with your
            active well's real-time depth, surfacing mud loss, stuck pipe, and
            overpressure risks before you encounter them.
          </p>

          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => navigate('/dashboard')}
              whileHover={{ x: 4 }}
              transition={{ duration: 0.15 }}
              className="font-mono text-sm px-8 py-4 bg-primary text-bg font-bold tracking-wide hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(0,255,157,0.3)]"
            >
              OPEN INTELLIGENCE DASHBOARD →
            </motion.button>
            <button
              onClick={() => navigate('/knowledge')}
              className="font-mono text-sm px-8 py-4 border border-hairline text-foreground/80 hover:border-foreground/50 hover:text-foreground transition-all"
            >
              Knowledge Repository
            </button>
          </div>
        </motion.div>
      </div>

      {/* Feature Strip - 6 Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="absolute bottom-0 left-0 right-0 z-10 border-t border-hairline bg-panel/90 backdrop-blur-md"
      >
        <div className="grid grid-cols-3 grid-rows-2 divide-x divide-y divide-hairline">
          {[
            { icon: <Map size={16} />, title: 'Geospatial Well Map', desc: 'Nearby wells plotted within your defined radius' },
            { icon: <AlertTriangle size={16} />, title: 'Real-Time Risk Alerts', desc: 'Alerts triggered as depth approaches danger zones' },
            { icon: <Layers size={16} />, title: 'Formation Correlation', desc: 'Historical events matched by depth band across wells' },
            { icon: <Target size={16} />, title: 'Explainable Risk Scoring', desc: 'Every alert shows exactly why based on proximity & depth' },
            { icon: <Database size={16} />, title: 'Built on Real Field Data', desc: 'Powered by the Volve field dataset, not placeholders' },
            { icon: <FileText size={16} />, title: 'One-Click Risk Report', desc: 'Export a formatted drilling risk dossier instantly' },
          ].map((f) => (
            <div key={f.title} className="px-8 py-5 flex items-start gap-4">
              <div className="text-primary mt-0.5 shrink-0">{f.icon}</div>
              <div>
                <div className="font-grotesk text-sm font-medium text-foreground mb-1">{f.title}</div>
                <div className="font-mono text-xs text-secondary">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-40 left-1/2 -translate-x-1/2 z-10 text-primary/30"
      >
        <ChevronDown size={20} />
      </motion.div>
    </div>
  )
}
