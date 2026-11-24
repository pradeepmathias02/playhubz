CREATE TABLE public.theatre_rooms (
  code text PRIMARY KEY,
  host_id uuid NOT NULL,
  media_type text NOT NULL,
  tmdb_id integer NOT NULL,
  season integer,
  episode integer,
  title text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.theatre_rooms TO authenticated;
GRANT ALL ON public.theatre_rooms TO service_role;
ALTER TABLE public.theatre_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can look up rooms" ON public.theatre_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own rooms" ON public.theatre_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts delete own rooms" ON public.theatre_rooms FOR DELETE TO authenticated USING (auth.uid() = host_id);