import { useEffect, useMemo, useState } from "react";
import GinExplorer from "@/components/GinExplorer";
import { COCKTAILS, GIN_PRICE } from "@/data/cocktails";
import type { Gin } from "@/data/gins";
import { createCheckout, confirmOrder, type OrderItem } from "@/lib/orders.functions";

const C = {
  bg: "#2c2416",
  card: "#332a18",
  border: "#4a3c22",
  gold: "#e8b84b",
  cream: "#f5ede0",
  barBg: "#231d12",
};
const HEAD = "'Cinzel', serif";
const BODY = "'Cormorant Garamond', serif";

type CartLine = OrderItem & { key: string };
type Tab = "explore" | "order" | "passport";

const money = (n: number) => `£${n.toFixed(2)}`;

export default function GinistryApp({ gins }: { gins: Gin[] }) {
  const [tab, setTab] = useState<Tab>("explore");
  const [orderTab, setOrderTab] = useState<"gins" | "cocktails">("gins");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [payError, setPayError] = useState("");
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState<{ order: string; table: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const table = params.get("table");
    if (table) setTableNumber(table);
    if (params.get("payment") === "success") {
      const stored = window.localStorage.getItem("ginistry_last_order");
      setSuccess({ order: params.get("order") ?? "", table: table ?? "" });
      if (stored) {
        try {
          setCart(JSON.parse(stored) as CartLine[]);
        } catch {
          /* ignore */
        }
      }
      const sessionId = params.get("session_id");
      if (sessionId) void confirmOrder({ data: { sessionId } });
      window.history.replaceState({}, "", table ? `/?table=${table}` : "/");
    }
  }, []);

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.price * l.quantity, 0),
    [cart],
  );
  const itemCount = useMemo(() => cart.reduce((s, l) => s + l.quantity, 0), [cart]);

  const qty = (key: string) => cart.find((l) => l.key === key)?.quantity ?? 0;

  const add = (line: Omit<CartLine, "quantity">) =>
    setCart((prev) => {
      const found = prev.find((l) => l.key === line.key);
      if (found)
        return prev.map((l) => (l.key === line.key ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { ...line, quantity: 1 }];
    });

  const remove = (key: string) =>
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    );

  const clearAndGoHome = () => {
    setSuccess(null);
    setCart([]);
    setNotes("");
    window.localStorage.removeItem("ginistry_last_order");
    setTab("explore");
  };

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(clearAndGoHome, 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

  const pay = async () => {
    setPayError("");
    setPaying(true);
    try {
      window.localStorage.setItem("ginistry_last_order", JSON.stringify(cart));
      const res = await createCheckout({
        data: {
          items: cart.map(({ name, price, quantity, type }) => ({ name, price, quantity, type })),
          table_number: tableNumber,
          notes,
          origin: window.location.origin,
        },
      });
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      setPayError(res.error ?? "Something went wrong. Please try again.");
    } catch {
      setPayError("Something went wrong. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  /* ---------- Success screen ---------- */
  if (success) {
    return (
      <div
        onClick={clearAndGoHome}
        style={{
          background: C.bg,
          minHeight: "100vh",
          color: C.cream,
          fontFamily: BODY,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420, width: "100%" }}>
          <div style={{ fontSize: 72, color: C.gold, lineHeight: 1 }}>✓</div>
          <h1 style={{ fontFamily: HEAD, fontSize: 28, color: C.gold, marginTop: 12 }}>
            Order placed! 🍸
          </h1>
          {success.table && (
            <div style={{ fontFamily: HEAD, fontSize: 22, marginTop: 8 }}>
              Table {success.table}
            </div>
          )}
          {success.order && (
            <div style={{ fontSize: 16, opacity: 0.7 }}>Order #{success.order}</div>
          )}
          {cart.length > 0 && (
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 14,
                padding: 16,
                margin: "20px 0",
                textAlign: "left",
              }}
            >
              {cart.map((l) => (
                <div
                  key={l.key}
                  style={{ display: "flex", justifyContent: "space-between", fontSize: 17 }}
                >
                  <span>
                    {l.quantity} × {l.name}
                  </span>
                  <span>{money(l.price * l.quantity)}</span>
                </div>
              ))}
              <div
                style={{
                  borderTop: `1px solid ${C.border}`,
                  marginTop: 10,
                  paddingTop: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: HEAD,
                  color: C.gold,
                }}
              >
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>
          )}
          <p style={{ fontStyle: "italic", opacity: 0.85, fontSize: 18 }}>
            Your order has been sent to the bar
          </p>
          <p style={{ fontSize: 14, opacity: 0.5, marginTop: 20 }}>Tap anywhere to continue</p>
        </div>
      </div>
    );
  }

  const itemRow = (
    key: string,
    title: string,
    sub: string,
    price: number,
    type: "gin" | "cocktail",
  ) => {
    const q = qty(key);
    return (
      <div
        key={key}
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: HEAD, fontSize: 16, color: C.cream }}>{title}</div>
          <div style={{ fontSize: 15, opacity: 0.6, marginTop: 2 }}>{sub}</div>
          <div style={{ fontFamily: HEAD, fontSize: 15, color: C.gold, marginTop: 6 }}>
            {money(price)}
          </div>
        </div>
        {q === 0 ? (
          <button
            type="button"
            aria-label={`Add ${title}`}
            onClick={() => add({ key, name: title, price, type })}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              border: "none",
              background: C.gold,
              color: "#241d10",
              fontSize: 24,
              lineHeight: 1,
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            +
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              aria-label={`Remove one ${title}`}
              onClick={() => remove(key)}
              style={qtyBtn}
            >
              −
            </button>
            <span style={{ fontFamily: HEAD, fontSize: 17, minWidth: 18, textAlign: "center" }}>
              {q}
            </span>
            <button
              type="button"
              aria-label={`Add another ${title}`}
              onClick={() => add({ key, name: title, price, type })}
              style={qtyBtn}
            >
              +
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.cream, fontFamily: BODY }}>
      <div style={{ paddingBottom: cart.length ? 130 : 76 }}>
        {tab === "explore" && (
          <GinExplorer
            gins={gins}
            screen="main"
            onScreenChange={(s) => s === "passport" && setTab("passport")}
          />
        )}
        {tab === "passport" && (
          <GinExplorer
            gins={gins}
            screen="passport"
            onScreenChange={(s) => s === "main" && setTab("explore")}
          />
        )}

        {tab === "order" && (
          <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px" }}>
            <h1 style={{ fontFamily: HEAD, fontSize: 24, color: C.gold, margin: 0 }}>Order</h1>
            <div style={{ fontSize: 17, opacity: 0.75, marginTop: 6 }}>
              {tableNumber ? (
                <>Serving to <strong style={{ color: C.gold }}>Table {tableNumber}</strong></>
              ) : (
                "Scan the QR code at your table to order"
              )}
            </div>

            <div style={{ display: "flex", gap: 8, margin: "18px 0 16px" }}>
              {(["gins", "cocktails"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrderTab(t)}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    borderRadius: 10,
                    fontFamily: HEAD,
                    fontSize: 13,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    border: `1px solid ${C.gold}`,
                    background: orderTab === t ? C.gold : "transparent",
                    color: orderTab === t ? "#241d10" : C.gold,
                  }}
                >
                  {t === "gins" ? "Gins" : "Cocktails"}
                </button>
              ))}
            </div>

            {orderTab === "gins"
              ? gins.map((g) =>
                  itemRow(
                    `gin-${g.id}`,
                    g.name,
                    [g.style, g.origin].filter(Boolean).join(" · "),
                    GIN_PRICE,
                    "gin",
                  ),
                )
              : COCKTAILS.map((c) =>
                  itemRow(`cocktail-${c.id}`, c.name, c.description, c.price, "cocktail"),
                )}
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      {cart.length > 0 && !sheetOpen && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          style={{
            position: "fixed",
            left: 12,
            right: 12,
            bottom: 74,
            zIndex: 40,
            background: C.gold,
            color: "#241d10",
            border: "none",
            borderRadius: 12,
            padding: "14px 18px",
            fontFamily: HEAD,
            fontSize: 15,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          <span>
            {itemCount} item{itemCount === 1 ? "" : "s"} · {money(total)}
          </span>
          <span>View Order →</span>
        </button>
      )}

      {/* Order summary sheet */}
      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 60,
            display: "flex",
            alignItems: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.card,
              borderTop: `1px solid ${C.gold}`,
              borderRadius: "18px 18px 0 0",
              padding: "18px 18px 28px",
              width: "100%",
              maxHeight: "88vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                width: 44,
                height: 4,
                borderRadius: 2,
                background: C.border,
                margin: "0 auto 14px",
              }}
            />
            <div style={{ fontFamily: HEAD, fontSize: 22, color: C.gold, textAlign: "center" }}>
              {tableNumber ? `Table ${tableNumber}` : "No table selected"}
            </div>

            <div style={{ margin: "18px 0" }}>
              {cart.map((l) => (
                <div
                  key={l.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "8px 0",
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: HEAD, fontSize: 15 }}>{l.name}</div>
                    <div style={{ fontSize: 14, opacity: 0.6 }}>{money(l.price)} each</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button type="button" onClick={() => remove(l.key)} style={qtyBtn}>
                      −
                    </button>
                    <span style={{ fontFamily: HEAD, minWidth: 16, textAlign: "center" }}>
                      {l.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        add({ key: l.key, name: l.name, price: l.price, type: l.type })
                      }
                      style={qtyBtn}
                    >
                      +
                    </button>
                  </div>
                  <div style={{ fontFamily: HEAD, minWidth: 60, textAlign: "right" }}>
                    {money(l.price * l.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: HEAD,
                fontSize: 18,
                color: C.gold,
              }}
            >
              <span>Subtotal</span>
              <span>{money(total)}</span>
            </div>

            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests?"
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginTop: 16,
                background: "#241d10",
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "12px 14px",
                color: C.cream,
                fontFamily: BODY,
                fontSize: 17,
                outline: "none",
              }}
            />

            {payError && (
              <div style={{ color: "#e08b6a", fontSize: 16, marginTop: 12 }}>{payError}</div>
            )}

            <button
              type="button"
              disabled={paying || !cart.length}
              onClick={() => void pay()}
              style={{
                width: "100%",
                marginTop: 16,
                minHeight: 52,
                border: "none",
                borderRadius: 10,
                background: C.gold,
                color: "#241d10",
                fontFamily: HEAD,
                fontSize: 16,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                opacity: paying ? 0.7 : 1,
                touchAction: "manipulation",
              }}
            >
              {paying ? "Please wait…" : `Pay ${money(total)}`}
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              style={{
                width: "100%",
                marginTop: 10,
                minHeight: 46,
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: "transparent",
                color: C.cream,
                fontFamily: HEAD,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              ← Keep browsing
            </button>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          background: C.barBg,
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {(
          [
            { id: "explore", label: "Explore", icon: "🍸" },
            { id: "order", label: "Order", icon: "🛒" },
            { id: "passport", label: "My Passport", icon: "📋" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              borderTop: `2px solid ${tab === t.id ? C.gold : "transparent"}`,
              padding: "10px 4px 12px",
              color: tab === t.id ? C.gold : "rgba(245,237,224,0.5)",
              fontFamily: HEAD,
              fontSize: 11,
              letterSpacing: "0.08em",
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            <div style={{ fontSize: 19, marginBottom: 3 }}>{t.icon}</div>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 18,
  border: `1px solid ${C.gold}`,
  background: "transparent",
  color: C.gold,
  fontSize: 20,
  lineHeight: 1,
  cursor: "pointer",
  touchAction: "manipulation",
};
