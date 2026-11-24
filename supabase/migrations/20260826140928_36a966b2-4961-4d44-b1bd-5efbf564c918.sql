-- Public aggregate vote stats table (no PII), maintained by trigger.
CREATE TABLE IF NOT EXISTS public.movie_vote_stats (
  media_type text NOT NULL,
  tmdb_id integer NOT NULL,
  rating smallint NOT NULL,
  cnt integer NOT NULL DEFAULT 0,
  PRIMARY KEY (media_type, tmdb_id, rating)
);

GRANT SELECT ON public.movie_vote_stats TO anon;
GRANT SELECT ON public.movie_vote_stats TO authenticated;
GRANT ALL ON public.movie_vote_stats TO service_role;

ALTER TABLE public.movie_vote_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vote stats are publicly readable" ON public.movie_vote_stats;
CREATE POLICY "Vote stats are publicly readable"
  ON public.movie_vote_stats FOR SELECT
  TO anon, authenticated
  USING (true);

-- Trigger function keeps aggregates in sync. SECURITY DEFINER is required to write
-- the aggregate table, but it is NOT callable from the API (EXECUTE revoked below).
CREATE OR REPLACE FUNCTION public.sync_movie_vote_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
    UPDATE public.movie_vote_stats
       SET cnt = GREATEST(cnt - 1, 0)
     WHERE media_type = OLD.media_type AND tmdb_id = OLD.tmdb_id AND rating = OLD.rating;
  END IF;

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    INSERT INTO public.movie_vote_stats (media_type, tmdb_id, rating, cnt)
    VALUES (NEW.media_type, NEW.tmdb_id, NEW.rating, 1)
    ON CONFLICT (media_type, tmdb_id, rating)
    DO UPDATE SET cnt = public.movie_vote_stats.cnt + 1;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_movie_vote_stats() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS movie_votes_sync_stats ON public.movie_votes;
CREATE TRIGGER movie_votes_sync_stats
AFTER INSERT OR UPDATE OR DELETE ON public.movie_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_movie_vote_stats();

-- Backfill existing votes
INSERT INTO public.movie_vote_stats (media_type, tmdb_id, rating, cnt)
SELECT media_type, tmdb_id, rating, count(*)::int
FROM public.movie_votes
GROUP BY media_type, tmdb_id, rating
ON CONFLICT (media_type, tmdb_id, rating) DO UPDATE SET cnt = EXCLUDED.cnt;

-- Remove the publicly executable SECURITY DEFINER RPC
DROP FUNCTION IF EXISTS public.get_vote_stats(text, integer);

-- Lock down the remaining helper trigger function too
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;