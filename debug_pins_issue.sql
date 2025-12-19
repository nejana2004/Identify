-- Debug script to check pins table foreign key constraint issue
-- Run this in your Supabase SQL editor to diagnose the problem

-- 1. Check what users exist in auth.users
SELECT 'Users in auth.users:' as info;
SELECT id, email, raw_user_meta_data FROM auth.users LIMIT 10;

-- 2. Check what's in the users table (our main table)
SELECT 'Users in public.users table:' as info;
SELECT id, username, name FROM public.users LIMIT 10;

-- 3. Check if there's a mismatch between auth.users and public.users
SELECT 'Users in auth.users but not in public.users:' as info;
SELECT au.id, au.email 
FROM auth.users au 
LEFT JOIN public.users pu ON au.id = pu.id 
WHERE pu.id IS NULL;

-- 4. Check boards table
SELECT 'Boards in database:' as info;
SELECT id, title, user_id FROM public.boards LIMIT 10;

-- 5. Check pins table
SELECT 'Pins in database:' as info;
SELECT id, board_id, profile_id FROM public.pins LIMIT 10;

-- 6. Check for orphaned pins (pins pointing to non-existent users)
SELECT 'Orphaned pins (pointing to non-existent users):' as info;
SELECT p.id, p.profile_id, p.board_id 
FROM public.pins p 
LEFT JOIN public.users u ON p.profile_id = u.id 
WHERE u.id IS NULL;

-- 7. Check for orphaned pins (pointing to non-existent boards)
SELECT 'Orphaned pins (pointing to non-existent boards):' as info;
SELECT p.id, p.profile_id, p.board_id 
FROM public.pins p 
LEFT JOIN public.boards b ON p.board_id = b.id 
WHERE b.id IS NULL;

-- Fix script: If you find users in auth.users but not in public.users, run this:
-- This will sync users from auth.users to public.users
INSERT INTO public.users (id, username, name, email)
SELECT 
  au.id, 
  COALESCE(au.raw_user_meta_data->>'username', SPLIT_PART(au.email, '@', 1)) as username,
  COALESCE(au.raw_user_meta_data->>'name', SPLIT_PART(au.email, '@', 1)) as name,
  au.email
FROM auth.users au 
LEFT JOIN public.users pu ON au.id = pu.id 
WHERE pu.id IS NULL;

-- 8. Clean up orphaned pins (remove pins pointing to non-existent boards)
SELECT 'Cleaning up orphaned pins pointing to non-existent boards...' as info;
DELETE FROM public.pins 
WHERE board_id NOT IN (SELECT id FROM public.boards);

-- 9. Clean up orphaned pins (remove pins pointing to non-existent users)
SELECT 'Cleaning up orphaned pins pointing to non-existent users...' as info;
DELETE FROM public.pins 
WHERE profile_id NOT IN (SELECT id FROM public.users);

-- 10. Verify cleanup - check pins table again
SELECT 'Pins table after cleanup:' as info;
SELECT COUNT(*) as total_pins FROM public.pins;

-- 11. Verify all foreign key relationships are now valid
SELECT 'Verifying all relationships are valid:' as info;
SELECT 
  COUNT(p.id) as valid_pins,
  COUNT(DISTINCT p.board_id) as unique_boards_referenced,
  COUNT(DISTINCT p.profile_id) as unique_profiles_referenced
FROM public.pins p
INNER JOIN public.boards b ON p.board_id = b.id
INNER JOIN public.users u ON p.profile_id = u.id;
