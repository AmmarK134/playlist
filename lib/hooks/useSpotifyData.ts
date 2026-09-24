"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export interface SpotifyImage {
  url: string;
  height?: number | null;
  width?: number | null;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[] | null;
  tracks: { total: number };
  external_urls: { spotify?: string };
  owner: { display_name: string | null; id?: string };
  public?: boolean | null;
}

export interface SpotifyTrack {
  id: string | null;
  name: string;
  artists: Array<{ name: string }>;
  album: { name: string; images: SpotifyImage[] };
  duration_ms: number;
  external_urls: { spotify?: string };
  uri?: string;
  explicit?: boolean;
  is_local?: boolean;
  preview_url?: string | null;
}

export interface SpotifyTrackItem {
  track: SpotifyTrack | null;
  added_at?: string | null;
}

export interface SpotifyPage<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
  previous?: string | null;
}

export interface SpotifyUser {
  id: string;
  display_name: string | null;
  images?: SpotifyImage[];
  external_urls?: { spotify?: string };
  followers?: { total: number };
}

class SpotifyRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SpotifyRequestError";
  }
}

async function fetchSpotify<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new SpotifyRequestError(
      data?.details ||
        data?.error ||
        "Spotify could not complete this request. Please try again.",
      response.status,
    );
  }
  if (!data)
    throw new Error("Spotify returned an empty response. Please try again.");
  return data as T;
}

function retrySpotify(failureCount: number, error: Error) {
  if (
    error instanceof SpotifyRequestError &&
    [401, 403, 429].includes(error.status)
  )
    return false;
  return failureCount < 1;
}

function nextOffset<T>(page: SpotifyPage<T>) {
  const offset = page.offset + page.limit;
  return page.next && page.items.length > 0 && offset > page.offset
    ? offset
    : undefined;
}

function useSpotifySession() {
  const { data: session, status } = useSession();
  return {
    enabled: status === "authenticated" && !session?.error,
    account: session?.user?.id || "guest",
  };
}

export function useUserPlaylists() {
  const { enabled, account } = useSpotifySession();
  return useInfiniteQuery({
    queryKey: ["spotify", "playlists", account],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      fetchSpotify<SpotifyPage<SpotifyPlaylist>>(
        `/api/spotify/playlists?limit=24&offset=${pageParam}`,
        signal,
      ),
    getNextPageParam: nextOffset,
    enabled,
    retry: retrySpotify,
  });
}

export function useUserData() {
  const { enabled, account } = useSpotifySession();
  return useQuery({
    queryKey: ["spotify", "user", account],
    queryFn: ({ signal }) =>
      fetchSpotify<SpotifyUser>("/api/spotify/me", signal),
    enabled,
    retry: retrySpotify,
  });
}

export function usePlaylistTracks(playlistId: string | null) {
  const { enabled, account } = useSpotifySession();
  return useInfiniteQuery({
    queryKey: ["spotify", "playlist", playlistId, account],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      fetchSpotify<SpotifyPage<SpotifyTrackItem>>(
        `/api/spotify/playlists/${encodeURIComponent(playlistId!)}/tracks?limit=50&offset=${pageParam}`,
        signal,
      ),
    getNextPageParam: nextOffset,
    enabled: enabled && Boolean(playlistId),
    retry: retrySpotify,
  });
}
