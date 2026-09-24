"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Library,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { AIChat } from "@/components/AIChat";
import { PlaylistCard } from "@/components/PlaylistCard";
import { TrackList } from "@/components/TrackList";
import { LoginButton } from "@/components/LoginButton";
import {
  useUserPlaylists,
  usePlaylistTracks,
} from "@/lib/hooks/useSpotifyData";
import { moods } from "@/lib/studio";

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
}
function Loading() {
  return (
    <div className="loading-state" role="status">
      <Loader2 className="animate-spin" size={24} />
      <p>Getting your studio ready…</p>
    </div>
  );
}
function Dashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const demo = params.get("demo") === "1" && !session;
  const creating = params.get("view") === "create";
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(
    null,
  );
  const playlists = useUserPlaylists();
  const tracks = usePlaylistTracks(selected?.id || null);
  if (status === "loading") return <Loading />;
  if (!session && !demo)
    return (
      <div className="connect-page page-enter">
        <div className="connect-art">
          <div className="connect-disc">
            <Library size={40} strokeWidth={1} />
          </div>
          <span className="connect-orbit" />
        </div>
        <div className="eyebrow">ALL YOUR SOUNDS. ONE PLACE.</div>
        <h1>
          Your music.
          <br />
          <i>A little more you.</i>
        </h1>
        <p>
          Connect Spotify to explore your library and turn your next idea into a
          playlist worth keeping.
        </p>
        <LoginButton
          callbackUrl={
            creating
              ? `/dashboard?view=create&prompt=${encodeURIComponent((params.get("prompt") || "").slice(0, 2000))}`
              : "/dashboard"
          }
        />
        <Link
          href={
            creating
              ? `/dashboard?demo=1&view=create&prompt=${encodeURIComponent((params.get("prompt") || "").slice(0, 2000))}`
              : "/dashboard?demo=1"
          }
          className="text-link"
        >
          Take a look around first <ArrowRight size={16} />
        </Link>
        <span className="connection-footnote">
          You choose what to create. New playlists are saved privately.
        </span>
      </div>
    );
  const items =
    playlists.data?.pages.flatMap((page) => page.items).filter(Boolean) || [];
  const visible = items
    .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : 0));
  const total = playlists.data?.pages[0]?.total || 0;
  const openCreate = (prompt?: string) =>
    router.push(
      `/dashboard?view=create${demo ? "&demo=1" : ""}${prompt ? `&prompt=${encodeURIComponent(prompt)}` : ""}`,
    );
  return (
    <div className="dashboard-page page-enter">
      {demo && (
        <div className="demo-banner">
          <span>
            <span className="status-dot" />
            You’re in the demo studio. Sample playlists, real possibilities.
          </span>
          <LoginButton label="Make it yours" />
        </div>
      )}
      {session?.error && (
        <div role="alert" className="error-banner">
          Your Spotify session has expired. Reconnect to keep creating.
          <LoginButton label="Reconnect Spotify" />
        </div>
      )}
      <div className="dashboard-heading">
        <div>
          <div className="eyebrow">
            {creating ? "THE CREATIVE CORNER" : "YOUR PERSONAL COLLECTION"}
          </div>
          <h1>
            {creating ? (
              <>
                Make a little <i>magic.</i>
              </>
            ) : (
              <>
                Your library<span className="heading-period">.</span>
              </>
            )}
          </h1>
          <p>
            {creating
              ? "Start with a feeling. We’ll help you find the sound."
              : demo
                ? "A glimpse of what your collection could look like."
                : `Good to see you${session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}. Pick up where you left off.`}
          </p>
        </div>
        {creating ? (
          <Link
            href={`/dashboard${demo ? "?demo=1" : ""}`}
            className="button button-secondary"
          >
            <ArrowLeft size={16} />
            Back to library
          </Link>
        ) : (
          <button
            className="button button-primary"
            onClick={() => openCreate()}
          >
            <Plus size={17} />
            Create a playlist
          </button>
        )}
      </div>
      {creating ? (
        <AIChat
          key={params.get("prompt") || "empty"}
          initialPrompt={params.get("prompt") || ""}
          demo={demo}
          onCreated={() => playlists.refetch()}
        />
      ) : selected ? (
        <>
          {!tracks.isLoading && !tracks.error && (
            <TrackList
              tracks={tracks.data?.pages.flatMap((page) => page.items) || []}
              playlistName={selected.name}
              onBack={() => setSelected(null)}
            />
          )}
          {(tracks.isLoading || tracks.error) && (
            <button
              className="button button-secondary"
              onClick={() => setSelected(null)}
            >
              <ArrowLeft size={16} />
              Back to library
            </button>
          )}
          {tracks.isLoading && <Loading />}
          {tracks.error && (
            <ErrorState
              message={tracks.error.message}
              onRetry={() => tracks.refetch()}
            />
          )}{" "}
          {tracks.hasNextPage && (
            <button
              className="button button-secondary load-more"
              disabled={tracks.isFetchingNextPage}
              onClick={() => tracks.fetchNextPage()}
            >
              {tracks.isFetchingNextPage ? "Loading…" : "Load more tracks"}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="library-toolbar">
            <div className="library-count">
              <span className="status-dot connected" />
              {demo
                ? "4 starter collections"
                : `${total} playlists in your library`}
            </div>
            <div className="library-tools">
              <label className="search-field">
                <Search size={16} />
                <span className="sr-only">Search your playlists</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search playlists…"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
              <label className="sort-field">
                <SlidersHorizontal size={16} />
                <span className="sr-only">Sort playlists</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="recent">Spotify order</option>
                  <option value="name">A–Z</option>
                </select>
              </label>
            </div>
          </div>
          {!demo && playlists.hasNextPage && (
            <p className="library-search-note">
              Showing {items.length} of {total} playlists. Search covers the
              playlists loaded below.
            </p>
          )}
          {demo ? (
            <div className="demo-library mood-grid">
              {moods
                .filter((m) =>
                  m.title.toLowerCase().includes(search.toLowerCase()),
                )
                .slice()
                .sort((a, b) =>
                  sort === "name" ? a.title.localeCompare(b.title) : 0,
                )
                .map((mood) => (
                  <button
                    className="mood-card"
                    key={mood.id}
                    onClick={() => openCreate(mood.prompt)}
                  >
                    <div className="mood-artwork">
                      <Image
                        src={mood.cover}
                        alt=""
                        fill
                        sizes="(max-width: 600px) 45vw, 25vw"
                      />
                      <span className="cover-number">SAMPLE COLLECTION</span>
                      <span className="cover-title">{mood.title}</span>
                      <span className="cover-action">
                        <ArrowUpRight size={21} />
                      </span>
                    </div>
                    <div className="mood-card-meta">
                      <h3>{mood.title}</h3>
                      <span className="sample-label">DEMO</span>
                    </div>
                    <p>{mood.count} tracks · PlaylistHelper</p>
                  </button>
                ))}
            </div>
          ) : playlists.isLoading ? (
            <div className="playlist-grid" aria-label="Loading playlists">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="playlist-skeleton animate-pulse" />
              ))}
            </div>
          ) : playlists.error ? (
            <ErrorState
              message={playlists.error.message}
              onRetry={() => playlists.refetch()}
            />
          ) : visible.length ? (
            <div className="playlist-grid">
              {visible.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onSelectPlaylist={(id) =>
                    setSelected({ id, name: playlist.name })
                  }
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Library size={32} strokeWidth={1} />
              <h2>
                {search
                  ? "No matching playlists."
                  : "Your next favorite starts here."}
              </h2>
              <p>
                {search
                  ? "Try another name, or clear your search."
                  : "Your Spotify playlists will live here. Let’s make your first one."}
              </p>
              <button
                className="button button-secondary"
                onClick={() => (search ? setSearch("") : openCreate())}
              >
                {search ? "Clear search" : "Create a playlist"}
                <ArrowRight size={16} />
              </button>
            </div>
          )}
          {demo &&
            !moods.some((m) =>
              m.title.toLowerCase().includes(search.toLowerCase()),
            ) && (
              <div className="empty-state">
                <h2>No matching collections.</h2>
                <button
                  className="button button-secondary"
                  onClick={() => setSearch("")}
                >
                  Clear search
                </button>
              </div>
            )}
          {!demo && playlists.hasNextPage && (
            <button
              className="button button-secondary load-more"
              disabled={playlists.isFetchingNextPage}
              onClick={() => playlists.fetchNextPage()}
            >
              {playlists.isFetchingNextPage
                ? "Loading…"
                : "Load more playlists"}
            </button>
          )}
          <div className="library-bottom-note">
            <span>THERE’S ALWAYS ANOTHER SOUND TO FIND.</span>
            <Link href="/" className="text-link">
              Find some inspiration <ArrowRight size={15} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="empty-state error-state">
      <h2>A small interruption.</h2>
      <p>{message}</p>
      <button onClick={onRetry} className="button button-secondary">
        Try again
      </button>
    </div>
  );
}
