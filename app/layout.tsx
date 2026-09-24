import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthNotice } from "@/components/AuthNotice";
const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Instrument_Serif({
  variable: "--font-editorial",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: {
    default: "PlaylistHelper — Find your frequency",
    template: "%s · PlaylistHelper",
  },
  description:
    "Turn a feeling into a playlist. Discover your next soundtrack, create playlists with AI, and bring them straight to your Spotify library.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} ${mono.variable} ${serif.variable}`}>
        <Providers>
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <Suspense fallback={<div className="topbar" />}>
            <Navbar />
          </Suspense>
          <div className="workspace">
            <Suspense>
              <AuthNotice />
            </Suspense>
            <main id="main-content">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
