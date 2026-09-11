import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Palette,
  ChevronLeft,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { TemplateManager, type TemplateDraft } from "@/components/certifyhub/TemplateManager";
import {
  archiveTemplate,
  deleteTemplate,
  duplicateTemplate,
  getStaffAccess,
  listTemplates,
  saveTemplate,
  setDefaultTemplate,
  unarchiveTemplate,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard/templates")({
  head: () => ({
    meta: [
      { title: "Certificate Templates Studio — WeCertify" },
      {
        name: "description",
        content: "Design and customize official Weskill certificate HTML and CSS templates.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TemplatesStudioPage,
});

function TemplatesStudioPage() {
  const queryClient = useQueryClient();
  const fetchAccess = useServerFn(getStaffAccess);
  const fetchTemplates = useServerFn(listTemplates);
  const storeTemplate = useServerFn(saveTemplate);
  const removeTemplate = useServerFn(deleteTemplate);
  const copyTemplate = useServerFn(duplicateTemplate);
  const makeDefaultTemplate = useServerFn(setDefaultTemplate);
  const archiveTpl = useServerFn(archiveTemplate);
  const unarchiveTpl = useServerFn(unarchiveTemplate);

  const access = useQuery({ queryKey: ["staff-access"], queryFn: () => fetchAccess({}) });
  const templates = useQuery({
    queryKey: ["certificate-templates"],
    queryFn: () => fetchTemplates({}),
  });

  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const canIssue = Boolean(access.data?.isAdmin || access.data?.isIssuer);
  const isAdmin = Boolean(access.data?.isAdmin);
  const templateList = useMemo(() => templates.data ?? [], [templates.data]);

  async function handleSaveTemplate(draft: TemplateDraft) {
    setMessage(null);
    try {
      await storeTemplate({ data: draft });
      setMessage({ kind: "ok", text: "Template saved successfully." });
      await queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not save that template.",
      });
      throw error;
    }
  }

  async function handleDeleteTemplate(id: string) {
    try {
      await removeTemplate({ data: { id } });
      setMessage({ kind: "ok", text: "Template deleted." });
      await queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not delete that template.",
      });
    }
  }

  async function handleDuplicateTemplate(id: string) {
    try {
      await copyTemplate({ data: { id } });
      setMessage({ kind: "ok", text: "Template duplicated successfully." });
      await queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not duplicate template.",
      });
    }
  }

  async function handleSetDefaultTemplate(id: string) {
    try {
      await makeDefaultTemplate({ data: { id } });
      setMessage({ kind: "ok", text: "Default template updated." });
      await queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not set default template.",
      });
    }
  }

  async function handleArchiveTemplate(id: string) {
    try {
      await archiveTpl({ data: { id } });
      setMessage({ kind: "ok", text: "Template archived." });
      await queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not archive template.",
      });
    }
  }

  async function handleUnarchiveTemplate(id: string) {
    try {
      await unarchiveTpl({ data: { id } });
      setMessage({ kind: "ok", text: "Template restored to active." });
      await queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not restore template.",
      });
    }
  }

  if (access.isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span>Loading template studio…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-rise">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/dashboard" className="hover:text-foreground flex items-center gap-0.5">
              <ChevronLeft className="size-3" /> Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Templates</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Certificate Templates Studio
            </h1>
            <span className="rounded-full bg-emerald/10 text-emerald border border-emerald/30 px-3 py-0.5 text-xs font-semibold">
              {templateList.length} Templates
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse, author, test and customize high-resolution certificate templates with dynamic
            variable placeholders.
          </p>
        </div>

        {canIssue && (
          <Link to="/dashboard/issue">
            <Button className="h-10 gap-2 shadow-gold bg-primary text-primary-foreground">
              <Plus className="size-4 text-gold" />
              <span>Use in Issuance Studio</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Notification status banner */}
      {message && (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-sm font-medium flex items-center justify-between ${
            message.kind === "ok"
              ? "border-emerald/40 bg-emerald/10 text-emerald"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.kind === "ok" ? (
              <CheckCircle2 className="size-4 text-emerald shrink-0" />
            ) : (
              <AlertCircle className="size-4 text-destructive shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessage(null)}
            className="h-6 w-6 p-0"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Template Manager Workspace */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-lift">
        <TemplateManager
          templates={templateList}
          isLoading={templates.isLoading}
          canEdit={canIssue}
          canDelete={isAdmin}
          onSave={handleSaveTemplate}
          onDelete={handleDeleteTemplate}
          onDuplicate={handleDuplicateTemplate}
          onSetDefault={handleSetDefaultTemplate}
          onArchive={handleArchiveTemplate}
          onUnarchive={handleUnarchiveTemplate}
        />
      </div>
    </div>
  );
}
