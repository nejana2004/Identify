-- Voting, saves, and notification targeting for the MVP engagement layer.

ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS upvote_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downvote_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vote_score INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.thread_replies
  ADD COLUMN IF NOT EXISTS upvote_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downvote_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vote_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS product_card_id UUID REFERENCES public.product_cards(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.content_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  vote_value SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS public.content_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)
);

DO $$ BEGIN
  ALTER TABLE public.content_votes
    ADD CONSTRAINT content_votes_target_type_check CHECK (target_type IN ('thread', 'reply'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.content_votes
    ADD CONSTRAINT content_votes_vote_value_check CHECK (vote_value IN (-1, 1));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.content_saves
    ADD CONSTRAINT content_saves_target_type_check CHECK (target_type IN ('thread', 'card'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_content_votes_target ON public.content_votes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_content_votes_user ON public.content_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_content_saves_target ON public.content_saves(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_content_saves_user ON public.content_saves(user_id);

ALTER TABLE public.content_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read content votes" ON public.content_votes;
CREATE POLICY "Public can read content votes" ON public.content_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own content votes" ON public.content_votes;
CREATE POLICY "Users can manage own content votes" ON public.content_votes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can read content saves" ON public.content_saves;
CREATE POLICY "Public can read content saves" ON public.content_saves
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own content saves" ON public.content_saves;
CREATE POLICY "Users can manage own content saves" ON public.content_saves
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
