-- Phase 4 Migration: Maintenance Calendar, Moving Checklist, Permit Tracker
-- + expand ai_reports check constraint for new AI report types
-- Run this in your Supabase SQL editor

-- ─── 1. Expand ai_reports check constraint ──────────────────────────────────────
alter table ai_reports
  drop constraint if exists ai_reports_report_type_check;

alter table ai_reports
  add constraint ai_reports_report_type_check
  check (report_type in (
    'should_i_buy',
    'inspection_analysis',
    'offer_strategy',
    'renovation_roi',
    'budget_check',
    'seller_motivation',
    'inspection_negotiation'
  ));

-- ─── 2. Maintenance Calendar ────────────────────────────────────────────────────
create table maintenance_tasks (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  property_id     uuid references properties(id) on delete set null,
  title           text not null,
  description     text,
  category        text not null default 'General'
                    check (category in (
                      'HVAC', 'Plumbing', 'Electrical', 'Exterior', 'Interior',
                      'Appliances', 'Landscaping', 'Safety', 'Seasonal', 'General'
                    )),
  recurrence      text not null default 'annual'
                    check (recurrence in (
                      'weekly', 'monthly', 'quarterly',
                      'semi_annual', 'annual', 'one_time'
                    )),
  -- Calendar month (1–12) this task is typically due; null = not month-pinned
  due_month       smallint check (due_month between 1 and 12),
  -- Absolute due date for one_time tasks
  due_date        date,
  last_done_at    date,
  next_due_at     date,
  status          text not null default 'upcoming'
                    check (status in ('upcoming', 'due', 'overdue', 'done')),
  estimated_cost  numeric(10, 2),
  notes           text,
  sort_order      integer not null default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table maintenance_tasks enable row level security;

create policy "users manage own maintenance_tasks" on maintenance_tasks
  for all using (auth.uid() = user_id);

create index maintenance_tasks_user_idx on maintenance_tasks(user_id);
create index maintenance_tasks_next_due_idx on maintenance_tasks(user_id, next_due_at);

-- ─── 3. Moving Checklist ────────────────────────────────────────────────────────
create table moving_checklist_items (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  property_id   uuid references properties(id) on delete set null,
  title         text not null,
  category      text not null default 'before'
                  check (category in ('before', 'day_of', 'after', 'admin')),
  is_completed  boolean not null default false,
  completed_at  timestamptz,
  due_date      date,
  notes         text,
  sort_order    integer not null default 0,
  created_at    timestamptz default now()
);

alter table moving_checklist_items enable row level security;

create policy "users manage own moving_checklist_items" on moving_checklist_items
  for all using (auth.uid() = user_id);

create index moving_checklist_user_idx on moving_checklist_items(user_id);

-- ─── 4. Permit Tracker ──────────────────────────────────────────────────────────
create table permits (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  property_id         uuid references properties(id) on delete set null,
  permit_number       text,
  title               text not null,
  description         text,
  permit_type         text not null default 'other'
                        check (permit_type in (
                          'building', 'electrical', 'plumbing', 'mechanical',
                          'roofing', 'demolition', 'zoning', 'other'
                        )),
  status              text not null default 'not_applied'
                        check (status in (
                          'not_applied', 'applied', 'under_review',
                          'approved', 'active', 'passed_inspection',
                          'closed', 'rejected'
                        )),
  applied_at          date,
  approved_at         date,
  expires_at          date,
  inspection_date     date,
  contractor_id       uuid references contractors(id) on delete set null,
  estimated_cost      numeric(10, 2),
  permit_fee          numeric(10, 2),
  issuing_authority   text,
  notes               text,
  document_url        text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table permits enable row level security;

create policy "users manage own permits" on permits
  for all using (auth.uid() = user_id);

create index permits_user_idx on permits(user_id);
create index permits_property_idx on permits(property_id);
