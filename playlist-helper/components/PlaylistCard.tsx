"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Music, ExternalLink, Play } from "lucide-react"

interface PlaylistCardProps {
  playlist: {
    id: string
    name: string
    description: string | null
    images: Array<{ url: string }>
    tracks: {
      total: number
    }
    external_urls: {
      spotify: string
    }
    owner: {
      display_name: string
    }
  }
  onSelectPlaylist: (playlistId: string) => void
}

export function PlaylistCard({ playlist, onSelectPlaylist }: PlaylistCardProps) {
  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm hover:bg-gray-800/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start space-x-4">
          <div className="relative w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center">
            <Music className="h-8 w-8 text-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-white text-lg truncate">
              {playlist.name}
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm">
              by {playlist.owner.display_name}
            </CardDescription>
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-600/30">
                {playlist.tracks.total} tracks
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {playlist.description && (
          <p className="text-gray-400 text-sm mb-4 line-clamp-2">
            {playlist.description}
          </p>
        )}
        <div className="flex space-x-2">
          <Button
            onClick={() => onSelectPlaylist(playlist.id)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Music className="mr-2 h-4 w-4" />
            View Tracks
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="border-gray-600 text-white hover:bg-gray-800"
            onClick={() => window.open(playlist.external_urls.spotify, "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
