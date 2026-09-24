import { NextRequest, NextResponse } from "next/server";
import {
  normalizePlaylist,
  spotifyRequest,
  type SpotifyPage,
  type SpotifyPlaylist,
} from "@/lib/spotify";
import {
  apiErrorResponse,
  paginationParams,
  privateHeaders,
  requireSpotifySession,
} from "@/lib/server-api";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { accessToken } = await requireSpotifySession();
    const { limit, offset } = paginationParams(request, 24);
    const page = await spotifyRequest<SpotifyPage<SpotifyPlaylist | null>>(
      accessToken,
      `/me/playlists?limit=${limit}&offset=${offset}`,
    );
    return NextResponse.json(
      {
        ...page,
        items: page.items
          .filter((playlist): playlist is SpotifyPlaylist => Boolean(playlist))
          .map(normalizePlaylist),
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
