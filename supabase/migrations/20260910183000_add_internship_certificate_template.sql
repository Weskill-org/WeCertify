-- Seed Prestigious Internship Completion certificate template

INSERT INTO public.certificate_templates (name, description, html, variables, is_default)
SELECT
  'Prestigious Internship Completion',
  'Official corporate and tech internship completion credential with dual mentor & HR signatures, project capstone showcase, and tenure badges.',
  '<div style="font-family:''Segoe UI'',Roboto,-apple-system,BlinkMacSystemFont,sans-serif;background:#ffffff;color:#1e293b;padding:46px 44px;border:3px solid #4338ca;border-radius:16px;box-sizing:border-box;min-height:510px;display:flex;flex-direction:column;justify-content:space-between;position:relative;box-shadow:inset 0 0 0 10px #f8faff, 0 12px 36px -12px rgba(67,56,202,0.12);overflow:hidden;">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #e0e7ff;padding-bottom:16px;">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,#4338ca,#6366f1);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:16px;font-weight:800;box-shadow:0 2px 8px rgba(67,56,202,0.3);">
        ✦
      </div>
      <div>
        <span style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#4338ca;display:block;margin-bottom:2px;">INDUSTRY PRACTICUM &amp; TALENT ACCELERATOR</span>
        <span style="font-size:15px;font-weight:700;color:#0f172a;letter-spacing:0.02em;">{{issuing_authority}}</span>
      </div>
    </div>
    <div style="text-align:right;">
      <span style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);color:#3730a3;border:1px solid #c7d2fe;padding:5px 14px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">
        ★ VERIFIED INTERNSHIP TENURE ★
      </span>
    </div>
  </div>

  <div style="text-align:center;padding:20px 0 16px;">
    <p style="letter-spacing:0.2em;text-transform:uppercase;font-size:12px;color:#6366f1;font-weight:700;margin:0 0 6px;">CREDENTIAL OF PROFESSIONAL COMPLETION</p>
    <h1 style="font-size:30px;color:#0f172a;margin:0 0 10px;font-weight:800;letter-spacing:-0.02em;">Certificate of Internship Completion</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 12px;font-style:italic;">This proudly certifies that</p>
    
    <h2 style="font-size:30px;color:#1e1b4b;margin:0 auto 12px;font-weight:800;letter-spacing:0.01em;border-bottom:2px solid #6366f1;display:inline-block;padding-bottom:4px;">{{holder_name}}</h2>
    
    <p style="color:#334155;font-size:15px;max-width:620px;margin:0 auto 18px;line-height:1.6;">
      has successfully concluded an intensive professional internship in<br>
      <strong style="color:#0f172a;font-size:17px;">{{certification_title}}</strong>
      {{#department}} within the <strong style="color:#4338ca;">{{department}}</strong> division{{/department}}{{#intern_role}} as <strong style="color:#1e1b4b;">{{intern_role}}</strong>{{/intern_role}}.
    </p>

    <div style="display:flex;justify-content:center;flex-wrap:wrap;gap:14px;margin-top:10px;">
      {{#internship_period}}
      <div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:8px;padding:6px 14px;font-size:12px;color:#475569;display:flex;align-items:center;gap:6px;">
        <span style="color:#6366f1;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;">Tenure:</span>
        <strong style="color:#1e1b4b;">{{internship_period}}</strong>
      </div>
      {{/internship_period}}

      {{#project_name}}
      <div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:8px;padding:6px 14px;font-size:12px;color:#475569;display:flex;align-items:center;gap:6px;">
        <span style="color:#6366f1;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;">Capstone Focus:</span>
        <strong style="color:#1e1b4b;">{{project_name}}</strong>
      </div>
      {{/project_name}}

      {{#grade}}
      <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:6px 14px;font-size:12px;color:#3730a3;font-weight:700;display:flex;align-items:center;gap:6px;">
        <span style="color:#4338ca;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;">Rating:</span>
        <span>{{grade}}</span>
      </div>
      {{/grade}}
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:2px solid #e0e7ff;padding-top:16px;font-size:12px;color:#64748b;">
    <div style="text-align:left;min-width:140px;">
      {{#mentor_name}}
      <div style="font-weight:700;color:#0f172a;font-size:13px;border-bottom:1px solid #c7d2fe;padding-bottom:2px;display:inline-block;">{{mentor_name}}</div>
      <div style="font-size:11px;color:#6366f1;margin-top:2px;font-weight:500;">Engineering Mentor / Supervisor</div>
      {{/mentor_name}}
    </div>

    <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px;padding:4px 12px;border-radius:8px;background:#f8faff;border:1px solid #e0e7ff;">
      {{#qr_code_url}}<img src="{{qr_code_url}}" width="48" height="48" style="border-radius:4px;border:1px solid #c7d2fe;background:#fff;padding:2px;" alt="Verification QR" />{{/qr_code_url}}
      <div>
        <span style="font-size:9px;font-family:monospace;color:#6366f1;display:block;letter-spacing:0.06em;">certify.weskill.org</span>
        <strong style="font-family:monospace;color:#1e1b4b;font-size:11px;">{{certificate_number}}</strong>
      </div>
      <span style="font-size:10px;color:#94a3b8;">Issued: {{issue_date}}</span>
    </div>

    <div style="text-align:right;min-width:140px;">
      {{#hr_director}}
      <div style="font-weight:700;color:#0f172a;font-size:13px;border-bottom:1px solid #c7d2fe;padding-bottom:2px;display:inline-block;">{{hr_director}}</div>
      <div style="font-size:11px;color:#6366f1;margin-top:2px;font-weight:500;">Director of People &amp; Talent</div>
      {{/hr_director}}
    </div>
  </div>
</div>',
  '[
    {"key": "intern_role", "label": "Intern Role / Designation", "defaultValue": "Full-Stack Software Engineering Intern"},
    {"key": "department", "label": "Department / Division", "defaultValue": "Cloud Platforms & Infrastructure"},
    {"key": "internship_period", "label": "Internship Period / Tenure", "defaultValue": "June 1, 2026 – August 31, 2026"},
    {"key": "project_name", "label": "Capstone / Major Project", "defaultValue": "Distributed Real-Time Verification Engine"},
    {"key": "mentor_name", "label": "Mentor / Technical Lead", "defaultValue": "Dr. Vikram Malhotra, Principal Architect"},
    {"key": "hr_director", "label": "Head of Talent / HR Director", "defaultValue": "Elena Vance, VP of People Operations"}
  ]'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM public.certificate_templates WHERE name = 'Prestigious Internship Completion'
);
