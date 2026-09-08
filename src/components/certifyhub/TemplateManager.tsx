import { useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TemplatePreview } from "@/components/certifyhub/TemplatePreview";
import {
  BUILT_IN_VARIABLES,
  extractCustomVariables,
  renderTemplate,
  type CertificateTemplate,
  type TemplateVariable,
} from "@/lib/template";

const STARTER_HTML = `<div style="font-family:Georgia,serif;background:#0b1b33;color:#f7f5ef;padding:56px;text-align:center;border:10px solid #c9a227;">
  <p style="letter-spacing:.3em;text-transform:uppercase;font-size:12px;color:#c9a227;">{{issuing_authority}}</p>
  <h1 style="font-size:32px;margin:8px 0;">Certificate of Completion</h1>
  <h2 style="font-size:28px;color:#c9a227;">{{holder_name}}</h2>
  <p>has successfully completed <strong>{{certification_title}}</strong></p>
  <p style="font-size:13px;opacity:.75;">Issued {{issue_date}} • No. {{certificate_number}}</p>
</div>`;

const SAMPLE = {
  certificate_number: "WSK-2026-000123",
  holder_name: "Ananya Sharma",
  certification_title: "Advanced Data Analytics Programme",
  issue_date: "2026-01-15",
  expiry_date: "2029-01-15",
  issuing_authority: "Weskill Certification Authority",
  grade: "Distinction",
  status: "active",
};

type Draft = {
  id: string;
  name: string;
  description: string;
  html: string;
  variables: TemplateVariable[];
  isDefault: boolean;
};

const EMPTY_DRAFT: Draft = {
  id: "",
  name: "",
  description: "",
  html: STARTER_HTML,
  variables: [],
  isDefault: false,
};

type Props = {
  templates: CertificateTemplate[];
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onSave: (draft: Draft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function TemplateManager({
  templates,
  isLoading,
  canEdit,
  canDelete,
  onSave,
  onDelete,
}: Props) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const detected = useMemo(() => extractCustomVariables(draft.html), [draft.html]);

  const previewHtml = useMemo(() => {
    const custom: Record<string, string> = {};
    for (const variable of draft.variables) {
      custom[variable.key] = variable.defaultValue || variable.label;
    }
    for (const key of detected) if (!custom[key]) custom[key] = key.replace(/_/g, " ");
    return renderTemplate(draft.html, { ...SAMPLE, ...custom });
  }, [draft.html, draft.variables, detected]);

  function edit(template: CertificateTemplate) {
    setDraft({
      id: template.id,
      name: template.name,
      description: template.description ?? "",
      html: template.html,
      variables: template.variables,
      isDefault: template.is_default,
    });
  }

  function addDetectedVariables() {
    const existing = new Set(draft.variables.map((v) => v.key));
    const additions = detected
      .filter((key) => !existing.has(key))
      .map((key) => ({
        key,
        label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        defaultValue: "",
      }));
    setDraft({ ...draft, variables: [...draft.variables, ...additions] });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(draft);
      setDraft(EMPTY_DRAFT);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-lift sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Certificate templates
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Design the certificate layout in HTML and add your own fields with{" "}
            <code className="rounded bg-surface px-1 py-0.5 text-xs">{"{{variable}}"}</code>{" "}
            placeholders.
          </p>
        </div>
        {draft.id && (
          <Button variant="outline" size="sm" onClick={() => setDraft(EMPTY_DRAFT)}>
            <Plus className="size-4" /> New template
          </Button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {isLoading ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading templates…
          </span>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No templates yet — create the first one.</p>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm"
            >
              <button
                type="button"
                className="font-medium hover:text-emerald"
                onClick={() => edit(template)}
              >
                {template.name}
              </button>
              {template.is_default && (
                <span className="rounded-full border border-gold/40 bg-gold/10 px-2 text-xs font-semibold text-gold">
                  default
                </span>
              )}
              {canDelete && (
                <button
                  type="button"
                  aria-label={`Delete ${template.name}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => void onDelete(template.id)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {canEdit && (
        <form className="mt-8 grid gap-6 lg:grid-cols-2" onSubmit={submit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template name</Label>
              <Input
                id="templateName"
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Classic Navy & Gold"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateDescription">Description (optional)</Label>
              <Input
                id="templateDescription"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Used for flagship programmes"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateHtml">HTML</Label>
              <Textarea
                id="templateHtml"
                required
                rows={14}
                value={draft.html}
                onChange={(e) => setDraft({ ...draft, html: e.target.value })}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Built-in fields: {BUILT_IN_VARIABLES.map((v) => `{{${v}}}`).join(", ")}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Custom variables</p>
                <Button type="button" variant="outline" size="sm" onClick={addDetectedVariables}>
                  <Wand2 className="size-4" /> Detect from HTML
                </Button>
              </div>
              {draft.variables.length === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Add fields issuers fill in per certificate, e.g. mentor name or credit hours.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {draft.variables.map((variable, index) => (
                    <li key={`${variable.key}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                      <Input
                        aria-label="Variable key"
                        value={variable.key}
                        onChange={(e) => {
                          const next = [...draft.variables];
                          next[index] = { ...variable, key: e.target.value };
                          setDraft({ ...draft, variables: next });
                        }}
                        placeholder="mentor_name"
                        className="h-10 font-mono text-xs"
                      />
                      <Input
                        aria-label="Variable label"
                        value={variable.label}
                        onChange={(e) => {
                          const next = [...draft.variables];
                          next[index] = { ...variable, label: e.target.value };
                          setDraft({ ...draft, variables: next });
                        }}
                        placeholder="Mentor name"
                        className="h-10"
                      />
                      <Input
                        aria-label="Default value"
                        value={variable.defaultValue ?? ""}
                        onChange={(e) => {
                          const next = [...draft.variables];
                          next[index] = { ...variable, defaultValue: e.target.value };
                          setDraft({ ...draft, variables: next });
                        }}
                        placeholder="Default (optional)"
                        className="h-10"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Remove ${variable.key || "variable"}`}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            variables: draft.variables.filter((_, i) => i !== index),
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() =>
                  setDraft({
                    ...draft,
                    variables: [...draft.variables, { key: "", label: "", defaultValue: "" }],
                  })
                }
              >
                <Plus className="size-4" /> Add variable
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/60 px-4 py-3">
              <Label htmlFor="isDefault" className="text-sm">
                Use as default template
              </Label>
              <Switch
                id="isDefault"
                checked={draft.isDefault}
                onCheckedChange={(checked) => setDraft({ ...draft, isDefault: checked })}
              />
            </div>

            <Button type="submit" size="lg" className="h-11 w-full" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {draft.id ? "Save changes" : "Create template"}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Live preview
            </p>
            <TemplatePreview html={previewHtml} className="h-[560px] w-full rounded-2xl border border-border bg-white" />
          </div>
        </form>
      )}
    </section>
  );
}
