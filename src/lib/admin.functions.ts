import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAudit } from "./storage.server";

async function assertRole(
  supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>,
  userId: string,
  roles: string[],
) {
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

    const [open, matched, found, closed, sightings, pending, recentCases] = await Promise.all([
      supabaseAdmin.from("missing_children").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabaseAdmin.from("missing_children").select("*", { count: "exact", head: true }).eq("status", "matched"),
      supabaseAdmin.from("missing_children").select("*", { count: "exact", head: true }).eq("status", "found"),
      supabaseAdmin.from("missing_children").select("*", { count: "exact", head: true }).eq("status", "closed"),
      supabaseAdmin.from("sightings").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("match_candidates").select("*", { count: "exact", head: true }).eq("decision", "pending"),
      supabaseAdmin
        .from("missing_children")
        .select("id, first_name, age, county, status, created_at, last_seen_lat, last_seen_lng, last_seen_location_text")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const hotspotMap = new Map<string, number>();
    for (const c of recentCases.data ?? []) {
      if (c.county) hotspotMap.set(c.county, (hotspotMap.get(c.county) ?? 0) + 1);
    }

    return {
      role: "police" as const,
      open: open.count ?? 0,
      matched: matched.count ?? 0,
      found: found.count ?? 0,
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

// ============================================================
// Phase 1 — Super Admin (CWSK) overview
// ============================================================

export const getSuperAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertRole(supabase as any, userId, ["super_admin"]);

    const [open, matched, found, closed, sightingsCnt, pending, officers, parents] = await Promise.all([
      supabaseAdmin.from("missing_children").select("*", { count: "exact", head: true }).eq("status", "open"),
      supabaseAdmin.from("missing_children").select("*", { count: "exact", head: true }).eq("status", "matched"),
      supabaseAdmin.from("missing_children").select("*", { count: "exact", head: true }).eq("status", "found"),
      supabaseAdmin.from("missing_children").select("*", { count: "exact", head: true }).eq("status", "closed"),
      supabaseAdmin.from("sightings").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("match_candidates").select("*", { count: "exact", head: true }).eq("decision", "pending"),
      supabaseAdmin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "police_admin"),
      supabaseAdmin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "parent_guardian"),
    ]);

    const [{ data: allCases }, { data: recentSightings }, { data: pendingMatches }] = await Promise.all([
      supabaseAdmin
        .from("missing_children")
        .select(
          "id, first_name, last_initial, age, gender, county, status, source, case_file_number, created_at, found_at, reporter_id",
        )
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("sightings")
        .select("id, location_text, notes, seen_at, lat, lng, created_at, reporter_id")
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("match_candidates")
        .select("id, sighting_id, child_id, ai_score, ai_rationale, created_at")
        .eq("decision", "pending")
        .order("ai_score", { ascending: false })
        .limit(20),
    ]);

    return {
      stats: {
        open: open.count ?? 0,
        matched: matched.count ?? 0,
        found: found.count ?? 0,
        closed: closed.count ?? 0,
        sightings: sightingsCnt.count ?? 0,
        pendingReviews: pending.count ?? 0,
        officers: officers.count ?? 0,
        parents: parents.count ?? 0,
      },
      allCases: allCases ?? [],
      recentSightings: recentSightings ?? [],
      pendingMatches: pendingMatches ?? [],
    };
  });

// ============================================================
// Phase 2 — User & role management
// ============================================================

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertRole(supabase as any, userId, ["super_admin"]);

    const [{ data: profiles }, { data: allRoles }, { data: orgs }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, phone, org_id, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("organizations").select("id, name, org_type, county"),
    ]);

    const rolesByUser = new Map<string, string[]>();
    for (const r of allRoles ?? []) {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role);
      rolesByUser.set(r.user_id, list);
    }
    const orgMap = new Map((orgs ?? []).map((o) => [o.id, o]));

    return (profiles ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      phone: p.phone,
      created_at: p.created_at,
      roles: rolesByUser.get(p.id) ?? [],
      org: p.org_id ? orgMap.get(p.org_id) ?? null : null,
    }));
  });

export const listOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("organizations")
      .select("id, name, org_type, county, verified")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const RoleInput = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["parent_guardian", "school_shelter", "police_admin", "super_admin"]),
});

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => RoleInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertRole(supabase as any, userId, ["super_admin"]);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    await logAudit(userId, "role.grant", "user_roles", data.user_id, { role: data.role });

    await supabaseAdmin.from("notifications").insert({
      user_id: data.user_id,
      title: `You have been granted the ${data.role.replace("_", " ")} role`,
      body: "Your dashboard now shows the tools available to your role.",
      link: "/dashboard",
    });
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => RoleInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertRole(supabase as any, userId, ["super_admin"]);
    if (data.user_id === userId && data.role === "super_admin") {
      throw new Error("You cannot revoke your own super_admin role.");
    }
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    await logAudit(userId, "role.revoke", "user_roles", data.user_id, { role: data.role });
    return { ok: true };
  });

const OrgAssignInput = z.object({
  user_id: z.string().uuid(),
  org_id: z.string().uuid().nullable(),
});

export const assignOfficerToOrg = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => OrgAssignInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertRole(supabase as any, userId, ["super_admin"]);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ org_id: data.org_id })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    await logAudit(userId, "officer.assign_org", "profiles", data.user_id, { org_id: data.org_id });
    return { ok: true };
  });

// ============================================================
// Phase 3 — Mark case as found
// ============================================================

const MarkFoundInput = z.object({
  case_id: z.string().uuid(),
  notes: z.string().min(3).max(2000),
  reunified_with_family: z.boolean().default(false),
});

export const markCaseFound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => MarkFoundInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertRole(supabase as any, userId, ["police_admin", "super_admin"]);

    const { data: child, error } = await supabaseAdmin
      .from("missing_children")
      .update({
        status: "found",
        found_at: new Date().toISOString(),
        found_notes: data.notes,
      })
      .eq("id", data.case_id)
      .select("reporter_id, first_name")
      .single();
    if (error || !child) throw new Error(error?.message ?? "Case not found");

    await supabaseAdmin.from("case_updates").insert({
      child_id: data.case_id,
      author_id: userId,
      message: `Child marked as FOUND. ${data.reunified_with_family ? "Reunited with family. " : ""}${data.notes}`,
    });

    await supabaseAdmin.from("notifications").insert({
      user_id: child.reporter_id,
      title: `${child.first_name} has been marked as found`,
      body: data.reunified_with_family
        ? "An officer has confirmed reunification with family."
        : "An officer has updated this case. Please check the case page for details.",
      link: `/cases/${data.case_id}`,
    });

    await logAudit(userId, "case.mark_found", "missing_children", data.case_id, {
      reunified: data.reunified_with_family,
    });

    return { ok: true };
  });
