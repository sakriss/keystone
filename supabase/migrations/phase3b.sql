-- Phase 3b: Premium tier + property limit
-- Run this in your Supabase SQL editor

-- Add is_premium to user_settings (defaults to false — everyone starts on free)
alter table user_settings
  add column if not exists is_premium boolean not null default false;

-- Insert a default user_settings row if one doesn't exist yet (upsert-safe)
-- This ensures every user has a settings row to check against
create or replace function ensure_user_settings()
returns trigger language plpgsql security definer as $$
begin
  insert into user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Trigger to auto-create user_settings on signup
drop trigger if exists on_auth_user_created_settings on auth.users;
create trigger on_auth_user_created_settings
  after insert on auth.users
  for each row execute function ensure_user_settings();
