CREATE TABLE public.user_activity_daily (
  user_id uuid NOT NULL,
  day date NOT NULL,
  active_seconds integer NOT NULL DEFAULT 0,
  watch_seconds integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
GRANT SELECT, INSERT, UPDATE ON public.user_activity_daily TO authenticated;
GRANT ALL ON public.user_activity_daily TO service_role;
ALTER TABLE public.user_activity_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity select" ON public.user_activity_daily FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own activity insert" ON public.user_activity_daily FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own activity update" ON public.user_activity_daily FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.watch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_type text NOT NULL,
  tmdb_id integer NOT NULL,
  item jsonb NOT NULL,
  first_watched_at timestamptz NOT NULL DEFAULT now(),
  last_watched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_type, tmdb_id)
);
GRANT SELECT, INSERT, UPDATE ON public.watch_history TO authenticated;
GRANT ALL ON public.watch_history TO service_role;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own history select" ON public.watch_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own history insert" ON public.watch_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own history update" ON public.watch_history FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.add_activity(_day date, _active integer, _watch integer)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  INSERT INTO public.user_activity_daily (user_id, day, active_seconds, watch_seconds)
  VALUES (auth.uid(), _day, LEAST(GREATEST(_active,0),90), LEAST(GREATEST(_watch,0),90))
  ON CONFLICT (user_id, day) DO UPDATE SET
    active_seconds = public.user_activity_daily.active_seconds + EXCLUDED.active_seconds,
    watch_seconds = public.user_activity_daily.watch_seconds + EXCLUDED.watch_seconds,
    updated_at = now();
$$;
REVOKE EXECUTE ON FUNCTION public.add_activity(date, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_activity(date, integer, integer) TO authenticated;