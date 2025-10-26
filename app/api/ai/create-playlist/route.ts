export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import OpenAI from "openai"
import { createSpotifyClient } from "@/lib/spotify"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    const accessToken = (session as any)?.accessToken || (session as any)?.access_token;
    
    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { playlistName, description, numberOfSongs, userRequest } = await request.json()

    console.log(`=== PLAYLIST CREATION API DEBUG ===`)
    console.log(`Received data:`, { playlistName, description, numberOfSongs, userRequest })
    console.log(`Number of songs requested: ${numberOfSongs}`)
    console.log(`=====================================`)

    if (!playlistName) {
      return NextResponse.json({ error: "Playlist name is required" }, { status: 400 })
    }

    const maxSongs = numberOfSongs || 20 // Default to 20 songs if not specified
    console.log(`Using maxSongs: ${maxSongs}`)

    // Get user's top artists/tracks for context
    const spotifyClient = createSpotifyClient(accessToken)
    const topArtists = await spotifyClient.getMyTopArtists({ limit: 5 })
    const topTracks = await spotifyClient.getMyTopTracks({ limit: 5 })

    const userContext = `
User's Top Artists: ${topArtists.body.items.map((artist: any) => artist.name).join(', ')}
User's Top Tracks: ${topTracks.body.items.map((track: any) => track.name).join(', ')}
`

    // Generate song suggestions using OpenAI
    const songGenerationPrompt = `Based on this playlist request: "${userRequest || playlistName}", generate exactly ${maxSongs} song suggestions in the format "Artist - Song Title". 
    
User's music taste context:
${userContext}

CRITICAL REQUIREMENTS:
- Generate EXACTLY ${maxSongs} songs (not more, not less)
- Format: "Artist - Song Title" (one per line)
- No additional text, explanations, or numbering
- Focus on the playlist theme: ${playlistName}
- Consider user's music taste when selecting songs
- Each line should contain exactly one song in the format "Artist - Song Title"

Return only the song suggestions, one per line, in the format "Artist - Song Title". Do not include any other text.`

    const songCompletion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a music expert. Generate song suggestions based on user requests and their music taste."
        },
        {
          role: "user",
          content: songGenerationPrompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.8,
    })

    const songSuggestions = songCompletion.choices[0]?.message?.content || ""
    const songs = songSuggestions.split('\n').filter(song => song.trim()).slice(0, maxSongs)
    
    console.log(`Generated ${songs.length} song suggestions:`, songs)

    // Get user's profile first
    const userResponse = await fetch(`https://api.spotify.com/v1/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error("Failed to get user profile")
    }

    const user = await userResponse.json()

    // Create the playlist using the correct API endpoint
    const createPlaylistResponse = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: playlistName,
        description: description || `AI-generated playlist: ${playlistName}`,
        public: false
      }),
    })

    if (!createPlaylistResponse.ok) {
      let errorText = ""
      try {
        errorText = await createPlaylistResponse.text()
      } catch (e) {
        errorText = "Unknown error"
      }
      console.error("Failed to create playlist:", createPlaylistResponse.status, errorText)
      throw new Error(`Failed to create playlist: ${createPlaylistResponse.status} - ${errorText}`)
    }

    const playlist = await createPlaylistResponse.json()
    console.log(`Created playlist: ${playlist.name} with ID: ${playlist.id}`)

    // Search for songs and get their URIs
    const songUris: string[] = []
    
    for (const song of songs) {
      try {
        const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(song)}&type=track&limit=1`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          if (searchData.tracks?.items?.[0]) {
            songUris.push(searchData.tracks.items[0].uri)
          }
        }
      } catch (error) {
        console.log(`Could not find song: ${song}`)
      }
    }

    // Add songs to playlist
    if (songUris.length > 0) {
      const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          uris: songUris
        }),
      })

      if (!addTracksResponse.ok) {
        let errorText = ""
        try {
          errorText = await addTracksResponse.text()
        } catch (e) {
          errorText = "Unknown error"
        }
        console.error("Failed to add tracks to playlist:", addTracksResponse.status, errorText)
      }
    }

    return NextResponse.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        external_urls: playlist.external_urls,
        tracks_added: songUris.length,
        total_requested: songs.length,
        requested_count: maxSongs
      }
    })

  } catch (error) {
    console.error("Error creating playlist:", error)
    return NextResponse.json(
      { 
        error: "Failed to create playlist",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
