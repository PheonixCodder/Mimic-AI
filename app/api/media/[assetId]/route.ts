import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";

import { requireWorkspaceSession } from "@/server/media/session";
import { getPresignedDownloadUrl } from "@/lib/r2";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const session = await requireWorkspaceSession();
    const { assetId } = await params;

    if (!assetId) {
      return NextResponse.json({ error: "Asset ID required" }, { status: 400 });
    }

    // For TTS audio files, the assetId is the R2 object key
    // We need to verify the user has access to this audio file
    // This could be enhanced with proper access control
    
    const presignedUrl = await getPresignedDownloadUrl(assetId);
    
    // Redirect to the presigned URL
    return NextResponse.redirect(presignedUrl);
  } catch (error) {
    console.error("Error serving audio file:", error);
    
    if (error instanceof TRPCError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    return NextResponse.json({ error: "Failed to serve audio file" }, { status: 500 });
  }
}