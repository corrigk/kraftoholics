// supabase/functions/stripe-webhook/index.ts
//
// Stripe calls this the moment a payment actually succeeds. This is
// the ONLY place a real order gets written to the database — never
// trust the browser's redirect back to the site alone, since that
// can be skipped, retried, or spoofed.
//
// Requires two secrets, set via:
//   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided
// automatically by Supabase — no need to set those yourself.)

import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-11-20.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

// The service role key bypasses Row Level Security — needed here
// because this function isn't an authenticated admin user, it's
// Stripe's server calling in. It never leaves this function.
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { id: string };

    // Guard against Stripe retrying the same event and creating a
    // duplicate order.
    const { data: existing } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (!existing) {
      const full = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items"],
      });

      const details = full.customer_details;
      const shipping = (full as any).shipping_details?.address || details?.address || {};

      const { data: order, error: orderErr } = await supabaseAdmin
        .from("orders")
        .insert({
          customer_name: details?.name || "Customer",
          email: details?.email || "",
          address: [shipping.line1, shipping.line2].filter(Boolean).join(", ") || "—",
          city: shipping.city || "—",
          zip: shipping.postal_code || "—",
          subtotal: (full.amount_total ?? 0) / 100,
          status: "placed",
          stripe_session_id: session.id,
        })
        .select()
        .single();

      if (orderErr) {
        console.error("Order insert failed:", orderErr);
        return new Response("Order insert failed", { status: 500 });
      }

      const items = (full.line_items?.data || []).map((li) => ({
        order_id: order.id,
        product_name: li.description || "Item",
        unit_price: (li.price?.unit_amount ?? 0) / 100,
        qty: li.quantity || 1,
      }));

      if (items.length) {
        const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(items);
        if (itemsErr) console.error("Order items insert failed:", itemsErr);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
