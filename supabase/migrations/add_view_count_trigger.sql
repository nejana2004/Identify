-- Create profile_views table if it doesn't exist
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
DROP POLICY IF EXISTS "Users can view all profile views" ON public.profile_views;
CREATE POLICY "Users can view all profile views" ON public.profile_views
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert profile views" ON public.profile_views;
CREATE POLICY "Anyone can insert profile views" ON public.profile_views
  FOR INSERT WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON public.profile_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at ON public.profile_views(viewed_at);

-- Function to update view count when a profile view is recorded
CREATE OR REPLACE FUNCTION update_view_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment view count for the profile
  UPDATE public.users 
  SET view_count = view_count + 1
  WHERE id = NEW.profile_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_view_count ON public.profile_views;

-- Create trigger for INSERT operations on profile_views
CREATE TRIGGER trigger_update_view_count
AFTER INSERT ON public.profile_views
FOR EACH ROW
EXECUTE FUNCTION update_view_count();

-- Create a simple increment function for the analytics.ts to call
CREATE OR REPLACE FUNCTION increment_profile_views(profile_id UUID)
RETURNS void AS $$
BEGIN
  -- Insert a view record (the trigger will handle updating the count)
  INSERT INTO public.profile_views (profile_id, viewer_id)
  VALUES (profile_id, auth.uid());
EXCEPTION
  WHEN OTHERS THEN
    -- Silently ignore errors (e.g., if user not authenticated)
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize view counts for existing users (in case they're incorrect)
UPDATE public.users u
SET view_count = (
  SELECT COUNT(*) 
  FROM public.profile_views pv 
  WHERE pv.profile_id = u.id
);
