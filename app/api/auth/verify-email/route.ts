import { NextResponse } from "next/server";
import { createServerClient, setAuthCookies } from "@insforge/sdk/ssr";
import { ensurePersonalWorkspace } from "@/server/workspaces/ensure-personal-workspace";

export async function POST(request: Request) {
  const client = createServerClient();
  const body = (await request.json()) as {
    email?: string;
    otp?: string;
  };

  if (!body.email || !body.otp) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Email and verification code are required" },
      { status: 400 },
    );
  }

  const { data, error } = await client.auth.verifyEmail({
    email: body.email,
    otp: body.otp,
  });

  if (error || !data?.accessToken || !data.user) {
    return NextResponse.json(
      {
        error: error?.error ?? "VERIFICATION_FAILED",
        message: error?.message ?? "Invalid or expired verification code",
      },
      { status: error?.statusCode ?? 400 },
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
