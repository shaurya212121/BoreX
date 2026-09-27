import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

/**
 * Initializes Lenis smooth scroll on a specific scrollable container.
 * If no wrapper is given, it applies to the window.
 */
export function useLenis(wrapper?: React.RefObject<HTMLElement | null>) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const lenis = new Lenis({
      wrapper: wrapper?.current ?? undefined,
      content: wrapper?.current ?? undefined,
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.5,
      infinite: false,
      autoRaf: true,
    })

    lenisRef.current = lenis

    return () => {
      lenis.destroy()
      lenisRef.current = null
    }
  }, [wrapper])

  return lenisRef
}

/**
 * Scroll-reveal observer: adds 'revealed' class to elements with 'reveal' class.
 * Uses Intersection Observer for performant scroll-triggered animations.
 */
export function useScrollReveal(containerRef?: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = containerRef?.current ?? document.body
    const revealEls = root.querySelectorAll('.reveal, .reveal-left, .reveal-scale')
    if (revealEls.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        root: containerRef?.current ?? null,
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      }
    )

    revealEls.forEach((el) => observer.observe(el))

    return () => {
      revealEls.forEach((el) => observer.unobserve(el))
      observer.disconnect()
    }
  }, [containerRef])
}

/**
 * Counter animation for statistics / numbers.
 */
export function useCountUp(
  targetValue: number,
  duration: number = 1500,
  startOnMount: boolean = true
): [React.RefObject<HTMLSpanElement | null>, () => void] {
  const ref = useRef<HTMLSpanElement | null>(null)

  const animate = () => {
    if (!ref.current) return
    const el = ref.current
    const start = 0
    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (targetValue - start) * eased

      el.textContent = Number.isInteger(targetValue)
        ? Math.round(current).toLocaleString()
        : current.toFixed(1)

      if (progress < 1) {
        requestAnimationFrame(tick)
      }
    }

    requestAnimationFrame(tick)
  }

  useEffect(() => {
    if (startOnMount) {
      const timer = setTimeout(animate, 200)
      return () => clearTimeout(timer)
    }
  }, [targetValue, startOnMount])

  return [ref, animate]
}
