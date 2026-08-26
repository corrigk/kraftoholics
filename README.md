# Kraftoholics — Website + Admin Dashboard

A ready-to-deploy site for the shop: a public storefront (`index.html`) and a
private admin dashboard (`admin.html`) your sister can log into to add
products with photos, view orders, read messages, and moderate reviews.

No build tools, no framework, no monthly server bill — it's plain HTML/CSS/JS
that talks directly to [Supabase](https://supabase.com) (free tier is plenty
for a small shop) for the database, login, and image storage. You'll host the
files themselves for free on GitHub Pages.

**You can open `index.html` in a browser right now** — it'll run in "demo
mode" with sample products so you can see the design. Follow the steps below
to make it real.

---

## What's in this folder

```
├── index.html              the public site
├── admin.html               the admin dashboard (product/order/message manager)
├── css/styles.css           all styling for both pages
├── js/
│   ├── supabaseClient.js    ← put your Supabase URL & key here (step 5)
│   ├── main.js               public site logic
│   └── admin.js               admin dashboard logic
├── assets/logo.jpg          your logo
├── supabase/
│   ├── schema.sql            database setup — run this first
│   └── seed.sql               optional: a few starter products
└── README.md                 this file
```

---

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign up (free).
2. Click **New Project**. Pick any name (e.g. "kraftoholics"), set a database
   password (save it somewhere), pick a region close to you, and create it.
   It takes a minute or two to spin up.

## Step 2 — Run the database schema

1. In your new project, open the **SQL Editor** (left sidebar).
2. Click **New query**, then open `supabase/schema.sql` from this folder,
   copy its entire contents, and paste it into the editor.
3. Click **Run**. You should see "Success. No rows returned."

This creates all the tables (products, orders, reviews, messages, newsletter
signups), sets up security rules so customers can only do what they should
be able to do, and creates a storage bucket for product photos.

**Optional:** repeat with `supabase/seed.sql` to start with a few sample
products already in the shop instead of an empty one.

## Step 3 — Create your sister's admin login

1. In Supabase, go to **Authentication → Users → Add user → Create new user**.
2. Enter her email and a password (she can change it later — there's no
   "forgot password" flow wired up yet, so pick something you can both access
   at first, or set one up together).
3. Go back to the **SQL Editor**, run this (with her real email):

   ```sql
   update public.profiles set is_admin = true
   where email = 'her-email@example.com';
   ```

   This is what actually gives her access to the admin dashboard — creating
   the login alone isn't enough.

## Step 4 — Connect the site to Supabase

1. In Supabase, go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon / public** key.
3. Open `js/supabaseClient.js` in VS Code and paste them in:

   ```js
   const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGciOi...";
   ```

The anon key is safe to commit to GitHub — it's meant to be public. It only
grants what the security rules in `schema.sql` allow. **Never** use the
`service_role` key here; that one bypasses all the rules.

## Step 5 — Preview it locally

Opening `index.html` by double-clicking it works, but some browsers restrict
network requests from local files. For a smoother preview:

- In VS Code, install the **Live Server** extension, then right-click
  `index.html` → **Open with Live Server**.
- Or, if you have Python installed, run `python3 -m http.server` in this
  folder and visit `http://localhost:8000`.

Visit `admin.html` the same way and log in with the account from Step 3.

---

## Step 6 — Push it to GitHub

In VS Code's terminal (Terminal → New Terminal), from this project folder:

```bash
git init
git add .
git commit -m "Initial site"
```

Then create a new empty repository on [github.com](https://github.com/new)
(don't add a README or .gitignore there — this folder already has one), and
run the commands GitHub shows you, which look like:

```bash
git remote add origin https://github.com/YOUR-USERNAME/kraftoholics.git
git branch -M main
git push -u origin main
```

## Step 7 — Host it for free with GitHub Pages

1. On your repo's GitHub page, go to **Settings → Pages**.
2. Under "Build and deployment", set **Source** to "Deploy from a branch",
   branch `main`, folder `/ (root)`, then **Save**.
3. After a minute, your site will be live at
   `https://corrigk.github.io/kraftoholics/`.
4. The admin dashboard is at `.../admin.html` — nothing stops someone from
   finding that URL, but they can't do anything without her login, and the
   database rules block writes from anyone who isn't marked as an admin.

**Alternative:** [Netlify](https://netlify.com) or [Vercel](https://vercel.com)
also host static sites like this for free, with the bonus of custom domains
being a bit easier to attach later. Either one: sign up, "Add new site →
Import from GitHub", pick this repo, and deploy with default settings (no
build command needed).

---

## What's real vs. still a placeholder

**Fully working once connected to Supabase:**
- Product catalog, with photos she uploads from the admin dashboard
- Cart (saved in the browser, survives a refresh)
- Order capture — orders are saved to the database and show up in the admin
  dashboard, with a status she can update (placed → shipped → completed)
- Reviews — customers can post them, she can hide or delete them
- Contact form + chat widget messages — land in her admin inbox
- Newsletter signups — collected in a table she can copy out

**Still placeholders, by design — these need extra services to make real:**
- **Payments.** No payment processor is connected, so "placing an order"
  doesn't charge a card. Adding real payments (e.g. Stripe) is a solid next
  step once she's ready to sell live — it needs a Stripe account and a small
  bit of server-side code (a Supabase Edge Function) to handle payments securely.
- **Emailed replies.** Replies she writes in the admin Messages tab are saved
  to the database but not emailed to the customer. Real email needs an email
  service (e.g. Resend, Postmark) hooked up through a Supabase Edge Function.
- **Customer accounts.** There's a sign-up/log-in page on the public site,
  but it's a visual placeholder — carts already persist per-browser without
  it. Wiring it to real Supabase accounts (with order history) is a
  reasonable future add-on.

---

## Everyday use, once it's live

- **She adds/edits products:** log into `admin.html` → Products tab → Add
  Product (or Edit on an existing one) → fill in details, choose a photo →
  Save. It appears on the site within seconds.
- **She checks orders/messages:** the Orders and Messages tabs in the admin
  dashboard, any time.
- **You make design changes:** edit `index.html` / `css/styles.css` in VS
  Code, then `git add . && git commit -m "..." && git push` — GitHub Pages
  redeploys automatically within a minute or two.

## Troubleshooting

- **Admin login says "not set up as an admin"** — double-check the SQL
  update in Step 3 ran against the right email, and that she's logged in
  with the same email/password created in Supabase Authentication.
- **Products aren't showing up** — check the browser console (right-click →
  Inspect → Console) for errors; most often it's `js/supabaseClient.js`
  still having the placeholder URL/key, or `schema.sql` not having been run.
- **Image upload fails** — confirm `schema.sql` ran fully (it creates the
  `product-images` storage bucket and its policies).
