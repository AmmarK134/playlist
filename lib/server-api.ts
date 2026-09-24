import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { authOptions, isSpotifyConfigured } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";
import { describeOpenAIError } from "@/lib/openai-error";

export const privateHeaders = { "Cache-Control": "private, no-store" };

export async function requireSpotifySession() {
  if (!isSpotifyConfigured())
    throw new ApiError("Spotify sign-in isn't configured yet.", 503);
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || session.error || !session.user?.id) {
    throw new ApiError(
      "Your Spotify session has expired. Please connect Spotify again.",
      401,
    );
  }
  return { accessToken: session.accessToken, userId: session.user.id };
}

export function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expected = process.env.NEXTAUTH_URL
    ? new URL(process.env.NEXTAUTH_URL).origin
    : request.nextUrl.origin;
  if (
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== expected)
  ) {
    throw new ApiError("This request must come from PlaylistHelper.", 403);
  }
}

export async function readJson<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new ApiError("Send a JSON request body.", 415);
  }
  const maxBytes = 32_768;
  if (Number(request.headers.get("content-length")) > maxBytes) {
    throw new ApiError("Your request is too long. Please shorten it.", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("A request body is required.", 400);
  let size = 0;
  let body = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ApiError("Your request is too long. Please shorten it.", 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new ApiError("The request contains invalid JSON.", 400);
  }
  const result = schema.safeParse(parsed);
  if (!result.success)
    throw new ApiError(
      result.error.issues[0]?.message ?? "Invalid request.",
      400,
    );
  return result.data;
}

// Per-instance burst guard; multi-instance deployments should also set a shared edge rate limit.
const requestWindows = new Map<string, { count: number; expires: number }>();

export function enforceRateLimit(userId: string, action: "chat" | "create") {
  const now = Date.now();
  for (const [key, window] of requestWindows)
    if (window.expires <= now) requestWindows.delete(key);
  const key = `${userId}:${action}`;
  const limit = action === "chat" ? 10 : 3;
  const window = requestWindows.get(key);
  if (window && window.count >= limit) {
    throw new ApiError(
      "You're moving quickly. Please wait a minute before trying again.",
      429,
      Math.max(1, Math.ceil((window.expires - now) / 1000)),
    );
  }
  if (window) window.count += 1;
  else {
    if (requestWindows.size >= 5000)
      throw new ApiError("The service is busy. Please try again shortly.", 503);
    requestWindows.set(key, { count: 1, expires: now + 60_000 });
  }
}

export function apiErrorResponse(error: unknown) {
  let status = 500;
  let message = "Something went wrong. Please try again.";
  let retryAfter: number | undefined;
  let code: string | undefined;
  if (error instanceof ApiError) {
    status = error.status;
    message = error.message;
    retryAfter = error.retryAfter;
  } else if (error instanceof OpenAI.APIError) {
    const details = describeOpenAIError(error);
    status = details.status;
    message = details.message;
    retryAfter = details.retryAfter;
    code = details.code;
    // Log only classified metadata; provider messages can contain secrets or prompts.
    console.warn("PlaylistHelper OpenAI request failed", {
      status: error.status,
      code: details.providerCode,
      category: details.category,
    });
  } else if (
    error instanceof Error &&
    ["TimeoutError", "AbortError"].includes(error.name)
  ) {
    status = 504;
    message = "The service took too long to respond. Please try again.";
  }
  return NextResponse.json(
    { error: message, ...(code ? { code } : {}) },
    {
      status,
      headers: {
        ...privateHeaders,
        ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
      },
    },
  );
}

export function paginationParams(request: NextRequest, defaultLimit: number) {
  const params = z
    .object({
      limit: z.coerce.number().int().min(1).max(50).default(defaultLimit),
      offset: z.coerce.number().int().min(0).max(100_000).default(0),
    })
    .safeParse({
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
      offset: request.nextUrl.searchParams.get("offset") ?? undefined,
    });
  if (!params.success)
    throw new ApiError(
      "Invalid pagination. Use a limit from 1 to 50 and a non-negative offset.",
      400,
    );
  return params.data;
}
