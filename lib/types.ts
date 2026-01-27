export interface Email {
  id: string
  threadId: string
  snippet: string
  subject: string
  from: string
  to: string
  date: string
  body: string
  labelIds: string[]
  isUnread: boolean
  isStarred: boolean
}

export interface Session {
  createdAt: string
  emailCount: number
}
