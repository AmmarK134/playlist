import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions, isSpotifyConfigured } from "@/lib/auth";

export const runtime = "nodejs";

const authHandler = NextAuth(authOptions);
type RouteContext = { params: Promise<{ nextauth: string[] }> };

async function handler(request: NextRequest, context: RouteContext) {
  if (!isSpotifyConfigured()) {
    const { nextauth } = await context.params;
    const headers = { "Cache-Control": "private, no-store" };
    // Public previews have no signed-in account and need no placeholder secret.
    if (request.method === "GET" && nextauth[0] === "session") {
      return NextResponse.json(null, { headers });
    }
    if (request.method === "GET" && nextauth[0] === "providers") {
      return NextResponse.json({}, { headers });
    }
    return NextResponse.json(
      { error: "Spotify sign-in isn't configured yet." },
      { status: 503, headers },
    );
  }
  return authHandler(request, context);
}

export { handler as GET, handler as POST };
