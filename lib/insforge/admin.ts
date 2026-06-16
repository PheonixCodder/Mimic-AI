import "server-only";

import { createAdminClient } from "@insforge/sdk";
import { env } from "@/lib/env";

export const insforgeAdmin = createAdminClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  apiKey: env.INSFORGE_API_KEY,
});
