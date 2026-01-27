import { NextRequest, NextResponse } from 'next/server'
import { redis, getEmailsKey, getSessionKey } from '@/lib/redis'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('session')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 })
  }

  try {
    // Check if session exists
    const session = await redis.get(getSessionKey(sessionId))
    if (!session) {
      return NextResponse.json({ error: 'Session not found or expired' }, { status: 404 })
    }

    // Get emails
    const emails = await redis.get(getEmailsKey(sessionId))
    if (!emails) {
      return NextResponse.json({ error: 'No emails found' }, { status: 404 })
    }

    return NextResponse.json({ emails, session })
  } catch (err) {
    console.error('Error fetching emails:', err)
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 })
  }
}
