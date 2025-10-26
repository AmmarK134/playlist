export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      env: {
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        hasSpotifyClientId: !!process.env.SPOTIFY_CLIENT_ID,
        hasSpotifyClientSecret: !!process.env.SPOTIFY_CLIENT_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        nodeEnv: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL,
        vercelUrl: process.env.VERCEL_URL,
        nextAuthUrl: process.env.NEXTAUTH_URL
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: "Environment check failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
