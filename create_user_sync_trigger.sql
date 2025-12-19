-- Create a trigger to automatically sync auth.users to public.users
-- Run this in Supabase SQL editor

-- Create or replace the function that syncs users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Generate base username from email
  base_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  final_username := base_username;
  
  -- Check if username already exists and add number if needed
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username AND id != NEW.id::text) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;

  INSERT INTO public.users (id, username, name, email, created_at, pin_count, view_count, board_count)
  VALUES (
    NEW.id::text,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
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
  -- Delete user's pins first (to avoid foreign key issues)
  BEGIN
    DELETE FROM public.pins WHERE user_id = OLD.id::text;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not delete pins by user_id: %', SQLERRM;
  END;
  
  BEGIN
    DELETE FROM public.pins WHERE profile_id = OLD.id::text;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not delete pins by profile_id: %', SQLERRM;
  END;
  
  -- Delete user's boards
  BEGIN
    DELETE FROM public.boards WHERE user_id = OLD.id::text;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not delete boards: %', SQLERRM;
  END;
  
  -- Delete user's links
  BEGIN
    DELETE FROM public.user_links WHERE user_id = OLD.id::text;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not delete user_links: %', SQLERRM;
  END;
  
  -- Finally delete the user record
  BEGIN
    DELETE FROM public.users WHERE id = OLD.id::text;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not delete user: %', SQLERRM;
  END;
  
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
