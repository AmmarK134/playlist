"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Music, Plus, Sparkles, TrendingUp } from "lucide-react"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {session.user?.name || session.user?.email}!
          </h1>
          <p className="text-gray-400">
            Ready to create some amazing playlists with AI?
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
                  <div className="text-2xl font-bold text-white">0</div>
                  <p className="text-xs text-gray-500">
                    Created with AI assistance
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

              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">
                    Songs Discovered
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">0</div>
                  <p className="text-xs text-gray-500">
                    New tracks found
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
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Your Playlists</CardTitle>
                <CardDescription className="text-gray-400">
                  All playlists created with AI assistance will appear here
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Music className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No playlists yet</h3>
                  <p className="text-gray-400 mb-4">
                    Start creating your first AI-powered playlist to see it here.
                  </p>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Playlist
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-chat" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">AI Chat</CardTitle>
                <CardDescription className="text-gray-400">
                  Chat with AI to discover music and create personalized playlists
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Sparkles className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">AI Chat Coming Soon</h3>
                  <p className="text-gray-400 mb-4">
                    The AI chat feature is currently under development. Stay tuned!
                  </p>
                  <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800" disabled>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Start Chat (Coming Soon)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
