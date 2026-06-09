
-- Add length constraints to community_questions text fields
ALTER TABLE public.community_questions
  ADD CONSTRAINT cq_question_text_len CHECK (char_length(question_text) BETWEEN 1 AND 2000),
  ADD CONSTRAINT cq_explanation_len CHECK (char_length(explanation) BETWEEN 1 AND 3000),
  ADD CONSTRAINT cq_passage_len CHECK (char_length(passage) <= 5000);

-- Add a validation trigger for options JSONB (must be array of exactly 4 non-empty strings)
CREATE OR REPLACE FUNCTION public.validate_community_question_options()
RETURNS TRIGGER
LANGUAGE plpgsql
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

CREATE TRIGGER trg_validate_cq_options
  BEFORE INSERT OR UPDATE ON public.community_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_community_question_options();
