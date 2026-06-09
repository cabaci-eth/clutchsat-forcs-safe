
-- Fix search_path on the validation function
CREATE OR REPLACE FUNCTION public.validate_community_question_options()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF jsonb_array_length(NEW.options) != 4 THEN
    RAISE EXCEPTION 'options must contain exactly 4 elements';
  END IF;
  FOR i IN 0..3 LOOP
    IF NEW.options->>i IS NULL OR char_length(trim(NEW.options->>i)) = 0 THEN
      RAISE EXCEPTION 'Each option must be a non-empty string';
    END IF;
    IF char_length(NEW.options->>i) > 500 THEN
      RAISE EXCEPTION 'Each option must be at most 500 characters';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
