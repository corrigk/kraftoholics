-- ============================================================
-- PAYMENTS SETUP
-- ------------------------------------------------------------
-- Run this once in the Supabase SQL Editor, in addition to
-- schema.sql and theme_settings.sql which you've already run.
-- It adds a column so the stripe-webhook Edge Function can avoid
-- creating a duplicate order if Stripe ever retries a webhook call.
-- ============================================================

alter table public.orders
  add column if not exists stripe_session_id text unique;
