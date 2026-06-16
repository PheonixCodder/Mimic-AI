import { redirect } from "next/navigation";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { LoginView } from "@/features/auth/views/login-view";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const insforge = await createInsForgeServerClient();
  const { data } = await insforge.auth.getCurrentUser();

  if (data?.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  return <LoginView errorCode={params.error} />;
}
