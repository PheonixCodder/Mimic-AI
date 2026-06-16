import { Logo } from "@/components/logo";
import { AuthForm } from "@/features/auth/components/auth-form";

type LoginViewProps = {
  errorCode?: string;
};

export function LoginView({ errorCode }: LoginViewProps) {
  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo href="/" priority width={46} height={40} />
        <p className="text-sm text-muted-foreground">
          Your AI Twin. Your Infrastructure. Your Content.
        </p>
      </div>
      <AuthForm mode="login" errorCode={errorCode} />
    </div>
  );
}
