import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  useIsPlatformStaff,
  useAllPartners,
  usePartnerApplications,
  usePartnerAdminAnalytics,
  useApprovedCommissionsByPartner,
  useCommissionReviewQueue,
  useProgramSettings,
} from "@/hooks/useAdminPartners";
import {
  approvePartnerApplication,
  rejectPartnerApplication,
} from "@/services/partners/partnerApplications.service";
import { setPartnerStatus } from "@/services/partners/partners.service";
import { createPartnerPayout } from "@/services/partners/partnerPayouts.service";
import {
  reviewCommission,
  updateProgramSettings,
  type PartnerProgramSettings,
} from "@/services/partners/partnerProgram.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldAlert,
  Trophy,
  Globe2,
  MousePointerClick,
  Users,
  HandCoins,
  Flag,
  Layers,
} from "lucide-react";
import { PARTNER_TYPE_LABELS, type PartnerApplication, type Partner } from "@/types/partner.types";

export const Route = createFileRoute("/_authenticated/admin/partners")({
  head: () => ({ meta: [{ title: "Partner Admin — Finflow Track" }] }),
  component: AdminPartnersPage,
});

function AdminPartnersPage() {
  const { isStaff, isLoading: staffLoading } = useIsPlatformStaff();
  const [statusFilter, setStatusFilter] = useState<PartnerApplication["status"] | "all">("pending");
  const { applications, isLoading: appsLoading } = usePartnerApplications(
    statusFilter === "all" ? undefined : statusFilter,
  );
  const { partners, isLoading: partnersLoading } = useAllPartners();
  const { analytics, isLoading: analyticsLoading } = usePartnerAdminAnalytics();
  const { grouped: payoutQueue, isLoading: payoutQueueLoading } = useApprovedCommissionsByPartner();
  const { commissions: reviewQueue, isLoading: reviewQueueLoading } = useCommissionReviewQueue();
  const { settings, isLoading: settingsLoading } = useProgramSettings();
  const [settingsDraft, setSettingsDraft] = useState<PartnerProgramSettings | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (settings && !settingsDraft) setSettingsDraft(settings);
  }, [settings, settingsDraft]);

  if (staffLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Not authorized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This page is only available to FinFlowTrack staff.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleApprove(applicationId: string) {
    try {
      await approvePartnerApplication(applicationId);
      toast.success("Partner approved");
      queryClient.invalidateQueries({ queryKey: ["partner-applications"] });
      queryClient.invalidateQueries({ queryKey: ["all-partners"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    }
  }

  async function handleReject(applicationId: string) {
    try {
      await rejectPartnerApplication(applicationId);
      toast.success("Application rejected");
      queryClient.invalidateQueries({ queryKey: ["partner-applications"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    }
  }

  async function handleSetStatus(partnerId: string, status: Partner["status"]) {
    try {
      await setPartnerStatus(partnerId, status);
      toast.success(`Partner set to ${status}`);
      queryClient.invalidateQueries({ queryKey: ["all-partners"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update partner");
    }
  }

  async function handleCreatePayout(partnerId: string, commissionIds: string[]) {
    try {
      await createPartnerPayout(partnerId, commissionIds);
      toast.success("Payout created — commissions marked as paid");
      queryClient.invalidateQueries({ queryKey: ["approved-commissions-by-partner"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create payout");
    }
  }

  async function handleReviewCommission(commissionId: string, status: "approved" | "rejected") {
    try {
      await reviewCommission(commissionId, status);
      toast.success(`Commission ${status}`);
      queryClient.invalidateQueries({ queryKey: ["partner-commission-review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["approved-commissions-by-partner"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review commission");
    }
  }

  async function handleSaveSettings() {
    if (!settingsDraft) return;
    try {
      await updateProgramSettings(settingsDraft);
      toast.success("Program settings saved");
      queryClient.invalidateQueries({ queryKey: ["partner-program-settings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Partner Program — Admin</h1>
        <p className="text-sm text-muted-foreground">Review applications and manage partners.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat
          icon={Users}
          label="Total partners"
          value={analytics?.totalPartners}
          loading={analyticsLoading}
        />
        <AdminStat
          icon={Users}
          label="Active partners"
          value={analytics?.activePartners}
          loading={analyticsLoading}
        />
        <AdminStat
          icon={MousePointerClick}
          label="Total clicks"
          value={analytics?.totalClicks}
          loading={analyticsLoading}
        />
        <AdminStat
          icon={HandCoins}
          label="Paid out"
          value={
            analytics ? formatMoney(analytics.totalPaidCommissions, analytics.currency) : undefined
          }
          loading={analyticsLoading}
        />
      </div>

      {analytics &&
        (analytics.topPerformers.length > 0 || analytics.revenueByCountry.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="h-4 w-4" /> Top performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.topPerformers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No earnings yet.</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.topPerformers.map((p) => (
                      <div key={p.partnerId} className="flex items-center justify-between text-sm">
                        <span>{p.businessName}</span>
                        <span className="font-medium">
                          {formatMoney(p.earnings, analytics.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe2 className="h-4 w-4" /> Revenue by country
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.revenueByCountry.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No earnings yet.</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.revenueByCountry.map((r) => (
                      <div key={r.country} className="flex items-center justify-between text-sm">
                        <span>{r.country}</span>
                        <span className="font-medium">
                          {formatMoney(r.earnings, analytics.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout queue</CardTitle>
        </CardHeader>
        <CardContent>
          {payoutQueueLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : Object.keys(payoutQueue).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No approved commissions waiting to be paid out.
            </p>
          ) : (
            <div className="divide-y">
              {Object.values(payoutQueue).map((group) => {
                const total = group.commissions.reduce((acc, c) => acc + c.commission_amount, 0);
                return (
                  <div
                    key={group.partnerId}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{group.businessName}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.commissions.length} commission(s) ·{" "}
                        {formatMoney(total, group.currency)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        handleCreatePayout(
                          group.partnerId,
                          group.commissions.map((c) => c.id),
                        )
                      }
                    >
                      Pay out
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4" /> Commission review queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviewQueueLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : reviewQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing waiting on review.</p>
          ) : (
            <div className="divide-y">
              {reviewQueue.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {formatMoney(c.commission_amount, c.currency)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        · tier {c.tier} · {c.commission_rate}% of{" "}
                        {formatMoney(c.billed_amount, c.currency)}
                      </span>
                    </p>
                    {c.flagged_for_review && (
                      <p className="flex items-center gap-1 text-xs text-amber-600">
                        <ShieldAlert className="h-3 w-3" /> {c.flag_reason ?? "Flagged for review"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReviewCommission(c.id, "rejected")}
                    >
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => handleReviewCommission(c.id, "approved")}>
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" /> Multi-tier referrals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settingsLoading || !settingsDraft ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="multiTierEnabled" className="font-normal">
                  Enable multi-tier commissions (pay a partner's upline too)
                </Label>
                <Switch
                  id="multiTierEnabled"
                  checked={settingsDraft.multi_tier_enabled}
                  onCheckedChange={(v) =>
                    setSettingsDraft({ ...settingsDraft, multi_tier_enabled: v })
                  }
                />
              </div>
              {settingsDraft.multi_tier_enabled && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="maxTiers">Max tiers</Label>
                    <Select
                      value={String(settingsDraft.max_tiers)}
                      onValueChange={(v) =>
                        setSettingsDraft({ ...settingsDraft, max_tiers: Number(v) })
                      }
                    >
                      <SelectTrigger id="maxTiers">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 (tier 1 only)</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tier2Rate">Tier 2 rate (%)</Label>
                    <Input
                      id="tier2Rate"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={settingsDraft.tier2_rate}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, tier2_rate: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tier3Rate">Tier 3 rate (%)</Label>
                    <Input
                      id="tier3Rate"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={settingsDraft.tier3_rate}
                      onChange={(e) =>
                        setSettingsDraft({ ...settingsDraft, tier3_rate: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
              )}
              <Button size="sm" onClick={handleSaveSettings}>
                Save settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Applications</CardTitle>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="needs_more_info">Needs info</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {appsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications here.</p>
          ) : (
            <div className="divide-y">
              {applications.map((app) => (
                <div key={app.id} className="flex items-start justify-between gap-4 py-4">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {app.business_name}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        · {PARTNER_TYPE_LABELS[app.partner_type]}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">{app.contact_email}</p>
                    {app.website && <p className="text-xs text-muted-foreground">{app.website}</p>}
                    {!app.user_id && (
                      <p className="text-xs text-amber-600">
                        No FinFlowTrack account linked yet — ask them to sign up before approving.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {app.status}
                    </Badge>
                    {app.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleReject(app.id)}>
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(app.id)}
                          disabled={!app.user_id}
                        >
                          Approve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active partners</CardTitle>
        </CardHeader>
        <CardContent>
          {partnersLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : partners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No partners yet.</p>
          ) : (
            <div className="divide-y">
              {partners.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{p.business_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.referral_code} · {p.commission_rate}%
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={p.status === "active" ? "default" : "destructive"}
                      className="capitalize"
                    >
                      {p.status}
                    </Badge>
                    {p.status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetStatus(p.id, "suspended")}
                      >
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetStatus(p.id, "active")}
                      >
                        Reactivate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminStat({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number | undefined;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-5 w-16" />
          ) : (
            <p className="text-lg font-semibold">{value ?? 0}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
