// ============================================================
// Profile Agent — Auto-generates a life-graph for any user
//
// On first login, analyzes ~200 emails via Claude to build a
// Contextual Life & Mailbox Graph stored per-user on disk.
// ============================================================

const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const { fetchInboxMessages } = require('./imap');

const PROFILES_DIR = path.join(__dirname, 'profiles');
const PROFILE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-flight builds — prevents duplicate builds for same user
const buildingProfiles = new Map();

// ---- Check if profile exists and is fresh ----

function getProfilePath(userEmail) {
  const safe = userEmail.replace(/[^a-zA-Z0-9@._-]/g, '_');
  return path.join(PROFILES_DIR, `${safe}.json`);
}

function loadProfile(userEmail) {
  const filePath = getProfilePath(userEmail);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const profile = JSON.parse(raw);

    // Check freshness
    if (profile._meta && profile._meta.generatedAt) {
      const age = Date.now() - new Date(profile._meta.generatedAt).getTime();
      if (age > PROFILE_MAX_AGE_MS) {
        console.log(`Profile for ${userEmail} is ${Math.round(age / 86400000)}d old — will rebuild`);
        return null;
      }
    }

    return profile;
  } catch {
    return null;
  }
}

// ---- Profile status check (non-blocking) ----

function getProfileStatus(userEmail) {
  if (buildingProfiles.has(userEmail)) return 'building';
  if (loadProfile(userEmail)) return 'ready';
  return 'none';
}

// ---- Build profile (async, can be awaited or fire-and-forget) ----

async function buildProfile(user) {
  const userEmail = user.email;

  // Already building?
  if (buildingProfiles.has(userEmail)) {
    return buildingProfiles.get(userEmail);
  }

  const promise = _doBuildProfile(user);
  buildingProfiles.set(userEmail, promise);

  try {
    const result = await promise;
    return result;
  } finally {
    buildingProfiles.delete(userEmail);
  }
}

async function _doBuildProfile(user) {
  const userEmail = user.email;
  console.log(`[profile-agent] Building profile for ${userEmail}...`);

  if (!config.processor.anthropicApiKey) {
    console.warn('[profile-agent] No ANTHROPIC_API_KEY — cannot build profile');
    return null;
  }

  const client = new Anthropic({ apiKey: config.processor.anthropicApiKey });

  // Step 1: Fetch emails
  console.log('[profile-agent] Fetching 200 emails...');
  const { messages } = await fetchInboxMessages(user, 200);
  console.log(`[profile-agent] Got ${messages.length} emails`);

  if (messages.length < 10) {
    console.warn('[profile-agent] Too few emails to build meaningful profile');
    return null;
  }

  // Step 2: Compute local stats
  const stats = computeLocalStats(messages, userEmail);

  // Step 3: Prepare compact messages for LLM
  const compactMessages = messages.map(m => ({
    from: m.from,
    subject: m.subject,
    snippet: (m.snippet || '').substring(0, 120),
    date: m.date,
    labels: (m.labelIds || []).filter(l =>
      l.startsWith('CATEGORY_') || l === 'UNREAD' || l === 'STARRED' || l === 'IMPORTANT'
    ),
    unread: m.isUnread,
    starred: m.isStarred,
  }));

  // Step 4: Chunk and analyze
  const CHUNK_SIZE = 130;
  const chunks = [];
  for (let i = 0; i < compactMessages.length; i += CHUNK_SIZE) {
    chunks.push(compactMessages.slice(i, i + CHUNK_SIZE));
  }

  const chunkAnalyses = [];
  for (let c = 0; c < chunks.length; c++) {
    console.log(`[profile-agent] Analyzing chunk ${c + 1}/${chunks.length} (${chunks[c].length} messages)...`);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: buildAnalysisPrompt(userEmail),
      messages: [{
        role: 'user',
        content: `Analyze these ${chunks[c].length} emails. This is chunk ${c + 1} of ${chunks.length}.\n\n${JSON.stringify(chunks[c], null, 1)}`,
      }],
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        chunkAnalyses.push(JSON.parse(jsonMatch[0]));
      } catch (e) {
        console.warn(`[profile-agent] Chunk ${c + 1} JSON parse failed, skipping`);
      }
    }

    if (c < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Step 5: Synthesize
  console.log('[profile-agent] Synthesizing life graph...');

  const synthesisResponse = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 12000,
    system: buildSynthesisPrompt(userEmail),
    messages: [{
      role: 'user',
      content: `Synthesize these ${chunkAnalyses.length} chunk analyses and the raw statistics into a final Contextual Life & Mailbox Graph.\n\n## Raw Statistics\n${JSON.stringify(stats, null, 2)}\n\n## Chunk Analyses\n${JSON.stringify(chunkAnalyses, null, 2)}`,
    }],
  });

  const synthesisText = synthesisResponse.content[0].text;
  const synthesisJson = synthesisText.match(/\{[\s\S]*\}/);
  if (!synthesisJson) {
    console.error('[profile-agent] Synthesis returned non-JSON');
    return null;
  }

  const lifeGraph = JSON.parse(synthesisJson[0]);

  // Add metadata
  lifeGraph._meta = {
    generatedAt: new Date().toISOString(),
    messagesSampled: messages.length,
    userEmail,
    version: 1,
  };

  // Step 6: Write to disk
  const filePath = getProfilePath(userEmail);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(lifeGraph, null, 2));
  console.log(`[profile-agent] Profile saved to ${filePath}`);
  console.log(`  - ${(lifeGraph.coordinationCircle || []).length} people in coordination circle`);
  console.log(`  - ${(lifeGraph.lifeThreads || []).length} life threads`);
  console.log(`  - ${(lifeGraph.senderRegistry || []).length} senders in registry`);

  return lifeGraph;
}

// ---- Local statistics (adapted from build-life-graph.js) ----

function computeLocalStats(messages, selfEmail) {
  const senderFreq = {};
  const senderDomains = {};
  const labelDist = {};
  const threadSizes = {};
  const subjectWords = {};

  for (const m of messages) {
    const fromLower = (m.from || '').toLowerCase();
    const senderKey = fromLower.replace(/.*</, '').replace(/>.*/, '').trim() || fromLower;
    senderFreq[senderKey] = (senderFreq[senderKey] || 0) + 1;

    const domain = senderKey.split('@')[1] || 'unknown';
    senderDomains[domain] = (senderDomains[domain] || 0) + 1;

    for (const label of (m.labelIds || [])) {
      labelDist[label] = (labelDist[label] || 0) + 1;
    }

    if (m.threadId) {
      threadSizes[m.threadId] = (threadSizes[m.threadId] || 0) + 1;
    }

    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'your', 'you', 'for', 'and', 'or', 'to', 'in', 'of', 'on', 'at', 'from', 'with', 're:', 'fwd:', 'fw:']);
    const words = (m.subject || '').toLowerCase().split(/\s+/);
    for (const w of words) {
      const clean = w.replace(/[^a-z0-9]/g, '');
      if (clean.length > 2 && !stopWords.has(clean)) {
        subjectWords[clean] = (subjectWords[clean] || 0) + 1;
      }
    }
  }

  const topSenders = Object.entries(senderFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 60)
    .map(([email, count]) => ({ email, count }));

  const topDomains = Object.entries(senderDomains)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([domain, count]) => ({ domain, count }));

  const activeThreads = Object.entries(threadSizes)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([threadId, count]) => ({ threadId, messageCount: count }));

  const topSubjectWords = Object.entries(subjectWords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word, count]) => ({ word, count }));

  return {
    totalMessages: messages.length,
    unreadCount: messages.filter(m => m.isUnread).length,
    starredCount: messages.filter(m => m.isStarred).length,
    topSenders,
    topDomains,
    labelDistribution: labelDist,
    activeThreads,
    topSubjectWords,
  };
}

// ---- LLM Prompts (generalized from build-life-graph.js) ----

function buildAnalysisPrompt(userEmail) {
  return `You are a user-context analyst building a "Contextual Life & Mailbox Graph" for the user (${userEmail}).

Your job: Analyze a batch of real email messages and extract structured context about the user's life, relationships, habits, and inbox patterns.

For this chunk, identify and return JSON with:

{
  "senders": [
    {
      "email": "sender@domain.com",
      "name": "Display Name",
      "relationship": "who this person/org is to the user",
      "category": "person|school|healthcare|finance|retail|newsletter|social|app|political|work|family|service",
      "frequency": "how often they appear in this chunk",
      "typicalContent": "what they usually send",
      "typicalAction": "what the user likely does with these (read|reply|ignore|archive|act-on)",
      "priority": "high|medium|low|noise"
    }
  ],
  "lifeThreads": [
    {
      "topic": "descriptive name",
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
}

function buildSynthesisPrompt(userEmail) {
  return `You are synthesizing multiple chunk analyses and raw inbox statistics into a single, authoritative "Contextual Life & Mailbox Graph" for the user (${userEmail}).

This life graph will be used by an AI email prioritization system to:
1. Score each incoming email's TRUE priority and urgency for this user personally
2. Generate deeply personalized summaries
3. Determine what action the user likely needs to take
4. Understand where this email fits in the user's bigger life picture

Return a comprehensive JSON structure:

{
  "identity": {
    "email": "${userEmail}",
    "name": "inferred name",
    "household": "who lives with the user (inferred from emails)",
    "generatedAt": "ISO timestamp",
    "messagesSampled": number
  },

  "coordinationCircle": [
    {
      "name": "Person/Org Name",
      "email": "their email",
      "role": "partner|child|teacher|coworker|doctor|service-provider|friend|etc.",
      "relationship": "detailed description",
      "communicationNorms": {
        "frequency": "daily|weekly|occasional|rare",
        "typicalTopics": ["list of usual topics"],
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
      "urgencyDefault": "high|medium|low",
      "timeframe": "when this is relevant"
    }
  ],

  "mailboxProfile": {
    "primaryUses": ["top 5 uses of this mailbox"],
    "volumeProfile": {
      "signalToNoiseRatio": "percentage of actionable vs. noise",
      "topNoiseCategories": ["ranked list"],
      "topSignalCategories": ["ranked list"]
    }
  },

  "senderRegistry": [
    {
      "email": "sender@domain.com",
      "name": "Display Name",
      "category": "person|school|healthcare|finance|retail|newsletter|social|app|political|work|family|service|delivery",
      "relationship": "relationship to user",
      "priority": "critical|high|medium|low|noise",
      "typicalContent": "what they send",
      "frequency": "daily|weekly|occasional|rare",
      "isAutomated": true/false,
      "isPersonal": true/false,
      "lifeThreads": ["thread IDs this sender relates to"]
    }
  ],

  "priorityRules": {
    "alwaysHighPriority": [
      {
        "condition": "description of when to always prioritize",
        "reason": "why this matters",
        "senderPatterns": ["sender email fragments"]
      }
    ],
    "alwaysLowPriority": [
      {
        "condition": "what to always deprioritize",
        "reason": "why",
        "senderPatterns": ["sender email fragments"]
      }
    ],
    "timeSensitivePatterns": [
      {
        "pattern": "description",
        "keywords": ["keywords"],
        "urgencyWindow": "immediate|today|this-week"
      }
    ]
  }
}

Be exhaustive. Use real names, real emails, real subjects from the data. This graph will directly power email intelligence.`;
}

module.exports = {
  loadProfile,
  getProfileStatus,
  buildProfile,
  getProfilePath,
};
