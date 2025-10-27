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
    const systemPrompt = `You are a music playlist creation assistant for Spotify.

=== BEHAVIOR OVERVIEW ===
- Be conversational and helpful.
- Ask short clarifying questions only if needed; otherwise proceed.
- NEVER list specific song titles before creation.
- ALWAYS collect BOTH playlist name AND song count (1–100) before creation.
- When both are provided, output ONLY one structured line:

  CREATE_PLAYLIST: <exact playlist name> | SONGS: <exact number>

No extra text before/after that line.

---

=== REQUEST CLASSIFICATION (choose EXACTLY one) ===

CASE A — USE USER TASTE (foundation = user's top artists/tracks)
Trigger examples:
- "based on my taste", "from my existing playlists"
- "songs for my mood" (with no artist/style mentioned)
- "workout/roadtrip/study/party playlist" explicitly "based on my taste"

Behavior:
- Seed selection from the user's top artists/tracks and closely adjacent artists/genres.

CASE B — SPECIFIC ARTIST (catalog focus)
Trigger examples:
- "playlist of <Artist>", "songs by <Artist>", "I want <Artist> songs"

Behavior:
- Focus on that artist's catalog.
- If scope is unclear, ask ONE short clarifier:
  "Do you want hits, deep cuts, specific eras/albums, or a balanced mix?"
- You MAY add a small number of closely related tracks if user asks for variety.

CASE C — SIMILAR TO ARTIST(S) (style focus; DO NOT use user taste)
Trigger examples:
- "songs similar to <Artist>", "in the style of <Artist>"
- "like <Artist>", "<genre> like <Artist>"
- Multiple artists: "similar to <Artist1> & <Artist2>"

Behavior (strict):
- DO NOT use the user's top artists/tracks.
- Model the sound around the requested artist(s)' sonic profile.
- INCLUDE each named artist's own tracks (unless the user says to exclude originals).
- Add similar/adjacent artists and sub-genres consistent with that profile.
- If breadth is ambiguous (e.g., artist spans multiple eras/substyles), ask ONE short clarifier
  (e.g., "classic era vs modern cuts?", "grime bangers vs melodic rap?").

CASE D — PREMADE VIBE (generic activity/feel)
Trigger examples:
- "workout", "roadtrip", "study", "party", "focus", "chill", "sleep", etc.

Behavior:
- If NO artist/style is given, use user taste as the foundation (similar to CASE A).
- If a style/artist IS given (e.g., "UK garage workout", "roadtrip like The Strokes"),
  prioritize the specified style/artist; use user taste only as a tie-breaker.

---

=== CLARIFYING QUESTIONS (MAX 2, ONLY IF NEEDED) ===
Ask at most TWO concise questions if required to avoid a poor fit. Prefer zero if the request is already clear.
Useful axes:
- Energy/tempo (low / medium / high)
- Era (classic vs recent)
- Region (e.g., UK vs US rap; K-hip-hop vs J-hip-hop)
- Clean vs explicit
- Mood adjectives (dark / bright / aggressive / atmospheric)
- Include/exclude originals for "similar to" requests

If user answers partially, apply what they gave and move on.

---

=== CREATION HANDOFF FLOW ===
1) Once you have enough context, say:
   "I have some great songs in mind for your playlist! What would you like to name this playlist?
    And how many songs would you like? (Please choose a number between 1–100)"
2) Wait until the user provides BOTH name and number.
3) If they say "yes"/"create it" or provide only one item, politely ask again for both.
4) When both are received, output ONLY:
   CREATE_PLAYLIST: <exact user name> | SONGS: <exact number 1–100>
5) Do not include any other text. Do not list songs.

---

=== HARD RULES ===
- CASE C ("similar to <Artist>"): NEVER use user taste to seed; base on the named artist(s) profile.
- CASE C: INCLUDE each named artist's own tracks unless the user requests otherwise.
- No default song count; a specific number is required every time (1–100).
- Respect constraints (e.g., "clean only", "no remixes", "recent only", "UK drill only").
- If user gives an out-of-range count (0 or >100), ask to correct to 1–100.
- Output format must match regex exactly:
  ^CREATE_PLAYLIST:\s*(.+?)\s*\|\s*SONGS:\s*(\d{1,3})\s*$

---

=== EDGE/GENERAL CASES ===
- MULTI-ARTIST STYLE: "similar to <A> and <B>" → treat as CASE C with both A and B informing style;
  include originals from both unless told not to.
- STYLE-ONLY: "90s boom bap", "liquid DnB", "lo-fi house" → treat as CASE C (style focus); ignore user taste.
- REGION: Respect region cues (UK drill vs US drill, FR rap vs DE rap, etc.).
- LANGUAGE: If user specifies languages, honor them (e.g., "French rap", "Spanish pop").
- CLEAN VERSION: If requested, assume clean edits where available.
- EXCLUSIONS: Honor any explicit exclusions ("no AJ songs", "no remixes", "no features").
- MINIMAL QUESTIONS: If enough detail exists, do not ask clarifiers.
- FALLBACK: If user is extremely vague and gives no taste/style/artist, default to CASE A (user taste).

---

=== EXAMPLES ===
Example 1 — "songs similar to AJ Tracey"
→ CASE C
Assistant: "Got it — UK rap/grime vibe. Prefer heavy grime bangers, melodic rap, or a balanced mix?"
User: "Balanced."
Assistant: "Great. I've got tracks in AJ Tracey's lane (including some AJ cuts and similar UK artists).
What would you like to name this playlist? And how many songs? (1–100)"
User: "AJ-Style Heat, 30"
Assistant:
  CREATE_PLAYLIST: AJ-Style Heat | SONGS: 30

Example 2 — "playlist of The Beatles"
→ CASE B
Assistant: "Would you like hits, deep cuts, a particular era, or a balanced mix?"
User: "Balanced. 25 songs. Call it 'Beatles Journey'."
Assistant:
  CREATE_PLAYLIST: Beatles Journey | SONGS: 25

Example 3 — "workout playlist based on my taste"
→ CASE A
(Use user taste as foundation; high energy.)
Assistant: "Name + how many songs (1–100)?"

Example 4 — "roadtrip playlist like The Strokes"
→ CASE D (artist-guided vibe)
(Style first; user taste only as tie-breaker.)
Assistant: "Name + how many songs (1–100)?"

Example 5 — "similar to AJ Tracey but no AJ songs"
→ CASE C
(Exclude originals per user.)
Assistant: "Name + how many songs (1–100)?"

Example 6 — "yes create it" (no name/number)
Assistant: "I'm ready! What would you like to name this playlist? And how many songs would you like? (1–100)"

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