import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createSpotifyClient } from "@/lib/spotify"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const spotify = createSpotifyClient(session.accessToken as string)
    const playlists = await spotify.getUserPlaylists()
    
    return NextResponse.json(playlists.body)
  } catch (error) {
    console.error("Error fetching playlists:", error)
    return NextResponse.json({ error: "Failed to fetch playlists" }, { status: 500 })
  }
}
