import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const C = {
  bg: "#2c2416",
  card: "#332a18",
  border: "#4a3c22",
  gold: "#e8b84b",
  cream: "#f5ede0",
};
const HEAD = "'Cinzel', serif";
const BODY = "'Cormorant Garamond', serif";

const title = "Bar Dashboard — The Ginistry";
const description = "Live table orders for staff at The Ginistry gin bar in Oxted, Surrey.";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type OrderItem = { name: string; quantity: number; price: number };
type Order = {
  id: string;
  order_number: number;
  table_number: string;
  items: OrderItem[];
  subtotal: number;
  notes: string;
  status: string;
  paid: boolean;
  created_at: string;
};

const NEXT: Record<string, string> = { new: "preparing", preparing: "served", served: "new" };
const STATUS_COLOR: Record<string, string> = {
  new: "#e8b84b",
  preparing: "#8fb0e0",
  served: "#8fc79a",
};

function Dashboard() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage.getItem("ginistry_pin") === "1") {
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (active && data) setOrders(data as unknown as Order[]);
    };
    void load();
    const channel = supabase
      .channel("orders-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void load())
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [unlocked]);

  const cycle = async (order: Order) => {
    const next = NEXT[order.status] ?? "new";
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
    await supabase.from("orders").update({ status: next }).eq("id", order.id);
  };

  if (!unlocked) {
    return (
      <div
        style={{
          background: C.bg,
          minHeight: "100vh",
          color: C.cream,
          fontFamily: BODY,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pin === "1234") {
              window.sessionStorage.setItem("ginistry_pin", "1");
              setUnlocked(true);
            } else {
              setPin("");
            }
          }}
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 24,
            width: "100%",
            maxWidth: 340,
            textAlign: "center",
          }}
        >
          <h1 style={{ fontFamily: HEAD, fontSize: 20, color: C.gold, marginTop: 0 }}>
            Bar Dashboard
          </h1>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            inputMode="numeric"
            placeholder="Enter PIN"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#241d10",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "12px 14px",
              color: C.cream,
              fontFamily: BODY,
              fontSize: 18,
              textAlign: "center",
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              width: "100%",
              marginTop: 14,
              minHeight: 48,
              border: "none",
              borderRadius: 10,
              background: C.gold,
              color: "#241d10",
              fontFamily: HEAD,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        color: C.cream,
        fontFamily: BODY,
        padding: "20px 16px 60px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontFamily: HEAD, fontSize: 24, color: C.gold, marginTop: 0 }}>
          Live Orders
        </h1>
        {orders.length === 0 && (
          <p style={{ opacity: 0.6, fontSize: 18 }}>No orders yet — they'll appear here live.</p>
        )}
        {orders.map((o) => (
          <div
            key={o.id}
            style={{
              background: C.card,
              border: `1px solid ${o.status === "new" ? C.gold : C.border}`,
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: HEAD, fontSize: 26, color: C.gold }}>
                Table {o.table_number || "—"}
              </div>
              <div style={{ textAlign: "right", fontSize: 15, opacity: 0.7 }}>
                <div>#{o.order_number}</div>
                <div>{new Date(o.created_at).toLocaleTimeString()}</div>
              </div>
            </div>

            <div style={{ margin: "12px 0" }}>
              {(o.items ?? []).map((it, i) => (
                <div
                  key={i}
                  style={{ display: "flex", justifyContent: "space-between", fontSize: 17 }}
                >
                  <span>
                    {it.quantity} × {it.name}
                  </span>
                  <span>£{(it.price * it.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {o.notes && (
              <div style={{ fontStyle: "italic", opacity: 0.8, fontSize: 16, marginBottom: 10 }}>
                “{o.notes}”
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: HEAD, fontSize: 18 }}>
                £{Number(o.subtotal).toFixed(2)}{" "}
                <span style={{ fontSize: 13, opacity: 0.6 }}>{o.paid ? "· paid" : "· unpaid"}</span>
              </div>
              <button
                type="button"
                onClick={() => void cycle(o)}
                style={{
                  border: `1px solid ${STATUS_COLOR[o.status] ?? C.border}`,
                  background: "transparent",
                  color: STATUS_COLOR[o.status] ?? C.cream,
                  borderRadius: 20,
                  padding: "10px 18px",
                  fontFamily: HEAD,
                  fontSize: 13,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {o.status}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
