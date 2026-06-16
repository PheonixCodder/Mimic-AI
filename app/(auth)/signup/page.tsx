import { redirect } from "next/navigation";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { SignupView } from "@/features/auth/views/signup-view";

export default async function SignupPage() {
  const insforge = await createInsForgeServerClient();
  const { data } = await insforge.auth.getCurrentUser();

  if (data?.user) {
    redirect("/dashboard");
  }

  return <SignupView />;
}
