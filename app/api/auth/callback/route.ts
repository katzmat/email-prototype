import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode, fetchEmails } from '@/lib/google'
import { redis, getSessionKey, getEmailsKey, SESSION_EXPIRY } from '@/lib/redis'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const sessionId = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(`${baseUrl}?error=${error}`)
  }

  if (!code || !sessionId) {
    return NextResponse.redirect(`${baseUrl}?error=missing_params`)
  }

  try {
    console.log('Starting OAuth callback for session:', sessionId)

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code)
    console.log('Got tokens, access_token present:', !!tokens.access_token)

    if (!tokens.access_token) {
      return NextResponse.redirect(`${baseUrl}?error=no_access_token`)
    }

    // Fetch emails from Gmail (200 from Inbox)
    console.log('Fetching emails...')
    const emails = await fetchEmails(tokens.access_token, 200)
    console.log('Fetched emails count:', emails.length)

    // Store session info
    console.log('Storing session to Redis...')
    await redis.set(
      getSessionKey(sessionId),
      {
        createdAt: new Date().toISOString(),
        emailCount: emails.length,
      },
      { ex: SESSION_EXPIRY }
    )

    // Store emails
    console.log('Storing emails to Redis...')
    await redis.set(
      getEmailsKey(sessionId),
      emails,
      { ex: SESSION_EXPIRY }
    )
    console.log('Successfully stored emails to Redis')

    // Redirect to inbox with session
    return NextResponse.redirect(`${baseUrl}/inbox?session=${sessionId}`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    const errorMessage = err instanceof Error ? err.message : 'unknown_error'
    return NextResponse.redirect(`${baseUrl}?error=${encodeURIComponent(errorMessage)}`)
  }
}
