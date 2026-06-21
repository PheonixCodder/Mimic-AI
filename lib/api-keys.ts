import "server-only";
import { insforgeAdmin } from "@/lib/insforge/admin";

export function generateApiKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `mk_live_${hex}`;
}

export async function hashApiKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Returns { workspaceId, keyId } or null. Updates last_used_at fire-and-forget. */
export async function validateApiKey(
  rawKey: string,
): Promise<{ workspaceId: string; keyId: string } | null> {
  const hash = await hashApiKey(rawKey);
  const { data } = await insforgeAdmin.database
    .from("api_keys")
    .select("id, workspace_id")
    .eq("key_hash", hash)
    .single();

  if (!data) return null;

  const row = data as { id: string; workspace_id: string };

  insforgeAdmin.database
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(() => {});

  return { workspaceId: row.workspace_id, keyId: row.id };
}
