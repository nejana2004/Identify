-- Normalize legacy usernames/names that were derived from email prefixes.

BEGIN;

UPDATE public.users
SET username = 'member_' || substring(replace(id::text, '-', '') from 1 for 8),
    updated_at = NOW()
WHERE
  username IS NOT NULL
  AND (
    username LIKE '%@%'
    OR (email IS NOT NULL AND lower(username) = lower(split_part(email, '@', 1)))
  );

UPDATE public.users
SET name = 'Member ' || upper(substring(replace(id::text, '-', '') from 1 for 4)),
    updated_at = NOW()
WHERE
  name IS NOT NULL
  AND (
    name LIKE '%@%'
    OR (email IS NOT NULL AND lower(name) = lower(split_part(email, '@', 1)))
  );

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
