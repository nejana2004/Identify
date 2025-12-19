-- Additional tables and functions for the Identify app
-- This script adds the core functionality tables and their relationships

---------------------------------
-- PROFILES EXTENSION TABLES
---------------------------------

-- Links table for user's external links (Linktree functionality)
CREATE TABLE IF NOT EXISTS public.links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on links
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

-- Links RLS policies
CREATE POLICY "Users can manage their own links" ON public.links
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view active links" ON public.links
  FOR SELECT USING (active = true);

-- Collections table (for Pinterest-like boards)
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on collections
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Collections RLS policies
CREATE POLICY "Users can manage their own collections" ON public.collections
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view public collections" ON public.collections
  FOR SELECT USING (is_private = false);

-- Items table (for Pinterest-like pins)
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  external_url TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Items RLS policies
CREATE POLICY "Users can manage their own items" ON public.items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view items" ON public.items
  FOR SELECT USING (true);

-- Collection items junction table
CREATE TABLE IF NOT EXISTS public.collection_items (
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  PRIMARY KEY (collection_id, item_id)
);

-- Enable RLS on collection items
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- Collection items RLS policies
CREATE POLICY "Users can manage items in their collections" ON public.collection_items
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.collections WHERE id = collection_id
    )
  );

CREATE POLICY "Everyone can view public collection items" ON public.collection_items
  FOR SELECT USING (
    (SELECT is_private FROM public.collections WHERE id = collection_id) = false
  );

---------------------------------
-- SOCIAL FEATURES
---------------------------------

-- Follows table
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id) -- Prevent self-follows
);

-- Enable RLS on follows
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Follows RLS policies
CREATE POLICY "Users can manage their follows" ON public.follows
  FOR ALL USING (auth.uid() = follower_id);

CREATE POLICY "Everyone can view follows" ON public.follows
  FOR SELECT USING (true);

-- Likes table
CREATE TABLE IF NOT EXISTS public.likes (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

-- Enable RLS on likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Likes RLS policies
CREATE POLICY "Users can manage their likes" ON public.likes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view likes" ON public.likes
  FOR SELECT USING (true);

---------------------------------
-- HELPER FUNCTIONS
---------------------------------

-- Function to get a user's profile with stats
CREATE OR REPLACE FUNCTION get_user_profile(lookup_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_data JSONB;
  follower_count INTEGER;
  following_count INTEGER;
  collection_count INTEGER;
  item_count INTEGER;
BEGIN
  -- Get basic user data
  SELECT row_to_json(u)::jsonb INTO user_data
  FROM users u
  WHERE u.username = lookup_username;
  
  IF user_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get follower count
  SELECT COUNT(*) INTO follower_count
  FROM follows
  WHERE following_id = (user_data->>'id')::uuid;
  
  -- Get following count
  SELECT COUNT(*) INTO following_count
  FROM follows
  WHERE follower_id = (user_data->>'id')::uuid;
  
  -- Get collection count
  SELECT COUNT(*) INTO collection_count
  FROM collections
  WHERE user_id = (user_data->>'id')::uuid;
  
  -- Get item count
  SELECT COUNT(*) INTO item_count
  FROM items
  WHERE user_id = (user_data->>'id')::uuid;
  
  -- Add stats to user data
  user_data := user_data || jsonb_build_object(
    'follower_count', follower_count,
    'following_count', following_count,
    'collection_count', collection_count,
    'item_count', item_count
  );
  
  RETURN user_data;
END;
$$;

-- Function to complete onboarding
CREATE OR REPLACE FUNCTION complete_onboarding(
  user_id UUID,
  user_name TEXT,
  user_username TEXT,
  user_bio TEXT,
  user_country TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  username_taken BOOLEAN;
BEGIN
  -- Check if username is taken by someone else
  SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE username = user_username 
    AND id != user_id
  ) INTO username_taken;
  
  IF username_taken THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Username is already taken'
    );
  END IF;
  
  -- Update user profile
  UPDATE public.users
  SET
    name = user_name,
    username = user_username,
    bio = user_bio,
    country = user_country,
    updated_at = now(),
    onboarded_at = now()
  WHERE id = user_id;
  
  -- Return updated user data
  SELECT row_to_json(u)::jsonb INTO result
  FROM users u
  WHERE u.id = user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'user', result
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Verify new tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('links', 'collections', 'items', 'collection_items', 'follows', 'likes')
ORDER BY table_name;
