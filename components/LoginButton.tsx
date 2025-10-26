"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Music } from "lucide-react"

export function LoginButton() {
  return (
    <Button
      onClick={() => signIn("spotify")}
      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
    >
      <Music className="mr-2 h-5 w-5" />
      Sign in with Spotify
    </Button>
  )
}
