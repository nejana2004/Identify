-- Create a trigger to automatically sync auth.users to public.users
-- Run this in Supabase SQL editor

-- Create or replace the function that syncs users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_candidate TEXT;
  base_username TEXT;
  final_username TEXT;
  fallback_suffix TEXT;
  counter INT := 0;
BEGIN
  fallback_suffix := substring(replace(NEW.id::text, '-', '') from 1 for 8);

  username_candidate := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(trim(NEW.raw_user_meta_data->>'preferred_username'), ''),
    ''
  );

  IF username_candidate = '' OR position('@' in username_candidate) > 0 THEN
    username_candidate := 'member_' || fallback_suffix;
  END IF;

  base_username := lower(regexp_replace(username_candidate, '[^a-zA-Z0-9_]+', '_', 'g'));
  base_username := trim(both '_' from base_username);

  IF base_username = '' THEN
    base_username := 'member_' || fallback_suffix;
  END IF;

  final_username := base_username;
  
  -- Check if username already exists and add number if needed
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username AND id != NEW.id) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;

  INSERT INTO public.users (id, username, name, email, created_at, pin_count, view_count, board_count)
  VALUES (
    NEW.id,
    final_username,
    CASE
      WHEN COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''), NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), '') = '' THEN 'Member'
      WHEN position('@' in COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '')) > 0 THEN 'Member'
      ELSE COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''), NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''))
    END,
    NEW.email,
    NEW.created_at,
    0, 0, 0
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth signup
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle user deletion (with error handling)
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove profile rows first so legacy FK variants cannot block auth deletion.
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DELETE FROM public.profiles WHERE id = OLD.id;
  END IF;

  -- Deleting public.users cascades through boards and related content.
  IF to_regclass('public.users') IS NOT NULL THEN
    DELETE FROM public.users WHERE id = OLD.id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create the trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create the trigger for user deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();
