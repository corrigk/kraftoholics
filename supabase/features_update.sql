-- ============================================================
-- FEATURES UPDATE — gift notes + optional stock tracking
-- ------------------------------------------------------------
-- Run this once in the Supabase SQL Editor, in addition to the
-- migrations you've already run.
-- ============================================================

-- Captures the optional "gift note" a customer can add on
-- Stripe's checkout page, filled in by the stripe-webhook function.
alter table public.orders
  add column if not exists gift_note text;

-- Optional per-product stock count. Leave NULL (the default) on
-- any product to treat it as always in stock, exactly like today —
-- only products where you actually set a number will show "X left"
-- or "Sold out" on the site.
alter table public.products
  add column if not exists stock_quantity int;
