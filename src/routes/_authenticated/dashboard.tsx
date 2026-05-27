import "@/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyContext } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Tafuta Mtoto" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const fetchCtx = useServerFn(getMyContext);
  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => fetchCtx() });

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/" });
  }

  const roles = data?.roles ?? [];
  const isPolice = roles.includes("police_admin");
  const isAdmin = roles.includes("super_admin");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{t("nav.dashboard")}</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? t("common.loading") : data?.profile?.full_name ?? data?.userId}
            </p>
            <div className="mt-2 flex gap-1">
              {roles.map((r) => (
                <Badge key={r} variant="secondary">{r}</Badge>
              ))}
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>{t("nav.logout")}</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-base">{t("nav.reportCase")}</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">{t("landing.how1")}</p>
              <Button disabled className="w-full">Coming next turn</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">{t("nav.newSighting")}</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">{t("landing.how2")}</p>
              <Button disabled className="w-full" variant="outline">Coming next turn</Button>
            </CardContent>
          </Card>

          {isPolice && (
            <Card>
              <CardHeader><CardTitle className="text-base">{t("nav.review")}</CardTitle></CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground">{t("landing.how3")}</p>
                <Button disabled className="w-full" variant="outline">Coming next turn</Button>
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <Card>
              <CardHeader><CardTitle className="text-base">{t("nav.audit")}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t("audit.blurb")}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="mt-8 border-dashed">
          <CardHeader><CardTitle className="text-base">Build status</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>✅ Database schema, RLS, roles, audit table, private storage bucket</p>
            <p>✅ Auth (email/password + Google), guardian auto-role on signup</p>
            <p>✅ EN/SW translation, landing, privacy page</p>
            <p>⏳ Case wizard, sighting form, AI matching server fn, police review queue, audit page — say "continue" to build these in the next turn.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
