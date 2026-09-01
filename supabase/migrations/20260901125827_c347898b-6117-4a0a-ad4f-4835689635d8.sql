CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_number TEXT NOT NULL UNIQUE,
  holder_name TEXT NOT NULL,
  certification_title TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  issuing_authority TEXT NOT NULL DEFAULT 'Weskill Certification Authority',
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.certificates TO anon;
GRANT SELECT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Certificates are publicly verifiable"
  ON public.certificates FOR SELECT
  USING (true);

CREATE INDEX certificates_number_idx ON public.certificates (certificate_number);

INSERT INTO public.certificates (certificate_number, holder_name, certification_title, issue_date, expiry_date, status, grade) VALUES
('WSK-2025-000123', 'Aarav Sharma', 'Advanced Full-Stack Web Development', '2025-03-14', '2028-03-14', 'active', 'Distinction'),
('WSK-2025-000456', 'Priya Nair', 'Data Analytics & Visualization Professional', '2025-06-02', NULL, 'active', 'Merit'),
('WSK-2024-000789', 'Rohan Mehta', 'Cloud Solutions Architect Foundations', '2024-01-20', '2025-01-20', 'expired', 'Pass'),
('WSK-2024-000321', 'Sneha Kulkarni', 'Cybersecurity Essentials', '2024-09-11', '2027-09-11', 'revoked', 'Pass'),
('WSK-2026-000998', 'Daniel Okafor', 'AI & Machine Learning Specialist', '2026-02-18', '2029-02-18', 'active', 'Distinction'),
('WSK-2025-000654', 'Meera Iyer', 'UI/UX Product Design Certification', '2025-11-05', NULL, 'active', 'Merit');