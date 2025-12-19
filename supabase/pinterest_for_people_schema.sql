-- Pinterest-for-People Database Schema
-- This script creates the complete schema for the Identify platform

-- First, ensure we have the core users table
-- (This should already exist from the previous setup)

-- Create boards table for organizing profiles
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add is_public column if it doesn't exist (for existing tables)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'boards' AND column_name = 'is_public') THEN
    ALTER TABLE public.boards ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Enable RLS on boards
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

-- Boards RLS policies
CREATE POLICY "Users can manage their own boards" ON public.boards
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view public boards" ON public.boards
  FOR SELECT USING (is_public = true);

-- Create pins table for pinning profiles to boards
CREATE TABLE IF NOT EXISTS public.pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(board_id, profile_id) -- Prevent duplicate pins
);

-- Enable RLS on pins
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

-- Pins RLS policies
CREATE POLICY "Users can manage pins in their boards" ON public.pins
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.boards WHERE id = board_id
    )
  );

CREATE POLICY "Everyone can view pins in public boards" ON public.pins
  FOR SELECT USING (
    (SELECT is_public FROM public.boards WHERE id = board_id) = true
  );

-- Add view tracking for profiles
CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on profile views
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Profile views RLS policies
CREATE POLICY "Users can view all profile views" ON public.profile_views
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert profile views" ON public.profile_views
  FOR INSERT WITH CHECK (true);

-- Add links table to users for social links (if not exists)
CREATE TABLE IF NOT EXISTS public.user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on user links
ALTER TABLE public.user_links ENABLE ROW LEVEL SECURITY;

-- User links RLS policies
CREATE POLICY "Users can manage their own links" ON public.user_links
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view active links" ON public.user_links
  FOR SELECT USING (is_active = true);

-- Add columns to users table if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'view_count') THEN
    ALTER TABLE public.users ADD COLUMN view_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'pin_count') THEN
    ALTER TABLE public.users ADD COLUMN pin_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'board_count') THEN
    ALTER TABLE public.users ADD COLUMN board_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create functions for analytics and recommendations

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_profile_view(
  profile_user_id UUID,
  viewer_user_id UUID DEFAULT NULL,
  viewer_ip INET DEFAULT NULL,
  viewer_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert view record
  INSERT INTO public.profile_views (
    profile_id, 
    viewer_id, 
    ip_address, 
    user_agent
  ) VALUES (
    profile_user_id, 
    viewer_user_id, 
    viewer_ip, 
    viewer_user_agent
  );
  
  -- Update user's view count
  UPDATE public.users 
  SET view_count = view_count + 1 
  WHERE id = profile_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Function to get trending creators (most pins in last 7 days)
CREATE OR REPLACE FUNCTION get_trending_creators(days_back INTEGER DEFAULT 7, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  username TEXT,
  name TEXT,
  bio TEXT,
  profile_photo TEXT,
  country TEXT,
  tags_created JSONB,
  recent_pin_count BIGINT,
  total_pin_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.name,
    u.bio,
    u.profile_photo,
    u.country,
    u.tags_created,
    COUNT(p.id) as recent_pin_count,
    u.pin_count as total_pin_count
  FROM public.users u
  LEFT JOIN public.pins p ON u.id = p.profile_id 
    AND p.created_at >= (now() - (days_back || ' days')::interval)
  GROUP BY u.id, u.username, u.name, u.bio, u.profile_photo, u.country, u.tags_created, u.pin_count
  ORDER BY recent_pin_count DESC, u.pin_count DESC
  LIMIT limit_count;
END;
$$;

-- Function to get recommended creators based on user's tags
CREATE OR REPLACE FUNCTION get_recommended_creators(
  for_user_id UUID,
  limit_count INTEGER DEFAULT 12
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  name TEXT,
  bio TEXT,
  profile_photo TEXT,
  country TEXT,
  tags_created JSONB,
  pin_count INTEGER,
  view_count INTEGER,
  match_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tags_created JSONB;
  user_tags_liked JSONB;
BEGIN
  -- Get user's preferences
  SELECT u.tags_created, u.tags_liked 
  INTO user_tags_created, user_tags_liked
  FROM public.users u 
  WHERE u.id = for_user_id;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.name,
    u.bio,
    u.profile_photo,
    u.country,
    u.tags_created,
    u.pin_count,
    u.view_count,
    CASE 
      WHEN user_tags_created IS NOT NULL AND u.tags_created ? ANY(SELECT jsonb_array_elements_text(user_tags_created)) THEN 3
      WHEN user_tags_liked IS NOT NULL AND u.tags_created ? ANY(SELECT jsonb_array_elements_text(user_tags_liked)) THEN 2
      ELSE 1
    END as match_score
  FROM public.users u
  WHERE u.id != for_user_id
  ORDER BY match_score DESC, u.pin_count DESC, u.view_count DESC
  LIMIT limit_count;
END;
$$;

-- Function to pin a profile to a board
CREATE OR REPLACE FUNCTION pin_profile_to_board(
  board_uuid UUID,
  profile_uuid UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  board_owner UUID;
BEGIN
  -- Check if user owns the board
  SELECT user_id INTO board_owner FROM public.boards WHERE id = board_uuid;
  
  IF board_owner != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You can only pin to your own boards'
    );
  END IF;
  
  -- Insert the pin
  INSERT INTO public.pins (board_id, profile_id)
  VALUES (board_uuid, profile_uuid)
  ON CONFLICT (board_id, profile_id) DO NOTHING;
  
  -- Update pin count for the profile
  UPDATE public.users 
  SET pin_count = (
    SELECT COUNT(*) FROM public.pins WHERE profile_id = profile_uuid
  )
  WHERE id = profile_uuid;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Profile pinned successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Function to create a new board
CREATE OR REPLACE FUNCTION create_board(
  board_title TEXT,
  board_description TEXT DEFAULT NULL,
  is_board_public BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_board_id UUID;
  result JSONB;
BEGIN
  -- Insert new board
  INSERT INTO public.boards (user_id, title, description, is_public)
  VALUES (auth.uid(), board_title, board_description, is_board_public)
  RETURNING id INTO new_board_id;
  
  -- Update user's board count
  UPDATE public.users 
  SET board_count = (
    SELECT COUNT(*) FROM public.boards WHERE user_id = auth.uid()
  )
  WHERE id = auth.uid();
  
  RETURN jsonb_build_object(
    'success', true,
    'board_id', new_board_id,
    'message', 'Board created successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pins_board_id ON public.pins(board_id);
CREATE INDEX IF NOT EXISTS idx_pins_profile_id ON public.pins(profile_id);
CREATE INDEX IF NOT EXISTS idx_pins_created_at ON public.pins(created_at);
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON public.profile_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at ON public.profile_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_users_tags_created ON public.users USING GIN(tags_created);
CREATE INDEX IF NOT EXISTS idx_users_pin_count ON public.users(pin_count);
CREATE INDEX IF NOT EXISTS idx_users_view_count ON public.users(view_count);

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('boards', 'pins', 'profile_views', 'user_links')
ORDER BY table_name;
