"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  AudioLines,
  Check,
  Disc3,
  Loader2,
  LockKeyhole,
  RotateCcw,
  X,
} from "lucide-react";
import { LoginButton } from "@/components/LoginButton";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
}

interface PlaylistDraft {
  name: string;
  description: string;
  numberOfSongs: number;
  userRequest: string;
}

interface SavedPlaylist {
  name: string;
  url?: string;
  count?: number;
  warning?: string;
}

interface ChatResponse {
  message?: string;
  isPlaylistCreation?: boolean;
  playlistName?: string;
  songCount?: number;
  error?: string;
  details?: string;
}

interface CreateResponse {
  playlist?: {
    id: string;
    name: string;
    tracks_added: number;
    external_urls?: { spotify?: string };
  };
  creationUncertain?: boolean;
  partialPlaylist?: { id: string; name: string; url?: string };
  warning?: string;
  error?: string;
  details?: string;
}

interface AIChatProps {
  initialPrompt?: string;
  demo?: boolean;
  onCreated?: () => void;
}

const suggestions = [
  {
    label: "A slow Sunday",
    prompt:
      "Create a relaxed, soulful Sunday morning playlist. Call it Slow Sunday, with 20 songs.",
  },
  {
    label: "After hours",
    prompt:
      "Make a moody late-night playlist with atmospheric R&B and a little alternative soul. Call it After Hours, with 20 songs.",
  },
  {
    label: "Head down, headphones on",
    prompt:
      "Create an instrumental focus playlist with warm electronic textures and no vocals. Call it In the Zone, with 25 songs.",
  },
];

function greeting(demo: boolean): Message {
  return {
    id: "welcome",
    role: "ai",
    content: demo
      ? "Welcome to the demo. Describe a mood to explore a sample playlist brief. Connect Spotify to create a playlist with your own direction."
      : "A feeling, a favorite artist, a very specific moment. Tell me what you have in mind, and we’ll find its soundtrack.",
  };
}

const primaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#e9b56d] px-4 py-2.5 text-xs font-semibold text-[#1c1d18] transition-colors hover:bg-[#f1c486] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e9b56d] disabled:cursor-not-allowed disabled:opacity-50";

export function AIChat(props: AIChatProps) {
  const { data: session } = useSession();
  // A demo brief or another account's conversation must never become a live draft.
  return (
    <PlaylistConversation
      key={`${props.demo ? "demo" : "live"}:${session?.user?.id || "guest"}`}
      {...props}
    />
  );
}

function PlaylistConversation({
  initialPrompt = "",
  demo = false,
  onCreated,
}: AIChatProps) {
  const { data: session, status, update } = useSession();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>(() => [greeting(demo)]);
  const [input, setInput] = useState(initialPrompt.slice(0, 2000));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<PlaylistDraft | null>(null);
  const [saved, setSaved] = useState<SavedPlaylist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const transcript = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const authenticated = status === "authenticated" && !session?.error;

  useEffect(() => {
    setInput(initialPrompt.slice(0, 2000));
  }, [initialPrompt]);

  useEffect(() => {
    if (messages.length > 1 && transcript.current) {
      transcript.current.scrollTo({
        top: transcript.current.scrollHeight,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || busy.current) return;
    if (!demo && !authenticated) {
      setError("Connect Spotify to start creating your playlist.");
      return;
    }

    busy.current = true;
    const previousMessages = messages;
    const previousDraft = draft;
    const nextMessages: Message[] = [
      ...messages,
      { id: crypto.randomUUID(), role: "user", content: text },
    ];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setDraft(null);
    setSaved(null);
    setLoading(true);

    try {
      if (demo) {
        setMessages([
          ...nextMessages,
          {
            id: crypto.randomUUID(),
            role: "ai",
            content:
              "Here’s an example of a finished brief: After Hours, a 20-track mix of atmospheric R&B and alternative soul. This is a sample, rather than a generated response to your prompt. Your connected studio will build around exactly what you ask for.",
          },
        ]);
        setDraft({
          name: "After Hours",
          numberOfSongs: 20,
          description:
            "Atmospheric R&B. Alternative soul. A little space to unwind.",
          userRequest:
            "A sample late-night mix of atmospheric R&B and alternative soul.",
        });
        return;
      }

      const pastConversation = previousMessages.filter(
        (message) => message.id !== "welcome",
      );
      const recentConversation =
        pastConversation.length > 20
          ? [pastConversation[0], ...pastConversation.slice(-19)]
          : pastConversation;
      const conversationHistory = recentConversation.map(
        ({ role, content }) => ({ role, content: content.slice(-2000) }),
      );
      // Keep long conversations within the API's request-size limit, including non-ASCII text.
      while (
        conversationHistory.length > 1 &&
        new TextEncoder().encode(
          JSON.stringify({ message: text, conversationHistory }),
        ).length > 28000
      ) {
        conversationHistory.splice(1, 1);
      }
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationHistory }),
      });
      const data: ChatResponse | null = await response.json().catch(() => null);
      if (response.status === 401) await update();
      if (!response.ok)
        throw new Error(
          data?.details ||
            data?.error ||
            `The studio couldn’t process your request (${response.status}). Please try again.`,
        );
      if (!data?.message)
        throw new Error(
          "The studio returned an empty response. Please try again.",
        );

      const ready = data.isPlaylistCreation && Boolean(data.playlistName);
      setMessages([
        ...nextMessages,
        {
          id: crypto.randomUUID(),
          role: "ai",
          content:
            ready && data.message.startsWith("CREATE_PLAYLIST:")
              ? "Your brief is ready. Take a look below, or tell me what you’d like to change."
              : data.message,
        },
      ]);
      if (ready && data.playlistName) {
        const userRequests = nextMessages
          .filter((message) => message.role === "user")
          .map((message) => message.content);
        const fullBrief = userRequests.join("\n");
        const userRequest =
          fullBrief.length <= 6000
            ? fullBrief
            : `${userRequests[0]}\n[Earlier refinements omitted]\n${fullBrief.slice(-3900)}`;
        setDraft({
          name: data.playlistName,
          description:
            `Created with PlaylistHelper · ${data.playlistName}`.slice(0, 300),
          numberOfSongs: data.songCount || 20,
          userRequest,
        });
      }
    } catch (failure) {
      setMessages(previousMessages);
      setDraft(previousDraft);
      setInput(text);
      setError(
        failure instanceof Error
          ? failure.message
          : "The connection was interrupted. Please try again.",
      );
    } finally {
      busy.current = false;
      setLoading(false);
      composer.current?.focus();
    }
  };

  const createPlaylist = async () => {
    if (!draft || busy.current || demo || !authenticated) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/create-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistName: draft.name,
          description: draft.description,
          numberOfSongs: draft.numberOfSongs,
          userRequest: draft.userRequest,
        }),
      });
      const data: CreateResponse | null = await response
        .json()
        .catch(() => null);
      if (response.status === 401) await update();
      if (data?.creationUncertain) {
        setDraft(null);
        setError(
          data.error ||
            "Spotify couldn’t confirm the save. Check your library before creating another playlist.",
        );
        await queryClient.invalidateQueries({
          queryKey: ["spotify", "playlists"],
        });
        onCreated?.();
        return;
      }
      if (data?.partialPlaylist) {
        setSaved({
          name: data.partialPlaylist.name,
          url: data.partialPlaylist.url,
          warning:
            data.details ||
            data.error ||
            "The playlist was created, but not all tracks could be added. Open Spotify to review it.",
        });
        setDraft(null);
        await queryClient.invalidateQueries({
          queryKey: ["spotify", "playlists"],
        });
        onCreated?.();
        return;
      }
      if (!response.ok)
        throw new Error(
          data?.details ||
            data?.error ||
            `Your playlist couldn’t be saved (${response.status}). Please try again.`,
        );
      if (!data?.playlist)
        throw new Error(
          "We couldn’t confirm the save. Check your Spotify library before trying again.",
        );
      setSaved({
        name: data.playlist.name,
        url: data.playlist.external_urls?.spotify,
        count: data.playlist.tracks_added,
        warning: data.warning,
      });
      setDraft(null);
      await queryClient.invalidateQueries({
        queryKey: ["spotify", "playlists"],
      });
      onCreated?.();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "The connection was interrupted. Check your Spotify library before trying again.",
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const reset = () => {
    if (busy.current) return;
    setMessages([greeting(demo)]);
    setDraft(null);
    setSaved(null);
    setError(null);
    setInput("");
    composer.current?.focus();
  };

  return (
    <section
      className="overflow-hidden rounded-xl border border-[#30302c] bg-[#1b1c18]"
      aria-label="Playlist studio"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#30302c] px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e9b56d]/20 bg-[#e9b56d]/5 text-[#e9b56d]">
            <AudioLines className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-[#f3f0e8]">
              Your playlist studio
            </h2>
            <p className="mt-0.5 text-[10px] text-[#a4a79b]">
              {demo
                ? "Demo session · no changes to Spotify"
                : "A conversation, then a collection."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={loading || saving || messages.length === 1}
          aria-label="Start a new conversation"
          title="Start a new conversation"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[#a4a79b] hover:bg-[#2a2c24] hover:text-[#e9b56d] focus-visible:outline-2 focus-visible:outline-[#e9b56d] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div
        ref={transcript}
        className="max-h-[420px] min-h-[240px] space-y-7 overflow-y-auto px-5 py-7 sm:px-7"
        role="log"
        aria-label="Playlist conversation"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
          >
            {message.role === "ai" && (
              <AudioLines
                className="mt-1 h-4 w-4 shrink-0 text-[#e9b56d]"
                aria-hidden="true"
              />
            )}
            <div
              className={
                message.role === "user"
                  ? "max-w-[90%] rounded-lg rounded-br-none bg-[#303228] px-4 py-3 sm:max-w-[80%]"
                  : "max-w-[92%] sm:max-w-[85%]"
              }
            >
              <p
                className={`mb-2 text-[9px] font-medium uppercase tracking-[0.16em] ${message.role === "user" ? "text-[#bfc4ae]" : "text-[#e9b56d]"}`}
              >
                {message.role === "user"
                  ? "You"
                  : demo
                    ? "Studio · sample"
                    : "Studio"}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-7 text-[#dedfd4]">
                {message.content}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div
            className="flex items-center gap-3 text-xs text-[#a4a79b]"
            role="status"
          >
            <Loader2
              className="h-4 w-4 animate-spin text-[#e9b56d]"
              aria-hidden="true"
            />{" "}
            Finding the right direction…
          </div>
        )}
      </div>

      {draft && (
        <div className="mx-5 mb-6 rounded-lg border border-[#4d493a] bg-[#29291f] p-5 sm:mx-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#c8bb99]">
              {demo ? "Sample playlist brief" : "Your playlist brief"}
            </p>
            <span className="flex items-center gap-1.5 text-[10px] text-[#b8baa9]">
              <LockKeyhole className="h-3 w-3" aria-hidden="true" /> Private
              playlist
            </span>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-[#62543c] bg-[#3b3426] text-[#e9b56d]">
              <Disc3 className="h-8 w-8 stroke-1" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="break-words text-xl font-medium tracking-tight text-[#f3f0e8]">
                {draft.name}
              </h3>
              <p className="mt-1 text-xs text-[#b8baa9]">
                {draft.numberOfSongs} tracks · Curated around your brief
              </p>
            </div>
          </div>
          <p className="mt-4 line-clamp-3 text-xs leading-6 text-[#c6c6b7]">
            {demo ? draft.description : draft.userRequest}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {demo || !authenticated ? (
              <LoginButton
                label="Connect Spotify to create"
                callbackUrl={`/dashboard?view=create&prompt=${encodeURIComponent(
                  messages
                    .filter((message) => message.role === "user")
                    .map((message) => message.content)
                    .join("\n")
                    .slice(-2000),
                )}`}
              />
            ) : (
              <button
                type="button"
                onClick={createPlaylist}
                disabled={saving || loading}
                className={primaryButton}
              >
                {saving ? (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {saving ? "Finding tracks & saving…" : "Create on Spotify"}
              </button>
            )}
            <p className="max-w-[240px] text-[10px] leading-relaxed text-[#a4a79b]">
              {demo
                ? "This sample won’t be saved to your library."
                : "Songs are matched on Spotify when you create."}
            </p>
          </div>
        </div>
      )}

      {saved && (
        <div
          className="mx-5 mb-6 rounded-lg border border-[#414b35] bg-[#23291e] p-5 sm:mx-7"
          role="status"
        >
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#c3cda8]">
            <Check className="h-4 w-4" aria-hidden="true" />
            {saved.warning
              ? "Playlist created · review needed"
              : "Added to your Spotify library"}
          </div>
          <h3 className="text-xl font-medium tracking-tight text-[#f3f0e8]">
            {saved.name}
          </h3>
          {saved.count !== undefined && (
            <p className="mt-2 text-xs text-[#b9c1a8]">
              {saved.count} tracks, ready for your next listen.
            </p>
          )}
          {saved.warning && (
            <p className="mt-3 text-xs leading-6 text-[#c8c3a8]">
              {saved.warning}
            </p>
          )}
          {saved.url?.startsWith("https://open.spotify.com/") && (
            <a
              href={saved.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-10 items-center gap-2 text-xs font-medium text-[#e9b56d] hover:underline focus-visible:outline-2 focus-visible:outline-[#e9b56d]"
            >
              Open in Spotify{" "}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">(new tab)</span>
            </a>
          )}
        </div>
      )}

      {error && (
        <div
          className="mx-5 mb-5 flex items-start justify-between gap-3 rounded-lg border border-[#6f4939] bg-[#39291f] px-4 py-3 text-xs leading-6 text-[#eac2a8] sm:mx-7"
          role="alert"
        >
          <div>
            <p>{error}</p>
            {!demo && !authenticated && (
              <div className="mt-3">
                <LoginButton label="Reconnect Spotify" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="shrink-0 rounded p-1 hover:bg-white/5"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="border-t border-[#30302c] px-5 pt-5 pb-4 sm:px-7">
        {messages.length === 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                type="button"
                key={suggestion.label}
                onClick={() => {
                  setInput(suggestion.prompt);
                  composer.current?.focus();
                }}
                className="cursor-pointer rounded-full border border-[#3d3f35] px-3 py-2 text-[10px] text-[#c3c6b7] transition-colors hover:border-[#79725b] hover:text-[#e9b56d] focus-visible:outline-2 focus-visible:outline-[#e9b56d]"
              >
                {suggestion.label}{" "}
                <span className="ml-1 text-[#838875]">↗</span>
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
          className="rounded-lg border border-[#45473b] bg-[#22241d] transition-colors focus-within:border-[#b49161]"
        >
          <label htmlFor="playlist-prompt" className="sr-only">
            Describe your playlist
          </label>
          <textarea
            ref={composer}
            id="playlist-prompt"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="What does your next playlist feel like?"
            maxLength={2000}
            rows={3}
            disabled={loading || saving}
            className="block w-full resize-y border-0 bg-transparent px-4 pt-4 pb-2 text-sm leading-6 text-[#f3f0e8] outline-none placeholder:text-[#898e7d] disabled:opacity-60"
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <p className="text-[9px] text-[#919784]">
              {input.length > 1700
                ? `${input.length} / 2000`
                : "A mood, an artist, a moment. Make it yours."}
            </p>
            <button
              type="submit"
              disabled={!input.trim() || loading || saving}
              aria-label="Send message"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-[#e9b56d] text-[#191b15] transition-colors hover:bg-[#f1c486] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e9b56d] disabled:cursor-not-allowed disabled:bg-[#444739] disabled:text-[#8d937f]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </form>
        <p className="mt-3 text-center text-[9px] leading-relaxed text-[#8e9481]">
          {demo
            ? "You’re exploring a demo. Connect Spotify to make it personal."
            : "Your playlist stays private. You choose when to create it."}
        </p>
      </div>
    </section>
  );
}
