import "@/i18n";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyContext, syncMyAccount } from "@/lib/auth.functions";
import { getDashboardStats } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  MapPin,
  Users,
  type LucideIcon,
} from "lucide-react";

type RecentCase = {
  id: string;
  first_name: string;
  age: number;
  county: string | null;
  status: string;
};

type ActionRoute = "/cases/new" | "/sightings/new" | "/review" | "/admin/audit";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Tafuta Mtoto" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const fetchCtx = useServerFn(getMyContext);
  const syncAccount = useServerFn(syncMyAccount);
  const fetchStats = useServerFn(getDashboardStats);
  const { isReady, user } = useAuthReady();
  const { data: me } = useQuery({
    queryKey: ["me", user?.id],
    queryFn: async () => {
      try {
        await syncAccount({ data: {} });
      } catch (syncError) {
        console.error("Dashboard account sync failed", syncError);
      }
      return fetchCtx();
    },
    enabled: isReady && !!user,
  });
  const { data: stats } = useQuery({
    queryKey: ["stats", me?.userId],
    queryFn: () => fetchStats(),
    enabled: isReady && !!me?.userId,
  });

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/" });
  }

  const roles = me?.roles ?? [];
  const isPolice = roles.includes("police_admin");
  const isAdmin = roles.includes("super_admin");
  const policeStats = stats?.role === "police" ? stats : null;
  const guardianStats = stats?.role === "guardian" ? stats : null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t("nav.dashboard")}</h1>
            <p className="text-sm text-muted-foreground">{me?.profile?.full_name ?? me?.userId}</p>
            <div className="mt-2 flex gap-1">
              {roles.map((r) => (
                <Badge key={r} variant="secondary">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            {t("nav.logout")}
          </Button>
        </div>

        {policeStats && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              icon={AlertTriangle}
              label="Open cases"
              value={policeStats.open}
              tone="destructive"
            />
            <StatCard
              icon={CheckCircle2}
              label="Matched"
              value={policeStats.matched}
              tone="default"
            />
            <StatCard icon={Users} label="Closed" value={policeStats.closed} />
            <StatCard icon={FileSearch} label="Sightings" value={policeStats.sightings} />
            <StatCard
              icon={AlertTriangle}
              label="Pending AI matches"
              value={policeStats.pendingReviews}
              tone="destructive"
            />
          </div>
        )}

        {guardianStats && (
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <StatCard icon={AlertTriangle} label="My cases" value={guardianStats.myCases} />
            <StatCard icon={FileSearch} label="My sightings" value={guardianStats.mySightings} />
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            title={t("nav.reportCase")}
            body={t("landing.how1")}
            to="/cases/new"
            cta="Open form"
          />
          <ActionCard
            title={t("nav.newSighting")}
            body={t("landing.how2")}
            to="/sightings/new"
            cta="Open form"
          />
          {isPolice && (
            <ActionCard
              title={t("nav.review")}
              body={t("landing.how3")}
              to="/review"
              cta="Open queue"
            />
          )}
          {isAdmin && (
            <ActionCard
              title={t("nav.audit")}
              body={t("audit.blurb")}
              to="/admin/audit"
              cta="View logs"
            />
          )}
        </div>

        {policeStats && policeStats.hotspots.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" /> Hotspots (by county, last 20 cases)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {policeStats.hotspots.map(([county, count]) => (
                  <li key={county} className="flex justify-between border-b py-1">
                    <span>{county}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {policeStats && policeStats.recentCases.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Recent open cases</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {policeStats.recentCases.map((c: RecentCase) => (
                  <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <Link
                      to="/cases/$caseId"
                      params={{ caseId: c.id }}
                      className="text-primary hover:underline"
                    >
                      {c.first_name} · age {c.age} · {c.county ?? "—"}
                    </Link>
                    <Badge variant={c.status === "open" ? "destructive" : "secondary"}>
                      {c.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "secondary",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={`rounded-md p-2 ${tone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionCard({
  title,
  body,
  to,
  cta,
}: {
  title: string;
  body: string;
  to: ActionRoute;
  cta: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">{body}</p>
        <Button asChild className="w-full">
          <Link to={to}>{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
