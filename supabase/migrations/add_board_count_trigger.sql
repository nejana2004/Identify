-- Function to update board count when a board is created or deleted
CREATE OR REPLACE FUNCTION update_board_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment board count for the user
    UPDATE public.users 
    SET board_count = board_count + 1
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement board count for the user
    UPDATE public.users 
    SET board_count = GREATEST(board_count - 1, 0)
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_board_count_insert ON public.boards;
DROP TRIGGER IF EXISTS trigger_update_board_count_delete ON public.boards;

-- Create trigger for INSERT operations
CREATE TRIGGER trigger_update_board_count_insert
AFTER INSERT ON public.boards
FOR EACH ROW
EXECUTE FUNCTION update_board_count();

-- Create trigger for DELETE operations
CREATE TRIGGER trigger_update_board_count_delete
AFTER DELETE ON public.boards
FOR EACH ROW
EXECUTE FUNCTION update_board_count();

-- Initialize board counts for existing users (in case they're incorrect)
UPDATE public.users u
SET board_count = (
  SELECT COUNT(*) 
  FROM public.boards b 
  WHERE b.user_id = u.id
);
