export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ 
      success: true, 
      message: "API is working",
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
