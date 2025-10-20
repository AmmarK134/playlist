import SpotifyWebApi from "spotify-web-api-node"

export const createSpotifyClient = (accessToken: string) => {
  const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  })

  spotifyApi.setAccessToken(accessToken)
  return spotifyApi
}

export type SpotifyClient = ReturnType<typeof createSpotifyClient>
