CREATE TABLE public.certificate_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  html text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.certificate_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificate_templates TO authenticated;
GRANT ALL ON public.certificate_templates TO service_role;

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates are publicly readable"
  ON public.certificate_templates FOR SELECT USING (true);

CREATE POLICY "Admins and issuers can create templates"
  ON public.certificate_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'issuer'));

CREATE POLICY "Admins and template owners can update templates"
  ON public.certificate_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

CREATE POLICY "Admins can delete templates"
  ON public.certificate_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER certificate_templates_updated_at
BEFORE UPDATE ON public.certificate_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.certificates
  ADD COLUMN template_id uuid REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
  ADD COLUMN template_data jsonb NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO public.certificate_templates (name, description, html, variables, is_default)
VALUES (
  'Classic Navy & Gold',
  'Default Weskill certificate layout with gold seal accent.',
  '<div style="font-family:Georgia,serif;background:#0b1b33;color:#f7f5ef;padding:56px;text-align:center;border:10px solid #c9a227;">
  <p style="letter-spacing:.3em;text-transform:uppercase;font-size:12px;color:#c9a227;margin:0 0 24px;">{{issuing_authority}}</p>
  <h1 style="font-size:34px;margin:0 0 8px;">Certificate of Completion</h1>
  <p style="margin:0 0 28px;opacity:.75;">This certifies that</p>
  <h2 style="font-size:30px;color:#c9a227;margin:0 0 12px;">{{holder_name}}</h2>
  <p style="margin:0 0 28px;">has successfully completed <strong>{{certification_title}}</strong>{{#grade}}</p>
  <p style="margin:0 0 28px;">Grade: {{grade}}{{/grade}}</p>
  <p style="font-size:13px;opacity:.7;margin:0;">Issued {{issue_date}} &nbsp;•&nbsp; Certificate No. {{certificate_number}}</p>
</div>',
  '[]'::jsonb,
  true
);