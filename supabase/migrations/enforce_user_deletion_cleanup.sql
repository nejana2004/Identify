-- Ensure deleting an auth user removes their public user row and all related content.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_user_delete_cascade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Remove profile rows first so legacy FK variants cannot block auth deletion.
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DELETE FROM public.profiles WHERE id = OLD.id;
  END IF;

  -- This delete cascades through boards, threads, cards, follows, memberships,
  -- saves, votes, notifications, and other user-owned content.
  IF to_regclass('public.users') IS NOT NULL THEN
    DELETE FROM public.users WHERE id = OLD.id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_delete_cascade();

DO $$
DECLARE
  existing_fk_name TEXT;
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RETURN;
  END IF;

  SELECT c.conname
  INTO existing_fk_name
  FROM pg_constraint c
  JOIN pg_attribute a
    ON a.attrelid = c.conrelid
   AND a.attnum = ANY(c.conkey)
  WHERE c.conrelid = 'public.profiles'::regclass
    AND c.contype = 'f'
    AND a.attname = 'id'
  LIMIT 1;

  IF existing_fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', existing_fk_name);
  END IF;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

COMMIT;