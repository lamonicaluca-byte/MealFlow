"use client";

import { useAppStore } from "@/store/app-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canEditAllergiesAndRoles } from "@/lib/auth/permissions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", collaborator: "Collaborator" };
const OP_ROLE_LABEL: Record<string, string> = { approver: "Approver", editor: "Editor", viewer: "Viewer" };

export default function ProfilesPage() {
  const members = useAppStore((s) => s.members);
  const roles = useAppStore((s) => s.roles);
  const dietaryProfiles = useAppStore((s) => s.dietaryProfiles);
  const { role } = useCurrentUser();
  const canSeeAllergies = canEditAllergiesAndRoles(role);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Profili</h1>
        <p className="text-sm text-muted-foreground">Chi fa parte della famiglia e come MealFlow ne tiene conto.</p>
      </div>

      <div className="space-y-3">
        {members.map((member) => {
          const memberRole = roles.find((r) => r.userId === member.userId);
          const profile = dietaryProfiles.find((p) => p.memberId === member.id);
          return (
            <Card key={member.id}>
              <CardContent className="flex gap-4 pt-5">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>{member.displayName.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="font-display text-lg font-semibold">{member.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.age ? `${member.age} anni` : member.ageGroup} · {member.userId ? "Account" : "Senza account"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {memberRole && <Badge variant="secondary">{ROLE_LABEL[memberRole.role]}</Badge>}
                    {memberRole && <Badge variant="outline">{OP_ROLE_LABEL[memberRole.operationalRole]}</Badge>}
                  </div>
                  {profile && canSeeAllergies && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {profile.allergies.map((a) => (
                        <Badge key={a.id} variant="destructive">
                          Allergia: {a.allergen}
                        </Badge>
                      ))}
                      {profile.intolerances.map((i) => (
                        <Badge key={i.id} variant="warning">
                          Intolleranza: {i.substance}
                        </Badge>
                      ))}
                      {profile.allergies.length === 0 && profile.intolerances.length === 0 && (
                        <span className="text-xs text-muted-foreground">Nessuna allergia o intolleranza nota.</span>
                      )}
                    </div>
                  )}
                  {profile?.preferredDishes.length ? (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Piatti preferiti: </span>
                      {profile.preferredDishes.join(", ")}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
