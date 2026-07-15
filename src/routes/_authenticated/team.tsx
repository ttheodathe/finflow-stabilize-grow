import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamHeader } from "@/components/team/TeamHeader";
import { MembersTable } from "@/components/team/MembersTable";
import { InviteMemberModal } from "@/components/team/InviteMemberModal";
import { PermissionMatrix } from "@/components/team/PermissionMatrix";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useSeatUsage } from "@/hooks/useInviteMember";
import { useCurrentRole } from "@/hooks/useCurrentRole";
import { useQuery } from "@tanstack/react-query";
import { listRolesForCompany } from "@/services/team/role.service";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

export const Route = createFileRoute("/_authenticated/team")({
  component: TeamSettingsPage,
});

function TeamSettingsPage() {
  const activeCompanyId = useActiveCompanyId();
  const companyId = activeCompanyId ?? "";
  const navigate = useNavigate();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [tab, setTab] = useState<"members" | "roles">("members");

  const { isAdmin, isLoading: isRoleLoading } = useCurrentRole(companyId);
  const { data: roles = [] } = useQuery({
    queryKey: ["roles", companyId],
    queryFn: () => listRolesForCompany(companyId),
    enabled: Boolean(companyId),
  });
  const { data: seatUsage } = useSeatUsage(companyId);

  const {
    members,
    invitations,
    isLoading,
    changeRole,
    suspend,
    reactivate,
    remove,
    resendInvitation,
    revokeInvitation,
  } = useTeamMembers(companyId);

  if (isRoleLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <TeamHeader
        companyId={companyId}
        seatUsage={seatUsage}
        onInviteClick={() => setInviteOpen(true)}
        onManageRolesClick={() => setTab("roles")}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "members" | "roles")}>
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          {isAdmin && <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>}
        </TabsList>

        <TabsContent value="members" className="mt-4">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <MembersTable
              companyId={companyId}
              members={members}
              invitations={invitations}
              roles={roles}
              onInviteClick={() => setInviteOpen(true)}
              onChangeRole={(memberId, newRoleId) => changeRole({ memberId, newRoleId })}
              onSuspend={suspend}
              onReactivate={reactivate}
              onRemove={remove}
              onResendInvitation={resendInvitation}
              onRevokeInvitation={revokeInvitation}
            />
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="roles" className="mt-4">
            <PermissionMatrix companyId={companyId} />
          </TabsContent>
        )}
      </Tabs>

      <InviteMemberModal
        companyId={companyId}
        roles={roles}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
    </div>
  );
}
