import { type NextAuthOptions } from "next-auth"
import SpotifyProvider from "next-auth/providers/spotify"
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
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      checks: ["pkce", "state"],
      authorization: {
        params: {
          scope: "user-read-email user-read-playback-state user-modify-playback-state user-top-read user-read-recently-played playlist-read-private playlist-modify-private playlist-modify-public",
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
    async jwt({ token, account }) {
      if (account) {
        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token ?? token.refresh_token;
        token.expires_at = account.expires_at; // seconds
        return token;
      }
      
      // Check if token is expired and refresh if needed
      if (token.expires_at && Date.now() < token.expires_at * 1000) {
        return token;
      }
      
      // Token is expired, try to refresh
      if (token.refresh_token) {
        try {
          const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: token.refresh_token,
              client_id: process.env.SPOTIFY_CLIENT_ID!,
              client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
            }),
          });
          
          if (response.ok) {
            const refreshedTokens = await response.json();
            token.access_token = refreshedTokens.access_token;
            token.expires_at = Math.floor(Date.now() / 1000) + refreshedTokens.expires_in;
            if (refreshedTokens.refresh_token) {
              token.refresh_token = refreshedTokens.refresh_token;
            }
          }
        } catch (error) {
          console.error("Token refresh failed:", error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      (session as any).access_token = token.access_token;
      (session as any).accessToken = token.access_token; // Add both for compatibility
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/", // Add error page redirect to home
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Enable debug mode for troubleshooting
}
