'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Email } from '@/lib/types'

function parseEmailAddress(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/)
  if (match) {
    return { name: match[1].replace(/"/g, ''), email: match[2] }
  }
  return { name: from, email: from }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const isThisYear = date.getFullYear() === now.getFullYear()
  if (isThisYear) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDaysAgo(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

const HORIZON_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 3, label: '3 days' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
]

function InboxContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')

  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Calm Mode state
  const [calmMode, setCalmMode] = useState(true)
  const [horizonDays, setHorizonDays] = useState(3)
  const [showHorizonModal, setShowHorizonModal] = useState(false)
  const [olderExpanded, setOlderExpanded] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided')
      setLoading(false)
      return
    }

    fetch(`/api/emails?session=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setEmails(data.emails || [])
        }
        setLoading(false)
      })
      .catch(err => {
        setError('Failed to load emails')
        setLoading(false)
      })
  }, [sessionId])

  // Filter emails based on search
  const searchFilteredEmails = emails.filter(email => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      email.subject.toLowerCase().includes(query) ||
      email.from.toLowerCase().includes(query) ||
      email.snippet.toLowerCase().includes(query)
    )
  })

  // Calm Mode filtering
  const recentEmails = searchFilteredEmails.filter(email => {
    if (!calmMode) return true
    const daysAgo = getDaysAgo(email.date)
    // Show all read emails + unread within horizon
    return !email.isUnread || daysAgo <= horizonDays
  })

  const hiddenOlderUnread = searchFilteredEmails.filter(email => {
    if (!calmMode) return false
    const daysAgo = getDaysAgo(email.date)
    return email.isUnread && daysAgo > horizonDays
  })

  const displayedEmails = calmMode && !olderExpanded ? recentEmails : searchFilteredEmails
  const unreadCount = calmMode
    ? recentEmails.filter(e => e.isUnread).length
    : searchFilteredEmails.filter(e => e.isUnread).length

  const handleClearData = async () => {
    if (confirm('Are you sure you want to disconnect and clear all your email data?')) {
      await fetch(`/api/clear?session=${sessionId}`, { method: 'POST' })
      window.location.href = '/'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your emails...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/" className="text-blue-600 hover:underline">Go back home</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-800">Email Prototype</h1>
          {calmMode ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-emerald-600 font-medium">
                Caught up (recent)
              </span>
              {hiddenOlderUnread.length > 0 && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  Older unread hidden
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-500">
              {unreadCount} unread of {emails.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Calm Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Calm Mode</span>
            <button
              onClick={() => {
                setCalmMode(!calmMode)
                setOlderExpanded(false)
              }}
              className={`
                relative w-11 h-6 rounded-full transition-colors duration-200
                ${calmMode ? 'bg-emerald-500' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
                  ${calmMode ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 px-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleClearData}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Disconnect
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 p-4">
          <nav className="space-y-1">
            <a href="#" className="flex items-center justify-between px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                Inbox
              </div>
              {unreadCount > 0 && (
                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Starred
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Snoozed
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Sent
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Drafts
            </a>
          </nav>
        </aside>

        {/* Email List */}
        <main className="flex-1 flex overflow-hidden">
          <div className={`${selectedEmail ? 'w-2/5' : 'w-full'} border-r border-gray-200 overflow-y-auto bg-white flex flex-col`}>
            {/* Calm Mode Hidden Summary Pill */}
            {calmMode && hiddenOlderUnread.length > 0 && !olderExpanded && (
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-700">
                    Hidden: {hiddenOlderUnread.length} unread older than {horizonDays} day{horizonDays !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => setShowHorizonModal(true)}
                    className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {/* Email List */}
            <div className="flex-1 overflow-y-auto">
              {displayedEmails.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchQuery ? 'No emails match your search' : 'No emails found'}
                </div>
              ) : (
                <ul>
                  {displayedEmails.map((email) => {
                    const { name } = parseEmailAddress(email.from)
                    const isSelected = selectedEmail?.id === email.id
                    const isHiddenUnread = calmMode && email.isUnread && getDaysAgo(email.date) > horizonDays

                    return (
                      <li
                        key={email.id}
                        onClick={() => setSelectedEmail(email)}
                        className={`
                          border-b border-gray-100 px-4 py-3 cursor-pointer transition-all duration-200
                          ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                          ${email.isUnread ? 'bg-white' : 'bg-gray-50/50'}
                          ${isHiddenUnread && olderExpanded ? 'opacity-70' : ''}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          {/* Star */}
                          <button
                            className="mt-1 text-gray-300 hover:text-yellow-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className={`w-5 h-5 ${email.isStarred ? 'text-yellow-400 fill-yellow-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm truncate ${email.isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                {name}
                              </span>
                              <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                                {formatDate(email.date)}
                              </span>
                            </div>
                            <div className={`text-sm truncate ${email.isUnread ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                              {email.subject || '(no subject)'}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {email.snippet}
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Older Unread Collapsed Section */}
            {calmMode && hiddenOlderUnread.length > 0 && (
              <div className="border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setOlderExpanded(!olderExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${olderExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <span>
                      {olderExpanded ? 'Hide' : 'Show'} {hiddenOlderUnread.length} older unread
                    </span>
                  </div>
                  {!olderExpanded && (
                    <span className="text-xs text-gray-400">
                      older than {horizonDays}d
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Email Detail */}
          {selectedEmail && (
            <div className="flex-1 overflow-y-auto bg-white p-6">
              <div className="max-w-3xl">
                {/* Close button */}
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="mb-4 text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Subject */}
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  {selectedEmail.subject || '(no subject)'}
                </h2>

                {/* From/To/Date */}
                <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-200">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                    {parseEmailAddress(selectedEmail.from).name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">
                          {parseEmailAddress(selectedEmail.from).name}
                        </span>
                        <span className="text-gray-500 text-sm ml-2">
                          &lt;{parseEmailAddress(selectedEmail.from).email}&gt;
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(selectedEmail.date).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      to {selectedEmail.to}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-gray-700 text-sm leading-relaxed">
                    {selectedEmail.body || selectedEmail.snippet}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Horizon Settings Modal */}
      {showHorizonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Calm Mode Settings
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Hide unread emails older than:
            </p>
            <div className="space-y-2 mb-6">
              {HORIZON_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setHorizonDays(option.value)}
                  className={`
                    w-full px-4 py-3 rounded-lg text-left transition-colors
                    ${horizonDays === option.value
                      ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-700'
                      : 'bg-gray-50 border-2 border-transparent text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Calm Mode hides older unread from your main inbox and count. Nothing is deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowHorizonModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowHorizonModal(false)
                  setOlderExpanded(false)
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function InboxPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <InboxContent />
    </Suspense>
  )
}
