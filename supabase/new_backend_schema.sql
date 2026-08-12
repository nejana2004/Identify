-- Identify platform backend reset script
-- Run this in Supabase SQL editor to wipe the old app schema and recreate the new platform backend.

BEGIN;

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core users table used by the app.
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  bio TEXT,
  country TEXT,
  profile_photo TEXT,
  tags_created JSONB NOT NULL DEFAULT '[]'::jsonb,
  onboarded_at TIMESTAMPTZ,
  pin_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  board_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
CREATE POLICY "Users are viewable by everyone"
  ON public.users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
CREATE POLICY "Users can insert their own record"
  ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
CREATE POLICY "Users can update their own record"
  ON public.users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own record" ON public.users;
CREATE POLICY "Users can delete their own record"
  ON public.users
  FOR DELETE USING (auth.uid() = id);

-- Board table.
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  cover_image TEXT,
  board_type TEXT NOT NULL DEFAULT 'open',
  access_price NUMERIC(10,2),
  invite_code TEXT,
  topic_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE public.boards
    ADD CONSTRAINT boards_board_type_check
    CHECK (board_type IN ('open', 'invite-only', 'paid'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public boards are viewable by everyone" ON public.boards;
CREATE POLICY "Public boards are viewable by everyone"
  ON public.boards
  FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can create boards" ON public.boards;
CREATE POLICY "Authenticated users can create boards"
  ON public.boards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Board owners can update boards" ON public.boards;
CREATE POLICY "Board owners can update boards"
  ON public.boards
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Board owners can delete boards" ON public.boards;
CREATE POLICY "Board owners can delete boards"
  ON public.boards
  FOR DELETE USING (auth.uid() = user_id);

-- Social proof and membership tables.
CREATE TABLE IF NOT EXISTS public.board_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (board_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (board_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.board_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE (board_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.board_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

ALTER TABLE public.board_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view board followers" ON public.board_followers;
CREATE POLICY "Anyone can view board followers" ON public.board_followers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow boards" ON public.board_followers;
CREATE POLICY "Users can follow boards" ON public.board_followers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unfollow boards" ON public.board_followers;
CREATE POLICY "Users can unfollow boards" ON public.board_followers
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "View board members" ON public.board_members;
CREATE POLICY "View board members" ON public.board_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage board members" ON public.board_members;
CREATE POLICY "Manage board members" ON public.board_members
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.boards WHERE id = board_id) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "View join requests" ON public.board_join_requests;
CREATE POLICY "View join requests" ON public.board_join_requests
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM public.boards WHERE id = board_id));

DROP POLICY IF EXISTS "Users can create join requests" ON public.board_join_requests;
CREATE POLICY "Users can create join requests" ON public.board_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Board owners can update requests" ON public.board_join_requests;
CREATE POLICY "Board owners can update requests" ON public.board_join_requests
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.boards WHERE id = board_id));

DROP POLICY IF EXISTS "Board owners can manage invitations" ON public.board_invitations;
CREATE POLICY "Board owners can manage invitations" ON public.board_invitations
  FOR ALL USING (auth.uid() = invited_by OR auth.uid() = invited_user_id);

DROP POLICY IF EXISTS "Anyone can view invite by code" ON public.board_invitations;
CREATE POLICY "Anyone can view invite by code" ON public.board_invitations
  FOR SELECT USING (invite_code IS NOT NULL);

-- Threads, replies, product cards, transactions.
CREATE TABLE IF NOT EXISTS public.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.thread_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES public.thread_replies(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  reply_level INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  upvote_count INTEGER NOT NULL DEFAULT 0,
  downvote_count INTEGER NOT NULL DEFAULT 0,
  vote_score INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_card_id UUID NOT NULL REFERENCES public.product_cards(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL,
  seller_payout NUMERIC(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read indexed threads" ON public.threads;
CREATE POLICY "Public can read indexed threads" ON public.threads
  FOR SELECT USING (is_indexed = TRUE OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage own threads" ON public.threads;
CREATE POLICY "Users can manage own threads" ON public.threads
  FOR ALL USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Public can read replies" ON public.thread_replies;
CREATE POLICY "Public can read replies" ON public.thread_replies
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own replies" ON public.thread_replies;
CREATE POLICY "Users can manage own replies" ON public.thread_replies
  FOR ALL USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Public can read cards" ON public.product_cards;
CREATE POLICY "Public can read cards" ON public.product_cards
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own cards" ON public.product_cards;
CREATE POLICY "Users can manage own cards" ON public.product_cards
  FOR ALL USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Users can read own transactions" ON public.transactions;
CREATE POLICY "Users can read own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "System can manage transactions" ON public.transactions;
CREATE POLICY "System can manage transactions" ON public.transactions
  FOR ALL USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Legacy compatibility tables used by a few remaining routes.
CREATE TABLE IF NOT EXISTS public.user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  position INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, position)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT,
  bio TEXT,
  avatar_url TEXT,
  country TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (board_id, profile_id)
);

ALTER TABLE public.user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own links" ON public.user_links;
CREATE POLICY "Users can view own links" ON public.user_links
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own links" ON public.user_links;
CREATE POLICY "Users can manage own links" ON public.user_links
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view profile views" ON public.profile_views;
CREATE POLICY "Users can view profile views" ON public.profile_views
  FOR SELECT USING (auth.uid() = profile_id OR auth.uid() = viewer_id);

DROP POLICY IF EXISTS "Users can create profile views" ON public.profile_views;
CREATE POLICY "Users can create profile views" ON public.profile_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id OR viewer_id IS NULL);

DROP POLICY IF EXISTS "Anyone can view pins" ON public.pins;
CREATE POLICY "Anyone can view pins" ON public.pins
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create pins" ON public.pins;
CREATE POLICY "Users can create pins" ON public.pins
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can remove own pins" ON public.pins;
CREATE POLICY "Users can remove own pins" ON public.pins
  FOR DELETE USING (auth.uid() = profile_id);

-- Notifications and activity tables.
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  from_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE,
  product_card_id UUID REFERENCES public.product_cards(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
ALTER TABLE public.content_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_saves ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

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

-- Utility functions used by current code and triggers.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_candidate TEXT;
  base_username TEXT;
  final_username TEXT;
  safe_name TEXT;
  fallback_suffix TEXT;
  counter INT := 0;
BEGIN
  fallback_suffix := substring(replace(NEW.id::text, '-', '') from 1 for 8);

  username_candidate := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'preferred_username'), '')
  );

  IF username_candidate IS NULL
     OR username_candidate LIKE '%@%'
     OR lower(username_candidate) = lower(split_part(COALESCE(NEW.email, ''), '@', 1)) THEN
    username_candidate := 'member_' || fallback_suffix;
  END IF;

  base_username := lower(regexp_replace(username_candidate, '[^a-zA-Z0-9_]+', '_', 'g'));
  base_username := trim(both '_' from base_username);

  IF base_username = '' THEN
    base_username := 'member_' || fallback_suffix;
  END IF;

  final_username := base_username;

  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username AND id <> NEW.id) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;

  safe_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''), NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''));
  IF safe_name IS NULL OR safe_name LIKE '%@%' OR lower(safe_name) = lower(split_part(COALESCE(NEW.email, ''), '@', 1)) THEN
    safe_name := 'Member';
  END IF;

  INSERT INTO public.users (id, username, name, email, created_at, updated_at)
  VALUES (
    NEW.id,
    final_username,
    safe_name,
    NEW.email,
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.user_links WHERE user_id = OLD.id;
  DELETE FROM public.board_followers WHERE user_id = OLD.id;
  DELETE FROM public.board_members WHERE user_id = OLD.id;
  DELETE FROM public.board_join_requests WHERE user_id = OLD.id;
  DELETE FROM public.board_invitations WHERE invited_user_id = OLD.id OR invited_by = OLD.id;
  DELETE FROM public.notifications WHERE user_id = OLD.id;
  DELETE FROM public.profile_views WHERE profile_id = OLD.id OR viewer_id = OLD.id;
  DELETE FROM public.pins WHERE profile_id = OLD.id;
  DELETE FROM public.boards WHERE user_id = OLD.id;
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.slugify_board_title(board_title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(trim(board_title), '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.set_board_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify_board_title(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.increment_board_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users SET board_count = board_count + 1, updated_at = NOW() WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users SET board_count = GREATEST(board_count - 1, 0), updated_at = NOW() WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.increment_pin_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.users SET pin_count = pin_count + 1, updated_at = NOW() WHERE id = NEW.profile_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.users SET pin_count = GREATEST(pin_count - 1, 0), updated_at = NOW() WHERE id = OLD.profile_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.increment_view_count_on_profile_view()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.viewer_id IS DISTINCT FROM NEW.profile_id THEN
    UPDATE public.users SET view_count = view_count + 1, updated_at = NOW() WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_new_user ON auth.users;
CREATE TRIGGER trigger_sync_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trigger_delete_auth_user ON auth.users;
CREATE TRIGGER trigger_delete_auth_user
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

DROP TRIGGER IF EXISTS trigger_set_board_slug ON public.boards;
CREATE TRIGGER trigger_set_board_slug
  BEFORE INSERT OR UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.set_board_slug();

DROP TRIGGER IF EXISTS trigger_increment_board_count_insert ON public.boards;
CREATE TRIGGER trigger_increment_board_count_insert
  AFTER INSERT ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.increment_board_count();

DROP TRIGGER IF EXISTS trigger_increment_board_count_delete ON public.boards;
CREATE TRIGGER trigger_increment_board_count_delete
  AFTER DELETE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.increment_board_count();

DROP TRIGGER IF EXISTS trigger_increment_pin_count_insert ON public.pins;
CREATE TRIGGER trigger_increment_pin_count_insert
  AFTER INSERT ON public.pins
  FOR EACH ROW EXECUTE FUNCTION public.increment_pin_count();

DROP TRIGGER IF EXISTS trigger_increment_pin_count_delete ON public.pins;
CREATE TRIGGER trigger_increment_pin_count_delete
  AFTER DELETE ON public.pins
  FOR EACH ROW EXECUTE FUNCTION public.increment_pin_count();

DROP TRIGGER IF EXISTS trigger_increment_profile_view ON public.profile_views;
CREATE TRIGGER trigger_increment_profile_view
  AFTER INSERT ON public.profile_views
  FOR EACH ROW EXECUTE FUNCTION public.increment_view_count_on_profile_view();

-- Remove old auth users so the rebuilt app starts with a clean signup state.
-- This prevents legacy emails from blocking new account creation.
DELETE FROM auth.users;

-- Grants for the Data API.
GRANT SELECT ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;

GRANT SELECT ON public.boards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boards TO service_role;

GRANT SELECT ON public.board_followers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_followers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_followers TO service_role;

GRANT SELECT ON public.board_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_members TO service_role;

GRANT SELECT ON public.board_join_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_join_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_join_requests TO service_role;

GRANT SELECT ON public.board_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_invitations TO service_role;

GRANT SELECT ON public.threads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.threads TO service_role;

GRANT SELECT ON public.thread_replies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_replies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_replies TO service_role;

GRANT SELECT ON public.product_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_cards TO service_role;

GRANT SELECT ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO service_role;

GRANT SELECT ON public.user_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_links TO service_role;

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

GRANT SELECT ON public.profile_views TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_views TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_views TO service_role;

GRANT SELECT ON public.pins TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pins TO service_role;

GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role;

GRANT SELECT ON public.content_votes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_votes TO service_role;

GRANT SELECT ON public.content_saves TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_saves TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_saves TO service_role;

-- Realtime publication for live updates in the app.
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.boards REPLICA IDENTITY FULL;
ALTER TABLE public.board_followers REPLICA IDENTITY FULL;
ALTER TABLE public.board_members REPLICA IDENTITY FULL;
ALTER TABLE public.board_join_requests REPLICA IDENTITY FULL;
ALTER TABLE public.board_invitations REPLICA IDENTITY FULL;
ALTER TABLE public.threads REPLICA IDENTITY FULL;
ALTER TABLE public.thread_replies REPLICA IDENTITY FULL;
ALTER TABLE public.product_cards REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.user_links REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.profile_views REPLICA IDENTITY FULL;
ALTER TABLE public.pins REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.content_votes REPLICA IDENTITY FULL;
ALTER TABLE public.content_saves REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'users') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'boards') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'board_followers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.board_followers;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'board_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.board_members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'board_join_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.board_join_requests;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'board_invitations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.board_invitations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'threads') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.threads;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'thread_replies') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_replies;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'product_cards') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_cards;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_links') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_links;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profile_views') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_views;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pins') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pins;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'content_votes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.content_votes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'content_saves') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.content_saves;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;