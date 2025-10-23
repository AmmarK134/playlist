import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import OpenAI from "openai"
import { createSpotifyClient } from "@/lib/spotify"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { message, conversationHistory = [] } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Create Spotify client
    const spotify = createSpotifyClient(session.accessToken as string)

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
    const systemPrompt = `You are a music playlist creation AI assistant. You help users create personalized Spotify playlists based on their preferences, mood, activities, or specific requests.

User's Music Context:
${userContext}

Instructions:
1. Understand what the user wants in their playlist
2. Be conversational and helpful about the playlist concept
3. Ask clarifying questions if needed about mood, genre, or style
4. When you have enough information, ask: "I have some great songs in mind for your playlist! What would you like to name this playlist? And how many songs would you like? (Please choose a number between 1-100)"
5. Wait for the user to provide BOTH the playlist name AND the number of songs
6. Only after getting both the name and song count, respond with: "CREATE_PLAYLIST: [exact playlist name from user]"
7. Do NOT list specific song names - just say you have songs in mind
8. Consider the user's music taste when making suggestions
9. Always ask for BOTH playlist name and song count before creating playlists
10. Use the EXACT number of songs the user requests, not a default
11. IMPORTANT: If the user says "yes" or "create it" without providing a name and song count, ask them again for both pieces of information

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
      playlistName = aiResponse.replace("CREATE_PLAYLIST:", "").trim()
      console.log(`AI wants to create playlist: "${playlistName}"`)
    }

    console.log(`AI Response: "${aiResponse}"`)
    console.log(`Is playlist creation: ${isPlaylistCreation}`)

    return NextResponse.json({
      message: aiResponse,
      isPlaylistCreation: isPlaylistCreation,
      playlistName: playlistName
    })

  } catch (error) {
    console.error("Error in AI chat:", error)
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    )
  }
}
