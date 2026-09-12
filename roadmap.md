# Roadmap

- [x] `orders` table + grants + RLS + realtime
- [x] Cocktails data
- [x] Bottom tab bar (Explore / Order / Passport)
- [x] Order tab: Gins + Cocktails sub-tabs, add/qty controls
- [x] Cart bar + order summary sheet + notes
- [x] Checkout server fn (Stripe); "Payments not configured yet" when STRIPE_SECRET_KEY missing
- [x] Stripe webhook route marks order paid
- [x] Success screen after `?payment=success`
- [x] `/dashboard` PIN 1234, realtime order list, status toggle

Blocked: live card payments need STRIPE_SECRET_KEY (and optionally STRIPE_WEBHOOK_SECRET) in Project Settings → Secrets.
