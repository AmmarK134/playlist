export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken || (session as any)?.access_token;
    
    return NextResponse.json({
      success: true,
      hasSession: !!session,
      hasAccessToken: !!accessToken,
      sessionKeys: session ? Object.keys(session) : [],
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: "Debug failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
