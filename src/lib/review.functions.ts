import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signedUrl, logAudit } from "./storage.server";

export const listPendingMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isPolice = (roles ?? []).some((r) => r.role === "police_admin" || r.role === "super_admin");
    if (!isPolice) throw new Error("Forbidden");

    const { data: matches, error } = await supabaseAdmin
      .from("match_candidates")
      .select("id, sighting_id, child_id, ai_score, ai_rationale, decision, created_at")
      .eq("decision", "pending")
      .order("ai_score", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    if (!matches?.length) return [];

    const sightingIds = [...new Set(matches.map((m) => m.sighting_id))];
    const childIds = [...new Set(matches.map((m) => m.child_id))];

    const [{ data: sightings }, { data: children }, { data: photos }] = await Promise.all([
      supabaseAdmin
        .from("sightings")
        .select("id, storage_path, location_text, notes, seen_at, lat, lng")
        .in("id", sightingIds),
      supabaseAdmin
        .from("missing_children")
        .select("id, first_name, last_initial, age, gender, county, last_seen_location_text, last_seen_at")
        .in("id", childIds),
      supabaseAdmin
        .from("child_photos")
        .select("child_id, storage_path, is_primary")
        .in("child_id", childIds)
        .eq("is_primary", true),
    ]);

    const sMap = new Map((sightings ?? []).map((s) => [s.id, s]));
    const cMap = new Map((children ?? []).map((c) => [c.id, c]));
    const pMap = new Map((photos ?? []).map((p) => [p.child_id, p.storage_path]));

    const out = await Promise.all(
      matches.map(async (m) => {
        const s = sMap.get(m.sighting_id);
        const c = cMap.get(m.child_id);
        const cPath = pMap.get(m.child_id);
        const [sightingUrl, candidateUrl] = await Promise.all([
          s ? signedUrl(s.storage_path, 120) : null,
          cPath ? signedUrl(cPath, 120) : null,
        ]);
        return { match: m, sighting: s, child: c, sightingUrl, candidateUrl };
      }),
    );
    await logAudit(userId, "review.list", "match_candidates", "queue");
    return out;
  });

const DecisionInput = z.object({
  match_id: z.string().uuid(),
  decision: z.enum(["confirmed", "rejected", "escalated"]),
  reason: z.string().min(5).max(1000),
});

export const decideMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => DecisionInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isPolice = (roles ?? []).some((r) => r.role === "police_admin" || r.role === "super_admin");
    if (!isPolice) throw new Error("Forbidden");

    const { data: updated, error } = await supabaseAdmin
      .from("match_candidates")
      .update({
        decision: data.decision,
        reviewer_id: userId,
        reviewer_reason: data.reason,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.match_id)
      .select("child_id, sighting_id, ai_score")
      .single();
    if (error || !updated) throw new Error(error?.message ?? "Update failed");

    await logAudit(userId, `review.${data.decision}`, "match_candidates", data.match_id, {
      reason: data.reason,
      ai_score: updated.ai_score,
    });

    if (data.decision === "confirmed") {
      // Update case status + notify guardian
      const { data: childRow } = await supabaseAdmin
        .from("missing_children")
        .select("reporter_id, first_name")
        .eq("id", updated.child_id)
        .single();
      await supabaseAdmin
        .from("missing_children")
        .update({ status: "matched" })
        .eq("id", updated.child_id);
      if (childRow) {
        await supabaseAdmin.from("notifications").insert({
          user_id: childRow.reporter_id,
          title: "Possible match confirmed by police",
          body: `An officer has verified a potential sighting for ${childRow.first_name}. They will contact you shortly.`,
          link: `/cases/${updated.child_id}`,
        });
        await supabaseAdmin.from("case_updates").insert({
          child_id: updated.child_id,
          author_id: userId,
          message: `Match confirmed by officer (AI score ${(updated.ai_score * 100).toFixed(1)}%). ${data.reason}`,
        });
      }
    }

    return { ok: true };
  });
