import { type NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import SpotifyProvider from "next-auth/providers/spotify"
import { prisma } from "@/lib/prisma"
import type { JWT } from "next-auth/jwt"
import type { Session } from "next-auth"

export interface ExtendedToken extends JWT {
  access_token?: string
  refresh_token?: string
  expires_at?: number
  error?: "RefreshAccessTokenError"
}

// Function to refresh the access token
async function refreshAccessToken(token: ExtendedToken): Promise<ExtendedToken> {
  try {
    const url = "https://accounts.spotify.com/api/token"
    
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body: new URLSearchParams({
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refresh_token || "",
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      ...token,
      access_token: refreshedTokens.access_token,
      expires_at: Date.now() + refreshedTokens.expires_in * 1000,
      refresh_token: refreshedTokens.refresh_token ?? token.refresh_token, // Fall back to old refresh token
    }
  } catch (error) {
    console.log("Error refreshing access token", error)

    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "user-read-email user-read-private playlist-read-private playlist-modify-public playlist-modify-private user-top-read streaming user-read-playback-state user-modify-playback-state user-read-currently-playing user-read-recently-played",
        },
      },
      profile(profile) {
        return {
          id: profile.id,
          name: profile.display_name,
          email: profile.email,
          image: profile.images?.[0]?.url,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      const t = token as ExtendedToken
      
      // Initial sign in
      if (account && user) {
        t.access_token = account.access_token
        t.refresh_token = account.refresh_token ?? t.refresh_token
        t.expires_at = account.expires_at
        return t
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (t.expires_at as number)) {
        return t
      }

      // Access token has expired, try to update it
      return await refreshAccessToken(t)
    },
    async session({ session, token }) {
      const s = session as Session & { accessToken?: string; refreshToken?: string; expiresAt?: number; error?: string }
      const t = token as ExtendedToken
      
      if (t) {
        s.accessToken = t.access_token as string
        s.refreshToken = t.refresh_token as string
        s.expiresAt = t.expires_at as number
        s.error = t.error
      }
      return s
    },
  },
  pages: {
    signIn: "/",
    error: "/", // Add error page redirect to home
  },
  session: {
    strategy: "jwt" as const,
  },
  debug: true, // Enable debug mode for troubleshooting
}
