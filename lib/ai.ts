import OpenAI from "openai";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";

export const chatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Describe the playlist you'd like.")
    .max(2000, "Keep your message under 2,000 characters."),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "ai"]),
        content: z.string().max(2000),
      }),
    )
    .max(20)
    .default([]),
});

export const createPlaylistSchema = z.object({
  playlistName: z
    .string()
    .trim()
    .min(1, "Give your playlist a name.")
    .max(100, "Keep your playlist name under 100 characters."),
  description: z.string().trim().max(300).optional(),
  numberOfSongs: z
    .number()
    .int()
    .min(1, "Choose between 1 and 100 songs.")
    .max(100, "Choose between 1 and 100 songs."),
  userRequest: z
    .string()
    .trim()
    .min(1, "Describe the playlist you'd like.")
    .max(8000),
});

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new ApiError(
      "The playlist assistant isn't configured yet. Add the OpenAI API key to enable it.",
      503,
    );
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 60_000,
    maxRetries: 0,
  });
}

export function openAIModel() {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}

export function parseModelJson<T>(
  content: string | null | undefined,
  schema: z.ZodType<T>,
): T {
  if (!content)
    throw new ApiError(
      "The assistant couldn't complete that request. Try a different description.",
      422,
    );
  try {
    const result = schema.safeParse(JSON.parse(content));
    if (result.success) return result.data;
  } catch {
    /* Treat invalid model output as an upstream failure. */
  }
  throw new ApiError(
    "The assistant returned an incomplete response. Please try again.",
    502,
  );
}
