import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface Well {
  id: string
  name: string
  lat: number
  lon: number
  field_name: string
  operator: string
  spud_date: string
  total_depth_m: number
}

export interface DrillingReport {
  id: string
  well_id: string
  report_date: string
  depth_m: number
  formation: string
  event_type: string
  notes: string
  source_document: string
}

export interface ActiveWellProgress {
  id: number
  well_id: string
  current_depth_m: number
  timestamp: string
}

export interface RiskAlert {
  id: string
  active_well_id: string
  nearby_well_id: string
  matched_depth_m: number
  event_type: string
  distance_km: number
  severity: string
  message: string
  created_at: string
}

export const SEVERITY_COLORS: Record<string, string> = {
  critical: '#FF2A5F', // Outrun Red/Pink
  high: '#FF9E00', // Warning Orange
  medium: '#8B7EC8', // Soft Purple
  low: '#00FF9D', // Neon Sonar Green
}

export const EVENT_LABELS: Record<string, string> = {
  stuck_pipe: 'Stuck Pipe',
  mud_loss: 'Mud Loss',
  kick: 'Well Control / Kick',
  overpressure: 'Overpressure Zone',
  normal: 'Normal Drilling',
}
