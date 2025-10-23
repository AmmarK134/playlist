import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { createSpotifyClient } from "@/lib/spotify"
import { authOptions } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await params
    const spotify = createSpotifyClient(session.accessToken as string)
    const tracks = await spotify.getPlaylistTracks(id)
    
    return NextResponse.json(tracks.body)
  } catch (error) {
    console.error("Error fetching playlist tracks:", error)
    return NextResponse.json({ error: "Failed to fetch playlist tracks" }, { status: 500 })
  }
}
