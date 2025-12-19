-- Assign default tags to existing users who don't have any tags
UPDATE public.users
SET tags_created = '["Tech", "Business", "Education"]'::jsonb
WHERE tags_created IS NULL 
   OR tags_created = '[]'::jsonb 
   OR jsonb_array_length(tags_created) = 0 
   OR jsonb_array_length(tags_created) IS NULL;

-- This gives all existing users some default tags so they appear in filtered searches
-- Users can update their tags later in their profile settings
