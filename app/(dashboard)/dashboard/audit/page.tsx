import type { Metadata } from "next";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { AuditView } from "@/features/audit/views/audit-view";

export const metadata: Metadata = { title: "Audit" };

export default async function AuditPage() {
  await prefetch(trpc.auditLogs.list.queryOptions({}));
  return (
    <HydrateClient>
      <AuditView />
    </HydrateClient>
  );
}
