-- Normalize legacy usernames/names that were derived from email prefixes.
-- Never use an email prefix as a public username; generate a stable member_* handle instead.

BEGIN;

UPDATE public.users
SET username = 'member_' || substring(replace(id::text, '-', '') from 1 for 8),
    updated_at = NOW()
WHERE
  username IS NULL
  OR username LIKE '%@%'
  OR (email IS NOT NULL AND lower(username) = lower(split_part(email, '@', 1)));

UPDATE public.users
SET name = CASE
            WHEN name IS NULL OR name LIKE '%@%' OR (email IS NOT NULL AND lower(name) = lower(split_part(email, '@', 1)))
              THEN 'Member'
            ELSE name
          END,
    updated_at = NOW()
WHERE
  name IS NULL
  OR name LIKE '%@%'
  OR (email IS NOT NULL AND lower(name) = lower(split_part(email, '@', 1)));

UPDATE public.profiles p
SET username = u.username,
    name = u.name,
    updated_at = NOW()
FROM public.users u
WHERE p.id = u.id
  AND (
    p.username IS DISTINCT FROM u.username
    OR p.name IS DISTINCT FROM u.name
  );

COMMIT;
