import "@/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPendingMatches, decideMatch } from "@/lib/review.functions";
import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({ meta: [{ title: "Review queue — Tafuta Mtoto" }] }),
  component: ReviewQueue,
});

function ReviewQueue() {
  const { t } = useTranslation();
  const list = useServerFn(listPendingMatches);
  const decide = useServerFn(decideMatch);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["review-queue"], queryFn: () => list() });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold">{t("review.title")}</h1>
        <p className="mb-4 text-sm text-muted-foreground">{t("review.disclaimer")}</p>
        {isLoading && <p>Loading…</p>}
        {error && <p className="text-destructive">{(error as Error).message}</p>}
        {data && data.length === 0 && <p className="text-muted-foreground">{t("review.empty")}</p>}
        <div className="space-y-4">
          {data?.map((row) => (
            <MatchCard
              key={row.match.id}
              row={row}
              onDecide={async (decision, reason) => {
                try {
                  await decide({ data: { match_id: row.match.id, decision, reason } });
                  toast.success(`Match ${decision}`);
                  qc.invalidateQueries({ queryKey: ["review-queue"] });
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed");
                }
              }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function MatchCard({ row, onDecide }: { row: any; onDecide: (d: "confirmed" | "rejected" | "escalated", reason: string) => Promise<void> }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const score = row.match.ai_score;
  const scorePct = (score * 100).toFixed(1);
  const tone = score >= 0.85 ? "destructive" : score >= 0.7 ? "default" : "secondary";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Candidate: {row.child?.first_name} {row.child?.last_initial ?? ""} · age {row.child?.age}
          </CardTitle>
          <Badge variant={tone as any}>{t("review.score")}: {scorePct}%</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Sighting</p>
            {row.sightingUrl && <img src={row.sightingUrl} alt="" className="h-48 w-full rounded object-cover ring-2 ring-border" />}
            <p className="mt-1 text-xs">{row.sighting?.location_text}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Reported child</p>
            {row.candidateUrl && <img src={row.candidateUrl} alt="" className="h-48 w-full rounded object-cover ring-2 ring-border" />}
            <p className="mt-1 text-xs">{row.child?.county} · last seen {row.child?.last_seen_location_text}</p>
          </div>
        </div>
        <div className="rounded border bg-secondary/30 p-2 text-sm">
          <p className="font-medium">{t("review.rationale")}</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{row.match.ai_rationale}</p>
        </div>
        <div>
          <label className="text-sm font-medium">{t("review.reasonLabel")}</label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("review.reasonPlaceholder")}
            rows={2}
            minLength={5}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={pendingConfirm ? "destructive" : "default"}
            disabled={reason.length < 5}
            onClick={async () => {
              if (!pendingConfirm) {
                setPendingConfirm(true);
                setTimeout(() => setPendingConfirm(false), 4000);
                return;
              }
              await onDecide("confirmed", reason);
            }}
          >
            {pendingConfirm ? t("review.confirmAgain") : t("review.confirm")}
          </Button>
          <Button variant="outline" disabled={reason.length < 5} onClick={() => onDecide("rejected", reason)}>
            {t("review.reject")}
          </Button>
          <Button variant="ghost" disabled={reason.length < 5} onClick={() => onDecide("escalated", reason)}>
            {t("review.escalate")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
