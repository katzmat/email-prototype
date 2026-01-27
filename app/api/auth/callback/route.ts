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
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code)

    if (!tokens.access_token) {
      return NextResponse.redirect(`${baseUrl}?error=no_access_token`)
    }

    // Fetch emails from Gmail (200 from Primary)
    const emails = await fetchEmails(tokens.access_token, 200)

    // Store session info
    await redis.set(
      getSessionKey(sessionId),
      {
        createdAt: new Date().toISOString(),
        emailCount: emails.length,
      },
      { ex: SESSION_EXPIRY }
    )

    // Store emails
    await redis.set(
      getEmailsKey(sessionId),
      emails,
      { ex: SESSION_EXPIRY }
    )

    // Redirect to inbox with session
    return NextResponse.redirect(`${baseUrl}/inbox?session=${sessionId}`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(`${baseUrl}?error=auth_failed`)
  }
}
