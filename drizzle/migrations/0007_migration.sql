DROP POLICY IF EXISTS "Signed-in users can look up rooms" ON public.theatre_rooms;
CREATE POLICY "Hosts view own rooms" ON public.theatre_rooms FOR SELECT TO authenticated USING (auth.uid() = host_id);

CREATE OR REPLACE FUNCTION public.find_theatre_room(_code text)
RETURNS TABLE(code text, host_id uuid, media_type text, tmdb_id integer, season integer, episode integer, title text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.code, r.host_id, r.media_type, r.tmdb_id, r.season, r.episode, r.title
  FROM public.theatre_rooms r
  WHERE auth.uid() IS NOT NULL AND length(_code) = 6 AND r.code = upper(_code)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.find_theatre_room(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_theatre_room(text) TO authenticated;