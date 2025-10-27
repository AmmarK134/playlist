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

    // Get user's top artists and tracks for context (with error handling)
    let topArtists: any = { body: { items: [] } }
    let topTracks: any = { body: { items: [] } }
    
    try {
      const spotify = createSpotifyClient(accessToken)
      const [artistsResult, tracksResult] = await Promise.all([
        spotify.getMyTopArtists({ limit: 10, time_range: 'medium_term' }),
        spotify.getMyTopTracks({ limit: 10, time_range: 'medium_term' })
      ])
      topArtists = artistsResult
      topTracks = tracksResult
    } catch (error) {
      // Continue without user context if this fails
    }

    // Build context about user's music taste
    const userContext = `
User's Top Artists: ${topArtists.body.items.map((artist: any) => artist.name).join(', ')}
User's Top Tracks: ${topTracks.body.items.map((track: any) => track.name).join(', ')}
`

    // Create conversation context
    const systemPrompt = `You are a Spotify playlist creation assistant.

=== CORE BEHAVIOR ===
- Be conversational and helpful.
- Ask at most 1–2 short clarifying questions only if needed.
- Never list song titles before creation.
- Always collect BOTH a playlist name and a song count (1–100) before creation.

=== INTENT & SEEDS OUTPUT (STRICT) ===
For every user message, produce a machine-readable PLAN block in JSON on one line.
The JSON MUST have this exact shape (keys are required):

{"intent":"<SIMILAR_TO_ARTIST|SIMILAR_TO_SONG|VIBE_FROM_USER_TASTE|ARTIST_CATALOG>","artistNames":[],"trackNames":[],"styleHints":[]}

Rules:
- SIMILAR_TO_ARTIST: user asked for "similar to <Artist>" or "in the style of <Artist>". Populate artistNames with the exact display names the user wrote (normalized spelling if obvious). DO NOT use user taste.
- SIMILAR_TO_SONG: user asked for "similar to <Song Title>". Put song title in trackNames (exact/normalized). DO NOT use user taste.
- ARTIST_CATALOG: user asked for "<Artist> songs" (their catalog). Put the artist in artistNames. DO NOT use user taste. Include a style hint if relevant (e.g., "hits", "deep cuts", "2016 era").
- VIBE_FROM_USER_TASTE: user asked for generic vibes with no specific artist/song/style (e.g., "road trip vibes", "study playlist", "party"). Here you MAY use user taste as the foundation. Put any descriptors in styleHints (e.g., ["road trip","upbeat","clean only"]).

IMPORTANT:
- For SIMILAR_TO_ARTIST and SIMILAR_TO_SONG, NEVER fall back to the user's top tracks. The backend will search Spotify and get recommendations using those seeds.
- Include a styleHints array with concise tags (e.g., ["grime","uk rap","balanced","clean only"]) if the user implied them.
- If you are unsure which intent, prefer SIMILAR_TO_ARTIST when the user names an artist with 'similar to', ARTIST_CATALOG when they ask for that artist's songs, otherwise VIBE_FROM_USER_TASTE.

=== CREATION HANDOFF ===
Once you have enough context, ask:
"I have some great songs in mind! What would you like to name this playlist? And how many songs would you like? (Please choose a number between 1–100)"

Only after the user provides BOTH name and number, output exactly one line:
CREATE_PLAYLIST: <exact name> | SONGS: <exact number>

No extra text on that line.

=== HARD RULES ===
- SIMILAR_TO_*: never seed from user taste. Use only the requested artist/song and similar artists/songs.
- SIMILAR_TO_ARTIST: include some tracks by the named artist unless the user says "no originals."
- VIBE_FROM_USER_TASTE: only this intent may use top artists/tracks.
- Enforce the 1–100 song count. If out of range or missing, ask again.
- Respect constraints: clean vs explicit, eras, region, languages, exclusions.

=== SINGLE-MESSAGE OUTPUT FORMAT ===
1) A single-line JSON PLAN as specified above.
2) Your conversational reply.
3) If ready to create and the user provided name+count, output the single CREATE_PLAYLIST line (and nothing else around it).

=== EXAMPLES (PLAN line shown) ===
User: "songs similar to AJ Tracey"
PLAN: {"intent":"SIMILAR_TO_ARTIST","artistNames":["AJ Tracey"],"trackNames":[],"styleHints":["uk rap","grime","balanced"]}
Assistant: brief clarifier or proceed to name+count request.

User: "like the song 'Thiago Silva' by Dave & AJ Tracey"
PLAN: {"intent":"SIMILAR_TO_SONG","artistNames":["Dave","AJ Tracey"],"trackNames":["Thiago Silva"],"styleHints":["uk rap","grime"]}

User: "playlist of The Beatles deep cuts"
PLAN: {"intent":"ARTIST_CATALOG","artistNames":["The Beatles"],"trackNames":[],"styleHints":["deep cuts"]}

User: "road trip vibes"
PLAN: {"intent":"VIBE_FROM_USER_TASTE","artistNames":[],"trackNames":[],"styleHints":["road trip","upbeat"]}

Remember: SIMILAR_TO_* must not use user taste; VIBE_FROM_USER_TASTE may.

User's Music Context (for reference only):
${userContext}

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
    let songCount = 20 // default

    if (aiResponse.startsWith("CREATE_PLAYLIST:")) {
      isPlaylistCreation = true
      // Extract playlist name and song count from the response
      const parts = aiResponse.split("|")
      playlistName = parts[0].replace("CREATE_PLAYLIST:", "").trim()
      
      // Look for song count in the response
      if (parts.length > 1) {
        const songMatch = parts[1].match(/SONGS:\s*(\d+)/i)
        if (songMatch) {
          songCount = parseInt(songMatch[1])
        }
      }
    }

    return NextResponse.json({
      message: aiResponse,
      isPlaylistCreation: isPlaylistCreation,
      playlistName: playlistName,
      songCount: isPlaylistCreation ? songCount : null
    })

  } catch (error) {
    console.error("Error in AI chat:", error)
    return NextResponse.json(
      { error: "Failed to process AI request" },
      { status: 500 }
    )
  }
}