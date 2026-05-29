import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AccountInput = z.object({
  full_name: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
});

export const syncMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AccountInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const claims = context.claims as Record<string, any>;
    const metadata = (claims.user_metadata ?? {}) as Record<string, unknown>;
    const fullName = data.full_name || (typeof metadata.full_name === "string" ? metadata.full_name : null) || (typeof metadata.name === "string" ? metadata.name : null) || (typeof claims.email === "string" ? claims.email : null);

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName,
        phone: data.phone || null,
      },
      { onConflict: "id" },
    );
    if (profileError) throw new Error(profileError.message);

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "parent_guardian" }, { onConflict: "user_id,role" });
    if (roleError) throw new Error(roleError.message);

    return { ok: true };
  });

export const getMyContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    return {
      userId,
      profile,
      roles: (roles ?? []).map((r) => r.role as string),
    };
  });
