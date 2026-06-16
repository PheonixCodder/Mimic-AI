import { Logo } from "@/components/logo";
import { AuthForm } from "@/features/auth/components/auth-form";

export function SignupView() {
  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo href="/" priority width={46} height={40} />
        <p className="text-sm text-muted-foreground">
          Create your self-hosted AI video studio
        </p>
      </div>
      <AuthForm mode="signup" />
    </div>
  );
}
