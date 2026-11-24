CREATE TABLE public.upcoming_calendar_cache (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.upcoming_calendar_cache TO anon, authenticated;
GRANT ALL ON public.upcoming_calendar_cache TO service_role;
ALTER TABLE public.upcoming_calendar_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public upcoming calendar read" ON public.upcoming_calendar_cache FOR SELECT TO anon, authenticated USING (id = 'calendar');