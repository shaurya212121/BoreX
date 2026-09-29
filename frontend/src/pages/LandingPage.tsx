import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Edges } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { Layers, ChevronDown, Zap, Shield, Globe } from 'lucide-react'
import { useLenis } from '../hooks/useAnimations'

// ─── Seismic Strata Scene ────────────────────────────────────────────────
const STRATA_LAYERS = [
  { y: 1.8,  h: 0.5,  color: '#3A2566' },
  { y: 1.2,  h: 0.6,  color: '#2E1D54' },
  { y: 0.4,  h: 0.7,  color: '#241644' },
  { y: -0.4, h: 0.7,  color: '#190E33' },
  { y: -1.2, h: 0.7,  color: '#100822' },
  { y: -2.0, h: 0.7,  color: '#080311' },
]

function StrataLayer({ y, h, color }: { y: number; h: number; color: string }) {
  return (
    <mesh position={[0, y, 0]} castShadow receiveShadow>
      {/* Tapered geometry for a cooler look, or just standard box with better lighting */}
      <boxGeometry args={[10, h - 0.1, 4]} />
      {/* Glossy material so it catches the directional light */}
      <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
      {/* Glowing sonar edges */}
      <Edges linewidth={2} threshold={15} color="#A775FF" />
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
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
      {/* Intense cyan light illuminating the rock faces as it goes down */}
      <pointLight ref={glowRef} color="#22d3ee" intensity={4} distance={4} />
    </>
  )
}

function WellboreLine() {
  const points = [new THREE.Vector3(0, 2.4, 0.5), new THREE.Vector3(0, -3.4, 0.5)]
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  const mat = new THREE.LineBasicMaterial({ color: "#0ea5e9", linewidth: 2, opacity: 0.7, transparent: true })
  
  return (
    <primitive object={new THREE.Line(geo, mat)} />
  )
}

function GridOverlay() {
  return (
    <gridHelper args={[20, 30, '#0ea5e9', '#1a1030']} position={[0, -2.8, 0]} />
  )
}

// ─── Animated Text Character ─────────────────────────────────────────────
function AnimatedWord({ word, delay }: { word: string; delay: number }) {
  return (
    <motion.span
      className="inline-block"
      initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {word}&nbsp;
    </motion.span>
  )
}

// ─── Feature Cards ───────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <Globe size={20} />,
    title: 'Geospatial Intelligence',
    desc: 'Real-time offset well proximity correlation across the Upper Assam Basin using Haversine geometry.',
    link: '/app/map',
  },
  {
    icon: <Shield size={20} />,
    title: 'Predictive Risk Engine',
    desc: 'ML-powered subsurface hazard prediction matching real-time depth against historical incident catalogs.',
    link: '/app/reports',
  },
  {
    icon: <Zap size={20} />,
    title: 'Live Telemetry Streams',
    desc: 'Synthetic telemetry simulation calibrated for eRTMAC-ready sensor integration and real-time monitoring.',
    link: '/app/telemetry',
  },
]

// ─── Landing Page ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const [showContent, setShowContent] = useState(false)

  // Initialize Lenis on mount for smooth scroll on landing page
  useLenis()

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300)
    return () => clearTimeout(timer)
  }, [])

  const titleWords = 'Nearby Wells Intelligence System'.split(' ')

  return (
    <div className="relative min-h-[200vh] overflow-hidden" style={{ background: '#050508' }}>
      {/* Background grain */}
      <div className="fixed inset-0 z-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-30 mix-blend-screen"
        style={{ backgroundImage: 'url(/bg_seismic.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      />

      {/* ═══ SECTION 1: 3D Hero ═══ */}
      <section className="relative h-screen flex flex-col">
        {/* 3D Scene */}
        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [5, 4, 8], fov: 45 }} shadows>
            <ambientLight intensity={0.3} color="#8B7EC8" />
            <directionalLight position={[5, 8, 5]} intensity={1.5} color="#EAE6EF" castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[-5, 3, -5]} intensity={0.4} color="#0ea5e9" />

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
              autoRotateSpeed={0.6}
              maxPolarAngle={Math.PI / 2.2}
              minPolarAngle={Math.PI / 4}
            />
          </Canvas>

          {/* Dark overlay gradient so text is legible */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#050508]/30 via-[#050508]/50 to-[#050508] pointer-events-none" />
        </div>

        {/* Hero Text - Centered & Cinematic */}
        <div className="relative z-20 flex flex-col items-center justify-center flex-1 pointer-events-none px-6">
          {showContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              {/* Brand Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-2.5 mb-6"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse-glow">
                  <Layers size={22} className="text-primary-glow" />
                </div>
                <span className="font-grotesk text-2xl font-bold tracking-[0.2em] text-foreground">
                  Bore<span className="text-gradient">X</span>
                </span>
              </motion.div>

              {/* Main Title — Word-by-word reveal */}
              <h1 className="font-grotesk text-sm md:text-base tracking-[0.25em] text-primary uppercase mb-3 flex flex-wrap justify-center">
                {titleWords.map((word, i) => (
                  <AnimatedWord key={word} word={word} delay={0.4 + i * 0.08} />
                ))}
              </h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
                className="font-sans text-xs sm:text-sm text-text-muted mb-3 text-center max-w-md font-normal"
              >
                AI-Powered Offset Well Knowledge & Decision Support Platform
              </motion.p>

              {/* Region tag */}
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.2 }}
                className="font-mono text-[10px] px-4 py-1.5 glass border-primary/20 text-primary-glow tracking-[0.15em] uppercase mb-12 rounded-full"
              >
                Upper Assam Basin Demonstration
              </motion.span>

              {/* CTA Button */}
              <motion.button
                onClick={() => navigate('/app/map')}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.4, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="btn-primary pointer-events-auto"
              >
                Initialize Command Center
              </motion.button>

              {/* SIH Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8, duration: 0.6 }}
                className="mt-10 font-mono text-[10px] text-text-dim tracking-[0.2em] uppercase"
              >
                Smart India Hackathon 2026 · Oil India Limited
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] text-text-dim tracking-[0.2em] uppercase font-mono">Scroll to explore</span>
          <ChevronDown size={16} className="text-primary-glow animate-scroll-hint" />
        </motion.div>
      </section>

      {/* ═══ SECTION 2: Feature Cards ═══ */}
      <section className="relative z-10 py-32 px-6 w-full flex justify-center">
        <div className="max-w-7xl w-full mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center text-center w-full mb-20"
          >
            <span className="font-mono text-[11px] text-primary tracking-[0.3em] uppercase mb-4 block">
              Core Capabilities
            </span>
            <h2 className="font-grotesk text-3xl md:text-4xl font-bold text-foreground">
              See what's beneath —<br />
              <span className="text-gradient">before you drill there.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => navigate(feat.link)}
                className="gradient-border p-8 rounded-2xl group cursor-pointer hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(56,189,248,0.15)] transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-glow mb-5 group-hover:bg-primary-glow group-hover:text-black group-hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-all duration-300">
                  {feat.icon}
                </div>
                <h3 className="font-grotesk text-lg font-semibold text-foreground mb-2 tracking-tight group-hover:text-primary-glow transition-colors">
                  {feat.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Secondary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex justify-center mt-24 pb-12 w-full"
          >
            <button
              onClick={() => navigate('/app/map')}
              className="btn-glass font-mono text-xs tracking-widest uppercase hover:text-primary-glow hover:border-primary-glow/50 transition-all duration-300"
            >
              Enter Command Center →
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
