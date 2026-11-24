CREATE OR REPLACE FUNCTION public.get_vote_stats(_media_type text, _tmdb_id integer)
RETURNS TABLE (rating smallint, cnt bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rating, count(*)::bigint
  FROM public.movie_votes
  WHERE media_type = _media_type AND tmdb_id = _tmdb_id
  GROUP BY rating;
$$;

GRANT EXECUTE ON FUNCTION public.get_vote_stats(text, integer) TO anon, authenticated;