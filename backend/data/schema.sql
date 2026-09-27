-- ============================================================
-- NWIS (Nearby Wells Intelligence System) — SIH26121
-- Supabase SQL Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- Wells table
create table if not exists wells (
  id              text primary key,
  name            text not null,
  lat             float8 not null,
  lon             float8 not null,
  field_name      text,
  operator        text,
  basin           text,
  spud_date       timestamptz,
  total_depth_m   float8,
  status          text default 'historical'
);

-- Historical drilling events extracted from DDRs
create table if not exists drilling_reports (
  id              text primary key,
  well_id         text references wells(id) on delete cascade,
  report_date     timestamptz,
  depth_m         float8,
  formation       text,
  event_type      text,
  severity        text,
  notes           text,
  source_document text
);

-- Active well depth progression (drives the timeline scrubber)
create table if not exists active_well_progress (
  id              bigint generated always as identity primary key,
  well_id         text references wells(id) on delete cascade,
  current_depth_m float8,
  rop_m_hr        float8,
  timestamp       timestamptz
);

-- Generated risk alerts
create table if not exists risk_alerts (
  id              text primary key,
  active_well_id  text references wells(id) on delete cascade,
  nearby_well_id  text references wells(id),
  matched_depth_m float8,
  event_type      text,
  distance_km     float8,
  severity        text,
  composite_score float8,
  message         text,
  created_at      timestamptz default now()
);

-- Enable Row Level Security
alter table wells              enable row level security;
alter table drilling_reports   enable row level security;
alter table active_well_progress enable row level security;
alter table risk_alerts        enable row level security;

-- Public read policies
create policy "public read wells"
  on wells for select using (true);

create policy "public read drilling_reports"
  on drilling_reports for select using (true);

create policy "public read active_well_progress"
  on active_well_progress for select using (true);

create policy "public read risk_alerts"
  on risk_alerts for select using (true);

-- Performance indices
create index if not exists idx_drilling_reports_well_id  on drilling_reports(well_id);
create index if not exists idx_drilling_reports_depth_m  on drilling_reports(depth_m);
create index if not exists idx_drilling_reports_event    on drilling_reports(event_type);
create index if not exists idx_risk_alerts_active_well   on risk_alerts(active_well_id);
create index if not exists idx_risk_alerts_severity      on risk_alerts(severity);
create index if not exists idx_progress_well_id          on active_well_progress(well_id);
create index if not exists idx_wells_basin               on wells(field_name);
