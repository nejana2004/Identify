-- Function to update pin count when a pin is added or removed
CREATE OR REPLACE FUNCTION update_pin_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment pin count for the profile
    UPDATE public.users 
    SET pin_count = pin_count + 1
    WHERE id = NEW.profile_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement pin count for the profile
    UPDATE public.users 
    SET pin_count = GREATEST(pin_count - 1, 0)
    WHERE id = OLD.profile_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for INSERT operations
CREATE TRIGGER trigger_update_pin_count_insert
AFTER INSERT ON public.pins
FOR EACH ROW
EXECUTE FUNCTION update_pin_count();

-- Create trigger for DELETE operations
CREATE TRIGGER trigger_update_pin_count_delete
AFTER DELETE ON public.pins
FOR EACH ROW
EXECUTE FUNCTION update_pin_count();

-- Initialize pin counts for existing users (in case they're incorrect)
UPDATE public.users u
SET pin_count = (
  SELECT COUNT(*) 
  FROM public.pins p 
  WHERE p.profile_id = u.id
);
