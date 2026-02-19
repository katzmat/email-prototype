#!/usr/bin/env node
// ============================================================
// build-life-graph.js
//
// One-shot script that fetches ~400 Gmail messages, analyzes
// them with Claude to build a Contextual Life & Mailbox Graph,
// then writes the result to services/life-graph-data.json.
//
// Usage:  node scripts/build-life-graph.js
// ============================================================

const path = require('path');
const dotenvResult = require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });
// Manually apply parsed values (some dotenv versions don't inject properly)
if (dotenvResult.parsed) {
  Object.assign(process.env, dotenvResult.parsed);
}

const { google } = require('googleapis');
const fs = require('fs');

// ---- Config ----
const TARGET_MESSAGES = 400;
const BATCH_SIZE = 100;   // Gmail API max per page
const OUTPUT_PATH = path.join(__dirname, '..', 'services', 'life-graph-data.json');

// ---- OAuth setup using session tokens ----
async function createAuthClient() {
  const sessionsDir = path.join(__dirname, '..', 'sessions');
  const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    throw new Error('No active session found. Start the server and connect Gmail first.');
  }

  // Use the most recent session
  const sessionData = JSON.parse(fs.readFileSync(path.join(sessionsDir, files[files.length - 1]), 'utf-8'));

  if (!sessionData.tokens) {
    throw new Error('Session has no tokens. Reconnect Gmail.');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials(sessionData.tokens);

  console.log(`Authenticated as: ${sessionData.userEmail}`);
  return oauth2Client;
}

// ---- Fetch messages in pages ----
async function fetchMessages(auth, count) {
  const gmail = google.gmail({ version: 'v1', auth });
  const allMessages = [];
  let pageToken = null;
  let fetched = 0;

  while (fetched < count) {
    const batchSize = Math.min(BATCH_SIZE, count - fetched);
    console.log(`  Fetching page ${Math.floor(fetched / BATCH_SIZE) + 1} (${batchSize} messages)...`);

    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: batchSize,
      labelIds: ['INBOX'],
      pageToken: pageToken || undefined,
    });

    if (!listResponse.data.messages) break;

    // Fetch metadata for each message in parallel (batches of 20 to avoid rate limits)
    const messageIds = listResponse.data.messages.map(m => m.id);
    const metadataBatch = [];

    for (let i = 0; i < messageIds.length; i += 20) {
      const chunk = messageIds.slice(i, i + 20);
      const results = await Promise.all(
        chunk.map(id => getMessageMetadata(gmail, id))
      );
      metadataBatch.push(...results);

      // Small delay between chunks to be kind to the API
      if (i + 20 < messageIds.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    allMessages.push(...metadataBatch);
    fetched += messageIds.length;
    pageToken = listResponse.data.nextPageToken;

    console.log(`  Total fetched: ${allMessages.length}`);

    if (!pageToken) break;

    // Delay between pages
    await new Promise(r => setTimeout(r, 300));
  }

  return allMessages;
}

async function getMessageMetadata(gmail, messageId) {
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'metadata',
    metadataHeaders: ['From', 'To', 'Subject', 'Date', 'List-Unsubscribe', 'Reply-To', 'Cc'],
  });

  const raw = response.data;
  const headers = {};
  (raw.payload?.headers || []).forEach(h => {
    headers[h.name.toLowerCase()] = h.value;
  });

  return {
    id: raw.id,
    threadId: raw.threadId,
    snippet: raw.snippet || '',
    from: headers.from || '',
    to: headers.to || '',
    cc: headers.cc || '',
    replyTo: headers['reply-to'] || '',
    subject: headers.subject || '(no subject)',
    date: headers.date || '',
    labelIds: raw.labelIds || [],
    isUnread: (raw.labelIds || []).includes('UNREAD'),
    isStarred: (raw.labelIds || []).includes('STARRED'),
    hasUnsubscribe: !!headers['list-unsubscribe'],
    sizeEstimate: raw.sizeEstimate || 0,
  };
}

// ---- Analyze with Claude ----
async function analyzeWithClaude(messages) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // ---- Phase 1: Compute raw statistics locally ----
  console.log('\n--- Phase 1: Computing local statistics ---');
  const stats = computeLocalStats(messages);

  // ---- Phase 2: Send to Claude for deep life-graph analysis ----
  console.log('\n--- Phase 2: Claude deep analysis ---');

  // Prepare a compact representation of all messages for the LLM
  const compactMessages = messages.map(m => ({
    id: m.id,
    from: m.from,
    to: m.to,
    subject: m.subject,
    snippet: m.snippet.substring(0, 120),
    date: m.date,
    labels: m.labelIds.filter(l => l.startsWith('CATEGORY_') || l === 'UNREAD' || l === 'STARRED' || l === 'IMPORTANT'),
    unread: m.isUnread,
    starred: m.isStarred,
    hasUnsub: m.hasUnsubscribe,
  }));

  // Split into chunks of ~130 messages per call to stay within context
  const CHUNK_SIZE = 130;
  const chunks = [];
  for (let i = 0; i < compactMessages.length; i += CHUNK_SIZE) {
    chunks.push(compactMessages.slice(i, i + CHUNK_SIZE));
  }

  const chunkAnalyses = [];

  for (let c = 0; c < chunks.length; c++) {
    console.log(`  Analyzing chunk ${c + 1}/${chunks.length} (${chunks[c].length} messages)...`);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: LIFE_GRAPH_ANALYSIS_PROMPT,
      messages: [{
        role: 'user',
        content: `Analyze these ${chunks[c].length} emails from Matt's inbox. This is chunk ${c + 1} of ${chunks.length}.\n\n${JSON.stringify(chunks[c], null, 1)}`,
      }],
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        chunkAnalyses.push(JSON.parse(jsonMatch[0]));
        console.log(`  Chunk ${c + 1} analysis complete.`);
      } catch (e) {
        console.warn(`  Chunk ${c + 1} JSON parse failed, skipping.`);
      }
    }

    // Rate limit courtesy
    if (c < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // ---- Phase 3: Synthesize all chunks into final life graph ----
  console.log('\n--- Phase 3: Synthesizing final life graph ---');

  const synthesisResponse = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 12000,
    system: LIFE_GRAPH_SYNTHESIS_PROMPT,
    messages: [{
      role: 'user',
      content: `Synthesize these ${chunkAnalyses.length} chunk analyses and the raw statistics into a final Contextual Life & Mailbox Graph.\n\n## Raw Statistics\n${JSON.stringify(stats, null, 2)}\n\n## Chunk Analyses\n${JSON.stringify(chunkAnalyses, null, 2)}`,
    }],
  });

  const synthesisText = synthesisResponse.content[0].text;
  const synthesisJson = synthesisText.match(/\{[\s\S]*\}/);
  if (!synthesisJson) {
    throw new Error('Synthesis returned non-JSON response');
  }

  return JSON.parse(synthesisJson[0]);
}

// ---- Local statistics computation ----
function computeLocalStats(messages) {
  const senderFreq = {};
  const senderDomains = {};
  const labelDist = {};
  const hourDist = {};
  const dayDist = {};
  const threadSizes = {};
  const unreadByLabel = {};
  const starredIds = [];
  const subjectWords = {};
  const replyPatterns = {};

  const selfEmail = 'katzmat@gmail.com';

  for (const m of messages) {
    // Sender frequency
    const fromLower = (m.from || '').toLowerCase();
    const senderKey = fromLower.replace(/.*</, '').replace(/>.*/, '').trim() || fromLower;
    senderFreq[senderKey] = (senderFreq[senderKey] || 0) + 1;

    // Domain frequency
    const domain = senderKey.split('@')[1] || 'unknown';
    senderDomains[domain] = (senderDomains[domain] || 0) + 1;

    // Label distribution
    for (const label of m.labelIds) {
      labelDist[label] = (labelDist[label] || 0) + 1;
      if (m.isUnread) {
        unreadByLabel[label] = (unreadByLabel[label] || 0) + 1;
      }
    }

    // Time-of-day distribution
    try {
      const d = new Date(m.date);
      if (!isNaN(d.getTime())) {
        const hour = d.getHours();
        hourDist[hour] = (hourDist[hour] || 0) + 1;
        const day = d.toLocaleDateString('en-US', { weekday: 'long' });
        dayDist[day] = (dayDist[day] || 0) + 1;
      }
    } catch (e) {}

    // Thread sizes
    threadSizes[m.threadId] = (threadSizes[m.threadId] || 0) + 1;

    // Starred
    if (m.isStarred) starredIds.push(m.id);

    // Subject word frequency (skip very common words)
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'your', 'you', 'for', 'and', 'or', 'to', 'in', 'of', 'on', 'at', 'from', 'with', 're:', 'fwd:', 'fw:']);
    const words = (m.subject || '').toLowerCase().split(/\s+/);
    for (const w of words) {
      const clean = w.replace(/[^a-z0-9]/g, '');
      if (clean.length > 2 && !stopWords.has(clean)) {
        subjectWords[clean] = (subjectWords[clean] || 0) + 1;
      }
    }

    // Reply-to patterns (indicates automated vs personal)
    if (m.replyTo && m.replyTo !== m.from) {
      replyPatterns[senderKey] = m.replyTo;
    }
  }

  // Top senders
  const topSenders = Object.entries(senderFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60)
    .map(([email, count]) => ({ email, count }));

  // Top domains
  const topDomains = Object.entries(senderDomains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([domain, count]) => ({ domain, count }));

  // Multi-message threads (conversations)
  const activeThreads = Object.entries(threadSizes)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([threadId, count]) => ({ threadId, messageCount: count }));

  // Top subject words
  const topSubjectWords = Object.entries(subjectWords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word, count]) => ({ word, count }));

  return {
    totalMessages: messages.length,
    unreadCount: messages.filter(m => m.isUnread).length,
    starredCount: starredIds.length,
    hasUnsubscribeCount: messages.filter(m => m.hasUnsubscribe).length,
    topSenders,
    topDomains,
    labelDistribution: labelDist,
    hourDistribution: hourDist,
    dayDistribution: dayDist,
    activeThreads,
    topSubjectWords,
    unreadByLabel,
    replyPatterns: Object.entries(replyPatterns).slice(0, 20).map(([sender, replyTo]) => ({ sender, replyTo })),
  };
}

// ---- LLM Prompts ----

const LIFE_GRAPH_ANALYSIS_PROMPT = `You are a user-context analyst building a "Contextual Life & Mailbox Graph" for Matt (katzmat@gmail.com).

Your job: Analyze a batch of real Gmail messages and extract structured context about Matt's life, relationships, habits, and inbox patterns.

For this chunk, identify and return JSON with:

{
  "senders": [
    {
      "email": "sender@domain.com",
      "name": "Display Name",
      "relationship": "who this person/org is to Matt",
      "category": "person|school|healthcare|finance|retail|newsletter|social|app|political|work|family|service",
      "frequency": "how often they appear in this chunk",
      "typicalContent": "what they usually send",
      "typicalAction": "what Matt likely does with these (read|reply|ignore|archive|act-on)",
      "engagementSignals": "any signals of how Matt engages (opened, replied, starred, etc.)",
      "priority": "high|medium|low|noise"
    }
  ],
  "lifeThreads": [
    {
      "topic": "descriptive name like 'Girl Scout Cookie Season' or 'Tax Prep 2025'",
      "status": "active|dormant|recurring|one-off",
      "relatedSenders": ["sender emails involved"],
      "relatedSubjects": ["key subject lines or fragments"],
      "timeframe": "when this is active",
      "actionPatterns": "what typically needs to happen",
      "urgencyPattern": "time-sensitive|routine|seasonal|background"
    }
  ],
  "inboxBehaviors": {
    "unreadPatterns": "what tends to stay unread vs. gets read",
    "starredPatterns": "what gets starred, if any",
    "labelUsage": "how labels/categories are distributed",
    "volumeByCategory": "rough breakdown of message types"
  },
  "contentPatterns": {
    "actionRequired": ["types of emails that need action"],
    "informationalOnly": ["types that are just FYI"],
    "recurringFormats": ["patterns like daily digests, weekly newsletters, etc."]
  }
}

Be specific — use real sender names, real subject fragments, real life details you observe. Don't generalize or make assumptions beyond what the data shows.`;

const LIFE_GRAPH_SYNTHESIS_PROMPT = `You are synthesizing multiple chunk analyses and raw inbox statistics into a single, authoritative "Contextual Life & Mailbox Graph" for Matt (katzmat@gmail.com).

This life graph will be used by an AI email prioritization system to:
1. Score each incoming email's TRUE priority and urgency for Matt personally
2. Generate deeply personalized "upshot" summaries
3. Determine what action Matt likely needs to take
4. Understand where this email fits in Matt's bigger life picture
5. Decide timing and presentation (urgent interrupt vs. batch vs. background)

Return a comprehensive JSON structure:

{
  "identity": {
    "email": "katzmat@gmail.com",
    "name": "Matt Katz",
    "location": "city/neighborhood",
    "household": "who lives with Matt",
    "occupation": "what Matt does for work",
    "generatedAt": "ISO timestamp",
    "messagesSampled": number
  },

  "coordinationCircle": [
    {
      "name": "Person/Org Name",
      "email": "their email",
      "role": "partner|child|teacher|therapist|troop-leader|coworker|doctor|service-provider|friend",
      "relationship": "detailed description of relationship",
      "communicationNorms": {
        "tone": "formal|casual|transactional",
        "frequency": "daily|weekly|occasional|rare",
        "typicalTopics": ["list of usual topics"],
        "typicalActions": ["what Matt does with their emails"],
        "replyExpectation": "always|usually|sometimes|rarely"
      },
      "priorityWeight": 0.0-1.0
    }
  ],

  "lifeThreads": [
    {
      "id": "slug-id",
      "name": "Human-readable topic name",
      "status": "active|dormant|recurring|seasonal|one-off|completed",
      "description": "What this life thread is about",
      "relatedPeople": ["names"],
      "relatedSenders": ["emails"],
      "keywords": ["subject/snippet keywords that signal this thread"],
      "actionPatterns": "What typically needs to happen",
      "urgencyDefault": "high|medium|low",
      "timeframe": "when this is relevant",
      "nextExpectedAction": "what Matt likely needs to do next, if known"
    }
  ],

  "mailboxProfile": {
    "primaryUses": ["top 5 uses of this mailbox in order"],
    "jobToBeDone": "the overarching purpose of this inbox for Matt",
    "volumeProfile": {
      "dailyAverage": number,
      "signalToNoiseRatio": "percentage of actionable vs. noise",
      "topNoiseCategories": ["ranked list"],
      "topSignalCategories": ["ranked list"]
    },
    "triageStrategy": {
      "description": "how Matt appears to triage based on read/unread/starred patterns",
      "batchingWindows": "any timing patterns in email checking",
      "archiveVsDelete": "does Matt archive or delete",
      "toleranceForUnread": "inbox-zero or running backlog"
    },
    "engagementPatterns": {
      "alwaysReads": ["types/senders Matt always engages with"],
      "usuallyIgnores": ["types/senders Matt rarely engages with"],
      "quickActions": ["reply|archive|star|forward — by content type"],
      "deepReads": ["types that get full attention"]
    }
  },

  "senderRegistry": [
    {
      "email": "sender@domain.com",
      "name": "Display Name",
      "category": "person|school|healthcare|finance|retail|newsletter|social|app|political|work|family|service|delivery|coordination",
      "subcategory": "more specific label",
      "relationship": "relationship to Matt",
      "priority": "critical|high|medium|low|noise",
      "typicalContent": "what they send",
      "typicalAction": "what Matt does with it",
      "frequency": "daily|weekly|occasional|rare|one-off",
      "engagementRate": "high|medium|low|none",
      "isAutomated": true/false,
      "isPersonal": true/false,
      "lifeThreads": ["thread IDs this sender relates to"]
    }
  ],

  "priorityRules": {
    "alwaysHighPriority": [
      {
        "condition": "description of when to always prioritize",
        "reason": "why this matters to Matt",
        "examples": ["sender/subject examples"]
      }
    ],
    "contextualPriority": [
      {
        "condition": "when this becomes high priority",
        "context": "what makes it situationally important",
        "examples": ["examples"]
      }
    ],
    "alwaysLowPriority": [
      {
        "condition": "what to always deprioritize",
        "reason": "why",
        "examples": ["examples"]
      }
    ],
    "timeSensitivePatterns": [
      {
        "pattern": "description",
        "urgencyWindow": "how quickly Matt should see this",
        "examples": ["examples"]
      }
    ]
  },

  "contentDistillation": {
    "upstyleRules": [
      {
        "senderPattern": "who/what type",
        "contentPattern": "what kind of email",
        "distillAs": "how to summarize for Matt — what framing, what details to lead with",
        "exampleGood": "example of a good upshot for this type",
        "exampleBad": "example of a bad/generic summary to avoid"
      }
    ],
    "actionDetection": [
      {
        "pattern": "type of email",
        "likelyAction": "what Matt typically needs to do",
        "urgency": "immediate|today|this-week|whenever",
        "phrasing": "how to phrase the action suggestion"
      }
    ]
  }
}

Be exhaustive. Use real names, real emails, real subjects from the data. This graph will directly power email intelligence. The more specific and grounded in observed data, the better the system works.`;


// ---- Main ----
async function main() {
  console.log('=== Building Contextual Life & Mailbox Graph ===\n');

  // Step 1: Authenticate
  console.log('Step 1: Authenticating...');
  const auth = await createAuthClient();

  // Step 2: Fetch messages
  console.log(`\nStep 2: Fetching ${TARGET_MESSAGES} messages from Gmail...`);
  const messages = await fetchMessages(auth, TARGET_MESSAGES);
  console.log(`\nFetched ${messages.length} total messages.`);

  // Step 3: Save raw messages for analysis
  const rawPath = path.join(__dirname, '..', 'services', 'raw-messages-400.json');
  console.log(`\nStep 3: Saving raw messages to ${rawPath}...`);
  fs.writeFileSync(rawPath, JSON.stringify(messages, null, 2));
  console.log('Raw messages saved.');

  // Step 3b: Compute local statistics
  console.log('\nStep 3b: Computing local statistics...');
  const stats = computeLocalStats(messages);
  const statsPath = path.join(__dirname, '..', 'services', 'message-stats.json');
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  console.log(`Statistics saved to ${statsPath}`);
  console.log(`  - ${stats.topSenders.length} top senders`);
  console.log(`  - ${stats.topDomains.length} top domains`);
  console.log(`  - ${stats.activeThreads.length} active threads`);
  console.log(`  - ${stats.topSubjectWords.length} top subject words`);
  console.log(`  - Unread: ${stats.unreadCount}/${stats.totalMessages}`);

  // Skip Claude analysis — will be done externally
  console.log('\nNote: Claude API analysis skipped (will be done externally).');
  console.log('Use raw-messages-400.json and message-stats.json for analysis.');
  return;

  // Original Claude analysis (kept for reference)
  const lifeGraph = await analyzeWithClaude(messages);

  // Add metadata
  lifeGraph._meta = {
    generatedAt: new Date().toISOString(),
    messagesSampled: messages.length,
    generatedBy: 'build-life-graph.js',
    version: 1,
  };

  // Step 4: Write to disk
  console.log(`\nStep 4: Writing life graph to ${OUTPUT_PATH}...`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(lifeGraph, null, 2));
  console.log(`\nDone! Life graph written to ${OUTPUT_PATH}`);
  console.log(`  - ${(lifeGraph.coordinationCircle || []).length} people in coordination circle`);
  console.log(`  - ${(lifeGraph.lifeThreads || []).length} active life threads`);
  console.log(`  - ${(lifeGraph.senderRegistry || []).length} senders in registry`);
  console.log(`  - ${(lifeGraph.priorityRules?.alwaysHighPriority || []).length} high-priority rules`);
}

main().catch(err => {
  console.error('\nFailed:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
