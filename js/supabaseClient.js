/* ============================================================
   SUPABASE CONFIG
   ------------------------------------------------------------
   1. Create a free project at https://supabase.com
   2. Go to Project Settings → API
   3. Copy your "Project URL" and "anon / public" key below
   4. Run supabase/schema.sql in the Supabase SQL Editor first

   The anon/public key is SAFE to put here and commit to GitHub —
   it's meant to be public. Your Row Level Security policies
   (in schema.sql) control what it's actually allowed to do.

   NEVER put your "service_role" key in this file or anywhere in
   the frontend — that key bypasses all security rules.
============================================================ */

const SUPABASE_URL = "https://htzrbefwjmxhbrseznxo.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_gIUDocP3WY2UKHR1HZi2cA_QqK2osZX";

const IS_SUPABASE_CONFIGURED =
  SUPABASE_URL.startsWith("http") &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_URL.includes("YOUR_SUPABASE");

// `supabase` here is the global provided by the CDN script tag
// loaded before this file in index.html / admin.html.
const supabaseClient = IS_SUPABASE_CONFIGURED
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const PRODUCT_IMAGE_BUCKET = "product-images";
