"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react"
import Image from "next/image"

interface SpotifyPlayerProps {
  trackUri?: string
  onTrackEnd?: () => void
}

declare global {
  interface Window {
    Spotify: any
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

export function SpotifyPlayer({ trackUri, onTrackEnd }: SpotifyPlayerProps) {
  const { data: session } = useSession()
  const [player, setPlayer] = useState<any>(null)
  const [deviceId, setDeviceId] = useState<string>("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<any>(null)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(50)
  const [isMuted, setIsMuted] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [sdkLoaded, setSdkLoaded] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const playerRef = useRef<any>(null)
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!session?.accessToken) return

    // Check if script is already loaded
    if (window.Spotify) {
      console.log("Spotify SDK already loaded, initializing player...")
      initializePlayer()
      return
    }

    console.log("Loading Spotify Web Playback SDK...")
    const script = document.createElement("script")
    script.src = "https://sdk.scdn.co/spotify-player.js"
    script.async = true

    script.onload = () => {
      console.log("Spotify SDK script loaded")
      setSdkLoaded(true)
      if (window.Spotify) {
        initializePlayer()
      }
    }

    script.onerror = () => {
      console.error("Failed to load Spotify SDK")
      setConnectionError("Failed to load Spotify SDK")
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      console.log("Spotify SDK ready callback triggered")
      setSdkLoaded(true)
      initializePlayer()
    }

    // Set a timeout to show error if SDK doesn't load
    const timeout = setTimeout(() => {
      if (!sdkLoaded && !window.Spotify) {
        setConnectionError("Spotify SDK failed to load. Please refresh the page.")
      }
    }, 10000)

    document.body.appendChild(script)

    return () => {
      clearTimeout(timeout)
      if (playerRef.current) {
        playerRef.current.disconnect()
      }
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current)
      }
      try {
        document.body.removeChild(script)
      } catch (e) {
        // Script might already be removed
      }
    }
  }, [session?.accessToken])

  const initializePlayer = () => {
    if (!session?.accessToken || !window.Spotify) return

    console.log("Initializing Spotify Player with token:", session.accessToken?.substring(0, 20) + "...")

    const spotifyPlayer = new window.Spotify.Player({
      name: "PlaylistHelper Player",
      getOAuthToken: (cb: (token: string) => void) => {
        console.log("Getting OAuth token for player")
        cb(session.accessToken as string)
      },
      volume: volume / 100,
    })

    spotifyPlayer.addListener("ready", ({ device_id }: { device_id: string }) => {
      console.log("Ready with Device ID", device_id)
      setDeviceId(device_id)
      setPlayer(spotifyPlayer)
      setIsReady(true)
      
      // Test token scopes when player is ready
      testTokenScopes()
    })

    spotifyPlayer.addListener("not_ready", ({ device_id }: { device_id: string }) => {
      console.log("Device ID has gone offline", device_id)
      setIsReady(false)
    })

    spotifyPlayer.addListener("player_state_changed", (state: any) => {
      if (!state) return

      setCurrentTrack(state.track_window.current_track)
      setIsPlaying(!state.paused)
      setPosition(state.position)
      setDuration(state.duration)

      if (state.paused && onTrackEnd) {
        onTrackEnd()
      }
    })

    spotifyPlayer.addListener("initialization_error", ({ message }: { message: string }) => {
      console.error("Failed to initialize:", message)
    })

    spotifyPlayer.addListener("authentication_error", ({ message }: { message: string }) => {
      console.error("Failed to authenticate:", message)
      console.log("Token scopes issue. Current token:", session.accessToken?.substring(0, 20) + "...")
      console.log("This usually means you need to log out and log back in to get the required scopes")
      console.log("Required scopes: streaming user-read-playback-state user-modify-playback-state user-read-currently-playing")
    })

    spotifyPlayer.addListener("account_error", ({ message }: { message: string }) => {
      console.error("Failed to validate Spotify account:", message)
    })

    spotifyPlayer.addListener("playback_error", ({ message }: { message: string }) => {
      console.error("Failed to perform playback:", message)
    })

    spotifyPlayer.connect()
    playerRef.current = spotifyPlayer
  }

  useEffect(() => {
    if (player && trackUri && deviceId && isReady) {
      playTrack(trackUri)
    }
  }, [player, trackUri, deviceId, isReady])

  // Update position every second
  useEffect(() => {
    if (isPlaying && duration > 0) {
      positionIntervalRef.current = setInterval(() => {
        setPosition(prev => {
          const newPosition = prev + 1000
          return newPosition >= duration ? duration : newPosition
        })
      }, 1000)
    } else {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current)
      }
    }

    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current)
      }
    }
  }, [isPlaying, duration])

  const playTrack = async (uri: string) => {
    if (!session?.accessToken || !deviceId) return

    try {
      console.log("Attempting to play track:", uri, "on device:", deviceId)
      
      // Check current playback state first
      const currentState = await checkPlaybackState()
      
      // Transfer playback to our device (required by Spotify API)
      const transferResponse = await fetch(`https://api.spotify.com/v1/me/player`, {
        method: "PUT",
        body: JSON.stringify({ 
          device_ids: [deviceId], 
          play: false 
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
      })

      if (!transferResponse.ok) {
        const transferError = await transferResponse.text()
        console.log("Transfer response:", transferResponse.status, transferError)
      } else {
        console.log("Device transfer successful")
      }

      // Wait for device transfer to complete
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Now play the track using the correct API format from documentation
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
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

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Failed to play track:", response.status, errorText)
        
        // Try without device_id as fallback
        const fallbackResponse = await fetch(`https://api.spotify.com/v1/me/player/play`, {
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
        
        if (fallbackResponse.ok) {
          console.log("Track started playing with fallback method")
        } else {
          const fallbackError = await fallbackResponse.text()
          console.error("Fallback method also failed:", fallbackResponse.status, fallbackError)
        }
      } else {
        console.log("Track started playing successfully")
      }
    } catch (error) {
      console.error("Error playing track:", error)
    }
  }

  const togglePlay = () => {
    if (player) {
      player.togglePlay()
    }
  }

  const previousTrack = () => {
    if (player) {
      player.previousTrack()
    }
  }

  const nextTrack = () => {
    if (player) {
      player.nextTrack()
    }
  }

  const setPlayerVolume = (newVolume: number) => {
    setVolume(newVolume)
    if (player) {
      player.setVolume(newVolume / 100)
    }
  }

  const toggleMute = () => {
    if (isMuted) {
      setPlayerVolume(volume)
      setIsMuted(false)
    } else {
      if (player) {
        player.setVolume(0)
      }
      setIsMuted(true)
    }
  }

  const seekTo = (position: number) => {
    if (player) {
      player.seek(position)
      setPosition(position)
    }
  }

  const checkPlaybackState = async () => {
    if (!session?.accessToken) return

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Current playback state:", data)
        return data
      } else {
        console.log("No active playback or device")
        return null
      }
    } catch (error) {
      console.error("Error checking playback state:", error)
      return null
    }
  }

  const testTokenScopes = async () => {
    if (!session?.accessToken) return

    try {
      // Test if we can access user's profile (basic scope)
      const profileResponse = await fetch(`https://api.spotify.com/v1/me`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })

      if (profileResponse.ok) {
        console.log("✅ Basic token works")
      } else {
        console.error("❌ Basic token failed:", profileResponse.status)
      }

      // Test if we can access playback state (streaming scope)
      const playbackResponse = await fetch(`https://api.spotify.com/v1/me/player`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })

      if (playbackResponse.ok) {
        console.log("✅ Playback scopes work")
      } else {
        console.error("❌ Playback scopes failed:", playbackResponse.status)
      }

    } catch (error) {
      console.error("Error testing token scopes:", error)
    }
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  if (connectionError) {
    return (
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="text-center text-red-400">
            <Volume2 className="h-8 w-8 mx-auto mb-2" />
            <p className="font-semibold">Connection Error</p>
            <p className="text-sm mt-2">{connectionError}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white text-xs"
            >
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isReady) {
    return (
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="text-center text-gray-400">
            <Volume2 className="h-8 w-8 mx-auto mb-2" />
            <p>Connecting to Spotify...</p>
            <p className="text-xs mt-2 text-gray-500">
              Note: Spotify Premium required for playback
            </p>
            <div className="mt-4 space-y-2">
              <Button
                onClick={testTokenScopes}
                className="bg-green-600 hover:bg-green-700 text-white text-xs mr-2"
              >
                Test Token Scopes
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-gray-600 text-white hover:bg-gray-800 text-xs"
              >
                Retry Connection
              </Button>
            </div>
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
            <p>No track selected</p>
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
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>{formatTime(position)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div 
              className="w-full bg-gray-700 rounded-full h-2 cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const clickX = e.clientX - rect.left
                const newPosition = (clickX / rect.width) * duration
                seekTo(newPosition)
              }}
            >
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="outline"
              size="lg"
              onClick={previousTrack}
              className="border-gray-600 text-white hover:bg-gray-800 rounded-full w-12 h-12"
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              onClick={togglePlay}
              className="bg-green-600 hover:bg-green-700 text-white rounded-full w-16 h-16"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={nextTrack}
              className="border-gray-600 text-white hover:bg-gray-800 rounded-full w-12 h-12"
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
              onChange={(e) => {
                const newVolume = Number(e.target.value)
                setPlayerVolume(newVolume)
                setIsMuted(newVolume === 0)
              }}
              className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-400 w-12">{isMuted ? 0 : volume}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
