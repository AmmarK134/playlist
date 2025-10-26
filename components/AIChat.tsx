"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, Music, Sparkles, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp: Date
}

interface PlaylistCreation {
  name: string
  songs: string[]
  description?: string
  numberOfSongs?: number
  userRequest?: string
}

export function AIChat() {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: "Hi! I'm your AI music assistant. I can help you create personalized playlists based on your mood, activities, or music preferences. What kind of playlist would you like to create?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [playlistCreation, setPlaylistCreation] = useState<PlaylistCreation | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          conversationHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      })

      const data = await response.json()

      if (response.ok) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: data.message,
          timestamp: new Date()
        }

        setMessages(prev => [...prev, aiMessage])

        // Check if AI wants to create a playlist
        if (data.isPlaylistCreation && data.playlistName) {
          // Get the song count from the AI response (most reliable)
          const numberOfSongs = data.songCount || 20
          
          // Get user's last message for context
          const userMessages = messages.filter(msg => msg.role === 'user')
          const lastUserMessage = userMessages[userMessages.length - 1]?.content || ''
          
          console.log(`=== SONG COUNT EXTRACTION DEBUG ===`)
          console.log(`AI provided song count: ${data.songCount}`)
          console.log(`Final song count: ${numberOfSongs}`)
          console.log(`User message: "${lastUserMessage}"`)
          console.log(`AI response: "${data.message}"`)
          console.log(`=====================================`)
          
          setPlaylistCreation({
            name: data.playlistName,
            songs: [],
            description: `AI-generated playlist: ${data.playlistName}`,
            numberOfSongs: numberOfSongs,
            userRequest: lastUserMessage
          })
        }
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "Sorry, I couldn't process your request. Please try again.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const createPlaylist = async () => {
    const accessToken = (session as any)?.accessToken || (session as any)?.access_token;
    console.log("AIChat - Session:", session);
    console.log("AIChat - Access token:", accessToken);
    console.log("AIChat - Playlist creation:", playlistCreation);
    
    if (!playlistCreation || !accessToken) {
      console.log("AIChat - Missing playlist creation or access token");
      return;
    }

    setIsCreatingPlaylist(true)

    try {
      const requestData = {
        playlistName: playlistCreation.name,
        description: playlistCreation.description,
        numberOfSongs: playlistCreation.numberOfSongs,
        userRequest: playlistCreation.userRequest
      }
      
      console.log("AIChat - Sending playlist creation request:", requestData)
      
      const response = await fetch('/api/ai/create-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...requestData,
          accessToken: accessToken // Pass the token explicitly
        }),
      })

      console.log("AIChat - Response status:", response.status);
      console.log("AIChat - Response ok:", response.ok);

      const data = await response.json()
      console.log("AIChat - Response data:", data);

      if (response.ok) {
        const successMessage: Message = {
          id: Date.now().toString(),
          role: 'ai',
          content: `🎉 Playlist "${data.playlist.name}" created successfully! I added ${data.playlist.tracks_added} songs to your playlist. You can find it in your Spotify library - go check it out!`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, successMessage])
        setPlaylistCreation(null)
      } else {
        let errorMessage: Message
        try {
          const errorData = await response.json()
          errorMessage = {
            id: Date.now().toString(),
            role: 'ai',
            content: `Sorry, I couldn't create the playlist. Error: ${errorData.details || errorData.error || 'Unknown error'}. Please try again.`,
            timestamp: new Date()
          }
        } catch (parseError) {
          errorMessage = {
            id: Date.now().toString(),
            role: 'ai',
            content: `Sorry, I couldn't create the playlist. HTTP ${response.status}: ${response.statusText}. Please try again.`,
            timestamp: new Date()
          }
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('AIChat - Error creating playlist:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'ai',
        content: `Sorry, I couldn't create the playlist. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsCreatingPlaylist(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-green-500" />
            AI Playlist Creator
          </CardTitle>
          <CardDescription className="text-gray-400">
            Chat with AI to create personalized playlists based on your mood, activities, or preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Chat Messages */}
            <div className="h-96 overflow-y-auto space-y-4 pr-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-800 text-white'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.role === 'ai' ? (
                        <Bot className="h-4 w-4 mt-1 flex-shrink-0" />
                      ) : (
                        <User className="h-4 w-4 mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 text-white px-4 py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4" />
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Playlist Creation Confirmation */}
            {playlistCreation && (
              <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4">
                <h4 className="text-green-300 font-medium mb-2">Ready to Create Playlist</h4>
            <div className="space-y-2 mb-4">
              <p className="text-green-200 text-sm">
                <strong>Name:</strong> {playlistCreation.name}
              </p>
              <p className="text-green-200 text-sm">
                <strong>Songs:</strong> {playlistCreation.numberOfSongs || 20} songs
              </p>
              <p className="text-green-200 text-sm">
                <strong>Description:</strong> {playlistCreation.description}
              </p>
              <p className="text-green-200 text-sm">
                <strong>User Request:</strong> {playlistCreation.userRequest}
              </p>
            </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={createPlaylist}
                    disabled={isCreatingPlaylist}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isCreatingPlaylist ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Music className="h-4 w-4 mr-2" />
                        Create Playlist
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setPlaylistCreation(null)}
                    variant="outline"
                    className="border-gray-600 text-white hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe the playlist you want to create..."
                disabled={isLoading}
                className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Suggestions */}
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">Quick suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Create a workout playlist",
                  "Make chill evening music",
                  "I want road trip songs",
                  "Create focus music for studying",
                  "Make a party playlist",
                  "I need sad songs for a breakup"
                ].map((suggestion) => (
                  <Badge
                    key={suggestion}
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-700 border-gray-600 text-gray-300"
                    onClick={() => setInput(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
