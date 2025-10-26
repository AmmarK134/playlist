"use client"

import { useQuery } from "@tanstack/react-query"

export function useUserPlaylists() {
  return useQuery({
    queryKey: ["spotify", "playlists"],
    queryFn: async () => {
      const response = await fetch("/api/spotify/playlists")
      if (!response.ok) {
        throw new Error("Failed to fetch playlists")
      }
      return response.json()
    },
  })
}

export function useUserData() {
  return useQuery({
    queryKey: ["spotify", "user"],
    queryFn: async () => {
      const response = await fetch("/api/spotify/me")
      if (!response.ok) {
        throw new Error("Failed to fetch user data")
      }
      return response.json()
    },
  })
}

export function usePlaylistTracks(playlistId: string | null) {
  return useQuery({
    queryKey: ["spotify", "playlist", playlistId],
    queryFn: async () => {
      if (!playlistId) return null
      const response = await fetch(`/api/spotify/playlists/${playlistId}/tracks`)
      if (!response.ok) {
        throw new Error("Failed to fetch playlist tracks")
      }
      return response.json()
    },
    enabled: !!playlistId,
  })
}
