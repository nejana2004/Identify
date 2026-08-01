-- Core schema for the board/thread/card version of Identify

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS board_type TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS access_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS invite_code TEXT,
  ADD COLUMN IF NOT EXISTS topic_tags TEXT[] DEFAULT ARRAY[]::TEXT[];

DO $$ BEGIN
  ALTER TABLE public.boards
    ADD CONSTRAINT boards_board_type_check
    CHECK (board_type IN ('open', 'invite-only', 'paid'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  thread_type TEXT NOT NULL DEFAULT 'question',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_solved BOOLEAN NOT NULL DEFAULT FALSE,
  is_indexed BOOLEAN NOT NULL DEFAULT TRUE,
  save_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.thread_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES public.thread_replies(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  reply_level INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  category TEXT NOT NULL DEFAULT 'product',
  image_url TEXT,
  file_url TEXT,
  external_link TEXT,
  stripe_price_id TEXT,
  verified_owner BOOLEAN NOT NULL DEFAULT FALSE,
  save_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_card_id UUID NOT NULL REFERENCES public.product_cards(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL,
  seller_payout NUMERIC(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_board_id ON public.threads(board_id);
CREATE INDEX IF NOT EXISTS idx_threads_author_id ON public.threads(author_id);
CREATE INDEX IF NOT EXISTS idx_thread_replies_thread_id ON public.thread_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_product_cards_creator_id ON public.product_cards(creator_id);
CREATE INDEX IF NOT EXISTS idx_product_cards_thread_id ON public.product_cards(thread_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_id ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON public.transactions(seller_id);

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public can read indexed threads" ON public.threads
  FOR SELECT USING (is_indexed = TRUE OR auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "Users can manage own threads" ON public.threads
  FOR ALL USING (auth.uid() = author_id);

CREATE POLICY IF NOT EXISTS "Public can read replies" ON public.thread_replies
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can manage own replies" ON public.thread_replies
  FOR ALL USING (auth.uid() = author_id);

CREATE POLICY IF NOT EXISTS "Public can read cards" ON public.product_cards
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can manage own cards" ON public.product_cards
  FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY IF NOT EXISTS "Users can read own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY IF NOT EXISTS "System can manage transactions" ON public.transactions
  FOR ALL USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
