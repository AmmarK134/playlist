import { ApiError } from "@/lib/api-error";

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  type: string;
  artists: { id: string; name: string }[];
  album: { name: string; images: { url: string }[] };
  duration_ms: number;
  explicit: boolean;
  is_playable?: boolean;
  is_local?: boolean;
  external_urls: { spotify: string };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: { url: string }[];
  external_urls: { spotify: string };
  owner: { id: string; display_name: string | null };
  tracks?: { total: number; href?: string };
  items?: { total: number; href?: string };
}

export interface SpotifyPage<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
}

export async function spotifyRequest<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    const messages: Record<number, string> = {
      401: "Your Spotify session has expired. Please connect Spotify again.",
      403: "Spotify denied access. Check this account is allowed in your Spotify app and reconnect to update permissions.",
      404: "This playlist is no longer available on Spotify.",
      429: "Spotify is receiving too many requests. Please wait and try again.",
    };
    const retryAfter = Number(response.headers.get("retry-after"));
    throw new ApiError(
      messages[response.status] ??
        "Spotify is unavailable. Please try again shortly.",
      [401, 403, 404, 429].includes(response.status) ? response.status : 502,
      response.status === 429 && Number.isFinite(retryAfter)
        ? Math.max(1, retryAfter)
        : undefined,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function normalizePlaylist(playlist: SpotifyPlaylist) {
  return {
    ...playlist,
    tracks: playlist.items ?? playlist.tracks ?? { total: 0 },
  };
}
