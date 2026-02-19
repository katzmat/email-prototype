// ============================================================
// Agent Classifier — Claude-powered batch email classification
//
// Uses the user's life-graph profile to classify emails into
// three tiers: needsAttention, glance, low.
// Falls back to rules-based classification if no API key.
// ============================================================

const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');

// ---- Cache ----
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ---- Glance sub-categories ----
const GLANCE_CATEGORIES = [
  'Shipping & Deliveries',
  'Purchases & Receipts',
  'Newsletters & Reads',
  'Events & Calendar',
  'Updates & Alerts',
  'Social & Community',
  'School & Kids',
  'Comments & Collab',
];

// ---- Main classifier ----

async function classifyEmails(emails, lifeGraph) {
  if (!emails || emails.length === 0) return [];

  // Check cache
  const cacheKey = emails.map(e => e.id).sort().join(',');
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  let results;

  if (config.processor.anthropicApiKey) {
    try {
      results = await classifyWithAgent(emails, lifeGraph);
    } catch (err) {
      console.warn('[agent-classifier] LLM classification failed, falling back to rules:', err.message);
      results = classifyWithRules(emails, lifeGraph);
    }
  } else {
    console.log('[agent-classifier] No API key — using rules-based classification');
    results = classifyWithRules(emails, lifeGraph);
  }

  // Cache results
  cache.set(cacheKey, { data: results, timestamp: Date.now() });
  if (cache.size > 50) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) cache.delete(oldest[0]);
  }

  return results;
}

// ---- Agent classification via Claude ----

async function classifyWithAgent(emails, lifeGraph) {
  const client = new Anthropic({ apiKey: config.processor.anthropicApiKey });

  const systemPrompt = buildClassificationPrompt(lifeGraph);

  const emailData = emails.map(e => ({
    id: e.id,
    from: e.from,
    subject: e.subject,
    snippet: (e.snippet || '').substring(0, 200),
    date: e.date,
    labels: (e.labelIds || []).filter(l =>
      l.startsWith('CATEGORY_') || l === 'UNREAD' || l === 'STARRED' || l === 'IMPORTANT'
    ),
    webLink: e.webLink,
  }));

  console.log(`[agent-classifier] Classifying ${emailData.length} emails with Claude...`);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Classify these ${emailData.length} emails. Return a JSON array.\n\n${JSON.stringify(emailData, null, 1)}`,
    }],
  });

  const text = response.content[0].text;

  // Parse JSON — try array first, then object with "classifications" key
  let classifications;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    classifications = JSON.parse(jsonMatch[0]);
  } else {
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const obj = JSON.parse(objMatch[0]);
      classifications = obj.classifications || obj.emails || obj.results || [];
    } else {
      throw new Error('No JSON found in classifier response');
    }
  }

  console.log(`[agent-classifier] Got ${classifications.length} classifications`);

  // Merge classifications with email data
  const classMap = new Map();
  for (const c of classifications) {
    classMap.set(String(c.id), c);
  }

  return emails.map(email => {
    const c = classMap.get(String(email.id));
    if (c) {
      return {
        id: email.id,
        tier: normalizeTier(c.tier),
        glanceCategory: c.glanceCategory || c.glance_category || null,
        summary: c.summary || null,
        reason: c.reason || null,
        suggestedAction: c.suggestedAction || c.suggested_action || null,
        urgencyType: c.urgencyType || c.urgency_type || null,
      };
    }
    // Fallback for emails not in response
    return {
      id: email.id,
      tier: 'low',
      glanceCategory: null,
      summary: null,
      reason: 'Not classified by agent',
      suggestedAction: null,
      urgencyType: null,
    };
  });
}

// ---- Rules-based fallback ----

function classifyWithRules(emails, lifeGraph) {
  const registry = (lifeGraph && lifeGraph.senderRegistry) || [];
  const registryMap = new Map();
  for (const entry of registry) {
    if (entry.email) registryMap.set(entry.email.toLowerCase(), entry);
  }

  return emails.map(email => {
    const from = (email.from || '').toLowerCase();
    const subj = (email.subject || '').toLowerCase();
    const labels = email.labelIds || [];

    // Extract sender email
    const senderEmail = (from.match(/<([^>]+)>/) || [, from])[1].trim();
    const domain = senderEmail.split('@')[1] || '';

    // Check sender registry
    let registryEntry = null;
    for (const [key, entry] of registryMap) {
      if (from.includes(key) || senderEmail.includes(key)) {
        registryEntry = entry;
        break;
      }
    }

    // Personal email domains
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
    const isPersonalDomain = personalDomains.includes(domain);

    // Promotion signals
    if (labels.includes('CATEGORY_PROMOTIONS') || labels.includes('SPAM')) {
      return { id: email.id, tier: 'low', glanceCategory: null, summary: null, reason: 'Promotion/spam', suggestedAction: null, urgencyType: null };
    }

    // Registry-based
    if (registryEntry) {
      if (registryEntry.priority === 'critical' || registryEntry.priority === 'high') {
        return {
          id: email.id,
          tier: 'needsAttention',
          glanceCategory: null,
          summary: null,
          reason: `Known important sender: ${registryEntry.name || registryEntry.email}`,
          suggestedAction: null,
          urgencyType: registryEntry.isPersonal ? 'person' : 'action',
        };
      }
      if (registryEntry.priority === 'noise') {
        return { id: email.id, tier: 'low', glanceCategory: null, summary: null, reason: 'Known low-priority sender', suggestedAction: null, urgencyType: null };
      }
    }

    // Time-sensitive patterns
    const urgentPatterns = ['security alert', 'sign-in', 'verification', 'otp', 'password reset', 'docusign', 'please sign', 'action required'];
    if (urgentPatterns.some(p => subj.includes(p))) {
      return { id: email.id, tier: 'needsAttention', glanceCategory: null, summary: null, reason: 'Time-sensitive action', suggestedAction: null, urgencyType: 'security' };
    }

    // Personal sender
    if (isPersonalDomain && !email.hasUnsubscribe) {
      const automatedSubjects = ['daily report', 'product update', 'order confirmed', 'newsletter', 'digest', 'weekly summary'];
      const isAutomated = automatedSubjects.some(p => subj.includes(p));
      if (!isAutomated) {
        return { id: email.id, tier: 'needsAttention', glanceCategory: null, summary: null, reason: 'Personal email from real person', suggestedAction: null, urgencyType: 'person' };
      }
    }

    // Glance categories
    const shippingPatterns = ['shipped', 'delivered', 'out for delivery', 'on the way', 'arriving', 'tracking'];
    if (shippingPatterns.some(p => subj.includes(p))) {
      return { id: email.id, tier: 'glance', glanceCategory: 'Shipping & Deliveries', summary: null, reason: 'Shipping update', suggestedAction: null, urgencyType: null };
    }

    const paymentPatterns = ['receipt', 'payment', 'invoice', 'statement ready', 'transaction'];
    if (paymentPatterns.some(p => subj.includes(p))) {
      return { id: email.id, tier: 'glance', glanceCategory: 'Purchases & Receipts', summary: null, reason: 'Payment/receipt', suggestedAction: null, urgencyType: null };
    }

    const calendarPatterns = ['invitation', 'rsvp', 'event', 'calendar', 'meeting'];
    if (calendarPatterns.some(p => subj.includes(p))) {
      return { id: email.id, tier: 'glance', glanceCategory: 'Events & Calendar', summary: null, reason: 'Calendar event', suggestedAction: null, urgencyType: null };
    }

    if (labels.includes('CATEGORY_UPDATES')) {
      return { id: email.id, tier: 'glance', glanceCategory: 'Updates & Alerts', summary: null, reason: 'Update notification', suggestedAction: null, urgencyType: null };
    }

    if (labels.includes('CATEGORY_SOCIAL')) {
      return { id: email.id, tier: 'glance', glanceCategory: 'Social & Community', summary: null, reason: 'Social notification', suggestedAction: null, urgencyType: null };
    }

    if (labels.includes('CATEGORY_FORUMS')) {
      return { id: email.id, tier: 'glance', glanceCategory: 'Comments & Collab', summary: null, reason: 'Forum/collab', suggestedAction: null, urgencyType: null };
    }

    // Newsletter detection
    if (email.hasUnsubscribe) {
      return { id: email.id, tier: 'glance', glanceCategory: 'Newsletters & Reads', summary: null, reason: 'Newsletter', suggestedAction: null, urgencyType: null };
    }

    // Default: low
    return { id: email.id, tier: 'low', glanceCategory: null, summary: null, reason: 'Uncategorized', suggestedAction: null, urgencyType: null };
  });
}

// ---- Build classification prompt ----

function buildClassificationPrompt(lifeGraph) {
  const identity = (lifeGraph && lifeGraph.identity) || {};
  const circle = (lifeGraph && lifeGraph.coordinationCircle) || [];
  const threads = (lifeGraph && lifeGraph.lifeThreads) || [];
  const rules = (lifeGraph && lifeGraph.priorityRules) || {};

  let peopleSec = '';
  if (circle.length > 0) {
    peopleSec = circle.map(p => {
      let line = `- ${p.name}`;
      if (p.email) line += ` (${p.email})`;
      line += ` — ${p.relationship || p.role}`;
      if (p.communicationNorms && p.communicationNorms.typicalTopics) {
        line += `. Topics: ${p.communicationNorms.typicalTopics.join(', ')}`;
      }
      return line;
    }).join('\n');
  }

  let threadsSec = '';
  if (threads.length > 0) {
    threadsSec = threads
      .filter(t => t.status === 'active' || t.status === 'recurring')
      .map(t => {
        let line = `- **${t.name}** (${t.status})`;
        if (t.description) line += ` — ${t.description}`;
        return line;
      }).join('\n');
  }

  let highRules = '';
  if (rules.alwaysHighPriority) {
    highRules = rules.alwaysHighPriority.map(r => `- ${r.condition} (${r.reason})`).join('\n');
  }

  let lowRules = '';
  if (rules.alwaysLowPriority) {
    lowRules = rules.alwaysLowPriority.map(r => `- ${r.condition} (${r.reason})`).join('\n');
  }

  return `You are an email classification agent for ${identity.name || 'the user'} (${identity.email || 'unknown'}).

Classify each email into exactly one of three tiers. The critical distinction is between ACTION-REQUIRED and INFORMATIONAL. Many emails feel important but require no action — those belong in "glance", not "needsAttention".

## Tier 1: "needsAttention"
The user must DO SOMETHING — reply, sign, confirm, pay, show up, decide. There is a concrete next step the user must take.

QUALIFIES:
- Direct message from a real person asking a question or requesting something ("Can you pick up Jennie?", "Are you free Thursday?")
- Documents requiring signature (DocuSign, legal)
- Money requests from known people (Venmo request, invoice due)
- Security alerts requiring action (new sign-in approval, password reset)
- Appointments/deadlines the user must confirm or attend TODAY
- Action-required notices from schools, doctors, employers ("Please complete by...")

DOES NOT QUALIFY (these go to "glance" even if they seem important):
- Daily reports, activity summaries, or digests (e.g. "Daily Report for Tuesday" from a school or service) — these are informational
- Newsletters from people the user respects or follows — still a newsletter
- Briefings or curated content emails (morning briefs, afternoon briefs, news roundups)
- Status updates that don't ask for anything ("Your order shipped", "Statement ready")
- Calendar notifications about events already on the calendar
- FYI-type messages with no ask ("Just wanted to share this article")

Ask yourself: "Does the user need to TAKE AN ACTION, or just BE AWARE?" If just be aware → glance.

## Tier 2: "glance"
Important-but-informational — worth skimming, no action needed. This includes content the user cares about but doesn't need to respond to. Assign a glanceCategory from:
- "Shipping & Deliveries" — order shipped/delivered/tracking
- "Purchases & Receipts" — receipts, payment confirmations
- "Newsletters & Reads" — newsletters, digests, content subscriptions, daily/morning/afternoon briefs, curated reads
- "Events & Calendar" — calendar invites (already accepted), event reminders
- "Updates & Alerts" — statements, transaction alerts, service notices
- "Social & Community" — LinkedIn, Nextdoor, social platform notifications
- "School & Kids" — school daily reports, activity updates, classroom digests, progress reports
- "Comments & Collab" — Figma comments, GitHub reviews, collaborative tool notifications

## Tier 3: "low"
Promotions, pseudo-promotions, and noise.
Examples:
- Retail promotions and sales emails
- Political fundraising disguised as urgency ("[URGENT POLL]", "MATCHING DEADLINE")
- App engagement bait (daily puzzles, "pins you might like")
- Job alert spam, auction alerts, event listings from marketplaces
- Any marketing email

## Anti-Gaming Rules
- Political emails with "URGENT", "BREAKING", "DEADLINE" = low (fundraising tactics)
- Retail "LAST CHANCE" / "FINAL HOURS" = low
- App notifications trying to re-engage = low
- Unsubscribe header + promotional content = low
- Daily/weekly reports and digests = glance (Newsletters & Reads or School & Kids), NEVER needsAttention

${peopleSec ? `## Key People (Coordination Circle)\n${peopleSec}\n` : ''}
${threadsSec ? `## Active Life Threads\n${threadsSec}\n` : ''}
${highRules ? `## Always High Priority\n${highRules}\n` : ''}
${lowRules ? `## Always Low Priority\n${lowRules}\n` : ''}

## Output Format
Return a JSON array. For each email:
{
  "id": "email-uid",
  "tier": "needsAttention" | "glance" | "low",
  "glanceCategory": "one of the categories above" | null,
  "summary": "One clear sentence describing what this email is about and why it matters to the user.",
  "reason": "2-4 word context tag explaining the classification",
  "suggestedAction": "Short imperative if user needs to do something" | null,
  "urgencyType": "person" | "action" | "security" | "deadline" | null
}

Be conservative with "needsAttention" — only truly important items. When in doubt between glance and low, prefer glance. When in doubt between needsAttention and glance, prefer glance.`;
}

// ---- Helpers ----

function normalizeTier(tier) {
  if (!tier) return 'low';
  const t = tier.toLowerCase().replace(/[^a-z]/g, '');
  if (t === 'needsattention' || t === 'needs_attention' || t === 'priority' || t === 'high') return 'needsAttention';
  if (t === 'glance' || t === 'worthaglance' || t === 'medium') return 'glance';
  return 'low';
}

// ---- Fast classifier (non-blocking) ----
// Returns cached agent results if available, otherwise rules-based instantly
// and kicks off agent classification in the background for next request.

async function classifyEmailsFast(emails, lifeGraph) {
  if (!emails || emails.length === 0) return { classifications: [], backend: 'empty' };

  const cacheKey = emails.map(e => e.id).sort().join(',');
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { classifications: cached.data, backend: 'agent' };
  }

  // Return rules-based immediately
  const rulesResults = classifyWithRules(emails, lifeGraph);

  // Fire-and-forget: run agent classification in background for next load
  if (config.processor.anthropicApiKey) {
    classifyEmails(emails, lifeGraph).catch(err => {
      console.warn('[agent-classifier] Background classification failed:', err.message);
    });
  }

  return { classifications: rulesResults, backend: 'rules' };
}

module.exports = {
  classifyEmails,
  classifyEmailsFast,
  GLANCE_CATEGORIES,
};
