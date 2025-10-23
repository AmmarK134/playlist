"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, ExternalLink, Music } from "lucide-react"
import { useState } from "react"
import Image from "next/image"
import { SimplePlayer } from "./SimplePlayer"

interface Track {
  track: {
    id: string
    name: string
    artists: Array<{ name: string }>
    album: {
      name: string
      images: Array<{ url: string }>
    }
    duration_ms: number
    external_urls: {
      spotify: string
    }
    preview_url: string | null
    uri: string // Spotify URI for playback
  }
}

interface TrackListProps {
  tracks: Track[]
  playlistName: string
  onBack: () => void
}

export function TrackList({ tracks, playlistName, onBack }: TrackListProps) {
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)
  const [currentTrackUri, setCurrentTrackUri] = useState<string | null>(null)
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null)

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const playTrack = (track: Track['track'], index: number) => {
    if (playingTrack === track.id) {
      setPlayingTrack(null)
      setCurrentTrackUri(null)
      setCurrentTrackIndex(null)
      return
    }

    // Use Spotify Web Playback SDK for full track playback
    setCurrentTrackUri(track.uri)
    setPlayingTrack(track.id)
    setCurrentTrackIndex(index)
  }

  const handleTrackChange = (index: number) => {
    setCurrentTrackIndex(index)
    const track = tracks[index]?.track
    if (track) {
      setPlayingTrack(track.id)
      setCurrentTrackUri(track.uri)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-gray-600 text-white hover:bg-gray-800"
        >
          ← Back to Playlists
        </Button>
        <h2 className="text-xl font-semibold text-white">{playlistName}</h2>
      </div>

      {currentTrackUri && (
        <SimplePlayer 
          trackUri={currentTrackUri} 
          onTrackEnd={() => {
            setPlayingTrack(null)
            setCurrentTrackIndex(null)
          }}
          playlistTracks={tracks}
          currentTrackIndex={currentTrackIndex ?? undefined}
          onTrackChange={handleTrackChange}
        />
      )}

      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Tracks ({tracks.length})</CardTitle>
          <CardDescription className="text-gray-400">
            Click play to preview songs or open in Spotify
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {tracks.map((item, index) => {
              const track = item.track
              if (!track) return null
              
              const imageUrl = track.album.images?.[0]?.url || "/placeholder-album.svg"
              const isPlaying = playingTrack === track.id
              
              return (
                <div
                  key={track.id}
                  className="flex items-center space-x-4 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <Image
                      src={imageUrl}
                      alt={track.album.name}
                      width={48}
                      height={48}
                      className="rounded object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">
                      {track.name}
                    </h4>
                    <p className="text-gray-400 text-sm truncate">
                      {track.artists.map(artist => artist.name).join(", ")}
                    </p>
                    <p className="text-gray-500 text-xs truncate">
                      {track.album.name}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="border-gray-600 text-gray-400">
                      {formatDuration(track.duration_ms)}
                    </Badge>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => playTrack(track, index)}
                      className="border-gray-600 text-white hover:bg-gray-800"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(track.external_urls.spotify, "_blank")}
                      className="border-gray-600 text-white hover:bg-gray-800"
                      title="Open in Spotify"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
