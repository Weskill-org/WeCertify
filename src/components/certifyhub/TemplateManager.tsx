import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Check,
  Copy,
  Eye,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  Wand2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TemplatePreview } from "@/components/certifyhub/TemplatePreview";
import { TEMPLATE_PRESETS, type TemplatePreset } from "@/lib/template-presets";
import {
  BUILT_IN_VARIABLES,
  extractCustomVariables,
  renderTemplate,
  type CertificateTemplate,
  type TemplateVariable,
} from "@/lib/template";
import { cn } from "@/lib/utils";

const SAMPLE: Record<string, string> = {
  certificate_number: "WE-2026-000123",
  holder_name: "Ananya Sharma",
  certification_title: "Advanced Data Analytics Programme",
  issue_date: "2026-01-15",
  expiry_date: "2029-01-15",
  issuing_authority: "Weskill Certification Authority",
  grade: "Distinction",
  status: "active",
};

export type TemplateDraft = {
  id: string;
  name: string;
  description: string;
  html: string;
  variables: TemplateVariable[];
  isDefault: boolean;
};

const EMPTY_DRAFT: TemplateDraft = {
  id: "",
  name: "",
  description: "",
  html: TEMPLATE_PRESETS[0]?.html ?? "",
  variables: TEMPLATE_PRESETS[0]?.variables ?? [],
  isDefault: false,
};

type Props = {
  templates: CertificateTemplate[];
  isLoading: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onSave: (draft: TemplateDraft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate?: (id: string) => Promise<void>;
  onSetDefault?: (id: string) => Promise<void>;
  onArchive?: (id: string) => Promise<void>;
  onUnarchive?: (id: string) => Promise<void>;
};

export function TemplateManager({
  templates,
  isLoading,
  canEdit,
  canDelete,
  onSave,
  onDelete,
  onDuplicate,
  onSetDefault,
  onArchive,
  onUnarchive,
}: Props) {
  const [draft, setDraft] = useState<TemplateDraft>(EMPTY_DRAFT);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"active" | "archived" | "all">("active");
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<CertificateTemplate | null>(null);

  const activeTemplates = useMemo(() => templates.filter((t) => !t.is_archived), [templates]);
  const archivedTemplates = useMemo(() => templates.filter((t) => t.is_archived), [templates]);
  const displayedTemplates = useMemo(() => {
    if (filterTab === "active") return activeTemplates;
    if (filterTab === "archived") return archivedTemplates;
    return templates;
  }, [filterTab, activeTemplates, archivedTemplates, templates]);

  const detected = useMemo(() => extractCustomVariables(draft.html), [draft.html]);

  const previewHtml = useMemo(() => {
    const custom: Record<string, string> = {};
    for (const variable of draft.variables) {
      custom[variable.key] = variable.defaultValue || variable.label;
    }
    for (const key of detected) if (!custom[key]) custom[key] = key.replace(/_/g, " ");
    return renderTemplate(draft.html, { ...SAMPLE, ...custom });
  }, [draft.html, draft.variables, detected]);

  function startEdit(template: CertificateTemplate) {
    setDraft({
      id: template.id,
      name: template.name,
      description: template.description ?? "",
      html: template.html,
      variables: template.variables,
      isDefault: template.is_default,
    });
    setIsEditing(true);
  }

  function startNew() {
    setDraft(EMPTY_DRAFT);
    setIsEditing(true);
  }

  function applyPreset(preset: TemplatePreset) {
    setDraft({
      id: "",
      name: `${preset.name} (Custom)`,
      description: preset.description,
      html: preset.html,
      variables: preset.variables,
      isDefault: false,
    });
    setPresetModalOpen(false);
    setIsEditing(true);
  }

  async function handleDirectInstallPreset(preset: TemplatePreset) {
    setSaving(true);
    try {
      await onSave({
        id: "",
        name: preset.name,
        description: preset.description,
        html: preset.html,
        variables: preset.variables,
        isDefault: false,
      });
      setPresetModalOpen(false);
    } finally {
      setSaving(false);
    }
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
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate(id: string) {
    if (!onDuplicate) return;
    setActionLoadingId(id);
    try {
      await onDuplicate(id);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleSetDefault(id: string) {
    if (!onSetDefault) return;
    setActionLoadingId(id);
    try {
      await onSetDefault(id);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleArchive(id: string, name: string) {
    if (!onArchive) return;
    if (
      !window.confirm(
        `Archive "${name}"? It will be hidden from the certificate issuance dropdown, but existing certificates using this template will continue to render properly.`,
      )
    ) {
      return;
    }
    setActionLoadingId(id);
    try {
      await onArchive(id);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleUnarchive(id: string) {
    if (!onUnarchive) return;
    setActionLoadingId(id);
    try {
      await onUnarchive(id);
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-lift sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Certificate Templates
            </h2>
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border border-border">
              {templates.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage, duplicate, and design custom layouts. Use{" "}
            <code className="rounded bg-surface px-1 py-0.5 text-xs text-foreground">
              {"{{variable}}"}
            </code>{" "}
            placeholders for dynamic certificate fields.
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresetModalOpen(true)}
              className="gap-1.5"
            >
              <Sparkles className="size-4 text-gold" /> Preset Library
            </Button>
            <Button size="sm" onClick={startNew} className="gap-1.5">
              <Plus className="size-4" /> Add Template
            </Button>
          </div>
        )}
      </div>

      {/* Filter Tabs: Active vs Archived vs All */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-surface/70 p-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterTab("active")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer",
              filterTab === "active"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Active
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px]",
                filterTab === "active"
                  ? "bg-emerald/15 text-emerald font-semibold"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {activeTemplates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("archived")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer",
              filterTab === "archived"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Archive className="size-3 text-muted-foreground" />
            Archived
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px]",
                filterTab === "archived"
                  ? "bg-amber-500/20 text-amber-500 font-semibold"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {archivedTemplates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer",
              filterTab === "all"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All
            <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
              {templates.length}
            </span>
          </button>
        </div>

        {filterTab === "archived" && (
          <p className="text-xs text-muted-foreground">
            Archived templates are hidden from the certificate issuance dropdown but remain
            preserved.
          </p>
        )}
      </div>

      {/* Templates Card Grid */}
      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading templates…
          </div>
        ) : displayedTemplates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {filterTab === "archived"
                ? "No archived templates found."
                : filterTab === "active"
                  ? "No active templates available. Install from presets or restore an archived template."
                  : "No templates available yet. Install from presets or create your first one."}
            </p>
            {filterTab !== "archived" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetModalOpen(true)}
                className="mt-4 gap-1.5"
              >
                <Sparkles className="size-4 text-gold" /> Browse Preset Library
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayedTemplates.map((template) => {
              const isActionLoading = actionLoadingId === template.id;
              return (
                <div
                  key={template.id}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl border bg-card/60 p-5 transition-all duration-200 hover:border-border hover:shadow-soft",
                    template.is_archived
                      ? "border-dashed border-border/80 bg-surface/30 opacity-90"
                      : template.is_default
                        ? "border-gold/50 bg-gold/5 ring-1 ring-gold/20"
                        : "border-border/70",
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-foreground text-base">
                          {template.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {template.is_archived ? (
                            <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                              <Archive className="size-3" /> Archived
                            </span>
                          ) : template.is_default ? (
                            <span className="flex items-center gap-1 rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">
                              <Star className="size-3 fill-gold" /> Default Template
                            </span>
                          ) : (
                            onSetDefault &&
                            canEdit && (
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() => void handleSetDefault(template.id)}
                                className="text-[11px] text-muted-foreground hover:text-gold transition-colors cursor-pointer"
                              >
                                Set as default
                              </button>
                            )
                          )}
                          <span className="text-xs text-muted-foreground">
                            {template.variables.length} field
                            {template.variables.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        title="Preview certificate design"
                        onClick={() => setPreviewTemplate(template)}
                        className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground transition-colors cursor-pointer"
                      >
                        <Eye className="size-4" />
                      </button>
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                      {template.description || "No description provided."}
                    </p>

                    {template.variables.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {template.variables.slice(0, 3).map((v) => (
                          <span
                            key={v.key}
                            className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                          >
                            {v.label || v.key}
                          </span>
                        ))}
                        {template.variables.length > 3 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{template.variables.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      {template.is_archived ? (
                        onUnarchive &&
                        canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isActionLoading}
                            className="h-8 px-2.5 text-xs text-foreground border-border hover:bg-surface gap-1.5"
                            onClick={() => void handleUnarchive(template.id)}
                            title="Restore template to active status"
                          >
                            {isActionLoading ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <ArchiveRestore className="size-3.5 text-emerald" />
                            )}
                            Restore
                          </Button>
                        )
                      ) : (
                        <>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 text-xs font-medium"
                              onClick={() => startEdit(template)}
                            >
                              Edit
                            </Button>
                          )}
                          {onArchive && canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isActionLoading}
                              className="h-8 px-2 text-xs text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 gap-1"
                              title="Archive template"
                              onClick={() => void handleArchive(template.id, template.name)}
                            >
                              {isActionLoading ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Archive className="size-3.5" />
                              )}
                              Archive
                            </Button>
                          )}
                        </>
                      )}

                      {onDuplicate && canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isActionLoading}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          title="Duplicate template"
                          onClick={() => void handleDuplicate(template.id)}
                        >
                          {isActionLoading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                          <span className="ml-1 hidden sm:inline">Duplicate</span>
                        </Button>
                      )}
                    </div>

                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-destructive"
                        title="Delete template permanently"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Are you sure you want to delete "${template.name}"? This cannot be undone.`,
                            )
                          ) {
                            void onDelete(template.id);
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor Section */}
      {isEditing && (
        <div className="mt-8 rounded-2xl border border-emerald/30 bg-card/80 p-6 shadow-soft">
          <div className="flex items-center justify-between border-b border-border/70 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {draft.id ? `Edit: ${draft.name}` : "Create New Template"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Customize HTML markup, styles, and dynamic custom variables.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="h-8 px-2"
            >
              <X className="size-4" /> Cancel
            </Button>
          </div>

          <form className="mt-6 grid gap-6 lg:grid-cols-2" onSubmit={submit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="templateName">Template Name</Label>
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
                <Label htmlFor="templateDescription">Description</Label>
                <Input
                  id="templateDescription"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Used for executive and advanced courses"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateHtml">HTML &amp; Inline CSS</Label>
                <Textarea
                  id="templateHtml"
                  required
                  rows={14}
                  value={draft.html}
                  onChange={(e) => setDraft({ ...draft, html: e.target.value })}
                  className="font-mono text-xs"
                />
                <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                  <span>Built-in:</span>
                  {BUILT_IN_VARIABLES.map((v) => (
                    <code key={v} className="rounded bg-surface px-1 py-0.2">
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>

              {/* Dynamic Custom Variables */}
              <div className="rounded-2xl border border-border bg-surface/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Custom Variables</p>
                    <p className="text-xs text-muted-foreground">
                      Dynamic form fields prompt issuers for extra details.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addDetectedVariables}>
                    <Wand2 className="size-3.5 mr-1" /> Auto-Detect
                  </Button>
                </div>

                {draft.variables.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    No custom variables yet. Add variables like instructor name or course hours.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {draft.variables.map((variable, index) => (
                      <li
                        key={`${variable.key}-${index}`}
                        className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
                      >
                        <Input
                          aria-label="Variable key"
                          value={variable.key}
                          onChange={(e) => {
                            const next = [...draft.variables];
                            next[index] = { ...variable, key: e.target.value };
                            setDraft({ ...draft, variables: next });
                          }}
                          placeholder="variable_key"
                          className="h-9 font-mono text-xs"
                        />
                        <Input
                          aria-label="Variable label"
                          value={variable.label}
                          onChange={(e) => {
                            const next = [...draft.variables];
                            next[index] = { ...variable, label: e.target.value };
                            setDraft({ ...draft, variables: next });
                          }}
                          placeholder="Field Label"
                          className="h-9 text-xs"
                        />
                        <Input
                          aria-label="Default value"
                          value={variable.defaultValue ?? ""}
                          onChange={(e) => {
                            const next = [...draft.variables];
                            next[index] = { ...variable, defaultValue: e.target.value };
                            setDraft({ ...draft, variables: next });
                          }}
                          placeholder="Default value"
                          className="h-9 text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          aria-label={`Remove ${variable.key || "variable"}`}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              variables: draft.variables.filter((_, i) => i !== index),
                            })
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      variables: [...draft.variables, { key: "", label: "", defaultValue: "" }],
                    })
                  }
                >
                  <Plus className="size-3.5 mr-1" /> Add Field
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/60 px-4 py-3">
                <div>
                  <Label htmlFor="isDefault" className="text-sm font-medium">
                    Set as default template
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Pre-selected when issuing new certificates.
                  </p>
                </div>
                <Switch
                  id="isDefault"
                  checked={draft.isDefault}
                  onCheckedChange={(checked) => setDraft({ ...draft, isDefault: checked })}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" size="lg" className="h-11 flex-1" disabled={saving}>
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {draft.id ? "Save Changes" : "Create Template"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-11"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>

            {/* Split Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Live Preview
                </p>
                <span className="text-[11px] text-muted-foreground">Renders sample data</span>
              </div>
              <TemplatePreview
                html={previewHtml}
                title="Certificate preview"
                className="h-[560px] w-full rounded-2xl border border-border bg-white"
              />
            </div>
          </form>
        </div>
      )}

      {/* Preset Library Dialog */}
      <Dialog open={presetModalOpen} onOpenChange={setPresetModalOpen}>
        <DialogContent className="max-w-4xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display flex items-center gap-2">
              <Sparkles className="size-5 text-gold" />
              Certificate Preset Library
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Choose from professionally designed certificates. Install directly or customize the
              layout.
            </p>
          </DialogHeader>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {TEMPLATE_PRESETS.map((preset) => (
              <div
                key={preset.id}
                className="flex flex-col justify-between rounded-2xl border border-border p-5 bg-card hover:border-emerald/40 hover:shadow-soft transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${preset.badgeColor}15`,
                        color: preset.badgeColor,
                        border: `1px solid ${preset.badgeColor}40`,
                      }}
                    >
                      {preset.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {preset.variables.length} custom field
                      {preset.variables.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <h4 className="mt-2 text-base font-bold text-foreground">{preset.name}</h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    disabled={saving}
                    onClick={() => void handleDirectInstallPreset(preset)}
                  >
                    <Check className="size-3.5 mr-1" /> Add to Templates
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => applyPreset(preset)}
                  >
                    Customize First
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Preview Dialog */}
      <Dialog
        open={Boolean(previewTemplate)}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-4xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display">
              {previewTemplate?.name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">{previewTemplate?.description}</p>
          </DialogHeader>
          <div className="mt-4">
            <TemplatePreview
              html={
                previewTemplate
                  ? renderTemplate(previewTemplate.html, {
                      ...SAMPLE,
                      ...Object.fromEntries(
                        previewTemplate.variables.map((v) => [v.key, v.defaultValue || v.label]),
                      ),
                    })
                  : ""
              }
              title={previewTemplate?.name ?? "Preview"}
              className="h-[480px] w-full rounded-xl border border-border bg-white"
            />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
