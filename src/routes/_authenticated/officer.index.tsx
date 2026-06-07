import "@/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats } from "@/lib/admin.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, FileSearch, Plus, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/officer/")({
  head: () => ({ meta: [{ title: "Officer Console — Tafuta Mtoto" }] }),
  component: OfficerHome,
});

function OfficerHome() {
  const fetchStats = useServerFn(getDashboardStats);
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: () => fetchStats() });
  const police = stats?.role === "police" ? stats : null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Officer Console</h1>
            <p className="text-sm text-muted-foreground">
              Upload station cases, review AI-suggested matches, and confirm sightings.
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus className="h-4 w-4" /> Upload station case
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                File a missing-child case from your station with the OB number and investigating
                officer. The photo enters the same AI matching pipeline as parent reports.
              </p>
              <Button asChild className="w-full">
                <Link to="/officer/cases/new">Open form</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSearch className="h-4 w-4" /> AI review queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Review pending AI-suggested matches between sightings and missing children.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/review">
                  Open queue {police ? `(${police.pendingReviews})` : ""}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" /> Station overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {police ? (
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <span>Open cases</span>
                    <Badge variant="destructive">{police.open}</Badge>
                  </li>
                  <li className="flex justify-between">
                    <span>Matched</span>
                    <Badge variant="secondary">{police.matched}</Badge>
                  </li>
                  <li className="flex justify-between">
                    <span>Found</span>
                    <Badge>{police.found ?? 0}</Badge>
                  </li>
                  <li className="flex justify-between">
                    <span>Sightings</span>
                    <Badge variant="secondary">{police.sightings}</Badge>
                  </li>
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
            </CardContent>
          </Card>
        </div>

        {police && police.recentCases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent cases across all stations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {police.recentCases.map((c) => (
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
