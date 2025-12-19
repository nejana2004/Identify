-- Fix the foreign key constraint to point to users table instead of profiles
-- Run this in Supabase SQL editor

-- 1. Drop the existing incorrect foreign key constraint
ALTER TABLE pins 
DROP CONSTRAINT IF EXISTS pins_profile_id_fkey;

-- 2. Add the correct foreign key constraint pointing to users table
ALTER TABLE pins 
ADD CONSTRAINT pins_profile_id_fkey 
FOREIGN KEY (profile_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- 3. Verify the constraint was created correctly
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'pins'
  AND tc.table_schema = 'public'
  AND tc.constraint_name = 'pins_profile_id_fkey';
