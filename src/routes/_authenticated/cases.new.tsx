import "@/i18n";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { createCase } from "@/lib/cases.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fileToDataUrl } from "@/lib/image";
import { KENYA_COUNTIES } from "@/lib/kenya-counties";

export const Route = createFileRoute("/_authenticated/cases/new")({
  head: () => ({ meta: [{ title: "Report a missing child — Tafuta Mtoto" }] }),
  component: NewCasePage,
});

function NewCasePage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const submit = useServerFn(createCase);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
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
  const [contacts, setContacts] = useState([{ name: "", relation: "", phone: "", priority: 1 }]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => {
      setForm((f) => ({
        ...f,
        last_seen_lat: p.coords.latitude.toFixed(6),
        last_seen_lng: p.coords.longitude.toFixed(6),
      }));
    });
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return toast.error("Max 8MB");
    setPhoto(await fileToDataUrl(f));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return toast.error(t("consent.required"));
    if (!photo) return toast.error("Photo required");
    setBusy(true);
    try {
      const res = await submit({
        data: {
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
          contacts: contacts.filter((c) => c.name && c.phone),
        },
      });
      toast.success(t("case.successBody"));
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
          <CardHeader><CardTitle>{t("case.newTitle")}</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-4 rounded-md border bg-secondary/50 p-3 text-sm">
              <p className="font-medium">{t("consent.title")}</p>
              <p className="mt-1 text-muted-foreground">{t("consent.body")}</p>
              <label className="mt-2 flex items-start gap-2">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} />
                <span>{t("consent.agree")}</span>
              </label>
            </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>{t("case.firstName")}</Label><Input required maxLength={50} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                <div><Label>{t("case.lastInitial")}</Label><Input maxLength={1} value={form.last_initial} onChange={(e) => setForm({ ...form, last_initial: e.target.value })} /></div>
                <div><Label>{t("case.age")}</Label><Input type="number" min={0} max={18} required value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
                <div><Label>{t("case.gender")}</Label><Input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} placeholder="male / female / other" /></div>
                <div>
                  <Label>{t("case.county")}</Label>
                  <Select value={form.county} onValueChange={(v) => setForm({ ...form, county: v })}>
                    <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {KENYA_COUNTIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>{t("case.lastSeenAt")}</Label><Input type="datetime-local" value={form.last_seen_at} onChange={(e) => setForm({ ...form, last_seen_at: e.target.value })} /></div>
              </div>
              <div><Label>{t("case.lastSeenLocation")}</Label><Input value={form.last_seen_location_text} onChange={(e) => setForm({ ...form, last_seen_location_text: e.target.value })} /></div>
              <div className="grid grid-cols-3 items-end gap-2">
                <div><Label>{t("case.lat")}</Label><Input value={form.last_seen_lat} onChange={(e) => setForm({ ...form, last_seen_lat: e.target.value })} /></div>
                <div><Label>{t("case.lng")}</Label><Input value={form.last_seen_lng} onChange={(e) => setForm({ ...form, last_seen_lng: e.target.value })} /></div>
                <Button type="button" variant="outline" onClick={useMyLocation}>{t("case.useMyLocation")}</Button>
              </div>
              <div><Label>{t("case.description")}</Label><Textarea rows={3} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

              <div>
                <Label>{t("case.photo")}</Label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} required />
                <p className="mt-1 text-xs text-muted-foreground">{t("case.photoHint")}</p>
                {photo && <img src={photo} alt="preview" className="mt-2 h-32 w-32 rounded object-cover" />}
              </div>

              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">{t("case.emergencyContacts")}</p>
                {contacts.map((c, i) => (
                  <div key={i} className="mb-2 grid grid-cols-3 gap-2">
                    <Input placeholder={t("case.contactName")} value={c.name} onChange={(e) => setContacts(contacts.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                    <Input placeholder={t("case.relation")} value={c.relation} onChange={(e) => setContacts(contacts.map((x, j) => j === i ? { ...x, relation: e.target.value } : x))} />
                    <Input placeholder={t("case.contactPhone")} value={c.phone} onChange={(e) => setContacts(contacts.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} />
                  </div>
                ))}
                {contacts.length < 5 && (
                  <Button type="button" size="sm" variant="outline" onClick={() => setContacts([...contacts, { name: "", relation: "", phone: "", priority: contacts.length + 1 }])}>
                    + {t("case.addContact")}
                  </Button>
                )}
              </div>

              <Button type="submit" disabled={busy || !consent} className="w-full">
                {busy ? t("case.submitting") : t("case.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
