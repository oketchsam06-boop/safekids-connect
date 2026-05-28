import "@/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLogs } from "@/lib/admin.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log — Tafuta Mtoto" }] }),
  component: AuditPage,
});

function AuditPage() {
  const fn = useServerFn(listAuditLogs);
  const { data, isLoading, error } = useQuery({ queryKey: ["audit"], queryFn: () => fn() });
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <Card>
          <CardHeader><CardTitle>Audit log (super-admin)</CardTitle></CardHeader>
          <CardContent>
            {isLoading && <p>Loading…</p>}
            {error && <p className="text-destructive">{(error as Error).message}</p>}
            {data && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b text-left text-muted-foreground">
                    <tr><th className="p-2">Time</th><th className="p-2">Actor</th><th className="p-2">Action</th><th className="p-2">Resource</th><th className="p-2">Metadata</th></tr>
                  </thead>
                  <tbody>
                    {data.map((l: any) => (
                      <tr key={l.id} className="border-b">
                        <td className="p-2">{new Date(l.created_at).toLocaleString()}</td>
                        <td className="p-2 font-mono">{l.actor_id?.slice(0, 8) ?? "—"}</td>
                        <td className="p-2">{l.action}</td>
                        <td className="p-2">{l.resource_type} / {l.resource_id?.slice(0, 8)}</td>
                        <td className="p-2"><code>{l.metadata ? JSON.stringify(l.metadata) : ""}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
