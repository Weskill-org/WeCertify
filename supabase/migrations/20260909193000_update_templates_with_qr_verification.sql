-- Update certificate templates to include scannable QR codes and canonical verification links (certify.weskill.org)

UPDATE public.certificate_templates
SET html = '<div style="font-family:Georgia,serif;background:#0b1b33;color:#f7f5ef;padding:52px 48px;text-align:center;border:10px solid #c9a227;border-radius:4px;box-sizing:border-box;min-height:480px;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden;">
  <div style="border:1px solid rgba(201,162,39,0.3);padding:36px 32px;border-radius:2px;box-sizing:border-box;background:radial-gradient(ellipse at center, rgba(16,33,62,0.6) 0%, rgba(11,27,51,0.95) 100%);">
    <p style="letter-spacing:.3em;text-transform:uppercase;font-size:12px;color:#c9a227;margin:0 0 16px;font-weight:600;">{{issuing_authority}}</p>
    {{#department}}<p style="letter-spacing:.15em;text-transform:uppercase;font-size:11px;color:#d8c385;margin:0 0 20px;opacity:.85;">{{department}}</p>{{/department}}
    <h1 style="font-size:32px;margin:0 0 8px;font-weight:700;letter-spacing:-0.01em;">Certificate of Completion</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#c5c0b0;font-style:italic;">This proudly certifies that</p>
    <h2 style="font-size:28px;color:#e5bf43;margin:0 0 14px;font-weight:700;letter-spacing:0.02em;">{{holder_name}}</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5;">has successfully completed all required coursework and examinations for<br><strong style="color:#ffffff;font-size:17px;">{{certification_title}}</strong></p>
    {{#grade}}
    <div style="display:inline-block;margin:0 auto 20px;padding:4px 18px;border:1px solid rgba(201,162,39,0.5);border-radius:20px;background:rgba(201,162,39,0.1);color:#e5bf43;font-size:13px;font-weight:600;letter-spacing:0.05em;">
      Grade Awarded: {{grade}}
    </div>
    {{/grade}}
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(201,162,39,0.25);display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#a8a294;">
      <span>Issued: <strong>{{issue_date}}</strong></span>
      <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px;">
        <span style="color:#c9a227;font-weight:600;font-size:11px;letter-spacing:0.08em;">★ VERIFIED CREDENTIAL ★</span>
        {{#qr_code_url}}<img src="{{qr_code_url}}" width="56" height="56" style="border-radius:4px;border:1px solid #c9a227;background:#fff;padding:2px;" alt="Verification QR" />{{/qr_code_url}}
        <span style="font-size:9px;color:#d8c385;letter-spacing:0.04em;">certify.weskill.org</span>
      </div>
      <span>Cert ID: <strong>{{certificate_number}}</strong></span>
    </div>
  </div>
</div>'
WHERE name = 'Classic Navy & Gold';

UPDATE public.certificate_templates
SET html = '<div style="font-family:''Segoe UI'',Roboto,Helvetica,sans-serif;background:#ffffff;color:#1e293b;padding:48px;border:3px solid #059669;border-radius:16px;box-sizing:border-box;min-height:480px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:inset 0 0 0 8px #f0fdf4;position:relative;">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #e2e8f0;padding-bottom:18px;">
    <div>
      <span style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#059669;display:block;margin-bottom:2px;">OFFICIAL ACCREDITATION</span>
      <span style="font-size:15px;font-weight:700;color:#0f172a;">{{issuing_authority}}</span>
    </div>
    <div style="text-align:right;">
      <span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.04em;">AUTHENTICATED</span>
    </div>
  </div>

  <div style="text-align:center;padding:24px 0;">
    <h1 style="font-size:30px;color:#0f172a;margin:0 0 8px;font-weight:800;letter-spacing:-0.02em;">Certificate of Achievement</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 16px;">This credential is officially conferred upon</p>
    <h2 style="font-size:28px;color:#059669;margin:0 0 12px;font-weight:700;">{{holder_name}}</h2>
    <p style="color:#334155;font-size:15px;max-width:540px;margin:0 auto;line-height:1.5;">for successfully demonstrating mastery and competence in <br><strong style="color:#0f172a;font-size:17px;">{{certification_title}}</strong></p>
    
    <div style="display:flex;justify-content:center;gap:24px;margin-top:20px;">
      {{#duration_hours}}
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 14px;font-size:12px;color:#475569;">
        Scope: <strong>{{duration_hours}}</strong>
      </div>
      {{/duration_hours}}
      {{#grade}}
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:6px 14px;font-size:12px;color:#047857;font-weight:600;">
        Standing: <strong>{{grade}}</strong>
      </div>
      {{/grade}}
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:2px solid #e2e8f0;padding-top:16px;font-size:12px;color:#64748b;">
    <div>
      {{#instructor_name}}
      <div style="font-weight:600;color:#0f172a;margin-bottom:2px;">{{instructor_name}}</div>
      <div style="font-size:11px;color:#94a3b8;">Lead Faculty Assessor</div>
      {{/instructor_name}}
    </div>
    <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px;">
      {{#qr_code_url}}<img src="{{qr_code_url}}" width="52" height="52" style="border-radius:4px;border:1px solid #a7f3d0;background:#fff;padding:2px;" alt="Verification QR" />{{/qr_code_url}}
      <div>
        <span style="font-size:10px;font-family:monospace;color:#94a3b8;display:block;">certify.weskill.org</span>
        <strong style="font-family:monospace;color:#0f172a;font-size:12px;">{{certificate_number}}</strong>
      </div>
    </div>
    <div style="text-align:right;">
      <span style="font-size:11px;color:#94a3b8;display:block;">ISSUE DATE</span>
      <strong style="color:#0f172a;">{{issue_date}}</strong>
    </div>
  </div>
</div>'
WHERE name = 'Modern Minimalist Emerald';

UPDATE public.certificate_templates
SET html = '<div style="font-family:''Times New Roman'',Times,serif;background:#fffdfa;color:#2c1810;padding:52px 48px;border:8px double #881337;box-sizing:border-box;min-height:480px;display:flex;flex-direction:column;justify-content:space-between;position:relative;box-shadow:inset 0 0 20px rgba(136,19,55,0.05);">
  <div style="text-align:center;border-bottom:1px solid #e7d8c9;padding-bottom:16px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#881337;margin-bottom:4px;">EXECUTIVE BOARD OF CREDENTIALING</div>
    <div style="font-size:16px;font-weight:700;letter-spacing:0.04em;color:#4c0519;">{{issuing_authority}}</div>
  </div>

  <div style="text-align:center;padding:20px 0;">
    <p style="font-style:italic;font-size:15px;color:#78350f;margin:0 0 6px;">Upon recommendation of the Academic Senate, presents this</p>
    <h1 style="font-size:32px;color:#881337;margin:0 0 12px;font-weight:bold;letter-spacing:0.03em;">Executive Diploma of Excellence</h1>
    <p style="font-size:14px;color:#6b5a51;margin:0 0 16px;">to</p>
    <h2 style="font-size:30px;color:#1c1917;margin:0 0 12px;font-family:Georgia,serif;letter-spacing:0.02em;border-bottom:2px solid #881337;display:inline-block;padding-bottom:4px;">{{holder_name}}</h2>
    <p style="font-size:16px;line-height:1.6;color:#332924;margin:12px 0 16px;">in recognition of distinguished capability and demonstrated mastery in<br><strong style="font-size:18px;color:#4c0519;">{{certification_title}}</strong></p>
    {{#distinction_notes}}
    <p style="font-style:italic;font-size:13px;color:#9f1239;margin:0 0 12px;letter-spacing:0.05em;">{{distinction_notes}}</p>
    {{/distinction_notes}}
  </div>

  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #e7d8c9;padding-top:18px;font-size:12px;color:#574841;">
    <div style="text-align:left;">
      {{#board_chair}}
      <div style="font-weight:bold;color:#1c1917;">{{board_chair}}</div>
      <div style="font-size:11px;color:#786961;">Executive Director</div>
      {{/board_chair}}
    </div>
    <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 14px;border:1px solid #fecdd3;background:#fff1f2;border-radius:4px;">
      {{#qr_code_url}}<img src="{{qr_code_url}}" width="48" height="48" style="background:#fff;padding:2px;border-radius:2px;" alt="Verification QR" />{{/qr_code_url}}
      <span style="font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#9f1239;display:block;">certify.weskill.org</span>
      <span style="font-family:monospace;font-weight:bold;color:#881337;font-size:11px;">{{certificate_number}}</span>
    </div>
    <div style="text-align:right;">
      <div style="font-weight:bold;color:#1c1917;">{{issue_date}}</div>
      <div style="font-size:11px;color:#786961;">Date of Conformance</div>
    </div>
  </div>
</div>'
WHERE name = 'Executive Crimson & Ivory';

UPDATE public.certificate_templates
SET html = '<div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;background:#090d16;color:#e2e8f0;padding:44px;border:2px solid #06b6d4;border-radius:12px;box-sizing:border-box;min-height:480px;display:flex;flex-direction:column;justify-content:space-between;position:relative;box-shadow:0 0 30px rgba(6,182,212,0.15);">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(6,182,212,0.25);padding-bottom:16px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="width:10px;height:10px;background:#06b6d4;border-radius:50%;display:inline-block;box-shadow:0 0 8px #06b6d4;"></span>
      <span style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#38bdf8;">VERIFIED_CREDENTIAL // {{issuing_authority}}</span>
    </div>
    <span style="background:rgba(6,182,212,0.1);color:#22d3ee;border:1px solid rgba(6,182,212,0.3);padding:3px 10px;border-radius:4px;font-size:11px;">STATUS: ACTIVE</span>
  </div>

  <div style="text-align:center;padding:24px 0;">
    <div style="color:#06b6d4;font-size:12px;letter-spacing:0.25em;text-transform:uppercase;margin-bottom:8px;">[ CERTIFICATE OF PROFICIENCY ]</div>
    <h1 style="font-size:28px;color:#f8fafc;margin:0 0 16px;font-family:''Segoe UI'',system-ui,sans-serif;font-weight:700;letter-spacing:-0.02em;">{{certification_title}}</h1>
    
    <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(56,189,248,0.2);padding:14px 20px;border-radius:8px;display:inline-block;margin:0 auto 16px;min-width:320px;">
      <span style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px;">ISSUED TO OPERATOR</span>
      <span style="font-size:22px;color:#38bdf8;font-weight:bold;letter-spacing:0.04em;">{{holder_name}}</span>
    </div>

    {{#track_specialization}}
    <div style="font-size:12px;color:#94a3b8;margin-bottom:6px;">
      TRACK: <span style="color:#f1f5f9;">{{track_specialization}}</span>
    </div>
    {{/track_specialization}}

    {{#skills_verified}}
    <div style="font-size:11px;color:#64748b;">
      VALIDATED: <span style="color:#a5f3fc;">{{skills_verified}}</span>
    </div>
    {{/skills_verified}}
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(6,182,212,0.25);padding-top:16px;font-size:11px;color:#64748b;">
    <div>
      <span>RECORD_ID: </span>
      <strong style="color:#38bdf8;">{{certificate_number}}</strong>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      {{#qr_code_url}}<img src="{{qr_code_url}}" width="46" height="46" style="border:1px solid #06b6d4;border-radius:4px;background:#fff;padding:2px;" alt="Verification QR" />{{/qr_code_url}}
      <div style="text-align:left;">
        <span style="color:#06b6d4;font-size:9px;display:block;letter-spacing:0.1em;">SCAN_VERIFY</span>
        <span style="color:#94a3b8;font-size:10px;">certify.weskill.org</span>
      </div>
    </div>
    {{#grade}}
    <div style="background:rgba(56,189,248,0.15);color:#38bdf8;padding:2px 10px;border-radius:4px;font-weight:bold;">
      SCORE: {{grade}}
    </div>
    {{/grade}}
    <div>
      <span>TIMESTAMP: </span>
      <strong style="color:#94a3b8;">{{issue_date}}</strong>
    </div>
  </div>
</div>'
WHERE name = 'Cyber Tech & Engineering';

UPDATE public.certificate_templates
SET html = '<div style="font-family:''Palatino Linotype'',Book Antiqua,Palatino,serif;background:#fafaf9;color:#1e293b;padding:48px 44px;border:6px solid #1e40af;box-sizing:border-box;min-height:480px;display:flex;flex-direction:column;justify-content:space-between;position:relative;outline:2px solid #93c5fd;outline-offset:-12px;">
  <div style="text-align:center;padding-top:6px;">
    <p style="letter-spacing:0.25em;text-transform:uppercase;font-size:11px;color:#1e40af;font-weight:bold;margin:0 0 6px;">INSTITUTIONAL CREST &amp; SEAL</p>
    <h2 style="font-size:18px;color:#0f172a;margin:0;letter-spacing:0.04em;">{{issuing_authority}}</h2>
  </div>

  <div style="text-align:center;padding:18px 0;">
    <p style="font-style:italic;font-size:14px;color:#64748b;margin:0 0 10px;">By virtue of the authority vested in the Academic Council</p>
    <h1 style="font-size:32px;color:#1e3a8a;margin:0 0 12px;font-weight:700;">Certificate of Academic Distinction</h1>
    <p style="font-size:14px;color:#475569;margin:0 0 12px;">is hereby bestowed with all rights and privileges upon</p>
    <h3 style="font-size:28px;color:#0f172a;margin:0 0 12px;font-weight:bold;letter-spacing:0.02em;">{{holder_name}}</h3>
    <p style="font-size:15px;color:#334155;margin:0 0 16px;line-height:1.5;">who has fulfilled all requirements for the professional curriculum in<br><strong style="font-size:17px;color:#1e40af;">{{certification_title}}</strong></p>
    {{#academic_honors}}
    <div style="display:inline-block;padding:4px 18px;border-radius:999px;border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;">
      {{academic_honors}}
    </div>
    {{/academic_honors}}
  </div>

  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid #cbd5e1;padding-top:16px;font-size:12px;color:#475569;">
    <div style="text-align:left;">
      {{#chancellor_name}}
      <div style="font-weight:bold;color:#0f172a;">{{chancellor_name}}</div>
      <div style="font-size:11px;color:#64748b;">Dean of Academic Affairs</div>
      {{/chancellor_name}}
    </div>
    <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px;">
      {{#qr_code_url}}<img src="{{qr_code_url}}" width="50" height="50" style="border:1px solid #bfdbfe;border-radius:4px;background:#fff;padding:2px;" alt="Verification QR" />{{/qr_code_url}}
      <div style="font-size:10px;color:#94a3b8;">certify.weskill.org</div>
      <div style="font-family:monospace;font-weight:bold;color:#1e40af;font-size:12px;">{{certificate_number}}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-weight:bold;color:#0f172a;">{{issue_date}}</div>
      <div style="font-size:11px;color:#64748b;">Conferment Date</div>
    </div>
  </div>
</div>'
WHERE name = 'Academic Distinction / Royal Blue';
