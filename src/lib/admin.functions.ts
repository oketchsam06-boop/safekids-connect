import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertRole(supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>, userId: string, roles: string[]) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const ok = (data ?? []).some((r: { role: string }) => roles.includes(r.role));
  if (!ok) throw new Error("Forbidden");
}

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const r = (roles ?? []).map((x) => x.role);
    const isPolice = r.includes("police_admin") || r.includes("super_admin");

    if (!isPolice) {
      const [{ count: myCases }, { count: mySightings }] = await Promise.all([
        supabase.from("missing_children").select("*", { count: "exact", head: true }),
        supabase.from("sightings").select("*", { count: "exact", head: true }),
      ]);
      return { role: "guardian" as const, myCases: myCases ?? 0, mySightings: mySightings ?? 0 };
    }

    const [open, matched, closed, sightings, pending, recentCases] = await Promise.all([
      supabaseAdmin.from("missing_children").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabaseAdmin.from("missing_children").select("*", { count: "exact", head: true }).eq("status", "matched"),
      supabaseAdmin.from("missing_children").select("*", { count: "exact", head: true }).eq("status", "closed"),
      supabaseAdmin.from("sightings").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("match_candidates").select("*", { count: "exact", head: true }).eq("decision", "pending"),
      supabaseAdmin
        .from("missing_children")
        .select("id, first_name, age, county, status, created_at, last_seen_lat, last_seen_lng, last_seen_location_text")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    // Hotspot aggregation by county
    const hotspotMap = new Map<string, number>();
    for (const c of recentCases.data ?? []) {
      if (c.county) hotspotMap.set(c.county, (hotspotMap.get(c.county) ?? 0) + 1);
    }

    return {
      role: "police" as const,
      open: open.count ?? 0,
      matched: matched.count ?? 0,
      closed: closed.count ?? 0,
      sightings: sightings.count ?? 0,
      pendingReviews: pending.count ?? 0,
      recentCases: recentCases.data ?? [],
      hotspots: [...hotspotMap.entries()].sort((a, b) => b[1] - a[1]),
    };
  });

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertRole(supabase as any, userId, ["super_admin"]);
    const { data, error } = await supabaseAdmin
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
