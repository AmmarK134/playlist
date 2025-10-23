"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { LoginButton } from "@/components/LoginButton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Music, Sparkles, Headphones } from "lucide-react"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    console.log("Session status:", status)
    console.log("Session data:", session)
    if (session) {
      console.log("Redirecting to dashboard...")
      router.push("/dashboard")
    }
  }, [session, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-white">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Create Amazing
            <span className="text-green-500 block">Playlists</span>
            with AI
          </h1>
          
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Connect your Spotify account and let AI help you discover new music, 
            create personalized playlists, and explore your musical taste like never before.
          </p>

          <div className="mb-16">
            <LoginButton />
            {session && (
              <div className="mt-4">
                <Button 
                  onClick={() => router.push("/dashboard")}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Go to Dashboard
                </Button>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <Music className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <CardTitle className="text-white">Spotify Integration</CardTitle>
                <CardDescription className="text-gray-400">
                  Seamlessly connect with your Spotify account to access your music library and create playlists.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <Sparkles className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <CardTitle className="text-white">AI-Powered</CardTitle>
                <CardDescription className="text-gray-400">
                  Advanced AI algorithms analyze your music taste and suggest perfect songs for your playlists.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <Headphones className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <CardTitle className="text-white">Discover Music</CardTitle>
                <CardDescription className="text-gray-400">
                  Find new artists, genres, and songs that match your preferences and expand your musical horizons.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
