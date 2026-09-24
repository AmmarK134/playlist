import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api-error";
import {
  spotifyRequest,
  type SpotifyPage,
  type SpotifyTrack,
} from "@/lib/spotify";
import {
  apiErrorResponse,
  paginationParams,
  privateHeaders,
  requireSpotifySession,
} from "@/lib/server-api";

export const runtime = "nodejs";

interface PlaylistItem {
  added_at: string | null;
  item?: SpotifyTrack | null;
  track?: SpotifyTrack | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { accessToken } = await requireSpotifySession();
    const { id } = await params;
    if (!/^[a-zA-Z0-9]{22}$/.test(id))
      throw new ApiError("Invalid Spotify playlist ID.", 400);
    const { limit, offset } = paginationParams(request, 50);
    const page = await spotifyRequest<SpotifyPage<PlaylistItem>>(
      accessToken,
      `/playlists/${id}/items?limit=${limit}&offset=${offset}`,
    );
    return NextResponse.json(
      {
        ...page,
        items: page.items.map((entry) => ({
          ...entry,
          track: entry.item ?? entry.track ?? null,
        })),
      },
      { headers: privateHeaders },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
