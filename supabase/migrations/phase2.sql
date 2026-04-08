-- Phase 2 Migration: Neighborhood Data + Property Sharing
-- Run this in your Supabase SQL editor

-- pgcrypto for gen_random_bytes (token generation)
create extension if not exists pgcrypto;

-- ─── Census cache ──────────────────────────────────────────────────────────────
-- Stores Census Bureau API responses keyed by ZIP to avoid repeat calls.
-- Public read; service-role writes (via Census API route handler).
create table census_cache (
  zip text primary key,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table census_cache enable row level security;

create policy "census_cache publicly readable" on census_cache
  for select using (true);

-- ─── Property shares ───────────────────────────────────────────────────────────
-- One row per property + invited email. Token used in invite URLs.
create table property_shares (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade not null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  invited_email text not null,
  accepted_user_id uuid references auth.users(id) on delete set null,
  permission text not null default 'view' check (permission in ('view', 'edit')),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz default now(),
  accepted_at timestamptz,
  unique(property_id, invited_email)
);

alter table property_shares enable row level security;

-- Owner can fully manage their own shares
create policy "owners manage own shares" on property_shares
  for all using (auth.uid() = owner_id);

-- Invitee can read their own pending invite (needed to render accept page)
create policy "invitees read own invite" on property_shares
  for select using (
    auth.uid() = accepted_user_id
    or invited_email = (select email from auth.users where id = auth.uid())
  );

-- Invitee can accept their own pending invite
create policy "invitees accept invite" on property_shares
  for update using (
    invited_email = (select email from auth.users where id = auth.uid())
    and status = 'pending'
  );

-- ─── Access-check helper functions ────────────────────────────────────────────

-- Returns true if the current user owns or has an accepted share for a property
create or replace function has_property_access(pid uuid)
returns boolean
language sql security definer stable as $$
  select
    exists (select 1 from properties where id = pid and user_id = auth.uid())
    or
    exists (
      select 1 from property_shares
      where property_id = pid
        and accepted_user_id = auth.uid()
        and status = 'accepted'
    );
$$;

-- Returns true only if the current user owns or has edit-level share access
create or replace function has_property_edit_access(pid uuid)
returns boolean
language sql security definer stable as $$
  select
    exists (select 1 from properties where id = pid and user_id = auth.uid())
    or
    exists (
      select 1 from property_shares
      where property_id = pid
        and accepted_user_id = auth.uid()
        and status = 'accepted'
        and permission = 'edit'
    );
$$;

-- ─── Updated RLS on properties ─────────────────────────────────────────────────
drop policy "users see own properties" on properties;

create policy "read properties with access" on properties
  for select using (user_id = auth.uid() or has_property_access(id));

create policy "insert properties owner" on properties
  for insert with check (user_id = auth.uid());

create policy "update properties with edit access" on properties
  for update using (
    user_id = auth.uid() or has_property_edit_access(id)
  );

create policy "delete properties owner only" on properties
  for delete using (user_id = auth.uid());

-- ─── Updated RLS on property child tables ─────────────────────────────────────

-- property_pros_cons
drop policy "users see own pros_cons" on property_pros_cons;

create policy "read pros_cons with access" on property_pros_cons
  for select using (has_property_access(property_id));

create policy "write pros_cons with edit" on property_pros_cons
  for insert with check (has_property_edit_access(property_id));

create policy "delete pros_cons with edit" on property_pros_cons
  for delete using (has_property_edit_access(property_id));

-- property_visits
drop policy "users see own visits" on property_visits;

create policy "read visits with access" on property_visits
  for select using (has_property_access(property_id));

create policy "write visits with edit" on property_visits
  for insert with check (has_property_edit_access(property_id));

create policy "delete visits with edit" on property_visits
  for delete using (has_property_edit_access(property_id));

-- property_photos
drop policy "users see own property_photos" on property_photos;

create policy "read property_photos with access" on property_photos
  for select using (has_property_access(property_id));

create policy "write property_photos with edit" on property_photos
  for insert with check (has_property_edit_access(property_id));

create policy "delete property_photos with edit" on property_photos
  for delete using (has_property_edit_access(property_id));

-- offers
drop policy "users see own offers" on offers;

create policy "read offers with access" on offers
  for select using (has_property_access(property_id));

create policy "write offers with edit" on offers
  for insert with check (has_property_edit_access(property_id));

create policy "delete offers with edit" on offers
  for delete using (has_property_edit_access(property_id));

-- inspections
drop policy "users see own inspections" on inspections;

create policy "read inspections with access" on inspections
  for select using (has_property_access(property_id));

create policy "write inspections with edit" on inspections
  for insert with check (has_property_edit_access(property_id));

create policy "delete inspections with edit" on inspections
  for delete using (has_property_edit_access(property_id));

-- inspection_items (join through inspections → property_id)
drop policy "users see own inspection_items" on inspection_items;

create policy "read inspection_items with access" on inspection_items
  for select using (
    exists (
      select 1 from inspections i
      where i.id = inspection_id and has_property_access(i.property_id)
    )
  );

create policy "write inspection_items with edit" on inspection_items
  for insert with check (
    exists (
      select 1 from inspections i
      where i.id = inspection_id and has_property_edit_access(i.property_id)
    )
  );

create policy "delete inspection_items with edit" on inspection_items
  for delete using (
    exists (
      select 1 from inspections i
      where i.id = inspection_id and has_property_edit_access(i.property_id)
    )
  );

-- insurance_quotes
drop policy "users see own insurance_quotes" on insurance_quotes;

create policy "read insurance_quotes with access" on insurance_quotes
  for select using (has_property_access(property_id));

create policy "write insurance_quotes with edit" on insurance_quotes
  for insert with check (has_property_edit_access(property_id));

create policy "delete insurance_quotes with edit" on insurance_quotes
  for delete using (has_property_edit_access(property_id));

-- closing_items
drop policy "users see own closing_items" on closing_items;

create policy "read closing_items with access" on closing_items
  for select using (has_property_access(property_id));

create policy "write closing_items with edit" on closing_items
  for insert with check (has_property_edit_access(property_id));

create policy "delete closing_items with edit" on closing_items
  for delete using (has_property_edit_access(property_id));
