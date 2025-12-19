-- Quick setup for user_links table
-- Run this in your Supabase SQL Editor

-- Create user_links table
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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_links_user_id ON public.user_links(user_id);
CREATE INDEX IF NOT EXISTS idx_user_links_position ON public.user_links(position);

-- Also ensure boards table has the missing columns
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'boards' AND column_name = 'is_public') THEN
    ALTER TABLE public.boards ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

SELECT 'Setup complete!' as result;
