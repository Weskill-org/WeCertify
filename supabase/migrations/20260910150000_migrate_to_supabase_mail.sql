-- Migration: Transition to Supabase Mail System and add Email Delivery Logs

-- 1. Extend smtp_settings to support Supabase Mail delivery
ALTER TABLE public.smtp_settings 
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS resend_api_key text DEFAULT '';

-- Make sure existing default row has provider set to supabase
UPDATE public.smtp_settings 
SET provider = 'supabase' 
WHERE provider IS NULL OR provider = '';

-- Ensure from_email has a sensible default if empty
UPDATE public.smtp_settings
SET from_email = 'certificates@weskill.org'
WHERE from_email IS NULL OR from_email = '';

-- 2. Create certificate_email_logs table to audit and record all Supabase email dispatches
CREATE TABLE IF NOT EXISTS public.certificate_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid REFERENCES public.certificates(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  provider text NOT NULL DEFAULT 'supabase',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on email logs
ALTER TABLE public.certificate_email_logs ENABLE ROW LEVEL SECURITY;

-- Allow issuers and admins to read email delivery logs
CREATE POLICY "Admins and issuers can view email logs"
  ON public.certificate_email_logs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'issuer')
  );

-- Allow issuers and admins to record email delivery logs
CREATE POLICY "Admins and issuers can insert email logs"
  ON public.certificate_email_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'issuer')
  );

-- Create index on certificate_id for fast log lookups
CREATE INDEX IF NOT EXISTS idx_certificate_email_logs_cert_id 
  ON public.certificate_email_logs (certificate_id);

CREATE INDEX IF NOT EXISTS idx_certificate_email_logs_created_at 
  ON public.certificate_email_logs (created_at DESC);
