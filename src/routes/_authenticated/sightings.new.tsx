import "@/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { createSighting } from "@/lib/sightings.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fileToDataUrl } from "@/lib/image";

export const Route = createFileRoute("/_authenticated/sightings/new")({
  head: () => ({ meta: [{ title: "Report a sighting — Tafuta Mtoto" }] }),
  component: NewSighting,
});

function NewSighting() {
  const { t } = useTranslation();
  const submit = useServerFn(createSighting);
  const [photo, setPhoto] = useState<string | null>(null);
  const [form, setForm] = useState({ location_text: "", notes: "", lat: "", lng: "", age: "", gender: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ matches: number; scores?: { score: number; rationale: string }[]; message?: string } | null>(null);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return toast.error("Max 8MB");
    setPhoto(await fileToDataUrl(f));
  }
  function useMyLoc() {
    navigator.geolocation?.getCurrentPosition((p) =>
      setForm((f) => ({ ...f, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })),
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) return toast.error("Photo required");
    setBusy(true);
    setResult(null);
    try {
      const r = await submit({
        data: {
          photo_data_url: photo,
          location_text: form.location_text || null,
          lat: form.lat ? Number(form.lat) : null,
          lng: form.lng ? Number(form.lng) : null,
          notes: form.notes || null,
          child_age_estimate: form.age ? Number(form.age) : null,
          child_gender: form.gender || null,
        },
      });
      setResult(r);
      toast.success(r.matches > 0 ? t("sighting.matchesFound") : t("sighting.noMatches"));
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
          <CardHeader><CardTitle>{t("sighting.title")}</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">{t("sighting.blurb")}</p>
            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <Label>{t("sighting.photo")}</Label>
                <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} required />
                {photo && <img src={photo} alt="" className="mt-2 h-32 w-32 rounded object-cover" />}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Estimated age</Label><Input type="number" min={0} max={18} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
                <div><Label>Apparent gender</Label><Input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} placeholder="male / female / other" /></div>
              </div>
              <div><Label>{t("sighting.location")}</Label><Input value={form.location_text} onChange={(e) => setForm({ ...form, location_text: e.target.value })} /></div>
              <div className="grid grid-cols-3 items-end gap-2">
                <div><Label>Lat</Label><Input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} /></div>
                <div><Label>Lng</Label><Input value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} /></div>
                <Button type="button" variant="outline" onClick={useMyLoc}>Use my location</Button>
              </div>
              <div><Label>{t("sighting.notes")}</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? t("sighting.matching") : t("sighting.submit")}
              </Button>
            </form>
            {result && (
              <div className="mt-4 rounded border bg-secondary/30 p-3 text-sm">
                <p className="font-medium">{result.matches} potential match{result.matches === 1 ? "" : "es"} forwarded for police review.</p>
                {result.message && <p className="mt-1 text-muted-foreground">{result.message}</p>}
                {result.scores?.map((s, i) => (
                  <div key={i} className="mt-2">
                    <span className="font-medium">AI confidence: {(s.score * 100).toFixed(1)}%</span>
                    <p className="text-xs text-muted-foreground">{s.rationale}</p>
                  </div>
                ))}
                <p className="mt-2 text-xs italic text-muted-foreground">AI suggestion — not verification. A police officer will independently review.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
