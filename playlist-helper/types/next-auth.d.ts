import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    error?: string
  }

  interface JWT {
    access_token?: string
    refresh_token?: string
    expires_at?: number
    error?: "RefreshAccessTokenError"
  }
}
