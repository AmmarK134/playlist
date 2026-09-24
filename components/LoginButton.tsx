"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SpotifyIcon } from "@/components/Brand";

export function LoginButton({
  label = "Connect Spotify",
  className = "",
  callbackUrl = "/dashboard",
}: {
  label?: string;
  className?: string;
  callbackUrl?: string;
}) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const connect = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/status");
      if (!response.ok)
        throw new Error(
          "We couldn’t check the connection. Please try again in a moment.",
        );
      const data = await response.json();
      if (!data.spotifyConfigured) {
        setMessage(
          "Spotify connection is not available in this installation yet. You can explore the demo studio while the connection is being set up.",
        );
        return;
      }
      await signIn("spotify", { callbackUrl });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  if (session && !session.error)
    return (
      <Link href={callbackUrl} className={`button button-primary ${className}`}>
        Open your studio <ArrowUpRight size={16} />
      </Link>
    );
  return (
    <>
      <button
        type="button"
        className={`button button-primary ${className}`}
        onClick={connect}
        disabled={loading}
      >
        {loading ? (
          <Loader2 size={17} className="animate-spin" />
        ) : (
          <SpotifyIcon />
        )}
        {loading ? "Connecting…" : label}
      </button>
      <Dialog open={!!message} onOpenChange={(open) => !open && setMessage("")}>
        <DialogContent className="studio-dialog">
          <DialogHeader>
            <div className="dialog-icon">
              <SpotifyIcon size={28} />
            </div>
            <DialogTitle>Your studio is almost ready.</DialogTitle>
            <DialogDescription>{message}</DialogDescription>
          </DialogHeader>
          <Link
            href="/dashboard?demo=1"
            onClick={() => setMessage("")}
            className="button button-primary"
          >
            Explore the demo <ArrowUpRight size={16} />
          </Link>
        </DialogContent>
      </Dialog>
    </>
  );
}
