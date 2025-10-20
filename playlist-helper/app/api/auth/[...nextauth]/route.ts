import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import SpotifyProvider from "next-auth/providers/spotify"
import { prisma } from "@/lib/prisma"

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "user-read-email user-read-private playlist-read-private playlist-modify-public playlist-modify-private user-top-read",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.accessToken = token.accessToken as string
        session.refreshToken = token.refreshToken as string
        session.expiresAt = token.expiresAt as number
      }
      return session
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
})

export { handler as GET, handler as POST }
