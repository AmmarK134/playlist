import { ArrowUpRight } from "lucide-react";
import { SpotifyIcon } from "@/components/Brand";
export function Footer() {
  return (
    <footer className="studio-footer">
      <span>GOOD MUSIC DESERVES GOOD COMPANY.</span>
      <a
        href="https://open.spotify.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        <SpotifyIcon size={15} />
        Made for listening on Spotify <ArrowUpRight size={13} />
      </a>
    </footer>
  );
}
