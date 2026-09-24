import { NextResponse } from "next/server";
import { spotifyRequest } from "@/lib/spotify";
import {
  apiErrorResponse,
  privateHeaders,
  requireSpotifySession,
} from "@/lib/server-api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { accessToken } = await requireSpotifySession();
    const profile = await spotifyRequest(accessToken, "/me");
    return NextResponse.json(profile, { headers: privateHeaders });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
