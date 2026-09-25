import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Edges } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { Layers } from 'lucide-react'

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

      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [5, 4, 8], fov: 45 }} shadows>
          <ambientLight intensity={0.4} color="#8B7EC8" />
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
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent pointer-events-none" />
      </div>

      {/* Hero Text - Centered & Cinematic */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          <div className="flex items-center gap-2 mb-3">
            <Layers size={24} className="text-primary" />
            <span className="font-grotesk text-2xl font-bold tracking-[0.25em] text-foreground">NWIS</span>
          </div>
          
          <h1 className="font-mono text-sm tracking-widest text-primary uppercase mb-2">
            Nearby Wells Intelligence System
          </h1>

          <p className="font-mono text-xs text-secondary/90 tracking-wide uppercase mb-3 text-center max-w-md">
            AI-Powered Offset Well Knowledge & Decision Support Platform
          </p>

          <span className="font-mono text-[10px] px-3 py-1 bg-primary/10 border border-primary/30 text-primary tracking-widest uppercase mb-10 rounded-xs">
            UPPER ASSAM BASIN DEMONSTRATION BENCHMARK
          </span>

          <motion.button
            onClick={() => navigate('/app/map')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="font-mono text-sm px-12 py-4 bg-primary/10 border-2 border-primary text-primary font-bold tracking-widest hover:bg-primary hover:text-bg transition-all shadow-[0_0_30px_rgba(0,255,157,0.2)] hover:shadow-[0_0_50px_rgba(0,255,157,0.5)] pointer-events-auto rounded-xs"
          >
            INITIALIZE COMMAND CENTER
          </motion.button>

          <div className="mt-8 font-mono text-[10px] text-secondary/60 tracking-wider uppercase">
            SYNTHETIC DEMONSTRATION DATA · SIH 2026
          </div>
        </motion.div>
      </div>
    </div>
  )
}

