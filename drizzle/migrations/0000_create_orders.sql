CREATE SEQUENCE IF NOT EXISTS public.order_number_seq;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  order_number integer NOT NULL DEFAULT nextval('public.order_number_seq'),
  table_number text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  stripe_session_id text,
  paid boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new'
);

GRANT SELECT, INSERT, UPDATE ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO anon, authenticated, service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read orders" ON public.orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update order status" ON public.orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

CREATE INDEX orders_created_at_idx ON public.orders (created_at DESC);