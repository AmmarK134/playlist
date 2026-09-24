import { NextResponse } from "next/server";
import { isSpotifyConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      spotifyConfigured: isSpotifyConfigured(),
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
