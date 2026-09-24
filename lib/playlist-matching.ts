import type { SpotifyTrack } from "@/lib/spotify";

export interface SongSuggestion {
  artist: string;
  title: string;
}

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeTitle(value: string) {
  return normalize(
    value
      .replace(/\s*[-(]\s*(?:\d{4}\s+)?remaster(?:ed)?[^)]*\)?$/i, "")
      .replace(/\s*\((?:feat\.?|with)\s+[^)]+\)/gi, ""),
  );
}

export function matchSong(
  suggestion: SongSuggestion,
  candidates: SpotifyTrack[],
  cleanOnly = false,
) {
  const title = normalizeTitle(suggestion.title);
  const artist = normalize(suggestion.artist);
  return candidates.find((track) => {
    if (
      track.type !== "track" ||
      track.is_playable === false ||
      track.is_local ||
      (cleanOnly && track.explicit)
    )
      return false;
    if (!/^spotify:track:[a-zA-Z0-9]{22}$/.test(track.uri)) return false;
    if (normalizeTitle(track.name) !== title) return false;
    return track.artists.some((candidate) => {
      const name = normalize(candidate.name);
      return (
        name === artist ||
        (name.length >= 3 && ` ${artist} `.includes(` ${name} `))
      );
    });
  });
}

export function uniqueSuggestions(suggestions: SongSuggestion[]) {
  const seen = new Set<string>();
  return suggestions.filter((song) => {
    const key = `${normalize(song.artist)}:${normalizeTitle(song.title)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
