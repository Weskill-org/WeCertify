-- Migration: Update existing certificates from WSK- prefix to WE- prefix
UPDATE public.certificates 
SET certificate_number = REPLACE(certificate_number, 'WSK-', 'WE-') 
WHERE certificate_number LIKE 'WSK-%';
