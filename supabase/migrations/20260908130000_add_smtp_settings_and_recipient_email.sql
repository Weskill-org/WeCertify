-- Migration: Add SMTP settings and recipient email fields

CREATE TABLE IF NOT EXISTS public.smtp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host text NOT NULL DEFAULT '',
  port integer NOT NULL DEFAULT 587,
  secure boolean NOT NULL DEFAULT false,
  user_name text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT 'CertifyHub by Weskill',
  default_subject text NOT NULL DEFAULT 'Your {{certification_title}} Certificate is Ready - {{certificate_number}}',
  default_body text NOT NULL DEFAULT 'Dear {{holder_name}},

Congratulations! We are pleased to inform you that your certificate for {{certification_title}} has been successfully issued.

Certificate Details:
- Certificate ID: {{certificate_number}}
- Issue Date: {{issue_date}}
{{#grade}}- Grade: {{grade}}
{{/grade}}- Issuing Authority: {{issuing_authority}}

You can view and verify the authenticity of your official credential online anytime using the following link:
{{verification_url}}

Best regards,
{{issuing_authority}}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.smtp_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.smtp_settings TO authenticated;
GRANT ALL ON public.smtp_settings TO service_role;

-- Admins can manage all SMTP settings
CREATE POLICY "Admins can manage smtp settings"
ON public.smtp_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Issuers can view SMTP settings (used to fetch default subject/body for emailing)
CREATE POLICY "Issuers can view smtp settings"
ON public.smtp_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'issuer'));

-- Updated_at trigger
DROP TRIGGER IF EXISTS smtp_settings_updated_at ON public.smtp_settings;
CREATE TRIGGER smtp_settings_updated_at
BEFORE UPDATE ON public.smtp_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add recipient email and email_sent_at to certificates
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS recipient_email text,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

-- Insert a default SMTP settings row if none exists
INSERT INTO public.smtp_settings (
  host, port, secure, user_name, password, from_email, from_name
)
SELECT '', 587, false, '', '', '', 'CertifyHub by Weskill'
WHERE NOT EXISTS (SELECT 1 FROM public.smtp_settings);
