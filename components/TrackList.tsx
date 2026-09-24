"use client";

import Image from "next/image";
import { ArrowLeft, ArrowUpRight, Clock3, Disc3, Music2 } from "lucide-react";
import type { SpotifyTrackItem } from "@/lib/hooks/useSpotifyData";

interface TrackListProps {
  tracks: SpotifyTrackItem[];
  playlistName: string;
  onBack: () => void;
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function TrackList({ tracks, playlistName, onBack }: TrackListProps) {
  return (
    <section aria-label={`${playlistName} tracks`}>
      <button
        type="button"
        onClick={onBack}
        className="mb-7 inline-flex cursor-pointer items-center gap-2 text-sm text-[#b6b8b0] transition-colors hover:text-[#e9b56d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e9b56d]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to your
        library
      </button>
      <div className="mb-7 flex items-center gap-4">
        <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-[#393b32] bg-[#252721] text-[#c4c9a7] sm:flex">
          <Disc3 className="h-8 w-8 stroke-1" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[#a4a79b]">
            Your collection
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[#f3f0e8] sm:text-3xl">
            {playlistName}
          </h2>
          <p className="mt-2 text-xs text-[#999b94]">
            {tracks.length} tracks loaded. Open a track in Spotify to listen.
          </p>
        </div>
      </div>
      {tracks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#383932] px-6 py-16 text-center">
          <Music2
            className="mx-auto mb-4 h-7 w-7 text-[#a4a79b]"
            aria-hidden="true"
          />
          <h3 className="text-base font-medium text-[#f3f0e8]">
            A little room for new discoveries.
          </h3>
          <p className="mt-2 text-sm text-[#999b94]">
            This playlist doesn’t have any tracks yet.
          </p>
        </div>
      ) : (
        <table className="w-full table-fixed border-collapse text-left">
          <caption className="sr-only">
            Tracks in {playlistName}. Spotify links open in a new tab.
          </caption>
          <thead>
            <tr className="border-b border-[#30302c] text-[10px] font-medium uppercase tracking-[0.15em] text-[#a4a79b]">
              <th className="w-8 pb-3 pl-1 font-medium sm:w-10" scope="col">
                #
              </th>
              <th className="pb-3 font-medium" scope="col">
                Track
              </th>
              <th
                className="hidden w-[25%] pb-3 font-medium md:table-cell"
                scope="col"
              >
                Album
              </th>
              <th
                className="w-12 pb-3 text-right font-medium sm:w-16"
                scope="col"
              >
                <Clock3 className="ml-auto h-3.5 w-3.5" aria-label="Duration" />
              </th>
              <th className="w-10 pb-3 font-medium sm:w-14" scope="col">
                <span className="sr-only">Listen</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tracks.map(({ track }, index) => {
              const spotifyUrl = track?.external_urls?.spotify;
              const canListen = spotifyUrl?.startsWith(
                "https://open.spotify.com/",
              );
              return (
                <tr
                  key={`${track?.id ?? "unavailable"}-${index}`}
                  className="group border-b border-[#30302c]/50 transition-colors hover:bg-[#22231f]"
                >
                  <td className="py-3 pl-1 text-xs tabular-nums text-[#8e9187]">
                    {String(index + 1).padStart(2, "0")}
                  </td>
                  <td className="py-3 pr-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-[#2c2e27] text-[#a4a79b]">
                        {track?.album?.images?.[0]?.url ? (
                          <Image
                            src={track.album.images[0].url}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <Music2 className="h-4 w-4" aria-hidden="true" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#eeeae0]">
                          {track?.name || "Unavailable track"}
                        </p>
                        <p className="mt-1 truncate text-xs text-[#a4a79b]">
                          {track?.explicit && (
                            <span
                              className="mr-1.5 inline-block rounded-sm bg-[#74776c] px-1 align-middle text-[8px] leading-3 text-[#191b16]"
                              aria-label="Explicit"
                            >
                              E
                            </span>
                          )}
                          {track?.artists
                            ?.map((artist) => artist.name)
                            .join(", ") || "No longer available on Spotify"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden truncate py-3 pr-4 text-xs text-[#a4a79b] md:table-cell">
                    {track?.album?.name || "—"}
                  </td>
                  <td className="py-3 text-right text-xs tabular-nums text-[#a4a79b]">
                    {track ? formatDuration(track.duration_ms) : "—"}
                  </td>
                  <td className="py-3 pl-1 text-right">
                    {canListen && (
                      <a
                        href={spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Listen to ${track?.name} in Spotify (new tab)`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#a4a79b] transition-colors hover:bg-[#33352b] hover:text-[#e9b56d] focus-visible:outline-2 focus-visible:outline-[#e9b56d]"
                      >
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
