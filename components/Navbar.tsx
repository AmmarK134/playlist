"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  ArrowUpRight,
  Compass,
  Library,
  Plus,
  LogOut,
  Disc3,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { LoginButton } from "@/components/LoginButton";

export function Navbar() {
  const path = usePathname();
  const params = useSearchParams();
  const { data: session } = useSession();
  const demo = !session && params.get("demo") === "1";
  const creating = path === "/dashboard" && params.get("view") === "create";
  const libraryHref = `/dashboard${demo ? "?demo=1" : ""}`;
  const createHref = `/dashboard?view=create${demo ? "&demo=1" : ""}`;
  return (
    <>
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-section-label">YOUR MUSIC, REIMAGINED</div>
        <nav aria-label="Main navigation" className="main-nav">
          <Link
            href="/"
            aria-current={path === "/" ? "page" : undefined}
            className={path === "/" ? "nav-link active" : "nav-link"}
          >
            <Compass size={19} />
            Discover
            <span className="nav-active-dot" />
          </Link>
          <Link
            href={libraryHref}
            aria-current={
              path === "/dashboard" && !creating ? "page" : undefined
            }
            className={
              path === "/dashboard" && !creating
                ? "nav-link active"
                : "nav-link"
            }
          >
            <Library size={19} />
            Your library
          </Link>
          <Link
            href={createHref}
            aria-current={creating ? "page" : undefined}
            className={creating ? "nav-link active" : "nav-link"}
          >
            <Plus size={19} />
            Create a playlist
          </Link>
        </nav>
        <div className="sidebar-note">
          <span className="small-record">
            <Disc3 size={26} />
          </span>
          <p>
            A little less searching.
            <br />A lot more listening.
          </p>
          <span className="small-label">MADE FOR YOUR MOMENTS</span>
        </div>
        <div className="sidebar-bottom">
          <div className="connection-status">
            <span
              className={
                session && !session.error
                  ? "status-dot connected"
                  : "status-dot"
              }
            />
            {session && !session.error
              ? "Spotify connected"
              : "Your next favorite awaits"}
          </div>
          <a
            className="sidebar-source"
            href="https://github.com/AmmarK134/playlist"
            target="_blank"
            rel="noopener noreferrer"
          >
            Independent by design <ArrowUpRight size={13} />
          </a>
        </div>
      </aside>
      <header className="topbar">
        <Link href="/" className="mobile-brand">
          <BrandMark />
          playlisthelper
        </Link>
        <span className="topbar-caption">A space for your sound.</span>
        <div className="topbar-actions">
          <Link href="/#how-it-works" className="text-link how-link">
            How it works <ArrowUpRight size={13} />
          </Link>
          {session ? (
            <>
              <Link href="/dashboard" className="profile-chip">
                <span className="avatar">
                  {(session.user?.name || "You").slice(0, 1).toUpperCase()}
                </span>
                <span>
                  {session.user?.name?.split(" ")[0] || "Your studio"}
                </span>
              </Link>
              <button
                className="icon-button"
                onClick={() => signOut({ callbackUrl: "/" })}
                aria-label="Sign out"
              >
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <LoginButton />
          )}
        </div>
      </header>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <Link href="/" aria-current={path === "/" ? "page" : undefined}>
          <Compass size={18} />
          Discover
        </Link>
        <Link
          href={libraryHref}
          aria-current={path === "/dashboard" && !creating ? "page" : undefined}
        >
          <Library size={18} />
          Library
        </Link>
        <Link href={createHref} aria-current={creating ? "page" : undefined}>
          <Plus size={18} />
          Create
        </Link>
      </nav>
    </>
  );
}
function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
