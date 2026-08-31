"use client";

import * as React from "react";
import { Mail, ShieldAlert, X } from "lucide-react";

import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canManageInvitations } from "@/lib/auth/permissions";
import type { HouseholdRole, OperationalRole } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", collaborator: "Collaborator" };
const OP_ROLE_LABEL: Record<string, string> = { approver: "Approver", editor: "Editor", viewer: "Viewer" };

export default function InvitationsPage() {
  const members = useAppStore((s) => s.members);
  const roles = useAppStore((s) => s.roles);
  const invitations = useAppStore((s) => s.invitations);
  const inviteMember = useAppStore((s) => s.inviteMember);
  const revokeInvitation = useAppStore((s) => s.revokeInvitation);
  const { user, role } = useCurrentUser();
  const { toast } = useToast();

  const [email, setEmail] = React.useState("");
  const [newRole, setNewRole] = React.useState<HouseholdRole>("collaborator");
  const [opRole, setOpRole] = React.useState<OperationalRole>("editor");

  const canManage = canManageInvitations(role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Inviti e ruoli</h1>
        <p className="text-sm text-muted-foreground">Chi può vedere, modificare o approvare cosa.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Membri attuali</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => {
            const memberRole = roles.find((r) => r.userId === m.userId);
            return (
              <div key={m.id} className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
                <span className="text-sm font-medium">{m.displayName}</span>
                <div className="flex gap-1.5">
                  {memberRole && <Badge variant="secondary">{ROLE_LABEL[memberRole.role]}</Badge>}
                  {memberRole && <Badge variant="outline">{OP_ROLE_LABEL[memberRole.operationalRole]}</Badge>}
                  {!memberRole && <Badge variant="outline">Senza account</Badge>}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {!canManage && (
        <p className="flex items-center gap-2 rounded-md bg-warning/10 p-3 text-xs text-warning">
          <ShieldAlert className="h-4 w-4" /> Solo Luca o sua moglie possono invitare nuovi membri o modificare i ruoli.
        </p>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Invita un nuovo membro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ruolo</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as HouseholdRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="collaborator">Collaborator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ruolo operativo</Label>
                <Select value={opRole} onValueChange={(v) => setOpRole(v as OperationalRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approver">Approver</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => {
                if (!email.trim() || !user) return;
                inviteMember(email.trim(), newRole, opRole, user.id);
                toast({ title: "Invito inviato", description: `Un invito è stato creato per ${email}.` });
                setEmail("");
              }}
              disabled={!email.trim()}
            >
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Invia invito
            </Button>
          </CardContent>
        </Card>
      )}

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Inviti inviati</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {ROLE_LABEL[inv.role]} · {OP_ROLE_LABEL[inv.operationalRole]}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={inv.status === "pending" ? "warning" : inv.status === "accepted" ? "success" : "secondary"}>
                    {inv.status}
                  </Badge>
                  {canManage && inv.status === "pending" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => revokeInvitation(inv.id)} aria-label="Revoca invito">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
