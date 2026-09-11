import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Mail,
  User,
  Search,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  listIssuers,
  createIssuer,
  updateIssuer,
  deleteIssuer,
  type ManagedIssuer,
} from "@/lib/admin.functions";

type IssuerManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserEmail?: string | null | undefined;
};

type ViewMode = "list" | "create" | "edit";

export function IssuerManagerDialog({
  open,
  onOpenChange,
  currentUserEmail,
}: IssuerManagerDialogProps) {
  const queryClient = useQueryClient();

  const fetchIssuers = useServerFn(listIssuers);
  const addIssuerFn = useServerFn(createIssuer);
  const editIssuerFn = useServerFn(updateIssuer);
  const removeIssuerFn = useServerFn(deleteIssuer);

  const {
    data: issuers,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["managed-issuers"],
    queryFn: () => fetchIssuers({}),
    enabled: open,
  });

  const [mode, setMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");

  // Create form state
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createFullName, setCreateFullName] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Edit form state
  const [editingIssuer, setEditingIssuer] = useState<ManagedIssuer | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"issuer" | "admin">("issuer");
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Delete state
  const [deletingIssuer, setDeletingIssuer] = useState<ManagedIssuer | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Status & Feedback
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  const filteredIssuers = useMemo(() => {
    if (!issuers) return [];
    if (!searchQuery.trim()) return issuers;
    const q = searchQuery.toLowerCase().trim();
    return issuers.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [issuers, searchQuery]);

  const handleStartCreate = () => {
    setFeedback(null);
    setCreateEmail("");
    setCreatePassword("");
    setCreateFullName("");
    setShowCreatePassword(false);
    setMode("create");
  };

  const handleStartEdit = (issuer: ManagedIssuer) => {
    setFeedback(null);
    setEditingIssuer(issuer);
    setEditEmail(issuer.email);
    setEditFullName(issuer.fullName);
    setEditPassword("");
    setEditRole(issuer.role === "admin" ? "admin" : "issuer");
    setShowEditPassword(false);
    setMode("edit");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      await addIssuerFn({
        data: {
          email: createEmail.trim(),
          password: createPassword,
          fullName: createFullName.trim(),
        },
      });

      setFeedback({ kind: "ok", message: `Issuer ${createEmail} created successfully.` });
      await queryClient.invalidateQueries({ queryKey: ["managed-issuers"] });
      setMode("list");
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to create issuer.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIssuer) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      await editIssuerFn({
        data: {
          id: editingIssuer.id,
          email: editEmail.trim(),
          fullName: editFullName.trim(),
          newPassword: editPassword.trim() ? editPassword : "",
          role: editRole,
        },
      });

      setFeedback({ kind: "ok", message: `Updated ${editEmail} successfully.` });
      await queryClient.invalidateQueries({ queryKey: ["managed-issuers"] });
      setMode("list");
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to update issuer.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingIssuer) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      await removeIssuerFn({
        data: { id: deletingIssuer.id },
      });

      setFeedback({ kind: "ok", message: `Issuer ${deletingIssuer.email} deleted.` });
      await queryClient.invalidateQueries({ queryKey: ["managed-issuers"] });
      setDeleteConfirmOpen(false);
      setDeletingIssuer(null);
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to delete issuer.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-semibold text-gold">
                <Shield className="size-3" /> Admin Only
              </span>
            </div>
            <DialogTitle className="font-display text-2xl font-bold mt-2">
              {mode === "list"
                ? "Manage Certificate Issuers"
                : mode === "create"
                  ? "Add New Certificate Issuer"
                  : "Edit Certificate Issuer"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {mode === "list"
                ? "Authorized staff accounts permitted to issue and manage Weskill certificates."
                : mode === "create"
                  ? "Create login credentials for a new certificate issuer."
                  : `Update profile, role, or reset password for ${editingIssuer?.email}.`}
            </DialogDescription>
          </DialogHeader>

          {/* Feedback message banner */}
          {feedback && (
            <div
              className={`mt-3 flex items-center gap-2.5 rounded-xl border p-3.5 text-sm ${
                feedback.kind === "ok"
                  ? "border-emerald/40 bg-emerald/10 text-emerald"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              {feedback.kind === "ok" ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* LIST MODE */}
          {mode === "list" && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email or role…"
                    className="h-9 pl-9 text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={handleStartCreate}
                  className="gap-1.5 bg-gold-gradient font-semibold text-gold-foreground shadow-gold hover:opacity-90"
                >
                  <UserPlus className="size-4" />
                  Add Issuer
                </Button>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                  <Loader2 className="size-6 animate-spin text-gold mb-2" />
                  Loading accounts…
                </div>
              ) : queryError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  Could not load issuers:{" "}
                  {queryError instanceof Error ? queryError.message : "Error"}
                </div>
              ) : filteredIssuers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  {searchQuery ? "No accounts match your search." : "No accounts found."}
                </div>
              ) : (
                <div className="divide-y divide-border/60 rounded-2xl border border-border/80 bg-card overflow-hidden">
                  {filteredIssuers.map((issuer) => {
                    const isSelf =
                      Boolean(currentUserEmail) &&
                      issuer.email.toLowerCase() === currentUserEmail?.toLowerCase();
                    const isSuperAdmin = issuer.role === "admin";

                    return (
                      <div
                        key={issuer.id}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary font-semibold text-secondary-foreground text-xs uppercase">
                            {issuer.fullName
                              ? issuer.fullName.slice(0, 2)
                              : issuer.email.slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground truncate">
                                {issuer.fullName || "Unnamed Issuer"}
                              </span>
                              {isSelf && (
                                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{issuer.email}</p>
                            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                              Added {new Date(issuer.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                              issuer.role === "admin"
                                ? "border-gold/40 bg-gold/10 text-gold"
                                : "border-emerald/40 bg-emerald/10 text-emerald"
                            }`}
                          >
                            {issuer.role === "admin" ? (
                              <Shield className="size-3" />
                            ) : (
                              <ShieldCheck className="size-3" />
                            )}
                            {issuer.role}
                          </span>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(issuer)}
                            className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            title="Edit user details or reset password"
                          >
                            <Edit2 className="size-3.5" />
                            Edit
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isSelf || isSuperAdmin}
                            onClick={() => {
                              setDeletingIssuer(issuer);
                              setDeleteConfirmOpen(true);
                            }}
                            className="h-8 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                            title={
                              isSelf
                                ? "Cannot delete your own account"
                                : isSuperAdmin
                                  ? "Administrators cannot be deleted"
                                  : "Delete issuer account"
                            }
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CREATE MODE */}
          {mode === "create" && (
            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="createFullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="createFullName"
                    value={createFullName}
                    onChange={(e) => setCreateFullName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="h-10 pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="createEmail">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="createEmail"
                    type="email"
                    required
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="issuer@weskill.org"
                    className="h-10 pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="createPassword">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="createPassword"
                    type={showCreatePassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="h-10 pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showCreatePassword ? "Hide password" : "Show password"}
                  >
                    {showCreatePassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Minimum 6 characters. The issuer can immediately use this to sign in.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode("list")}
                  disabled={submitting}
                  className="gap-1.5"
                >
                  <ArrowLeft className="size-4" />
                  Back to list
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="gap-1.5 bg-gold-gradient font-semibold text-gold-foreground shadow-gold"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}
                  Create Issuer
                </Button>
              </div>
            </form>
          )}

          {/* EDIT MODE */}
          {mode === "edit" && editingIssuer && (
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="editFullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="editFullName"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="h-10 pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editEmail">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="editEmail"
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="h-10 pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editRole">Staff Role</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditRole("issuer")}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      editRole === "issuer"
                        ? "border-emerald bg-emerald/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <ShieldCheck className="size-4 text-emerald shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Issuer</p>
                      <p className="text-xs text-muted-foreground">Issues credentials</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole("admin")}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      editRole === "admin"
                        ? "border-gold bg-gold/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <Shield className="size-4 text-gold shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Administrator</p>
                      <p className="text-xs text-muted-foreground">Full system control</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border">
                <Label htmlFor="editPassword">Reset Password (optional)</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="editPassword"
                    type={showEditPassword ? "text" : "password"}
                    minLength={6}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave empty to keep existing password"
                    className="h-10 pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showEditPassword ? "Hide password" : "Show password"}
                  >
                    {showEditPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Only enter a new password if you want to reset this user's password.
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode("list")}
                  disabled={submitting}
                  className="gap-1.5"
                >
                  <ArrowLeft className="size-4" />
                  Back to list
                </Button>
                <Button type="submit" disabled={submitting} className="gap-1.5">
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete Issuer Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the issuer{" "}
              <strong className="text-foreground">{deletingIssuer?.email}</strong>? This will revoke
              all certificate issuing access and permanently remove their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
