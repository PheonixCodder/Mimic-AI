import { NextResponse } from "next/server";
import { createServerClient } from "@insforge/sdk/ssr";

export async function POST(request: Request) {
  const client = createServerClient();
  const body = (await request.json()) as {
    email?: string;
  };

  if (!body.email) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Email is required" },
      { status: 400 },
    );
  }

  const { data, error } = await client.auth.resendVerificationEmail({
    email: body.email,
  });

  if (error) {
    return NextResponse.json(
      {
        error: error.error ?? "RESEND_FAILED",
        message: error.message ?? "Failed to resend verification code",
      },
      { status: error.statusCode ?? 400 },
    );
  }

  return NextResponse.json({
    success: true,
    message: data?.message ?? "Verification code sent",
  });
}
