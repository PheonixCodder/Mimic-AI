import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";

const ALLOWED_PROVIDERS = new Set(["google", "github"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json(
      { error: "INVALID_PROVIDER", message: "Unsupported OAuth provider" },
      { status: 400 },
    );
  }

  const client = createServerClient();
  const redirectTo = new URL("/api/auth/callback", process.env.NEXT_PUBLIC_APP_URL).toString();

  const { data, error } = await client.auth.signInWithOAuth(provider, {
    redirectTo,
    skipBrowserRedirect: true,
  });

  if (error || !data?.url || !data.codeVerifier) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_init_failed", request.url),
    );
  }

  const cookieStore = await cookies();
  cookieStore.set("insforge_code_verifier", data.codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(data.url);
}
