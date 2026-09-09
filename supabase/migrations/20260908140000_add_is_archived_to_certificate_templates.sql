-- Add is_archived column to certificate_templates
ALTER TABLE public.certificate_templates
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_certificate_templates_is_archived
  ON public.certificate_templates(is_archived);
