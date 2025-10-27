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
    console.log("=== CREATE PLAYLIST API CALLED ===")
    console.log("Environment:", process.env.NODE_ENV)
    console.log("Vercel:", !!process.env.VERCEL)
    
    // Check environment variables
    console.log("Environment check:")
    console.log("- OPENAI_API_KEY:", !!process.env.OPENAI_API_KEY)
    console.log("- NEXTAUTH_SECRET:", !!process.env.NEXTAUTH_SECRET)
    console.log("- SPOTIFY_CLIENT_ID:", !!process.env.SPOTIFY_CLIENT_ID)
    console.log("- SPOTIFY_CLIENT_SECRET:", !!process.env.SPOTIFY_CLIENT_SECRET)
    
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken || (session as any)?.access_token;
    
    if (!accessToken) {
      console.error("No access token available")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { playlistName, description, numberOfSongs, userRequest, accessToken: explicitToken } = await request.json()
    
    // Use explicit token if provided, otherwise fall back to session
    const finalAccessToken = explicitToken || accessToken;
    
    if (!finalAccessToken) {
      console.error("No final access token available")
      return NextResponse.json({ error: "No access token available" }, { status: 401 })
    }

    if (!playlistName) {
      console.error("Missing playlist name")
      return NextResponse.json({ error: "Playlist name is required" }, { status: 400 })
    }

    console.log(`Creating playlist: "${playlistName}" with ${numberOfSongs || 20} songs`)
    const maxSongs = numberOfSongs || 20

    // Get user's top artists/tracks for context
    let topArtists, topTracks;
    try {
      console.log("Getting user's top artists/tracks...")
      const spotifyClient = createSpotifyClient(finalAccessToken)
      topArtists = await spotifyClient.getMyTopArtists({ limit: 5 })
      topTracks = await spotifyClient.getMyTopTracks({ limit: 5 })
      console.log("Successfully got user's top artists/tracks")
    } catch (error) {
      console.error("Error getting user's top artists/tracks:", error)
      // Continue without user context if this fails
      topArtists = { body: { items: [] } }
      topTracks = { body: { items: [] } }
    }

    const userContext = `
User's Top Artists: ${topArtists.body.items.map((artist: any) => artist.name).join(', ')}
User's Top Tracks: ${topTracks.body.items.map((track: any) => track.name).join(', ')}
`

    // Analyze the request to determine the approach
    const request = userRequest || playlistName;
    const isSpecificArtist = /(songs by|playlist of|tracks by|music by)\s+[A-Za-z\s]+/i.test(request);
    const isSimilarToArtist = /(style|similar to|like|sounds like)\s+[A-Za-z\s]+/i.test(request);
    const isPremadeOption = /(workout|roadtrip|study|party|chill|focus|energy)/i.test(request);
    const isPersonalTaste = /(my feelings|my mood|my taste|based on me|personal)/i.test(request);

    let approach = "";
    let focusInstructions = "";

    if (isSpecificArtist) {
      approach = "SPECIFIC ARTIST ONLY";
      focusInstructions = `Focus ONLY on songs by the specific artist mentioned. Do NOT use user's personal taste.`;
    } else if (isSimilarToArtist) {
      approach = "SIMILAR TO ARTIST";
      focusInstructions = `Focus on the mentioned artist and similar artists. Do NOT use user's personal taste.`;
    } else if (isPremadeOption || isPersonalTaste) {
      approach = "USE USER'S MUSIC TASTE";
      focusInstructions = `Use the user's music taste as the foundation for this playlist.`;
    } else {
      approach = "DEFAULT - FOCUS ON REQUEST";
      focusInstructions = `Focus on the specific request, use user's taste only as secondary reference.`;
    }

    console.log(`Playlist creation approach: ${approach} for request: "${request}"`);

    // Generate song suggestions using OpenAI
    const songGenerationPrompt = `Based on this playlist request: "${request}", generate exactly ${maxSongs} song suggestions in the format "Artist - Song Title". 
    
APPROACH: ${approach}
${focusInstructions}

User's music taste context:
${userContext}

CRITICAL REQUIREMENTS:
- Generate EXACTLY ${maxSongs} songs (not more, not less)
- Format: "Artist - Song Title" (one per line)
- No additional text, explanations, or numbering
- Each line should contain exactly one song in the format "Artist - Song Title"

Return only the song suggestions, one per line, in the format "Artist - Song Title". Do not include any other text.`

    let songCompletion;
    try {
      console.log("Calling OpenAI API...")
      songCompletion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a music expert. Analyze the request and use the appropriate approach:

SPECIFIC ARTIST ONLY: If user asks for "songs by [Artist]" or "playlist of [Artist]", focus ONLY on that artist's songs.

SIMILAR TO ARTIST: If user asks for "[Artist] style" or "similar to [Artist]", focus on that artist and similar artists. Do NOT use user's personal taste.

USE USER'S MUSIC TASTE: If user asks for premade options (workout, roadtrip, study) or personal requests (my feelings, my mood), use their music taste as foundation.

DEFAULT: For other requests, focus on the specific request and use user's taste only as secondary reference.`
          },
          {
            role: "user",
            content: songGenerationPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.8,
      })
      console.log("OpenAI API call successful")
    } catch (error) {
      console.error("Error calling OpenAI:", error)
      throw new Error(`Failed to generate song suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    const songSuggestions = songCompletion.choices[0]?.message?.content || ""
    let songs = songSuggestions.split('\n').filter(song => song.trim()).slice(0, maxSongs)
    
    console.log(`Generated ${songs.length} song suggestions:`, songs)
    
    // Fallback if no songs were generated
    if (songs.length === 0) {
      console.log("No songs generated, using fallback songs")
      songs = [
        "The Beatles - Here Comes The Sun",
        "Queen - Bohemian Rhapsody", 
        "Led Zeppelin - Stairway to Heaven",
        "Pink Floyd - Wish You Were Here",
        "The Rolling Stones - Paint It Black"
      ].slice(0, Math.min(maxSongs, 5))
    }
    
    // If we don't have enough songs, try to generate more
    if (songs.length < maxSongs) {
      console.log(`Only generated ${songs.length} songs, requesting ${maxSongs - songs.length} more...`)
      try {
        const additionalPrompt = `Generate ${maxSongs - songs.length} more song suggestions in the same format for the playlist: "${request}". Return only "Artist - Song Title" format, one per line.`
        
        const additionalCompletion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are a music expert. Generate additional song suggestions."
            },
            {
              role: "user",
              content: additionalPrompt
            }
          ],
          max_tokens: 500,
          temperature: 0.8,
        })
        
        const additionalSongs = additionalCompletion.choices[0]?.message?.content || ""
        const moreSongs = additionalSongs.split('\n').filter(song => song.trim())
        songs.push(...moreSongs.slice(0, maxSongs - songs.length))
        console.log(`Added ${moreSongs.length} more songs, total: ${songs.length}`)
      } catch (error) {
        console.log("Could not generate additional songs:", error)
      }
    }

    // Get user's profile first with retry
    console.log("Getting user profile...")
    let userResponse;
    let retries = 3;
    
    while (retries > 0) {
      try {
        userResponse = await fetch(`https://api.spotify.com/v1/me`, {
          headers: {
            Authorization: `Bearer ${finalAccessToken}`,
          },
        })
        
        if (userResponse.ok) {
          console.log("User profile retrieved successfully")
          break;
        } else {
          const errorText = await userResponse.text()
          console.error(`Failed to get user profile (attempt ${4-retries}):`, userResponse.status, errorText)
          if (retries === 1) {
            throw new Error(`Failed to get user profile: ${userResponse.status} - ${errorText}`)
          }
        }
      } catch (error) {
        console.error(`Error getting user profile (attempt ${4-retries}):`, error)
        if (retries === 1) {
          throw error;
        }
      }
      retries--;
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }

    const user = await userResponse.json()
    console.log("User profile retrieved:", user.id)

    // Create the playlist using the correct API endpoint
    console.log("Creating playlist...")
    const createPlaylistResponse = await fetch(`https://api.spotify.com/v1/users/${user.id}/playlists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${finalAccessToken}`,
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
    console.log("Playlist created successfully:", playlist.id)
    console.log(`Created playlist: ${playlist.name} with ID: ${playlist.id}`)

    // Search for songs and get their URIs
    console.log(`Searching for ${songs.length} songs...`)
    const songUris: string[] = []
    
    for (const song of songs) {
      try {
        console.log(`Searching for: ${song}`)
        const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(song)}&type=track&limit=1`, {
          headers: {
            Authorization: `Bearer ${finalAccessToken}`,
          },
        })

        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          if (searchData.tracks?.items?.[0]) {
            songUris.push(searchData.tracks.items[0].uri)
            console.log(`Found: ${song} -> ${searchData.tracks.items[0].uri}`)
          } else {
            console.log(`No results for: ${song}`)
          }
        } else {
          console.log(`Search failed for: ${song} (${searchResponse.status})`)
        }
      } catch (error) {
        console.log(`Error searching for song: ${song}`, error)
      }
    }
    
    console.log(`Found ${songUris.length} songs out of ${songs.length} requested`)

    // Add songs to playlist
    if (songUris.length > 0) {
      console.log(`Adding ${songUris.length} tracks to playlist...`)
      const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${finalAccessToken}`,
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
        throw new Error(`Failed to add tracks to playlist: ${addTracksResponse.status} - ${errorText}`)
      } else {
        console.log("Successfully added tracks to playlist")
      }
    } else {
      console.log("No songs found to add to playlist")
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
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const statusCode = errorMessage.includes("401") ? 401 : 
                      errorMessage.includes("403") ? 403 : 
                      errorMessage.includes("404") ? 404 : 500
    
    return NextResponse.json(
      { 
        error: "Failed to create playlist",
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    )
  }
}
