import { NextResponse } from "next/server";
import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";
import { ensurePersonalWorkspace } from "@/server/workspaces/ensure-personal-workspace";

export async function POST(request: Request) {
  const client = createServerClient();
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Email and password are required" },
      { status: 400 },
    );
  }

  const { data, error } = await client.auth.signUp({
    email: body.email,
    password: body.password,
    name: body.name,
  });

  if (error) {
    return NextResponse.json(
      {
        error: error.error ?? "AUTH_ERROR",
        message: error.message ?? "Sign up failed",
      },
      { status: error.statusCode ?? 400 },
    );
  }

  if (data?.requireEmailVerification) {
    return NextResponse.json({
      requireEmailVerification: true,
      email: body.email,
    });
  }

  if (!data?.accessToken || !data.user) {
    return NextResponse.json(
      { error: "AUTH_ERROR", message: "Sign up did not return a session" },
      { status: 400 },
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
