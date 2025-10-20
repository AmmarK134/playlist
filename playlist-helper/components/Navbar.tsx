"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Music } from "lucide-react"

export function Navbar() {
  const { data: session, status } = useSession()

  return (
    <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <Music className="h-8 w-8 text-green-500" />
            <span className="text-xl font-bold text-white">PlaylistHelper</span>
          </Link>

          <div className="flex items-center space-x-4">
            {status === "loading" ? (
              <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse" />
            ) : session ? (
              <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                  <Button variant="ghost" className="text-white hover:bg-gray-800">
                    Dashboard
                  </Button>
                </Link>
                <div className="flex items-center space-x-2">
                  {session.user?.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="text-white text-sm">
                    {session.user?.name || session.user?.email}
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => signOut()}
                  className="text-white border-gray-600 hover:bg-gray-800"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link href="/">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
