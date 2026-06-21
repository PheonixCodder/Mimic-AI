import "server-only";
import { insforgeAdmin } from "@/lib/insforge/admin";

/** Returns true if the given userId has is_platform_admin = true in profiles. */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const { data } = await insforgeAdmin.database
    .from("profiles")
    .select("is_platform_admin")
    .eq("user_id", userId)
    .single();

  return (data as { is_platform_admin: boolean } | null)?.is_platform_admin === true;
}
