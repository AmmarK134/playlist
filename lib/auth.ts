import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import SpotifyProvider from "next-auth/providers/spotify";

export function isSpotifyConfigured() {
  return Boolean(
    process.env.SPOTIFY_CLIENT_ID &&
    process.env.SPOTIFY_CLIENT_SECRET &&
    process.env.NEXTAUTH_SECRET &&
    process.env.NEXTAUTH_URL,
  );
}

// Concurrent page/API requests can otherwise exchange the same refresh token twice.
const pendingRefreshes = new Map<string, Promise<JWT>>();

async function exchangeRefreshToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refresh_token!,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    const refreshed: {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    } = await response.json();

    if (
      !response.ok ||
      !refreshed.access_token ||
      typeof refreshed.expires_in !== "number" ||
      refreshed.expires_in <= 0
    ) {
      throw new Error("Token refresh failed");
    }

    return {
      ...token,
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? token.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      error: undefined,
    };
  } catch {
    // Never return an expired token or log credentials/provider response bodies.
    return {
      ...token,
      access_token: undefined,
      refresh_token: undefined,
      error: "RefreshAccessTokenError",
    };
  }
}

export async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!token.refresh_token) {
    return {
      ...token,
      access_token: undefined,
      error: "RefreshAccessTokenError",
    };
  }
  const existing = pendingRefreshes.get(token.refresh_token);
  if (existing) return existing;
  const pending = exchangeRefreshToken(token);
  pendingRefreshes.set(token.refresh_token, pending);
  try {
    return await pending;
  } finally {
    pendingRefreshes.delete(token.refresh_token);
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID ?? "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
      checks: ["pkce", "state"],
      authorization: {
        params: {
          scope:
            "playlist-read-private playlist-read-collaborative playlist-modify-private",
        },
      },
      profile(profile) {
        return {
          id: profile.id,
          name: profile.display_name || profile.id,
          email: profile.email ?? null,
          image: profile.images?.[0]?.url ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn() {
      return isSpotifyConfigured();
    },
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at:
            account.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
          error: undefined,
        };
      }
      if (
        token.access_token &&
        token.expires_at &&
        Date.now() < (token.expires_at - 60) * 1000
      )
        return token;
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.sub ?? "";
      session.accessToken = token.error ? undefined : token.access_token;
      session.expiresAt = token.expires_at;
      session.error = token.error;
      return session;
    },
  },
  pages: { signIn: "/", error: "/" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
};
