-- Keystone Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Properties
create table properties (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  address text not null,
  city text,
  state text,
  zip text,
  price numeric,
  beds integer,
  baths numeric,
  sqft integer,
  year_built integer,
  listing_url text,
  status text default 'watching' check (status in ('watching', 'visited', 'offer_made', 'under_contract', 'purchased', 'passed')),
  is_primary boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Property pros/cons
create table property_pros_cons (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade not null,
  type text not null check (type in ('pro', 'con')),
  text text not null,
  created_at timestamptz default now()
);

-- Property visits
create table property_visits (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade not null,
  visited_at date not null,
  notes text,
  overall_rating integer check (overall_rating between 1 and 5),
  created_at timestamptz default now()
);

-- Property photos
create table property_photos (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade not null,
  storage_path text not null,
  caption text,
  created_at timestamptz default now()
);

-- Offers
create table offers (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade not null,
  amount numeric not null,
  offered_at date not null,
  status text default 'pending' check (status in ('pending', 'countered', 'accepted', 'rejected', 'withdrawn')),
  counter_amount numeric,
  notes text,
  created_at timestamptz default now()
);

-- Pre-approvals
create table pre_approvals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  lender_name text not null,
  amount numeric not null,
  interest_rate numeric,
  loan_type text,
  expires_at date,
  contact_name text,
  contact_phone text,
  contact_email text,
  notes text,
  created_at timestamptz default now()
);

-- Inspections
create table inspections (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade not null,
  inspector_name text,
  inspector_company text,
  inspector_phone text,
  inspector_email text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  cost numeric,
  status text default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  report_url text,
  notes text,
  created_at timestamptz default now()
);

-- Inspection items (from report, becomes to-do list)
create table inspection_items (
  id uuid primary key default uuid_generate_v4(),
  inspection_id uuid references inspections(id) on delete cascade not null,
  description text not null,
  category text,
  priority text default 'medium' check (priority in ('high', 'medium', 'low')),
  status text default 'open' check (status in ('open', 'in_progress', 'resolved', 'wont_fix')),
  estimated_cost numeric,
  notes text,
  created_at timestamptz default now()
);

-- Insurance quotes
create table insurance_quotes (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade not null,
  company_name text not null,
  agent_name text,
  agent_phone text,
  agent_email text,
  annual_premium numeric,
  monthly_premium numeric,
  coverage_amount numeric,
  deductible numeric,
  policy_type text,
  notes text,
  is_selected boolean default false,
  created_at timestamptz default now()
);

-- Closing items / checklist
create table closing_items (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties(id) on delete cascade not null,
  title text not null,
  category text check (category in ('document', 'payment', 'appointment', 'task')),
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  due_date date,
  amount numeric,
  notes text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Budget items
create table budget_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  property_id uuid references properties(id) on delete set null,
  category text not null,
  name text not null,
  estimated_monthly numeric default 0,
  actual_monthly numeric,
  frequency text default 'monthly' check (frequency in ('monthly', 'annual', 'one_time')),
  notes text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Documents
create table documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  property_id uuid references properties(id) on delete set null,
  title text not null,
  category text check (category in ('contract', 'disclosure', 'inspection', 'title', 'appraisal', 'hoa', 'insurance', 'mortgage', 'warranty', 'other')),
  storage_path text not null,
  file_size bigint,
  mime_type text,
  notes text,
  created_at timestamptz default now()
);

-- Rooms (for renovation planning)
create table rooms (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  property_id uuid references properties(id) on delete set null,
  name text not null,
  description text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Room projects
create table room_projects (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade not null,
  title text not null,
  description text,
  status text default 'on_hold' check (status in ('on_hold', 'planned', 'in_progress', 'completed', 'cancelled')),
  priority text default 'medium' check (priority in ('high', 'medium', 'low')),
  is_diy boolean default false,
  budget_estimate numeric,
  actual_cost numeric,
  contractor_name text,
  contractor_phone text,
  contractor_quote numeric,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Room photos (current state + inspiration)
create table room_photos (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade not null,
  project_id uuid references room_projects(id) on delete set null,
  storage_path text not null,
  photo_type text default 'current' check (photo_type in ('current', 'inspiration', 'completed')),
  caption text,
  source_url text,
  created_at timestamptz default now()
);

-- DIY resources / links per project
create table project_resources (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references room_projects(id) on delete cascade not null,
  title text not null,
  url text,
  resource_type text check (resource_type in ('article', 'video', 'product', 'supplier', 'other')),
  notes text,
  created_at timestamptz default now()
);

-- Contractors (global contact book)
create table contractors (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  company text,
  trade text,
  phone text,
  email text,
  rating integer check (rating between 1 and 5),
  is_recommended boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- Row Level Security
alter table properties enable row level security;
alter table property_pros_cons enable row level security;
alter table property_visits enable row level security;
alter table property_photos enable row level security;
alter table offers enable row level security;
alter table pre_approvals enable row level security;
alter table inspections enable row level security;
alter table inspection_items enable row level security;
alter table insurance_quotes enable row level security;
alter table closing_items enable row level security;
alter table budget_items enable row level security;
alter table documents enable row level security;
alter table rooms enable row level security;
alter table room_projects enable row level security;
alter table room_photos enable row level security;
alter table project_resources enable row level security;
alter table contractors enable row level security;

-- RLS Policies (users can only see their own data)
create policy "users see own properties" on properties for all using (auth.uid() = user_id);
create policy "users see own pros_cons" on property_pros_cons for all using (
  exists (select 1 from properties where id = property_id and user_id = auth.uid())
);
create policy "users see own visits" on property_visits for all using (
  exists (select 1 from properties where id = property_id and user_id = auth.uid())
);
create policy "users see own property_photos" on property_photos for all using (
  exists (select 1 from properties where id = property_id and user_id = auth.uid())
);
create policy "users see own offers" on offers for all using (
  exists (select 1 from properties where id = property_id and user_id = auth.uid())
);
create policy "users see own pre_approvals" on pre_approvals for all using (auth.uid() = user_id);
create policy "users see own inspections" on inspections for all using (
  exists (select 1 from properties where id = property_id and user_id = auth.uid())
);
create policy "users see own inspection_items" on inspection_items for all using (
  exists (
    select 1 from inspections i
    join properties p on p.id = i.property_id
    where i.id = inspection_id and p.user_id = auth.uid()
  )
);
create policy "users see own insurance_quotes" on insurance_quotes for all using (
  exists (select 1 from properties where id = property_id and user_id = auth.uid())
);
create policy "users see own closing_items" on closing_items for all using (
  exists (select 1 from properties where id = property_id and user_id = auth.uid())
);
create policy "users see own budget_items" on budget_items for all using (auth.uid() = user_id);
create policy "users see own documents" on documents for all using (auth.uid() = user_id);
create policy "users see own rooms" on rooms for all using (auth.uid() = user_id);
create policy "users see own room_projects" on room_projects for all using (
  exists (select 1 from rooms where id = room_id and user_id = auth.uid())
);
create policy "users see own room_photos" on room_photos for all using (
  exists (select 1 from rooms where id = room_id and user_id = auth.uid())
);
create policy "users see own project_resources" on project_resources for all using (
  exists (
    select 1 from room_projects rp
    join rooms r on r.id = rp.room_id
    where rp.id = project_id and r.user_id = auth.uid()
  )
);
create policy "users see own contractors" on contractors for all using (auth.uid() = user_id);

-- Sourcing items (products to purchase for renovation)
create table sourcing_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  room_id uuid references rooms(id) on delete cascade not null,
  project_id uuid references room_projects(id) on delete set null,
  category text not null,
  item_description text not null,
  total_cost numeric,
  link text,
  status text default 'tentative' check (status in ('tentative', 'approved', 'backup', 'later', 'ordered', 'arrived')),
  material_finish text,
  dimensions text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table sourcing_items enable row level security;
create policy "users see own sourcing_items" on sourcing_items for all using (auth.uid() = user_id);

-- Storage buckets (run these separately in Supabase dashboard if SQL doesn't work)
-- insert into storage.buckets (id, name, public) values ('property-photos', 'property-photos', false);
-- insert into storage.buckets (id, name, public) values ('room-photos', 'room-photos', false);
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
