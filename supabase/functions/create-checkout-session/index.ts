// supabase/functions/create-checkout-session/index.ts
//
// Called from the site (js/main.js) when someone clicks "Continue to
// Payment." Turns the cart into a Stripe Checkout Session and returns
// the URL to redirect the customer to. Stripe hosts the actual payment
// page — card numbers never touch this function or the site.
//
// Requires one secret, set via:
//   supabase secrets set STRIPE_SECRET_KEY=sk_test_...

import Stripe from "npm:stripe@17";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-11-20.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { items, returnBase } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Cart is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build one Stripe line item per cart line, folding any selected
    // rope color / charm / size / personalization into the item name
    // so it's visible on the Stripe checkout page, the receipt, and
    // (via the webhook) the order in the admin dashboard.
    const line_items = items.map((item) => {
      const opts = item.options || {};
      const optionText = Object.entries(opts)
        .filter(([, v]) => v && v !== "As shown")
        .map(([, v]) => v)
        .join(", ");

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: optionText ? `${item.name} (${optionText})` : String(item.name || "Item"),
          },
          unit_amount: Math.round(Number(item.price) * 100),
        },
        quantity: Math.max(1, Number(item.qty) || 1),
      };
    });

    const base = returnBase || "https://example.com/";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      shipping_address_collection: { allowed_countries: ["US"] },
      success_url: `${base}?checkout=success`,
      cancel_url: `${base}?checkout=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
