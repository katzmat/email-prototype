import { google } from 'googleapis'

export function getOAuth2Client() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/api/auth/callback`
  )
}

export function getAuthUrl(sessionId: string) {
  const oauth2Client = getOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
    state: sessionId,
    prompt: 'consent',
  })
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function fetchEmails(accessToken: string, maxResults: number = 200) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  // First, get list of message IDs from INBOX
  // Using labelIds instead of category:primary for better compatibility
  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    maxResults: maxResults,
    labelIds: ['INBOX'],
  })

  const messages = listResponse.data.messages || []

  console.log(`Found ${messages.length} messages in inbox`)

  if (messages.length === 0) {
    return []
  }

  // Fetch full details for each message (in batches to avoid timeouts)
  const batchSize = 50
  const allEmails = []

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize)
    console.log(`Fetching batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(messages.length / batchSize)}`)

    const batchEmails = await Promise.all(
      batch.map(async (msg) => {
        try {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'full',
          })

          const headers = detail.data.payload?.headers || []
          const getHeader = (name: string) =>
            headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

          // Extract body
          let body = ''
          const payload = detail.data.payload

          if (payload?.body?.data) {
            body = Buffer.from(payload.body.data, 'base64').toString('utf-8')
          } else if (payload?.parts) {
            // Handle multipart messages
            const textPart = payload.parts.find(p => p.mimeType === 'text/plain')
            const htmlPart = payload.parts.find(p => p.mimeType === 'text/html')
            const part = textPart || htmlPart
            if (part?.body?.data) {
              body = Buffer.from(part.body.data, 'base64').toString('utf-8')
            }
          }

          return {
            id: detail.data.id,
            threadId: detail.data.threadId,
            snippet: detail.data.snippet,
            subject: getHeader('Subject'),
            from: getHeader('From'),
            to: getHeader('To'),
            date: getHeader('Date'),
            body: body,
            labelIds: detail.data.labelIds || [],
            isUnread: detail.data.labelIds?.includes('UNREAD') || false,
            isStarred: detail.data.labelIds?.includes('STARRED') || false,
          }
        } catch (err) {
          console.error(`Error fetching message ${msg.id}:`, err)
          return null
        }
      })
    )

    allEmails.push(...batchEmails.filter(e => e !== null))
  }

  console.log(`Successfully fetched ${allEmails.length} emails`)
  return allEmails
}
