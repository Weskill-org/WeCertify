CREATE TABLE public.certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_number text NOT NULL UNIQUE,
  holder_name text NOT NULL,
  certification_title text NOT NULL,
  issue_date date NOT NULL,
  expiry_date date,
  status text NOT NULL DEFAULT 'active',
  issuing_authority text NOT NULL DEFAULT 'Weskill Certification Authority',
  grade text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.certificates TO anon;
GRANT SELECT ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Certificates are publicly verifiable"
  ON public.certificates FOR SELECT
  USING (true);

INSERT INTO public.certificates
  (certificate_number, holder_name, certification_title, issue_date, expiry_date, status, issuing_authority, grade)
VALUES
  ('WSK-2025-000123', 'Ananya Sharma', 'Advanced Full-Stack Development', '2025-03-14', '2028-03-14', 'active', 'Weskill Certification Authority', 'Distinction'),
  ('WSK-2025-000456', 'Rohan Mehta', 'Data Analytics Professional', '2025-01-22', NULL, 'active', 'Weskill Certification Authority', 'Merit'),
  ('WSK-2024-000789', 'Priya Nair', 'Cloud Infrastructure Associate', '2022-06-10', '2024-06-10', 'expired', 'Weskill Certification Authority', 'Pass'),
  ('WSK-2024-000321', 'Karan Patel', 'Cybersecurity Fundamentals', '2024-02-05', '2027-02-05', 'revoked', 'Weskill Certification Authority', NULL),
  ('WSK-2025-000654', 'Meera Iyer', 'AI & Machine Learning Specialist', '2025-05-30', '2030-05-30', 'active', 'Weskill Certification Authority', 'Distinction');