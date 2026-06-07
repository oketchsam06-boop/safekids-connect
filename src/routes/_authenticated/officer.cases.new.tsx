import "@/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createStationCase } from "@/lib/cases.functions";
import { listOrganizations } from "@/lib/admin.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fileToDataUrl } from "@/lib/image";
import { KENYA_COUNTIES } from "@/lib/kenya-counties";

export const Route = createFileRoute("/_authenticated/officer/cases/new")({
  head: () => ({ meta: [{ title: "Upload station case — Tafuta Mtoto" }] }),
  component: NewStationCasePage,
});

function NewStationCasePage() {
  const nav = useNavigate();
  const submit = useServerFn(createStationCase);
  const fetchOrgs = useServerFn(listOrganizations);
  const orgsQ = useQuery({ queryKey: ["orgs"], queryFn: () => fetchOrgs() });

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    case_file_number: "",
    investigating_officer: "",
    station_org_id: "",
    first_name: "",
    last_initial: "",
    age: "",
    gender: "",
    county: "",
    last_seen_at: "",
    last_seen_location_text: "",
    last_seen_lat: "",
    last_seen_lng: "",
    description: "",
  });
  const [photo, setPhoto] = useState<string | null>(null);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return toast.error("Max 8MB");
    setPhoto(await fileToDataUrl(f));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) return toast.error("Photo required");
    if (!form.case_file_number) return toast.error("OB / case file number required");
    setBusy(true);
    try {
      const res = await submit({
        data: {
          case_file_number: form.case_file_number,
          investigating_officer: form.investigating_officer || null,
          station_org_id: form.station_org_id || null,
          first_name: form.first_name,
          last_initial: form.last_initial || null,
          age: Number(form.age),
          gender: form.gender || null,
          county: form.county || null,
          last_seen_at: form.last_seen_at ? new Date(form.last_seen_at).toISOString() : null,
          last_seen_location_text: form.last_seen_location_text || null,
          last_seen_lat: form.last_seen_lat ? Number(form.last_seen_lat) : null,
          last_seen_lng: form.last_seen_lng ? Number(form.last_seen_lng) : null,
          description: form.description || null,
          photo_data_url: photo,
          consent_version: "1.0",
          contacts: [],
        },
      });
      toast.success("Station case uploaded — entered AI matching pipeline");
      nav({ to: "/cases/$caseId", params: { caseId: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload station case</CardTitle>
            <p className="text-sm text-muted-foreground">
              For police officers filing a missing-child case from station records.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="rounded-md border bg-secondary/40 p-3">
                <p className="mb-2 text-sm font-medium">Station details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>OB / Case file number *</Label>
                    <Input
                      required
                      value={form.case_file_number}
                      onChange={(e) =>
                        setForm({ ...form, case_file_number: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Investigating officer</Label>
                    <Input
                      value={form.investigating_officer}
                      onChange={(e) =>
                        setForm({ ...form, investigating_officer: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Station / organization</Label>
                    <Select
                      value={form.station_org_id}
                      onValueChange={(v) => setForm({ ...form, station_org_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select station" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {(orgsQ.data ?? []).map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name} ({o.county ?? o.org_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First name *</Label>
                  <Input
                    required
                    maxLength={50}
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Last initial</Label>
                  <Input
                    maxLength={1}
                    value={form.last_initial}
                    onChange={(e) => setForm({ ...form, last_initial: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Age *</Label>
                  <Input
                    type="number"
                    min={0}
                    max={18}
                    required
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Input
                    placeholder="male / female / other"
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  />
                </div>
                <div>
                  <Label>County</Label>
                  <Select
                    value={form.county}
                    onValueChange={(v) => setForm({ ...form, county: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select county" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {KENYA_COUNTIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Last seen at</Label>
                  <Input
                    type="datetime-local"
                    value={form.last_seen_at}
                    onChange={(e) => setForm({ ...form, last_seen_at: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Last seen location (text)</Label>
                <Input
                  value={form.last_seen_location_text}
                  onChange={(e) =>
                    setForm({ ...form, last_seen_location_text: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Description / distinguishing features</Label>
                <Textarea
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <Label>Child photo *</Label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onPhoto}
                  required
                />
                {photo && (
                  <img
                    src={photo}
                    alt="preview"
                    className="mt-2 h-32 w-32 rounded object-cover"
                  />
                )}
              </div>

              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Uploading…" : "Upload station case"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
