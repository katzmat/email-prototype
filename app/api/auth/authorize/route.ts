import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google'
import { nanoid } from 'nanoid'

export async function GET(request: NextRequest) {
  // Check if a session ID was provided, otherwise generate one
  const searchParams = request.nextUrl.searchParams
  let sessionId = searchParams.get('session')

  if (!sessionId) {
    // Generate a new session ID if none provided
    sessionId = nanoid(12)
  }

  // Generate the Google OAuth URL
  const authUrl = getAuthUrl(sessionId)

  // Redirect to Google's OAuth page
  return NextResponse.redirect(authUrl)
}
