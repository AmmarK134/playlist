export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    console.log("=== SIMPLE PLAYLIST API CALLED ===")
    console.log("Environment:", process.env.NODE_ENV)
    console.log("Vercel:", !!process.env.VERCEL)
    
    const session = await getServerSession(authOptions)
    console.log("Session:", session)
    
    const accessToken = (session as any)?.accessToken || (session as any)?.access_token;
    console.log("Access token:", accessToken)
    
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { playlistName } = await request.json()
    console.log("Playlist name:", playlistName)

    // Test Spotify API call
    const userResponse = await fetch(`https://api.spotify.com/v1/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error("Spotify API error:", userResponse.status, errorText)
      return NextResponse.json({ 
        error: "Spotify API error", 
        details: `${userResponse.status}: ${errorText}` 
      }, { status: userResponse.status })
    }

    const user = await userResponse.json()
    console.log("User ID:", user.id)

    return NextResponse.json({
      success: true,
      message: "Simple playlist test successful",
      userId: user.id,
      playlistName: playlistName
    })

  } catch (error) {
    console.error("Simple playlist error:", error)
    return NextResponse.json(
      { 
        error: "Simple playlist failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
