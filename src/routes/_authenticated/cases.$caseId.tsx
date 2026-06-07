import "@/i18n";
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCase } from "@/lib/cases.functions";
import { markCaseFound } from "@/lib/admin.functions";
import { getMyContext } from "@/lib/auth.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Heart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cases/$caseId")({
  head: () => ({ meta: [{ title: "Case detail — Tafuta Mtoto" }] }),
  component: CaseDetail,
});

function CaseDetail() {
  const { caseId } = Route.useParams();
  const qc = useQueryClient();
  const fn = useServerFn(getCase);
  const fetchCtx = useServerFn(getMyContext);
  const doMarkFound = useServerFn(markCaseFound);

  const { data, isLoading, error } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => fn({ data: { id: caseId } }),
  });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => fetchCtx() });

  const [showForm, setShowForm] = useState(false);
  const [notes, setNotes] = useState("");
  const [reunified, setReunified] = useState(false);
  const [busy, setBusy] = useState(false);

  const roles = me?.roles ?? [];
  const canMarkFound =
    (roles.includes("police_admin") || roles.includes("super_admin")) &&
    data?.case.status !== "found" &&
    data?.case.status !== "closed";

  async function onMarkFound() {
    if (notes.trim().length < 3) return toast.error("Add a short note about recovery");
    setBusy(true);
    try {
      await doMarkFound({
        data: { case_id: caseId, notes, reunified_with_family: reunified },
      });
      toast.success("Case marked as found");
      setShowForm(false);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["case", caseId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link to="/dashboard">← Back</Link>
        </Button>
        {isLoading && <p>Loading…</p>}
        {error && <p className="text-destructive">{(error as Error).message}</p>}
        {data && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {data.case.first_name} {data.case.last_initial ?? ""}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {data.case.source === "station" && (
                    <Badge variant="outline">Station case</Badge>
                  )}
                  <Badge variant={data.case.status === "found" ? "default" : "secondary"}>
                    {data.case.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {data.photos.map((p) => (
                  <img
                    key={p.id}
                    src={p.url}
                    alt=""
                    className="h-40 w-40 rounded object-cover ring-2 ring-border"
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Age: </span>{data.case.age}</div>
                <div><span className="text-muted-foreground">Gender: </span>{data.case.gender ?? "—"}</div>
                <div><span className="text-muted-foreground">County: </span>{data.case.county ?? "—"}</div>
                <div><span className="text-muted-foreground">Last seen: </span>{data.case.last_seen_at ? new Date(data.case.last_seen_at).toLocaleString() : "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Location: </span>{data.case.last_seen_location_text ?? "—"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Description: </span>{data.case.description ?? "—"}</div>
                {data.case.case_file_number && (
                  <div><span className="text-muted-foreground">OB #: </span>{data.case.case_file_number}</div>
                )}
                {data.case.investigating_officer && (
                  <div><span className="text-muted-foreground">Officer: </span>{data.case.investigating_officer}</div>
                )}
                {data.case.found_at && (
                  <div className="col-span-2 rounded border border-green-500/30 bg-green-500/10 p-2">
                    <strong>Marked found:</strong>{" "}
                    {new Date(data.case.found_at).toLocaleString()}
                    {data.case.found_notes && <p className="mt-1">{data.case.found_notes}</p>}
                  </div>
                )}
              </div>

              {canMarkFound && (
                <div className="rounded-md border p-3">
                  {!showForm ? (
                    <Button onClick={() => setShowForm(true)} variant="default">
                      <Heart className="mr-2 h-4 w-4" />
                      Mark child as found
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Recovery details</p>
                      <Textarea
                        rows={3}
                        placeholder="Describe how the child was located and recovered…"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={reunified}
                          onCheckedChange={(v) => setReunified(!!v)}
                        />
                        <Label>Reunified with family</Label>
                      </label>
                      <div className="flex gap-2">
                        <Button onClick={onMarkFound} disabled={busy}>
                          {busy ? "Saving…" : "Confirm found"}
                        </Button>
                        <Button variant="ghost" onClick={() => setShowForm(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {data.contacts.length > 0 && (
                <div>
                  <h3 className="mb-2 font-medium">Emergency contacts</h3>
                  <ul className="space-y-1 text-sm">
                    {data.contacts.map((c) => (
                      <li key={c.id}>
                        {c.name} ({c.relation ?? "—"}) — {c.phone}
                      </li>
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
                        <div className="text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleString()}
                        </div>
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
