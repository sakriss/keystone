-- Phase 3 Migration: AI Features + Live Listings
-- Run this in your Supabase SQL editor

-- ─── AI Reports ────────────────────────────────────────────────────────────────
-- Caches generated AI reports so they don't need to be regenerated on every load.
-- Reports expire after 7 days or when the user manually regenerates.
create table ai_reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  report_type text not null check (report_type in (
    'should_i_buy',
    'inspection_analysis',
    'offer_strategy',
    'renovation_roi',
    'budget_check'
  )),
  -- Optional reference to a specific inspection for inspection_analysis reports
  inspection_id uuid references inspections(id) on delete cascade,
  -- Structured JSON response from the AI
  content jsonb not null,
  -- ISO timestamp of when this was generated
  generated_at timestamptz not null default now(),
  -- Reports expire after 7 days; null = never expires
  expires_at timestamptz default (now() + interval '7 days'),
  -- Track which model generated this
  model text,
  created_at timestamptz default now()
);

alter table ai_reports enable row level security;

create policy "users manage own ai_reports" on ai_reports
  for all using (auth.uid() = user_id);

-- Index for fast lookups by property + type
create index ai_reports_property_type_idx on ai_reports(property_id, report_type);
create index ai_reports_user_type_idx on ai_reports(user_id, report_type);

-- ─── Listing Cache ─────────────────────────────────────────────────────────────
-- Caches RentCast valuation + comparable sales data per property address.
-- 24-hour TTL — live data doesn't need to be fresher than that.
create table listing_cache (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade unique,
  source text not null default 'rentcast',
  -- Full response payload from the listing API
  valuation jsonb,
  comparables jsonb,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

alter table listing_cache enable row level security;

create policy "users manage own listing_cache" on listing_cache
  for all using (auth.uid() = user_id);
