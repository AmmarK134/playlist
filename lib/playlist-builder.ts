import { ApiError } from "@/lib/api-error";
import {
  matchSong,
  uniqueSuggestions,
  type SongSuggestion,
} from "@/lib/playlist-matching";
import {
  spotifyRequest,
  type SpotifyPlaylist,
  type SpotifyTrack,
} from "@/lib/spotify";

export class PartialPlaylistError extends ApiError {
  constructor(readonly playlist: SpotifyPlaylist) {
    super(
      "Your playlist was created, but Spotify couldn't confirm the songs were added. Open it in Spotify to check before creating another.",
      502,
    );
  }
}

export class UnconfirmedPlaylistError extends ApiError {
  constructor() {
    super(
      "Spotify didn't confirm whether your playlist was created. Check your Spotify library before saving again to avoid a duplicate.",
      502,
    );
  }
}

async function findTrack(
  accessToken: string,
  song: SongSuggestion,
  cleanOnly: boolean,
) {
  const quote = (text: string) => text.replace(/["\\]/g, " ");
  const queries = [
    `track:"${quote(song.title)}" artist:"${quote(song.artist)}"`,
    `${song.artist} ${song.title}`,
  ];
  for (const query of queries) {
    const result = await spotifyRequest<{ tracks: { items: SpotifyTrack[] } }>(
      accessToken,
      `/search?${new URLSearchParams({ q: query, type: "track", limit: "5" })}`,
    );
    const match = matchSong(song, result.tracks?.items ?? [], cleanOnly);
    if (match) return match;
  }
  return undefined;
}

export async function saveGeneratedPlaylist(
  accessToken: string,
  options: {
    playlistName: string;
    description?: string;
    numberOfSongs: number;
    songs: SongSuggestion[];
    cleanOnly: boolean;
  },
) {
  const { playlistName, description, numberOfSongs, cleanOnly } = options;
  const songs = uniqueSuggestions(options.songs);
  const tracks = new Map<string, SpotifyTrack>();
  // Leave room within the route's 180s budget for auth, generation and both writes.
  const searchDeadline = Date.now() + 55_000;
  // Resolve four searches at a time, preserving the curator's order.
  for (
    let index = 0;
    index < songs.length && tracks.size < numberOfSongs;
    index += 4
  ) {
    if (Date.now() >= searchDeadline) break;
    const batch = await Promise.all(
      songs
        .slice(index, index + 4)
        .map((song) => findTrack(accessToken, song, cleanOnly)),
    );
    for (const track of batch) {
      if (track && tracks.size < numberOfSongs) tracks.set(track.uri, track);
    }
  }
  if (tracks.size === 0) {
    throw new ApiError(
      "No matching songs were available on Spotify. Try a more specific artist or mood. No playlist was created.",
      422,
    );
  }

  // Resolve songs before creating, so failed searches don't leave empty playlists.
  let playlist: SpotifyPlaylist;
  try {
    playlist = await spotifyRequest<SpotifyPlaylist>(
      accessToken,
      "/me/playlists",
      {
        method: "POST",
        body: JSON.stringify({
          name: playlistName,
          description: description || "Curated with PlaylistHelper.",
          public: false,
        }),
      },
    );
  } catch (error) {
    // A transport failure or upstream 5xx can occur after Spotify commits the write.
    if (!(error instanceof ApiError) || error.status >= 500)
      throw new UnconfirmedPlaylistError();
    throw error;
  }
  try {
    // Never retry a mutation automatically: the first attempt may already have succeeded.
    await spotifyRequest(accessToken, `/playlists/${playlist.id}/items`, {
      method: "POST",
      body: JSON.stringify({ uris: [...tracks.keys()] }),
    });
  } catch {
    throw new PartialPlaylistError(playlist);
  }
  return { playlist, tracksAdded: tracks.size };
}
