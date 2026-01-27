import { NextRequest, NextResponse } from 'next/server'
import { redis, getEmailsKey, getSessionKey } from '@/lib/redis'

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('session')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 })
  }

  try {
    // Delete session and emails
    await redis.del(getSessionKey(sessionId))
    await redis.del(getEmailsKey(sessionId))

    return NextResponse.json({ success: true, message: 'Data cleared successfully' })
  } catch (err) {
    console.error('Error clearing data:', err)
    return NextResponse.json({ error: 'Failed to clear data' }, { status: 500 })
  }
}

// Also support GET for easy browser access
export async function GET(request: NextRequest) {
  return POST(request)
}
