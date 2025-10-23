"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Music, Plus, Sparkles, TrendingUp, ExternalLink } from "lucide-react"
import { PlaylistCard } from "@/components/PlaylistCard"
import { TrackList } from "@/components/TrackList"
import { SimplePlayer } from "@/components/SimplePlayer"
import { AIChat } from "@/components/AIChat"
import { useUserPlaylists, useUserData, usePlaylistTracks } from "@/lib/hooks/useSpotifyData"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [selectedPlaylistName, setSelectedPlaylistName] = useState<string>("")

  const { data: playlists, isLoading: playlistsLoading, error: playlistsError } = useUserPlaylists()
  const { data: userData, isLoading: userLoading } = useUserData()
  const { data: tracks, isLoading: tracksLoading } = usePlaylistTracks(selectedPlaylistId)
  const [currentTrackUri, setCurrentTrackUri] = useState<string | null>(null)

  useEffect(() => {
    console.log("Dashboard - Session status:", status)
    console.log("Dashboard - Session data:", session)
    if (status === "unauthenticated") {
      console.log("Not authenticated, redirecting to home...")
      router.push("/")
    }
  }, [status, router])

  if (status === "loading" || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const handleSelectPlaylist = (playlistId: string, playlistName: string) => {
    setSelectedPlaylistId(playlistId)
    setSelectedPlaylistName(playlistName)
  }

  const handleBackToPlaylists = () => {
    setSelectedPlaylistId(null)
    setSelectedPlaylistName("")
  }

  const handlePlayTrack = (trackUri: string) => {
    setCurrentTrackUri(trackUri)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {currentTrackUri && (
          <div className="mb-6">
            <SimplePlayer 
              trackUri={currentTrackUri} 
              onTrackEnd={() => setCurrentTrackUri(null)}
            />
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {userData?.display_name || session.user?.name || session.user?.email}!
          </h1>
          <p className="text-gray-400">
            {userData?.followers?.total ? `${userData.followers.total.toLocaleString()} followers` : "Ready to create some amazing playlists with AI?"}
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-gray-900/50 border-gray-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-green-600">
              Overview
            </TabsTrigger>
            <TabsTrigger value="playlists" className="data-[state=active]:bg-green-600">
              My Playlists
            </TabsTrigger>
            <TabsTrigger value="ai-chat" className="data-[state=active]:bg-green-600">
              AI Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Total Playlists
                  </CardTitle>
                  <Music className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {playlistsLoading ? "..." : playlists?.total || 0}
                  </div>
                  <p className="text-xs text-gray-500">
                    {playlists?.total > 0 ? "Your Spotify playlists" : "No playlists found"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Followers
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {userData?.followers?.total?.toLocaleString() || "0"}
                  </div>
                  <p className="text-xs text-gray-500">
                    Spotify followers
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    AI Interactions
                  </CardTitle>
                  <Sparkles className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">0</div>
                  <p className="text-xs text-gray-500">
                    Chat sessions completed
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
                <CardDescription className="text-gray-400">
                  Get started with creating your first AI-powered playlist
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Playlist with AI
                </Button>
                <Button variant="outline" className="w-full border-gray-600 text-white hover:bg-gray-800">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Start AI Chat Session
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="playlists" className="space-y-6">
            {selectedPlaylistId ? (
              <TrackList
                tracks={tracks?.items || []}
                playlistName={selectedPlaylistName}
                onBack={handleBackToPlaylists}
              />
            ) : (
              <div className="space-y-6">
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Your Spotify Playlists</CardTitle>
                    <CardDescription className="text-gray-400">
                      {playlistsLoading ? "Loading your playlists..." : `Found ${playlists?.total || 0} playlists`}
                    </CardDescription>
                  </CardHeader>
                </Card>

                {playlistsLoading ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                        <CardHeader>
                          <div className="animate-pulse">
                            <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : playlistsError ? (
                  <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                    <CardContent className="text-center py-12">
                      <Music className="h-16 w-16 text-red-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">Error loading playlists</h3>
                      <p className="text-gray-400 mb-4">
                        There was an error fetching your Spotify playlists. Please try again.
                      </p>
                      <Button 
                        onClick={() => window.location.reload()}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Retry
                      </Button>
                    </CardContent>
                  </Card>
                ) : playlists?.items?.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {playlists.items.map((playlist: any) => (
                      <PlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        onSelectPlaylist={(id) => handleSelectPlaylist(id, playlist.name)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                    <CardContent className="text-center py-12">
                      <Music className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-white mb-2">No playlists found</h3>
                      <p className="text-gray-400 mb-4">
                        You don't have any playlists in your Spotify account yet.
                      </p>
                      <Button 
                        onClick={() => window.open("https://open.spotify.com", "_blank")}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Spotify
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai-chat" className="space-y-6">
            <AIChat />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
