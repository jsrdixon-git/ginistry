# Table ordering + payment for The Ginistry

Adds a full order-and-pay flow on top of the existing gin explorer, plus a bar-side order screen. Everything you have today stays exactly as it is.

## What customers get

**Bottom tab bar** (dark bar, gold highlight on the active tab):
- Explore — today's gin list, search, filters
- Order — new ordering menu
- My Passport — today's passport screen

**Table from the QR code.** The app reads `?table=5` from the link and shows "Table 5" through the ordering flow. Without it, the Order tab shows "Scan the QR code at your table to order" and ordering is disabled.

**Order tab** with two sub-tabs:
- Gins — every gin from your Google Sheet, showing name, style · origin, £9.50 placeholder price, and a gold + button (turns into − / count / + once added)
- Cocktails — the 12 listed cocktails with name, ingredients, price, same add controls

**Cart.** When something is in the cart a gold bar sits above the tabs: "3 items · £27.50 — View Order →". Tapping opens a summary sheet with the table number at the top, the item lines, subtotal, a "Any special requests?" notes box and a full-width gold "Pay £27.50" button.

**Payment.** The Pay button sends the customer to Stripe's own secure payment page and back to the app afterwards.

**Success screen.** Big gold tick, "Order placed! 🍸", table number, what was ordered, "Your order has been sent to the bar". Clears the cart and returns to Explore after 5 seconds or on tap.

## What the bar gets

A `/dashboard` page, PIN-protected with 1234, that lists orders newest first and updates live on every device without refreshing. Each card: order number, big table number, time, items with quantities, total paid, and a status button cycling NEW (red) → PREPARING (amber) → SERVED (green). Dark theme, laid out for a tablet behind the bar.

## What I need from you

Stripe's built-in Lovable payment setup is not available in this workspace, so the app will connect to your own Stripe account. Please create a Stripe account (free) and add your **test mode secret key** in Project Settings → Secrets as `STRIPE_SECRET_KEY`. I'll build everything now; ordering will work end-to-end as soon as that key is saved. Until then the Pay button will show a clear "payments not configured yet" message.

Prices are placeholders (£9.50 per gin, the cocktail prices you listed) — easy to change later, and gin prices can move into your Google Sheet if you want.

## Technical notes

- New `orders` table: id, created_at, table_number, items (jsonb), subtotal, notes, stripe_session_id, status, order_number (auto-increment via sequence), plus paid flag. RLS: no public reads of the whole table; the dashboard reads through a server function, order creation happens server-side only.
- Realtime enabled on `orders` for the dashboard; dashboard subscribes with the browser client via a narrow policy limited to non-sensitive columns.
- Checkout runs through TanStack server functions (`src/lib/orders.functions.ts`), not edge functions: `createCheckout` inserts the pending order, calls the Stripe Checkout Sessions API, returns the URL; `success_url` returns to `/?payment=success&table=X&order=XXXX`.
- A server route at `src/routes/api/public/stripe-webhook.ts` verifies the Stripe signature and marks the order paid, so unpaid abandoned checkouts never reach the bar.
- New files: `src/data/cocktails.ts`, `src/components/OrderMenu.tsx`, `src/components/CartSheet.tsx`, `src/components/BottomTabs.tsx`, `src/routes/dashboard.tsx`. `GinExplorer.tsx` gains tab state only; its existing screens are untouched.
