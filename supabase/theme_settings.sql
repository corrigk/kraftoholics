-- ============================================================
-- THEME SETTINGS
-- ------------------------------------------------------------
-- Run this once in the Supabase SQL Editor (in addition to the
-- original schema.sql, which you've already run). It adds a
-- single-row settings table that stores which color theme the
-- public site should use — editable from the admin dashboard's
-- new "Theme" tab.
-- ============================================================

create table if not exists public.site_settings (
  id int primary key default 1,
  theme text not null default 'classic',
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.site_settings (id, theme)
values (1, 'classic')
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "Site settings are publicly viewable" on public.site_settings;
create policy "Site settings are publicly viewable"
  on public.site_settings for select
  using (true);

drop policy if exists "Admins can update site settings" on public.site_settings;
create policy "Admins can update site settings"
  on public.site_settings for update
  using (public.is_admin());
