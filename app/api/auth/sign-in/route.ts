import { NextResponse } from "next/server";
import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";
import { ensurePersonalWorkspace } from "@/server/workspaces/ensure-personal-workspace";

export async function POST(request: Request) {
  const client = createServerClient();
  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Email and password are required" },
      { status: 400 },
    );
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error || !data?.accessToken || !data.user) {
    const emailNotVerified =
      error?.statusCode === 403 ||
      error?.error === "EMAIL_NOT_VERIFIED" ||
      error?.message?.toLowerCase().includes("verify your email");

    if (emailNotVerified) {
      return NextResponse.json(
        {
          error: "EMAIL_NOT_VERIFIED",
          requireEmailVerification: true,
          email: body.email,
          message: error?.message ?? "Please verify your email before signing in",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        error: error?.error ?? "AUTH_UNAUTHORIZED",
        message: error?.message ?? "Sign in failed",
      },
      { status: error?.statusCode ?? 401 },
    );
  }

  await ensurePersonalWorkspace(data.user);

  const response = NextResponse.json({ user: data.user });
  setAuthCookies(response.cookies, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  return response;
}
