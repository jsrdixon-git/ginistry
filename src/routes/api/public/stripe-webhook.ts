import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

function verify(payload: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim() ?? "", v?.trim() ?? ""];
    }),
  ) as Record<string, string>;
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        const body = await request.text();
        const header = request.headers.get("stripe-signature") ?? "";
        if (!verify(body, header, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(body) as {
          type?: string;
          data?: { object?: { id?: string; metadata?: { order_id?: string } } };
        };
        if (event.type === "checkout.session.completed") {
          const sessionId = event.data?.object?.id;
          const orderId = event.data?.object?.metadata?.order_id;
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          if (orderId) {
            await supabaseAdmin.from("orders").update({ paid: true }).eq("id", orderId);
          } else if (sessionId) {
            await supabaseAdmin
              .from("orders")
              .update({ paid: true })
              .eq("stripe_session_id", sessionId);
          }
        }
        return new Response("ok");
      },
    },
  },
});
