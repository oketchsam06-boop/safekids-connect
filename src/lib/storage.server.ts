import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BUCKET = "child-photos";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function decodeDataUrl(dataUrl: string): { buf: Buffer; mime: string } {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i.exec(dataUrl);
  if (!m) throw new Error("Invalid image format (use JPEG, PNG, or WEBP)");
  const mime = m[1].toLowerCase();
  if (!ALLOWED.has(mime)) throw new Error("Unsupported image type");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > MAX_BYTES) throw new Error("Image exceeds 8MB");
  if (buf.length < 1024) throw new Error("Image too small");
  return { buf, mime };
}

export async function uploadPrivate(path: string, dataUrl: string) {
  const { buf, mime } = decodeDataUrl(dataUrl);
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: mime, upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

export async function signedUrl(path: string, ttlSec = 60) {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, ttlSec);
  if (error || !data) throw new Error(`Signed URL failed: ${error?.message ?? "unknown"}`);
  return data.signedUrl;
}

export async function downloadAsBase64(path: string): Promise<string> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Download failed: ${error?.message ?? "unknown"}`);
  const ab = await data.arrayBuffer();
  const buf = Buffer.from(ab);
  const mime = data.type || "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function logAudit(actorId: string | null, action: string, resourceType: string, resourceId: string, metadata?: Record<string, unknown>) {
  await supabaseAdmin.from("audit_logs").insert({
    actor_id: actorId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata: (metadata ?? null) as any,
  });
}
