"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react"
import Image from "next/image"

interface SimplePlayerProps {
  trackUri?: string
  onTrackEnd?: () => void
  playlistTracks?: any[]
  currentTrackIndex?: number
  onTrackChange?: (index: number) => void
}

export function SimplePlayer({ trackUri, onTrackEnd, playlistTracks, currentTrackIndex, onTrackChange }: SimplePlayerProps) {
  const { data: session } = useSession()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<any>(null)
  const [volume, setVolume] = useState(50)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastApiCall, setLastApiCall] = useState<number>(0)
  const [isRateLimited, setIsRateLimited] = useState(false)

  // Get current playback state
  const getPlaybackState = async () => {
    if (!session?.accessToken) return

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })

      if (response.ok) {
        const text = await response.text()
        if (text) {
          const data = JSON.parse(text)
          setCurrentTrack(data.item)
          setIsPlaying(data.is_playing)
          setVolume(data.device?.volume_percent || 50)
          return data
        } else {
          console.log("Empty response from Spotify API")
          return null
        }
      } else if (response.status === 204) {
        console.log("No active playback (204 No Content)")
        return null
      } else {
        console.log("No active playback:", response.status)
        return null
      }
    } catch (error) {
      console.error("Error getting playback state:", error)
      return null
    }
  }

  // Play a track using Spotify Web API
  const playTrack = async (uri: string) => {
    if (!session?.accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      console.log("Playing track:", uri)

      // First, get available devices
      const devicesResponse = await fetch(`https://api.spotify.com/v1/me/player/devices`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })

      let deviceId = null
      if (devicesResponse.ok) {
        const devices = await devicesResponse.json()
        console.log("Available devices:", devices.devices)
        
        const activeDevice = devices.devices.find((device: any) => device.is_active)
        if (activeDevice) {
          deviceId = activeDevice.id
          console.log("Using active device:", activeDevice.name)
        } else if (devices.devices.length > 0) {
          deviceId = devices.devices[0].id
          console.log("Using first available device:", devices.devices[0].name)
        } else {
          setError("No Spotify devices found. Please open Spotify on your phone or computer.")
          setIsLoading(false)
          return
        }
      } else {
        setError("Could not access Spotify devices. Please make sure Spotify is open.")
        setIsLoading(false)
        return
      }

      // Play the track
      const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play${deviceId ? `?device_id=${deviceId}` : ''}`, {
        method: "PUT",
        body: JSON.stringify({ 
          uris: [uri],
          position_ms: 0
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
      })

      if (playResponse.ok) {
        console.log("Track started playing successfully")
        setIsPlaying(true)
        // Get updated playback state
        setTimeout(() => getPlaybackState(), 1000)
      } else {
        const errorText = await playResponse.text()
        console.error("Failed to play track:", playResponse.status, errorText)
        
        if (playResponse.status === 404) {
          setError("No active Spotify device found. Please open Spotify on your phone or computer and try again.")
        } else {
          setError(`Failed to play track: ${playResponse.status}`)
        }
      }
    } catch (error) {
      console.error("Error playing track:", error)
      setError("Error playing track")
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle play/pause with rate limiting
  const togglePlay = async () => {
    if (!session?.accessToken) return

    // Rate limiting for play/pause
    const now = Date.now()
    if (now - lastApiCall < 1000) {
      console.log("Rate limiting: Please wait before play/pause")
      setIsRateLimited(true)
      setError("Please wait 1 second before play/pause")
      setTimeout(() => setIsRateLimited(false), 1000)
      return
    }
    setLastApiCall(now)
    setIsRateLimited(false)

    try {
      console.log(`${isPlaying ? 'Pausing' : 'Playing'} track...`)
      const response = await fetch(`https://api.spotify.com/v1/me/player/${isPlaying ? 'pause' : 'play'}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })

      if (response.ok) {
        console.log(`Successfully ${isPlaying ? 'paused' : 'played'} track`)
        setIsPlaying(!isPlaying)
        if (!isPlaying) {
          setTimeout(() => getPlaybackState(), 1000)
        }
      } else {
        const errorText = await response.text()
        console.error(`Failed to ${isPlaying ? 'pause' : 'play'} track:`, response.status, errorText)
        
        if (response.status === 429) {
          setError("Rate limit exceeded. Please wait a moment before trying again.")
        } else {
          setError(`Could not ${isPlaying ? 'pause' : 'play'} track. Make sure Spotify is active.`)
        }
      }
    } catch (error) {
      console.error("Error toggling playback:", error)
      setError("Error toggling playback")
    }
  }

  // Skip to next track in playlist
  const nextTrack = async () => {
    if (!playlistTracks || currentTrackIndex === undefined || !onTrackChange) {
      setError("No playlist context available for skipping")
      return
    }

    // Rate limiting - prevent too many API calls
    const now = Date.now()
    if (now - lastApiCall < 2000) {
      console.log("Rate limiting: Skipping too fast, please wait")
      setIsRateLimited(true)
      setError("Please wait 2 seconds before skipping again")
      setTimeout(() => setIsRateLimited(false), 2000)
      return
    }
    setLastApiCall(now)
    setIsRateLimited(false)

    const nextIndex = currentTrackIndex + 1
    if (nextIndex < playlistTracks.length) {
      const nextTrack = playlistTracks[nextIndex]
      if (nextTrack?.track?.uri) {
        console.log("Playing next track in playlist:", nextTrack.track.name)
        onTrackChange(nextIndex)
        // Use a delay to avoid rate limiting
        setTimeout(async () => {
          await playTrack(nextTrack.track.uri)
        }, 500)
      } else {
        setError("Next track not available")
      }
    } else {
      setError("No more tracks in playlist")
    }
  }

  // Skip to previous track in playlist
  const previousTrack = async () => {
    if (!playlistTracks || currentTrackIndex === undefined || !onTrackChange) {
      setError("No playlist context available for skipping")
      return
    }

    // Rate limiting - prevent too many API calls
    const now = Date.now()
    if (now - lastApiCall < 2000) {
      console.log("Rate limiting: Skipping too fast, please wait")
      setIsRateLimited(true)
      setError("Please wait 2 seconds before skipping again")
      setTimeout(() => setIsRateLimited(false), 2000)
      return
    }
    setLastApiCall(now)
    setIsRateLimited(false)

    const prevIndex = currentTrackIndex - 1
    if (prevIndex >= 0) {
      const prevTrack = playlistTracks[prevIndex]
      if (prevTrack?.track?.uri) {
        console.log("Playing previous track in playlist:", prevTrack.track.name)
        onTrackChange(prevIndex)
        // Use a delay to avoid rate limiting
        setTimeout(async () => {
          await playTrack(prevTrack.track.uri)
        }, 500)
      } else {
        setError("Previous track not available")
      }
    } else {
      setError("No previous tracks in playlist")
    }
  }

  // Set volume
  const setPlayerVolume = async (newVolume: number) => {
    if (!session?.accessToken) return

    setVolume(newVolume)
    setIsMuted(newVolume === 0)

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${newVolume}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })

      if (!response.ok) {
        console.log("Volume control not available on this device")
        // Don't show error for volume - it's not critical
      }
    } catch (error) {
      console.log("Volume control error (non-critical):", error)
      // Don't show error for volume - it's not critical
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (isMuted) {
      setPlayerVolume(volume)
    } else {
      setPlayerVolume(0)
    }
  }

  // Auto-play when trackUri changes
  useEffect(() => {
    if (trackUri) {
      playTrack(trackUri)
    }
  }, [trackUri])

  // Get initial playback state
  useEffect(() => {
    if (session?.accessToken) {
      getPlaybackState()
    }
  }, [session?.accessToken])

  if (error) {
    return (
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="text-center text-red-400">
            <Volume2 className="h-8 w-8 mx-auto mb-2" />
            <p className="font-semibold">Playback Error</p>
            <p className="text-sm mt-2">{error}</p>
            <Button
              onClick={() => setError(null)}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white text-xs"
            >
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!currentTrack) {
    return (
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="text-center text-gray-400">
            <Volume2 className="h-8 w-8 mx-auto mb-2" />
            <p>No track playing</p>
            <p className="text-xs mt-2 text-gray-500">
              Click play on any track to start listening
            </p>
            <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
              <p className="text-blue-300 text-xs font-medium mb-1">💡 Tips:</p>
              <p className="text-blue-200 text-xs mb-1">
                • Make sure Spotify is open on your phone or computer
              </p>
              <p className="text-blue-200 text-xs mb-1">
                • Skip buttons work when you have multiple tracks in your queue
              </p>
              <p className="text-blue-200 text-xs">
                • Wait 1-2 seconds between button clicks to avoid rate limits
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white text-lg">Now Playing</CardTitle>
        <CardDescription className="text-gray-400 text-sm">
          {currentTrack.artists[0]?.name} • {currentTrack.album.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-6">
          <div className="flex-shrink-0">
            <Image
              src={currentTrack.album.images[0]?.url || "/placeholder-album.svg"}
              alt={currentTrack.name}
              width={120}
              height={120}
              className="rounded-lg object-cover shadow-lg"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-semibold text-xl truncate mb-2">{currentTrack.name}</h4>
            <p className="text-gray-300 text-lg truncate mb-1">
              {currentTrack.artists.map((artist: any) => artist.name).join(", ")}
            </p>
            <p className="text-gray-400 text-sm truncate">
              {currentTrack.album.name}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Control Buttons */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="outline"
              size="lg"
              onClick={previousTrack}
              disabled={isRateLimited}
              className={`border-gray-600 text-white hover:bg-gray-800 rounded-full w-12 h-12 ${isRateLimited ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              onClick={togglePlay}
              disabled={isLoading || isRateLimited}
              className={`bg-green-600 hover:bg-green-700 text-white rounded-full w-16 h-16 ${isRateLimited ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
              ) : isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={nextTrack}
              disabled={isRateLimited}
              className={`border-gray-600 text-white hover:bg-gray-800 rounded-full w-12 h-12 ${isRateLimited ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMute}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => setPlayerVolume(Number(e.target.value))}
              className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-400 w-12">{isMuted ? 0 : volume}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
