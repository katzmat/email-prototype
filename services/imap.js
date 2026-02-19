const { ImapFlow } = require('imapflow');
const config = require('../config');

/**
 * Create an IMAP client configured for the user's provider.
 * Gmail: basic auth with app password.
 * Yahoo: XOAUTH2 with access token.
 */
function createImapClient(user) {
  const isGmail = user.email.endsWith('@gmail.com') || user.email.endsWith('@googlemail.com');

  if (isGmail) {
    return new ImapFlow({
      host: config.imap.gmailHost,
      port: 993,
      secure: true,
      auth: { user: user.email, pass: user.credential },
      logger: false,
    });
  }

  // Yahoo — app password (basic auth)
  return new ImapFlow({
    host: config.imap.yahooHost,
    port: 993,
    secure: true,
    auth: { user: user.email, pass: user.credential },
    logger: false,
  });
}

/**
 * Fetch latest inbox messages via IMAP.
 * Returns { messages } in the same shape as the old /api/emails response.
 */
async function fetchInboxMessages(user, maxResults = 30) {
  const client = createImapClient(user);
  const isGmail = user.email.endsWith('@gmail.com') || user.email.endsWith('@googlemail.com');

  try {
    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    try {
      const mailbox = client.mailbox;
      const total = mailbox.exists || 0;
      if (total === 0) return { messages: [] };

      // Fetch the latest N messages by sequence number
      const start = Math.max(1, total - maxResults + 1);
      const range = `${start}:*`;

      const messages = [];

      for await (const msg of client.fetch(range, {
        envelope: true,
        flags: true,
        bodyStructure: true,
        ...(isGmail ? { labels: true } : {}),
        source: { maxBytes: 4096 }, // for snippet extraction
      })) {
        const normalized = normalizeImapMessage(msg, user.provider, user.email);
        messages.push(normalized);
      }

      // Reverse so newest first
      messages.reverse();

      return { messages };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

/**
 * Normalize an IMAP message to the GmailMessage-compatible shape.
 */
function normalizeImapMessage(msg, provider, email) {
  const envelope = msg.envelope || {};
  const flags = msg.flags ? Array.from(msg.flags) : [];
  const gmLabels = msg.labels ? Array.from(msg.labels) : [];

  // Build from string
  const fromAddr = envelope.from?.[0];
  const fromStr = fromAddr
    ? (fromAddr.name ? `${fromAddr.name} <${fromAddr.address}>` : fromAddr.address)
    : '';

  // Build to string
  const toAddr = envelope.to?.[0];
  const toStr = toAddr
    ? (toAddr.name ? `${toAddr.name} <${toAddr.address}>` : toAddr.address)
    : '';

  // Map flags to labelIds
  const labelIds = ['INBOX'];
  if (!flags.includes('\\Seen')) labelIds.push('UNREAD');
  if (flags.includes('\\Flagged')) labelIds.push('STARRED');

  // Gmail: map X-GM-LABELS to category labelIds
  if (provider === 'gmail') {
    for (const label of gmLabels) {
      // Gmail labels come in various formats
      if (label === '\\Important' || label === '\\\\Important') labelIds.push('IMPORTANT');
      if (label === '\\Starred' || label === '\\\\Starred') labelIds.push('STARRED');
      // Category labels
      const catMatch = label.match(/^(?:\\\\)?CATEGORY_(\w+)$/i);
      if (catMatch) {
        labelIds.push(`CATEGORY_${catMatch[1].toUpperCase()}`);
      }
      if (label.toLowerCase().includes('spam')) labelIds.push('SPAM');
    }
  }

  // Extract snippet from source
  let snippet = '';
  if (msg.source) {
    snippet = extractSnippet(msg.source);
  }

  // Compute webLink
  let webLink;
  if (provider === 'gmail') {
    // Gmail web link uses the message UID — hex encoding of X-GM-MSGID if available,
    // but UID works for basic deep linking
    webLink = `https://mail.google.com/mail/u/0/#inbox/${msg.uid}`;
  } else {
    webLink = 'https://mail.yahoo.com';
  }

  // Threading: use messageId and inReplyTo for grouping
  const messageId = envelope.messageId || null;
  const inReplyTo = envelope.inReplyTo || null;

  return {
    id: String(msg.uid),
    threadId: String(msg.uid),
    snippet,
    from: fromStr,
    to: toStr,
    subject: envelope.subject || '(no subject)',
    date: envelope.date ? new Date(envelope.date).toISOString() : '',
    labelIds,
    isUnread: !flags.includes('\\Seen'),
    isStarred: flags.includes('\\Flagged'),
    webLink,
    messageId,
    inReplyTo,
  };
}

/**
 * Extract a plain-text snippet (~200 chars) from the raw message source.
 */
function extractSnippet(source) {
  const str = typeof source === 'string' ? source : source.toString('utf-8');

  // Find the body after the blank line separating headers from body
  const bodyStart = str.indexOf('\r\n\r\n');
  if (bodyStart === -1) return '';

  let body = str.substring(bodyStart + 4);

  // Strip HTML tags if present
  body = body.replace(/<[^>]+>/g, ' ');
  // Decode common entities
  body = body.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  // Collapse whitespace
  body = body.replace(/\s+/g, ' ').trim();

  return body.substring(0, 200);
}

/**
 * Group messages into conversation threads.
 * Uses messageId/inReplyTo for reference-based threading,
 * then falls back to subject normalization (strip Re:/Fwd: prefixes).
 * Returns the same messages array with `threadId` updated to a shared value
 * for messages in the same conversation.
 */
function assignThreadIds(messages) {
  // Map messageId → threadId
  const idToThread = new Map();
  let nextThread = 1;

  // Normalize subject for fallback grouping
  function normalizeSubject(subj) {
    return (subj || '')
      .replace(/^(re|fwd|fw)\s*:\s*/gi, '')
      .replace(/^(re|fwd|fw)\s*:\s*/gi, '') // nested
      .trim()
      .toLowerCase();
  }

  // Pass 1: assign by reference chain
  for (const msg of messages) {
    let threadId = null;

    // Check if this replies to a known message
    if (msg.inReplyTo && idToThread.has(msg.inReplyTo)) {
      threadId = idToThread.get(msg.inReplyTo);
    }

    if (!threadId) {
      threadId = `thread-${nextThread++}`;
    }

    if (msg.messageId) {
      idToThread.set(msg.messageId, threadId);
    }

    msg.threadId = threadId;
  }

  // Pass 2: merge threads with matching subjects
  const subjectToThread = new Map();
  const threadMerge = new Map(); // old threadId → canonical threadId

  for (const msg of messages) {
    const normSubj = normalizeSubject(msg.subject);
    if (!normSubj) continue;

    const existingThread = subjectToThread.get(normSubj);
    if (existingThread && existingThread !== msg.threadId) {
      // Merge: map the newer threadId to the existing one
      threadMerge.set(msg.threadId, existingThread);
      msg.threadId = existingThread;
    } else {
      // Resolve through merge chain
      let resolved = msg.threadId;
      while (threadMerge.has(resolved)) {
        resolved = threadMerge.get(resolved);
      }
      msg.threadId = resolved;
      subjectToThread.set(normSubj, resolved);
    }
  }

  // Final pass: resolve all merge chains
  for (const msg of messages) {
    let resolved = msg.threadId;
    while (threadMerge.has(resolved)) {
      resolved = threadMerge.get(resolved);
    }
    msg.threadId = resolved;
  }

  return messages;
}

module.exports = { createImapClient, fetchInboxMessages, assignThreadIds };
