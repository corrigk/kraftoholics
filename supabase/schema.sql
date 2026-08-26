-- ============================================================
-- KRAFTOHOLICS — SUPABASE SCHEMA
-- ------------------------------------------------------------
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New Query → paste this whole file → Run).
-- It's safe to re-run: tables/policies are created only if missing.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- Mirrors auth.users and adds an is_admin flag. A row is created
-- automatically for every new signed-up user via the trigger below.
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by the owner" on public.profiles;
create policy "Profiles are viewable by the owner"
  on public.profiles for select
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper used throughout the policies below: is the current
-- logged-in user an admin?
create or replace function public.is_admin()
returns boolean as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$ language sql stable security definer set search_path = public;

-- ============================================================
-- PRODUCTS
-- ============================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(10,2) not null default 0,
  category text not null default 'custom', -- catholic | school | custom | watercolor
  tag text,
  image_url text,
  rope_colors text[] not null default '{}',
  charms text[] not null default '{}',
  sizes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Active products are publicly viewable" on public.products;
create policy "Active products are publicly viewable"
  on public.products for select
  using (is_active = true or public.is_admin());

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
  on public.products for insert
  with check (public.is_admin());

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
  on public.products for update
  using (public.is_admin());

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
  on public.products for delete
  using (public.is_admin());

-- ============================================================
-- REVIEWS
-- ============================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rating int not null check (rating between 1 and 5),
  message text not null,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "Approved reviews are publicly viewable" on public.reviews;
create policy "Approved reviews are publicly viewable"
  on public.reviews for select
  using (approved = true or public.is_admin());

drop policy if exists "Anyone can submit a review" on public.reviews;
create policy "Anyone can submit a review"
  on public.reviews for insert
  with check (char_length(message) between 1 and 1000 and rating between 1 and 5);

drop policy if exists "Admins can update reviews" on public.reviews;
create policy "Admins can update reviews"
  on public.reviews for update
  using (public.is_admin());

drop policy if exists "Admins can delete reviews" on public.reviews;
create policy "Admins can delete reviews"
  on public.reviews for delete
  using (public.is_admin());

-- ============================================================
-- MESSAGES (contact form + chat widget)
-- ============================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  message text not null,
  source text not null default 'contact_form', -- contact_form | chat_widget
  is_read boolean not null default false,
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "Anyone can send a message" on public.messages;
create policy "Anyone can send a message"
  on public.messages for insert
  with check (char_length(message) between 1 and 2000);

drop policy if exists "Admins can view messages" on public.messages;
create policy "Admins can view messages"
  on public.messages for select
  using (public.is_admin());

drop policy if exists "Admins can update messages" on public.messages;
create policy "Admins can update messages"
  on public.messages for update
  using (public.is_admin());

-- ============================================================
-- NEWSLETTER SIGNUPS
-- ============================================================
create table if not exists public.newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.newsletter_signups enable row level security;

drop policy if exists "Anyone can subscribe" on public.newsletter_signups;
create policy "Anyone can subscribe"
  on public.newsletter_signups for insert
  with check (true);

drop policy if exists "Admins can view subscribers" on public.newsletter_signups;
create policy "Admins can view subscribers"
  on public.newsletter_signups for select
  using (public.is_admin());

-- ============================================================
-- ORDERS + ORDER ITEMS
-- ============================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  email text not null,
  address text not null,
  city text not null,
  zip text not null,
  subtotal numeric(10,2) not null default 0,
  status text not null default 'placed', -- placed | shipped | completed | cancelled
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "Anyone can place an order" on public.orders;
create policy "Anyone can place an order"
  on public.orders for insert
  with check (true);

drop policy if exists "Admins can view orders" on public.orders;
create policy "Admins can view orders"
  on public.orders for select
  using (public.is_admin());

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
  on public.orders for update
  using (public.is_admin());

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10,2) not null,
  qty int not null default 1,
  options jsonb not null default '{}'
);

alter table public.order_items enable row level security;

drop policy if exists "Anyone can insert order items" on public.order_items;
create policy "Anyone can insert order items"
  on public.order_items for insert
  with check (true);

drop policy if exists "Admins can view order items" on public.order_items;
create policy "Admins can view order items"
  on public.order_items for select
  using (public.is_admin());

-- ============================================================
-- STORAGE — product photos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Product images are publicly readable" on storage.objects;
create policy "Product images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.is_admin());

-- ============================================================
-- DONE.
-- Next: create your sister's login in Authentication → Users,
-- then run this to make her an admin (replace the email):
--
--   update public.profiles set is_admin = true
--   where email = 'her-email@example.com';
--
-- (If handle_new_user hasn't fired yet because she hasn't logged
-- in once, wait until after her first login attempt, or insert
-- her profile row manually using her user id from Authentication → Users.)
-- ============================================================
