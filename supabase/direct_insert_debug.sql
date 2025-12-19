-- DIRECT INSERT FUNCTION WITH DEBUG INFO
-- This simplified function adds logging and returns detailed info for debugging

CREATE OR REPLACE FUNCTION direct_insert_debug(
  user_id UUID,
  user_name TEXT,
  user_username TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
  pre_exists BOOLEAN;
  post_exists BOOLEAN;
  error_occurred BOOLEAN := FALSE;
  error_message TEXT;
  has_updated_at BOOLEAN;
  table_columns TEXT;
  schema_info TEXT;
  table_schemas TEXT;
BEGIN
  -- Check if user exists before insert
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = user_id) INTO pre_exists;
  
  -- Get all schemas that have a users table
  SELECT string_agg(table_schema, ', ')
  FROM information_schema.tables
  WHERE table_name = 'users'
  INTO table_schemas;
  
  -- Get detailed schema info for debugging
  SELECT string_agg(table_schema || '.' || table_name || ' (columns: ' || 
    (SELECT string_agg(column_name, ', ') 
     FROM information_schema.columns c 
     WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) || ')', E'\n')
  FROM information_schema.tables t
  WHERE table_name = 'users'
  INTO schema_info;
  
  -- Check if the PUBLIC.users table has an updated_at column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updated_at'
  ) INTO has_updated_at;
  
  -- Get all columns for debugging
  SELECT string_agg(column_name, ', ') 
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'users'
  INTO table_columns;
  
  -- Try to insert or update
  BEGIN
    -- Always use the fully qualified table name
    IF has_updated_at THEN
      -- If updated_at exists, use it
      INSERT INTO public.users (id, name, username, created_at, updated_at)
      VALUES (user_id, user_name, user_username, now(), now())
      ON CONFLICT (id) DO UPDATE
      SET name = user_name, username = user_username, updated_at = now();
    ELSE
      -- If updated_at doesn't exist, omit it
      INSERT INTO public.users (id, name, username, created_at)
      VALUES (user_id, user_name, user_username, now())
      ON CONFLICT (id) DO UPDATE
      SET name = user_name, username = user_username;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    error_occurred := TRUE;
    error_message := SQLERRM;
  END;
  
  -- Check if user exists after insert
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = user_id) INTO post_exists;
  
  -- Build detailed result
  result := jsonb_build_object(
    'success', NOT error_occurred,
    'pre_exists', pre_exists,
    'post_exists', post_exists,
    'user_id', user_id,
    'username', user_username,
    'has_updated_at', has_updated_at,
    'table_schemas', table_schemas,
    'schema_info', schema_info,
    'public_table_columns', table_columns
  );
  
  IF error_occurred THEN
    result := result || jsonb_build_object('error', error_message);
  END IF;
  
  RETURN result;
END;
$$;

-- Also create a better debug policy that allows everyone to see user records
-- FOR DEVELOPMENT ONLY - REMOVE BEFORE PRODUCTION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'DEBUG - Allow all select'
  ) THEN
    CREATE POLICY "DEBUG - Allow all select" ON "public"."users"
      FOR SELECT USING (true);
  END IF;
END $$;
