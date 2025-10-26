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

    const { message, conversationHistory = [] } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Create Spotify client
    const spotify = createSpotifyClient(accessToken)

    // Get user's top artists and tracks for context
    const [topArtists, topTracks] = await Promise.all([
      spotify.getMyTopArtists({ limit: 10, time_range: 'medium_term' }),
      spotify.getMyTopTracks({ limit: 10, time_range: 'medium_term' })
    ])

    // Build context about user's music taste
    const userContext = `
User's Top Artists: ${topArtists.body.items.map(artist => artist.name).join(', ')}
User's Top Tracks: ${topTracks.body.items.map(track => track.name).join(', ')}
`

    // Create conversation context
    const systemPrompt = `You are a music playlist creation AI assistant. You help users create Spotify playlists based on their specific requests, mood, activities, or style preferences.

User's Music Context (for reference only):
${userContext}

Instructions:
1. Analyze the user's request to determine which approach to use
2. Be conversational and helpful about the playlist concept
3. Ask clarifying questions if needed about mood, genre, or style
4. When you have enough information, ask: "I have some great songs in mind for your playlist! What would you like to name this playlist? And how many songs would you like? (Please choose a number between 1-100)"
5. Wait for the user to provide BOTH the playlist name AND the number of songs
6. Only after getting both the name and song count, respond with: "CREATE_PLAYLIST: [exact playlist name from user] | SONGS: [exact number from user]"
7. Do NOT list specific song names - just say you have songs in mind
8. Always ask for BOTH playlist name and song count before creating playlists
9. Use the EXACT number of songs the user requests, not a default
10. IMPORTANT: If the user says "yes" or "create it" without providing a name and song count, ask them again for both pieces of information
11. CRITICAL: Always include the song count in your CREATE_PLAYLIST response using the format "| SONGS: [number]"

REQUEST ANALYSIS - Use this logic to determine approach:

CASE 1 - USE USER'S MUSIC TASTE:
- "Make me a playlist based on my feelings"
- "Create a playlist from my existing playlists"
- "Make me a workout playlist" (premade option)
- "Make me a roadtrip playlist" (premade option)
- "Songs for my mood"
- "Based on my music taste"

CASE 2 - SPECIFIC ARTIST ONLY:
- "I want Arctic Monkeys songs"
- "Make me a playlist of The Beatles"
- "Songs by Drake"
- Ask: "What type of songs from [Artist] do you want? (hits, deep cuts, specific albums, etc.)"

CASE 3 - SIMILAR TO ARTIST (DON'T USE USER TASTE):
- "I want Arctic Monkeys style"
- "Songs similar to The Strokes"
- "Make me a playlist like Radiohead"
- "Indie rock like Arctic Monkeys"
- Focus on that artist and similar artists, ignore user's personal taste

CASE 4 - PREMADE OPTIONS (USE USER TASTE):
- "Workout playlist"
- "Roadtrip playlist"
- "Study playlist"
- "Party playlist"
- Use user's music taste as the foundation

Current conversation:
${conversationHistory.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n')}

User: ${message}`

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })

    const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that request."

    let isPlaylistCreation = false
    let playlistName = ""

    if (aiResponse.startsWith("CREATE_PLAYLIST:")) {
      isPlaylistCreation = true
      // Extract playlist name and song count from the response
      const parts = aiResponse.split("|")
      playlistName = parts[0].replace("CREATE_PLAYLIST:", "").trim()
      
      // Look for song count in the response
      let songCount = 20 // default
      if (parts.length > 1) {
        const songMatch = parts[1].match(/SONGS:\s*(\d+)/i)
        if (songMatch) {
          songCount = parseInt(songMatch[1])
        }
      }
      
      console.log(`AI wants to create playlist: "${playlistName}" with ${songCount} songs`)
    }

    console.log(`AI Response: "${aiResponse}"`)
    console.log(`Is playlist creation: ${isPlaylistCreation}`)

    return NextResponse.json({
      message: aiResponse,
      isPlaylistCreation: isPlaylistCreation,
      playlistName: playlistName,
      songCount: isPlaylistCreation ? (aiResponse.includes("| SONGS:") ? parseInt(aiResponse.match(/SONGS:\s*(\d+)/i)?.[1] || "20") : 20) : null
    })

  } catch (error) {
    console.error("Error in AI chat:", error)
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    )
  }
}
