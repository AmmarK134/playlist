import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="PlaylistHelper home">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>
        playlist<span className="brand-light">helper</span>
        <span className="brand-dot" aria-hidden="true">
          ✳
        </span>
      </span>
    </Link>
  );
}

export function SpotifyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1 .3c-2.8-1.7-6.3-2.1-10.5-1.1a.75.75 0 0 1-.4-1.5c4.6-1 8.5-.6 11.6 1.3.4.2.5.7.3 1Zm1.5-3a.94.94 0 0 1-1.3.3c-3.1-1.9-7.9-2.5-11.5-1.4a.94.94 0 1 1-.6-1.8c4.2-1.3 9.5-.6 13.1 1.6.5.3.6.9.3 1.3Zm.1-3.2C15.4 8.9 9.3 8.7 5.8 9.8a1.13 1.13 0 0 1-.7-2.1c4.1-1.3 10.9-1.1 15.2 1.5a1.13 1.13 0 1 1-1.2 1.9Z" />
    </svg>
  );
}
