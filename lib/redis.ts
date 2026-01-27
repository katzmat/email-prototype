import { Redis } from '@upstash/redis'

// Initialize Redis client using environment variables
// Vercel automatically sets these when you connect Upstash
export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

// Helper to generate session keys
export function getSessionKey(sessionId: string) {
  return `session:${sessionId}`
}

export function getEmailsKey(sessionId: string) {
  return `emails:${sessionId}`
}

// Session expires after 7 days
export const SESSION_EXPIRY = 60 * 60 * 24 * 7
