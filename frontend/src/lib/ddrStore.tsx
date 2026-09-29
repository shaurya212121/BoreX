// ============================================================================
// BoreX / NWIS: Draft DDR Store
// Shared state for anomaly-drafted DDR entries across components
// Uses React Context for cross-component reactivity
// ============================================================================

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { DraftDDREntry } from './anomalyDetector'

export interface DDRStoreContextType {
  /** Queue of draft DDR entries awaiting review */
  draftEntries: DraftDDREntry[]
  /** Confirmed (finalized) DDR entries */
  confirmedEntries: DraftDDREntry[]
  /** Add a new draft entry to the queue */
  addDraft: (entry: DraftDDREntry) => void
  /** Confirm a draft, moving it to the confirmed list */
  confirmDraft: (id: string) => void
  /** Update a draft before confirming */
  updateDraft: (id: string, updates: Partial<DraftDDREntry>) => void
  /** Discard a draft, removing it from the queue */
  discardDraft: (id: string) => void
  /** Confirm with edits in one step */
  confirmWithEdits: (id: string, updates: Partial<DraftDDREntry>) => void
}

const DDRStoreContext = createContext<DDRStoreContextType | null>(null)

export function DDRStoreProvider({ children }: { children: ReactNode }) {
  const [draftEntries, setDraftEntries] = useState<DraftDDREntry[]>([])
  const [confirmedEntries, setConfirmedEntries] = useState<DraftDDREntry[]>([])

  const addDraft = useCallback((entry: DraftDDREntry) => {
    setDraftEntries((prev) => {
      // Deduplicate: don't add if a draft with the same anomaly at similar depth already exists
      const isDuplicate = prev.some(
        (e) =>
          e.anomaly_type === entry.anomaly_type &&
          Math.abs(e.bit_depth - entry.bit_depth) < 20
      )
      if (isDuplicate) return prev
      return [entry, ...prev].slice(0, 50) // Keep max 50 drafts
    })
  }, [])

  const confirmDraft = useCallback((id: string) => {
    setDraftEntries((prev) => {
      const entry = prev.find((e) => e.id === id)
      if (entry) {
        const confirmed: DraftDDREntry = { ...entry, status: 'CONFIRMED' }
        setConfirmedEntries((cPrev) => [confirmed, ...cPrev])
      }
      return prev.filter((e) => e.id !== id)
    })
  }, [])

  const updateDraft = useCallback((id: string, updates: Partial<DraftDDREntry>) => {
    setDraftEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    )
  }, [])

  const discardDraft = useCallback((id: string) => {
    setDraftEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const confirmWithEdits = useCallback(
    (id: string, updates: Partial<DraftDDREntry>) => {
      setDraftEntries((prev) => {
        const entry = prev.find((e) => e.id === id)
        if (entry) {
          const confirmed: DraftDDREntry = { ...entry, ...updates, status: 'CONFIRMED' }
          setConfirmedEntries((cPrev) => [confirmed, ...cPrev])
        }
        return prev.filter((e) => e.id !== id)
      })
    },
    []
  )

  return (
    <DDRStoreContext.Provider
      value={{
        draftEntries,
        confirmedEntries,
        addDraft,
        confirmDraft,
        updateDraft,
        discardDraft,
        confirmWithEdits,
      }}
    >
      {children}
    </DDRStoreContext.Provider>
  )
}

export function useDDRStore(): DDRStoreContextType {
  const ctx = useContext(DDRStoreContext)
  if (!ctx) {
    throw new Error('useDDRStore must be used within a DDRStoreProvider')
  }
  return ctx
}
