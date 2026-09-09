-- Migration: Rename platform default from_name to WeCertify by Weskill
ALTER TABLE public.smtp_settings 
  ALTER COLUMN from_name SET DEFAULT 'WeCertify by Weskill';

UPDATE public.smtp_settings 
SET from_name = 'WeCertify by Weskill' 
WHERE from_name = 'CertifyHub by Weskill';
