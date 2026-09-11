-- Migration: Remove Resend API Key and enforce custom SMTP provider

-- 1. Ensure any existing rows have provider set to 'smtp'
UPDATE public.smtp_settings 
SET provider = 'smtp'
WHERE provider IS DISTINCT FROM 'smtp';

-- 2. Drop the resend_api_key column from smtp_settings if it exists
ALTER TABLE public.smtp_settings 
  DROP COLUMN IF EXISTS resend_api_key;
