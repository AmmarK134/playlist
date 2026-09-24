"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Disc3, ListMusic } from "lucide-react";
import type { SpotifyPlaylist } from "@/lib/hooks/useSpotifyData";

interface PlaylistCardProps {
  playlist: SpotifyPlaylist;
  onSelectPlaylist: (playlistId: string) => void;
}

export function PlaylistCard({
  playlist,
  onSelectPlaylist,
}: PlaylistCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = playlist.images?.[0]?.url;
  const spotifyUrl = playlist.external_urls?.spotify;
  const canOpenSpotify = spotifyUrl?.startsWith("https://open.spotify.com/");
  const description = playlist.description
    ?.replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "’")
    .replace(/&quot;/g, '"');

  return (
    <article className="group min-w-0">
      <button
        type="button"
        onClick={() => onSelectPlaylist(playlist.id)}
        className="block w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e9b56d]"
        aria-label={`View ${playlist.name}`}
      >
        <div className="relative mb-4 aspect-square overflow-hidden rounded-lg border border-white/5 bg-[#262723]">
          {imageUrl && !imageFailed ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1100px) 30vw, 260px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-[#b8a994]">
              <Disc3
                className="h-[44%] w-[44%] stroke-[0.6]"
                aria-hidden="true"
              />
              <span className="mt-3 text-[9px] uppercase tracking-[0.3em]">
                A personal collection
              </span>
            </div>
          )}
          <span className="absolute right-3 bottom-3 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-[#e9b56d] text-[#181815] opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transition-none">
            <ListMusic className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-[#f3f0e8] transition-colors group-hover:text-[#e9b56d]">
          {playlist.name}
        </h3>
        {description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#999b94]">
            {description}
          </p>
        )}
      </button>
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[#999b94]">
        <p className="min-w-0 truncate">
          {playlist.tracks?.total ?? 0} tracks{" "}
          <span className="mx-1.5 text-[#55574f]">·</span>{" "}
          {playlist.owner?.display_name || "Spotify"}
        </p>
        {canOpenSpotify && (
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${playlist.name} in Spotify (new tab)`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[#262723] hover:text-[#f3f0e8] focus-visible:outline-2 focus-visible:outline-[#e9b56d]"
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}
