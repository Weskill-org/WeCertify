import { useMemo, useState } from "react";
import { Check, Eye, FileText, LayoutTemplate, Plus, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TemplatePreview } from "@/components/certifyhub/TemplatePreview";
import { renderTemplate, type CertificateTemplate } from "@/lib/template";
import { cn } from "@/lib/utils";

type Props = {
  templates: CertificateTemplate[];
  selectedId: string;
  onSelect: (templateId: string) => void;
  onAddNew?: () => void;
  sampleData?: Record<string, string | null | undefined>;
};

const DEFAULT_SAMPLE: Record<string, string> = {
  certificate_number: "WE-2026-000456",
  holder_name: "Ananya Sharma",
  certification_title: "Advanced Data Analytics Programme",
  issue_date: "2026-03-14",
  expiry_date: "2029-03-14",
  grade: "Distinction",
  issuing_authority: "Weskill Certification Authority",
  status: "active",
};

export function TemplateSelector({
  templates,
  selectedId,
  onSelect,
  onAddNew,
  sampleData = DEFAULT_SAMPLE,
}: Props) {
  const [search, setSearch] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<CertificateTemplate | null>(null);

  const activeTemplates = useMemo(() => templates.filter((t) => !t.is_archived), [templates]);

  const filtered = useMemo(() => {
    if (!search.trim()) return activeTemplates;
    const query = search.toLowerCase();
    return activeTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query)),
    );
  }, [activeTemplates, search]);

  const modalRenderedHtml = useMemo(() => {
    if (!previewTemplate) return "";
    const defaults: Record<string, string> = {};
    for (const v of previewTemplate.variables) {
      defaults[v.key] = v.defaultValue || v.label;
    }
    return renderTemplate(previewTemplate.html, { ...sampleData, ...defaults });
  }, [previewTemplate, sampleData]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <LayoutTemplate className="size-4 text-emerald" />
            Certificate Template
            <span className="text-xs text-muted-foreground font-normal">
              ({activeTemplates.length} available)
            </span>
          </label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose the visual style and dynamic fields for this certificate.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTemplates.length > 3 && (
            <div className="relative w-44 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates…"
                className="h-8 pl-8 text-xs"
              />
            </div>
          )}
          {onAddNew && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddNew}
              className="h-8 gap-1.5 text-xs border-emerald/40 text-emerald hover:bg-emerald/10 hover:text-emerald"
            >
              <Plus className="size-3.5" />
              Add Template
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Option 1: No Template (Data-only) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelect("")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onSelect("");
          }}
          className={cn(
            "relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200",
            selectedId === ""
              ? "border-emerald bg-emerald/5 shadow-soft ring-2 ring-emerald/30"
              : "border-border/80 bg-card hover:border-border hover:bg-surface/50",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground">
                <FileText className="size-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Data Record Only</h4>
                <span className="text-[11px] text-muted-foreground">No custom layout</span>
              </div>
            </div>
            {selectedId === "" && (
              <span className="flex size-5 items-center justify-center rounded-full bg-emerald text-emerald-foreground">
                <Check className="size-3" />
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Issues verifiable credentials with standard registry layout without visual template.
          </p>
        </div>

        {/* Template Cards */}
        {filtered.map((template) => {
          const isSelected = selectedId === template.id;
          const varCount = template.variables.length;

          return (
            <div
              key={template.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(template.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(template.id);
              }}
              className={cn(
                "group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200",
                isSelected
                  ? "border-emerald bg-emerald/5 shadow-soft ring-2 ring-emerald/40"
                  : "border-border/80 bg-card hover:border-emerald/40 hover:bg-surface/60",
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 pr-1">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                        isSelected
                          ? "border-emerald/40 bg-emerald/10 text-emerald"
                          : "border-border bg-surface text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      <Sparkles className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-foreground">
                        {template.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {template.is_default && (
                          <span className="rounded-full border border-gold/40 bg-gold/15 px-1.5 py-0.2 text-[10px] font-semibold text-gold">
                            Default
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {varCount === 0
                            ? "Standard fields"
                            : `${varCount} custom field${varCount > 1 ? "s" : ""}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      title="Preview template"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTemplate(template);
                      }}
                      className="flex size-7 items-center justify-center rounded-md border border-border/80 bg-background/80 text-muted-foreground hover:bg-surface hover:text-foreground"
                    >
                      <Eye className="size-3.5" />
                    </button>
                    {isSelected && (
                      <span className="flex size-5 items-center justify-center rounded-full bg-emerald text-emerald-foreground">
                        <Check className="size-3" />
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-2.5 line-clamp-2 text-xs text-muted-foreground">
                  {template.description || "Custom certificate template."}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                <span className="italic">Click to apply</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
                  {template.name.split(" ")[0]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog for Quick Fullscreen Preview */}
      <Dialog
        open={Boolean(previewTemplate)}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-4xl p-6 sm:p-8">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4 pr-6">
              <div>
                <DialogTitle className="text-xl font-bold font-display">
                  {previewTemplate?.name}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">{previewTemplate?.description}</p>
              </div>
              {previewTemplate && (
                <Button
                  size="sm"
                  onClick={() => {
                    onSelect(previewTemplate.id);
                    setPreviewTemplate(null);
                  }}
                  className="gap-1.5"
                >
                  <Check className="size-4" />
                  Use this template
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="mt-4">
            <TemplatePreview
              html={modalRenderedHtml}
              title={previewTemplate?.name ?? "Template preview"}
              className="h-[480px] w-full rounded-xl border border-border bg-white"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
