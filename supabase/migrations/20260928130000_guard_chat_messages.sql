-- Les messages d'un groupe de spécialité peuvent être courts, comme dans une
-- messagerie. L'ancien minimum de 10 caractères ne s'applique plus.
ALTER TABLE public.guard_discussions
  DROP CONSTRAINT IF EXISTS guard_discussions_content_check;

ALTER TABLE public.guard_discussions
  ADD CONSTRAINT guard_discussions_content_check
  CHECK (char_length(content) BETWEEN 2 AND 10000);

NOTIFY pgrst, 'reload schema';
