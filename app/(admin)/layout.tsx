import Link from "next/link";
import { redirect } from "next/navigation";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { isPlatformAdmin } from "@/lib/admin-guard";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const insforge = await createInsForgeServerClient();
  const { data } = await insforge.auth.getCurrentUser();

  if (!data?.user) redirect("/login");

  const isAdmin = await isPlatformAdmin(data.user.id);
  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="min-h-svh flex flex-col">
      <header className="border-b bg-background px-6 py-3 flex items-center gap-4">
        <span className="text-sm font-semibold tracking-tight">Mimic AI · Admin</span>
        <span className="ml-auto text-xs text-muted-foreground">{data.user.email}</span>
        <Link href="/dashboard" className="text-xs text-primary hover:underline">
          Back to dashboard
        </Link>
      </header>
      <main className="flex-1 p-6 lg:p-10">{children}</main>
    </div>
  );
}
