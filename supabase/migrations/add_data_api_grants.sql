-- Add Data API GRANT statements for all tables (Supabase requirement effective May 30, 2026)
-- This ensures tables created in public schema are accessible via PostgREST, supabase-js, and GraphQL

-- Grants for users table (if exists)
GRANT SELECT ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;

-- Grants for boards table (if exists)
GRANT SELECT ON public.boards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.boards TO service_role;

-- Grants for pins table (if exists)
GRANT SELECT ON public.pins TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pins TO service_role;

-- Grants for profile_views table (if exists)
GRANT SELECT ON public.profile_views TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_views TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_views TO service_role;

-- Grants for user_links table (if exists)
GRANT SELECT ON public.user_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_links TO service_role;

-- Grants for notifications table (if exists)
GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role;

-- Grants for board_invitations table (if exists)
GRANT SELECT ON public.board_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_invitations TO service_role;

-- Grants for board_join_requests table (if exists)
GRANT SELECT ON public.board_join_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_join_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_join_requests TO service_role;

-- Grants for board_members table (if exists)
GRANT SELECT ON public.board_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_members TO service_role;

-- Grants for board_followers table (if exists)
GRANT SELECT ON public.board_followers TO anon;
GRANT SELECT ON public.board_followers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_followers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_followers TO service_role;

-- Grants for profiles table (if exists)
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
