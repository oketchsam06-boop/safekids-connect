import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { uploadPrivate, signedUrl, logAudit } from "./storage.server";

const CaseInput = z.object({
  first_name: z.string().trim().min(1).max(50),
  last_initial: z.string().trim().max(1).optional().nullable(),
  age: z.number().int().min(0).max(18),
  gender: z.string().max(20).optional().nullable(),
  county: z.string().max(60).optional().nullable(),
  last_seen_at: z.string().optional().nullable(),
  last_seen_location_text: z.string().max(300).optional().nullable(),
  last_seen_lat: z.number().min(-90).max(90).optional().nullable(),
  last_seen_lng: z.number().min(-180).max(180).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  photo_data_url: z.string().min(30),
  consent_version: z.string().default("1.0"),
  contacts: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        relation: z.string().max(50).optional().nullable(),
        phone: z.string().min(7).max(20),
        priority: z.number().int().min(1).max(5).default(1),
      }),
    )
    .max(5)
    .default([]),
});

export const createCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CaseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Record consent (user-scoped, RLS)
    await supabase.from("consents").insert({
      user_id: userId,
      purpose: "missing_child_report",
      version: data.consent_version,
    });

    // 2. Insert case as the user (RLS-enforced)
    const { data: caseRow, error: caseErr } = await supabase
      .from("missing_children")
      .insert({
        reporter_id: userId,
        first_name: data.first_name,
        last_initial: data.last_initial ?? null,
        age: data.age,
        gender: data.gender ?? null,
        county: data.county ?? null,
        last_seen_at: data.last_seen_at ?? null,
        last_seen_location_text: data.last_seen_location_text ?? null,
        last_seen_lat: data.last_seen_lat ?? null,
        last_seen_lng: data.last_seen_lng ?? null,
        description: data.description ?? null,
      })
      .select("id")
      .single();
    if (caseErr || !caseRow) throw new Error(caseErr?.message ?? "Failed to create case");

    // 3. Upload photo (admin, private bucket)
    const path = `cases/${caseRow.id}/${crypto.randomUUID()}.img`;
    await uploadPrivate(path, data.photo_data_url);

    // 4. Record photo row
    const { error: photoErr } = await supabase.from("child_photos").insert({
      child_id: caseRow.id,
      storage_path: path,
      uploaded_by: userId,
      is_primary: true,
    });
    if (photoErr) throw new Error(photoErr.message);

    // 5. Contacts
    if (data.contacts.length) {
      await supabase
        .from("emergency_contacts")
        .insert(data.contacts.map((c) => ({ ...c, child_id: caseRow.id })));
    }

    // 6. Audit
    await logAudit(userId, "case.create", "missing_children", caseRow.id);

    // 7. Notify police_admins (best-effort)
    const { data: officers } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "police_admin");
    if (officers?.length) {
      await supabaseAdmin.from("notifications").insert(
        officers.map((o) => ({
          user_id: o.user_id,
          title: "New missing-child case reported",
          body: `${data.first_name}, age ${data.age}${data.county ? `, ${data.county}` : ""}`,
          link: `/cases/${caseRow.id}`,
        })),
      );
    }

    return { id: caseRow.id };
  });

export const listMyCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("missing_children")
      .select("id, first_name, age, county, status, created_at, last_seen_location_text")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: c, error: cErr }, { data: photos }, { data: contacts }, { data: updates }] =
      await Promise.all([
        supabase.from("missing_children").select("*").eq("id", data.id).maybeSingle(),
        supabase.from("child_photos").select("*").eq("child_id", data.id),
        supabase.from("emergency_contacts").select("*").eq("child_id", data.id),
        supabase
          .from("case_updates")
          .select("*")
          .eq("child_id", data.id)
          .order("created_at", { ascending: false }),
      ]);
    if (cErr) throw new Error(cErr.message);
    if (!c) throw new Error("Not found");

    const photoUrls = await Promise.all(
      (photos ?? []).map(async (p) => ({
        id: p.id,
        is_primary: p.is_primary,
        url: await signedUrl(p.storage_path, 120),
      })),
    );
    await logAudit(userId, "case.read", "missing_children", data.id);

    return { case: c, photos: photoUrls, contacts: contacts ?? [], updates: updates ?? [] };
  });

// ============================================================
// Officer / station case upload (Phase 3)
// ============================================================

const StationCaseInput = CaseInput.extend({
  case_file_number: z.string().trim().min(1).max(50),
  station_org_id: z.string().uuid().optional().nullable(),
  investigating_officer: z.string().trim().max(120).optional().nullable(),
});

export const createStationCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StationCaseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller is officer / super admin
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const ok = (roles ?? []).some((r) => r.role === "police_admin" || r.role === "super_admin");
    if (!ok) throw new Error("Forbidden — officers only");

    // Consent (officer attests on behalf of the station)
    await supabase.from("consents").insert({
      user_id: userId,
      purpose: "station_case_upload",
      version: data.consent_version,
    });

    // Insert case via admin client so we can set 'source' and station fields
    const { data: caseRow, error: caseErr } = await supabaseAdmin
      .from("missing_children")
      .insert({
        reporter_id: userId,
        first_name: data.first_name,
        last_initial: data.last_initial ?? null,
        age: data.age,
        gender: data.gender ?? null,
        county: data.county ?? null,
        last_seen_at: data.last_seen_at ?? null,
        last_seen_location_text: data.last_seen_location_text ?? null,
        last_seen_lat: data.last_seen_lat ?? null,
        last_seen_lng: data.last_seen_lng ?? null,
        description: data.description ?? null,
        source: "station",
        case_file_number: data.case_file_number,
        station_org_id: data.station_org_id ?? null,
        investigating_officer: data.investigating_officer ?? null,
        assigned_officer_id: userId,
      })
      .select("id")
      .single();
    if (caseErr || !caseRow) throw new Error(caseErr?.message ?? "Failed to create station case");

    const path = `cases/${caseRow.id}/${crypto.randomUUID()}.img`;
    await uploadPrivate(path, data.photo_data_url);

    const { error: photoErr } = await supabaseAdmin.from("child_photos").insert({
      child_id: caseRow.id,
      storage_path: path,
      uploaded_by: userId,
      is_primary: true,
    });
    if (photoErr) throw new Error(photoErr.message);

    if (data.contacts.length) {
      await supabaseAdmin
        .from("emergency_contacts")
        .insert(data.contacts.map((c) => ({ ...c, child_id: caseRow.id })));
    }

    await logAudit(userId, "case.create.station", "missing_children", caseRow.id, {
      case_file_number: data.case_file_number,
    });

    // Notify super admins of new station case
    const { data: admins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");
    if (admins?.length) {
      await supabaseAdmin.from("notifications").insert(
        admins.map((a) => ({
          user_id: a.user_id,
          title: "New station case uploaded",
          body: `${data.first_name}, age ${data.age} — OB ${data.case_file_number}`,
          link: `/cases/${caseRow.id}`,
        })),
      );
    }

    return { id: caseRow.id };
  });

