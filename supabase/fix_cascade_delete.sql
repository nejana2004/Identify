-- Fix foreign key constraints to enable cascade delete
-- This allows boards to be deleted even when they have pins

-- STEP 1: Drop ALL foreign key constraints on pins table (find them dynamically)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT constraint_name FROM information_schema.table_constraints 
              WHERE table_name = 'pins' AND constraint_type = 'FOREIGN KEY') 
    LOOP
        EXECUTE 'ALTER TABLE pins DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
    END LOOP;
    
    FOR r IN (SELECT constraint_name FROM information_schema.table_constraints 
              WHERE table_name = 'boards' AND constraint_type = 'FOREIGN KEY') 
    LOOP
        EXECUTE 'ALTER TABLE boards DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
    END LOOP;
    
    FOR r IN (SELECT constraint_name FROM information_schema.table_constraints 
              WHERE table_name = 'user_links' AND constraint_type = 'FOREIGN KEY') 
    LOOP
        EXECUTE 'ALTER TABLE user_links DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
    END LOOP;
END $$;

-- STEP 2: Delete the specific orphaned pin (board_id that no longer exists)
DELETE FROM pins WHERE board_id = '58b3db9b-9aac-4c8c-bdbf-fb499986acf0';

-- STEP 3: Clean up ALL orphaned data (using LEFT JOIN for reliability)
DELETE FROM pins p
WHERE NOT EXISTS (SELECT 1 FROM boards b WHERE b.id = p.board_id);

DELETE FROM pins p
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.profile_id);

DELETE FROM boards b
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = b.user_id);

DELETE FROM user_links ul
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ul.user_id);

-- STEP 4: Re-add constraints with ON DELETE CASCADE

-- pins.board_id -> boards.id
ALTER TABLE pins 
ADD CONSTRAINT pins_board_id_fkey 
FOREIGN KEY (board_id) 
REFERENCES boards(id) 
ON DELETE CASCADE;

-- pins.profile_id -> users.id
ALTER TABLE pins 
ADD CONSTRAINT pins_profile_id_fkey 
FOREIGN KEY (profile_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- boards.user_id -> users.id
ALTER TABLE boards 
ADD CONSTRAINT boards_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- user_links.user_id -> users.id
ALTER TABLE user_links 
ADD CONSTRAINT user_links_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- STEP 5: Verify the constraints
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('pins', 'boards', 'user_links');
