-- Movie ratings: each logged-in user can cast one genuine vote per title.
-- rating: 1 = Timepass, 2 = Good, 3 = Perfect
CREATE TABLE public.movie_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('movie', 'tv')),
  tmdb_id integer NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_type, tmdb_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.movie_votes TO authenticated;
GRANT ALL ON public.movie_votes TO service_role;

ALTER TABLE public.movie_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own votes"
  ON public.movie_votes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own votes"
  ON public.movie_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
  ON public.movie_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON public.movie_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_movie_votes_updated_at
  BEFORE UPDATE ON public.movie_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();