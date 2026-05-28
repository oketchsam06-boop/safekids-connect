import "@/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCase } from "@/lib/cases.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/cases/$caseId")({
  head: () => ({ meta: [{ title: "Case detail — Tafuta Mtoto" }] }),
  component: CaseDetail,
});

function CaseDetail() {
  const { caseId } = Route.useParams();
  const fn = useServerFn(getCase);
  const { data, isLoading, error } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => fn({ data: { id: caseId } }),
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-3"><Link to="/dashboard">← Back</Link></Button>
        {isLoading && <p>Loading…</p>}
        {error && <p className="text-destructive">{(error as Error).message}</p>}
        {data && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{data.case.first_name} {data.case.last_initial ?? ""}</CardTitle>
                <Badge>{data.case.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {data.photos.map((p) => (
                  <img key={p.id} src={p.url} alt="" className="h-40 w-40 rounded object-cover ring-2 ring-border" />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Age: </span>{data.case.age}</div>
                <div><span className="text-muted-foreground">Gender: </span>{data.case.gender ?? "—"}</div>
                <div><span className="text-muted-foreground">County: </span>{data.case.county ?? "—"}</div>
                <div><span className="text-muted-foreground">Last seen: </span>{data.case.last_seen_at ? new Date(data.case.last_seen_at).toLocaleString() : "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Location: </span>{data.case.last_seen_location_text ?? "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Description: </span>{data.case.description ?? "—"}</div>
              </div>
              {data.contacts.length > 0 && (
                <div>
                  <h3 className="mb-2 font-medium">Emergency contacts</h3>
                  <ul className="space-y-1 text-sm">
                    {data.contacts.map((c) => (
                      <li key={c.id}>{c.name} ({c.relation ?? "—"}) — {c.phone}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.updates.length > 0 && (
                <div>
                  <h3 className="mb-2 font-medium">Timeline</h3>
                  <ul className="space-y-2 text-sm">
                    {data.updates.map((u) => (
                      <li key={u.id} className="rounded border p-2">
                        <div className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleString()}</div>
                        <div>{u.message}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
