import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateObject } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { uploadPrivate, downloadAsBase64, logAudit } from "./storage.server";

const SightingInput = z.object({
  photo_data_url: z.string().min(30),
  location_text: z.string().max(300).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  child_age_estimate: z.number().int().min(0).max(18).optional().nullable(),
  child_gender: z.string().max(20).optional().nullable(),
});

const MATCH_THRESHOLD = 0.6;
const TOP_K = 3;

export const createSighting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SightingInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Insert sighting row (RLS-enforced) — placeholder path, updated after upload
    const { data: row, error } = await supabase
      .from("sightings")
      .insert({
        reporter_id: userId,
        storage_path: "pending",
        location_text: data.location_text ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Failed to create sighting");

    // 2. Upload photo
    const path = `sightings/${row.id}/${crypto.randomUUID()}.img`;
    await uploadPrivate(path, data.photo_data_url);
    await supabaseAdmin.from("sightings").update({ storage_path: path }).eq("id", row.id);
    await logAudit(userId, "sighting.create", "sightings", row.id);

    // 3. Candidate pre-filter (admin client; bypasses RLS for matching purposes only)
    let q = supabaseAdmin
      .from("missing_children")
      .select("id, first_name, age, gender, county")
      .eq("status", "open");
    if (data.child_age_estimate != null) {
      q = q.gte("age", Math.max(0, data.child_age_estimate - 3)).lte("age", data.child_age_estimate + 3);
    }
    if (data.child_gender) q = q.eq("gender", data.child_gender);
    const { data: candidates } = await q.limit(50);

    if (!candidates || candidates.length === 0) {
      return { sightingId: row.id, matches: 0, message: "No open cases to compare." };
    }

    // 4. Load primary photo for each candidate
    const ids = candidates.map((c) => c.id);
    const { data: photos } = await supabaseAdmin
      .from("child_photos")
      .select("child_id, storage_path, is_primary")
      .in("child_id", ids)
      .eq("is_primary", true);
    const photoByCase = new Map((photos ?? []).map((p) => [p.child_id, p.storage_path]));
    const usable = candidates.filter((c) => photoByCase.has(c.id)).slice(0, TOP_K);
    if (usable.length === 0) return { sightingId: row.id, matches: 0, message: "No candidate photos." };

    // 5. Multimodal AI scoring
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) throw new Error("AI gateway not configured");
    const gateway = createLovableAiGatewayProvider(lovableKey);

    const sightingB64 = data.photo_data_url;
    const candidateImages = await Promise.all(
      usable.map(async (c) => ({ c, b64: await downloadAsBase64(photoByCase.get(c.id)!) })),
    );

    const schema = z.object({
      results: z.array(
        z.object({
          candidate_id: z.string(),
          score: z.number().min(0).max(1),
          rationale: z.string().max(500),
          observable_features: z.array(z.string()).max(8),
        }),
      ),
    });

    let aiResults: z.infer<typeof schema>["results"] = [];
    try {
      const ai = await generateObject({
        model: gateway("google/gemini-2.5-flash"),
        schema,
        messages: [
          {
            role: "system",
            content:
              "You are a forensic visual-similarity assistant for a child-protection platform. You compare a SIGHTING photo to CANDIDATE photos of missing children. Be conservative. Score 0-1 (0 = clearly different person, 1 = highly likely same person). Consider apparent age, facial structure, hair, skin tone, distinguishing features. NEVER claim certainty. Your output is decision support only — a human officer makes the final decision.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "SIGHTING photo:" },
              { type: "image", image: sightingB64 },
              ...candidateImages.flatMap(({ c, b64 }) => [
                {
                  type: "text" as const,
                  text: `CANDIDATE id=${c.id} (reported age ${c.age}${c.gender ? ", " + c.gender : ""}):`,
                },
                { type: "image" as const, image: b64 },
              ]),
              {
                type: "text",
                text: "Score each candidate. Return one result per candidate using the candidate id provided.",
              },
            ],
          },
        ],
      });
      aiResults = ai.object.results;
    } catch (e) {
      console.error("AI matching failed", e);
      return { sightingId: row.id, matches: 0, message: "AI matching temporarily unavailable; sighting logged." };
    }

    // 6. Insert match_candidates above threshold
    const toInsert = aiResults
      .filter((r) => r.score >= MATCH_THRESHOLD && usable.some((u) => u.id === r.candidate_id))
      .map((r) => ({
        sighting_id: row.id,
        child_id: r.candidate_id,
        ai_score: r.score,
        ai_rationale: `${r.rationale}\nFeatures: ${r.observable_features.join(", ")}`,
        decision: "pending" as const,
      }));

    if (toInsert.length) {
      await supabaseAdmin.from("match_candidates").insert(toInsert);

      // Notify police_admins
      const { data: officers } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "police_admin");
      if (officers?.length) {
        await supabaseAdmin.from("notifications").insert(
          officers.map((o) => ({
            user_id: o.user_id,
            title: `AI suggested ${toInsert.length} potential match(es)`,
            body: "Review required in the police queue.",
            link: "/review",
          })),
        );
      }
      await logAudit(userId, "sighting.matches.ai", "sightings", row.id, {
        candidate_count: toInsert.length,
      });
    }

    return {
      sightingId: row.id,
      matches: toInsert.length,
      scores: aiResults.map((r) => ({ score: r.score, rationale: r.rationale })),
    };
  });
