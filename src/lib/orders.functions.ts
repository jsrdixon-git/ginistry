import { createServerFn } from "@tanstack/react-start";

export type OrderItem = {
  name: string;
  price: number;
  quantity: number;
  type: "gin" | "cocktail";
};

type CheckoutInput = {
  items: OrderItem[];
  table_number: string;
  notes: string;
  origin: string;
};

function sanitize(input: unknown): CheckoutInput {
  const raw = (input ?? {}) as Partial<CheckoutInput>;
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .slice(0, 50)
    .map((i) => ({
      name: String(i?.name ?? "").slice(0, 120),
      price: Math.max(0, Math.min(500, Number(i?.price) || 0)),
      quantity: Math.max(1, Math.min(20, Math.round(Number(i?.quantity) || 1))),
      type: i?.type === "cocktail" ? ("cocktail" as const) : ("gin" as const),
    }))
    .filter((i) => i.name);
  return {
    items,
    table_number: String(raw.table_number ?? "").slice(0, 20),
    notes: String(raw.notes ?? "").slice(0, 500),
    origin: String(raw.origin ?? "").slice(0, 200),
  };
}

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator(sanitize)
  .handler(async ({ data }) => {
    if (!data.items.length) return { error: "Your order is empty." as string, url: null };

    const subtotal = Number(
      data.items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2),
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        table_number: data.table_number,
        items: data.items,
        subtotal,
        notes: data.notes,
        status: "new",
        paid: false,
      })
      .select("id, order_number")
      .single();

    if (error || !order) {
      console.error("Order insert failed", error);
      return { error: "We couldn't save your order. Please try again.", url: null };
    }

    const stripeKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeKey) {
      return {
        error: "Payments not configured yet — add your Stripe key in project settings.",
        url: null,
        orderNumber: order.order_number,
      };
    }

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set(
      "success_url",
      `${data.origin}/?payment=success&table=${encodeURIComponent(data.table_number)}&order=${order.order_number}&session_id={CHECKOUT_SESSION_ID}`,
    );
    params.set("cancel_url", `${data.origin}/?table=${encodeURIComponent(data.table_number)}`);
    params.set("metadata[order_id]", order.id);
    data.items.forEach((item, idx) => {
      params.set(`line_items[${idx}][quantity]`, String(item.quantity));
      params.set(`line_items[${idx}][price_data][currency]`, "gbp");
      params.set(
        `line_items[${idx}][price_data][unit_amount]`,
        String(Math.round(item.price * 100)),
      );
      params.set(`line_items[${idx}][price_data][product_data][name]`, item.name);
    });

    try {
      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const json = (await res.json()) as { url?: string; id?: string; error?: { message?: string } };
      if (!res.ok || !json.url) {
        console.error("Stripe session error", json.error);
        return { error: "Payment could not be started. Please try again.", url: null };
      }
      await supabaseAdmin
        .from("orders")
        .update({ stripe_session_id: json.id ?? null })
        .eq("id", order.id);
      return { error: null, url: json.url, orderNumber: order.order_number };
    } catch (err) {
      console.error("Stripe request failed", err);
      return { error: "Payment could not be started. Please try again.", url: null };
    }
  });

export const confirmOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ({
    sessionId: String((input as { sessionId?: string })?.sessionId ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const stripeKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeKey || !data.sessionId) return { paid: false };
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(data.sessionId)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } },
    );
    const json = (await res.json()) as { payment_status?: string; id?: string };
    if (json.payment_status !== "paid") return { paid: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("orders")
      .update({ paid: true })
      .eq("stripe_session_id", data.sessionId);
    return { paid: true };
  });
