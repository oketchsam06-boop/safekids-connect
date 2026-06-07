import "@/i18n";
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSuperAdminOverview } from "@/lib/admin.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Heart,
  ShieldCheck,
  Users,
  Building2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "CWSK Admin — Tafuta Mtoto" }] }),
  component: SuperAdminDashboard,
});

function SuperAdminDashboard() {
  const fn = useServerFn(getSuperAdminOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["super-admin-overview"],
    queryFn: () => fn(),
  });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [countyFilter, setCountyFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const counties = useMemo(() => {
    const s = new Set<string>();
    (data?.allCases ?? []).forEach((c) => c.county && s.add(c.county));
    return [...s].sort();
  }, [data]);

  const filtered = useMemo(() => {
    return (data?.allCases ?? []).filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (countyFilter !== "all" && c.county !== countyFilter) return false;
      if (q && !c.first_name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, statusFilter, countyFilter, q]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">CWSK Super Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Complete oversight of all cases, sightings, matches, and users
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/users">Manage users</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/audit">Audit log</Link>
            </Button>
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading overview…</p>}
        {error && <p className="text-destructive">{(error as Error).message}</p>}

        {data && (
          <>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              <Stat icon={AlertTriangle} label="Open" value={data.stats.open} tone="destructive" />
              <Stat icon={FileSearch} label="Matched" value={data.stats.matched} />
              <Stat icon={Heart} label="Found" value={data.stats.found} tone="success" />
              <Stat icon={CheckCircle2} label="Closed" value={data.stats.closed} />
              <Stat icon={FileSearch} label="Sightings" value={data.stats.sightings} />
              <Stat
                icon={AlertTriangle}
                label="Pending AI"
                value={data.stats.pendingReviews}
                tone="destructive"
              />
              <Stat icon={ShieldCheck} label="Officers" value={data.stats.officers} />
              <Stat icon={Users} label="Parents" value={data.stats.parents} />
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">All cases ({filtered.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex flex-wrap gap-2">
                  <Input
                    placeholder="Search by first name"
                    className="max-w-xs"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="matched">Matched</SelectItem>
                      <SelectItem value="found">Found</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={countyFilter} onValueChange={setCountyFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="all">All counties</SelectItem>
                      {counties.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b text-left text-muted-foreground">
                      <tr>
                        <th className="p-2">Child</th>
                        <th className="p-2">Age</th>
                        <th className="p-2">County</th>
                        <th className="p-2">Source</th>
                        <th className="p-2">OB#</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Reported</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, 100).map((c) => (
                        <tr key={c.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <Link
                              to="/cases/$caseId"
                              params={{ caseId: c.id }}
                              className="text-primary hover:underline"
                            >
                              {c.first_name} {c.last_initial ?? ""}
                            </Link>
                          </td>
                          <td className="p-2">{c.age}</td>
                          <td className="p-2">{c.county ?? "—"}</td>
                          <td className="p-2">
                            <Badge variant={c.source === "station" ? "default" : "secondary"}>
                              {c.source === "station" ? (
                                <>
                                  <Building2 className="mr-1 inline h-3 w-3" /> Station
                                </>
                              ) : (
                                "Parent"
                              )}
                            </Badge>
                          </td>
                          <td className="p-2 font-mono text-xs">{c.case_file_number ?? "—"}</td>
                          <td className="p-2">
                            <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No cases match these filters.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Pending AI matches ({data.pendingMatches.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.pendingMatches.length === 0 && (
                    <p className="text-sm text-muted-foreground">No matches awaiting review.</p>
                  )}
                  <ul className="space-y-2">
                    {data.pendingMatches.slice(0, 10).map((m) => (
                      <li key={m.id} className="rounded border p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs">
                            child {m.child_id.slice(0, 8)} ↔ sighting {m.sighting_id.slice(0, 8)}
                          </span>
                          <Badge variant="destructive">{(m.ai_score * 100).toFixed(0)}%</Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {m.ai_rationale}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                    <Link to="/review">Open review queue</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent sightings</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.recentSightings.length === 0 && (
                    <p className="text-sm text-muted-foreground">No sightings yet.</p>
                  )}
                  <ul className="space-y-2 text-sm">
                    {data.recentSightings.slice(0, 10).map((s) => (
                      <li key={s.id} className="rounded border p-2">
                        <div className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleString()}
                        </div>
                        <div>{s.location_text ?? "Unknown location"}</div>
                        {s.notes && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {s.notes}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function statusVariant(s: string): "default" | "destructive" | "secondary" | "outline" {
  if (s === "open") return "destructive";
  if (s === "found") return "default";
  if (s === "matched") return "secondary";
  return "outline";
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "destructive" | "success";
}) {
  const toneCls =
    tone === "destructive"
      ? "bg-destructive/10 text-destructive"
      : tone === "success"
        ? "bg-green-500/10 text-green-700 dark:text-green-400"
        : "bg-primary/10 text-primary";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-md p-2 ${toneCls}`}>
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
