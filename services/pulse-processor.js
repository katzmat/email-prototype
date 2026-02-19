// ============================================================
// Pulse Processor — Life-Graph-Driven Classification + LLM
//
// Uses a Contextual Life & Mailbox Graph (life-graph-data.json)
// built from analysis of 400+ real inbox messages to score,
// classify, and summarize emails with deep personalization.
//
// Pipeline:
//   1. Score each email against sender registry + priority rules
//   2. Match to active life threads
//   3. Classify into needsYou / tracking / awareness / reading / noise
//   4. Enrich signal items with LLM summaries (life-thread-aware prompts)
//   5. Priority reassessment agent (catches rule misses)
// ============================================================

var config = require('../config');
var path = require('path');
var fs = require('fs');

// ---- Load Life Graph Data ----
var LIFE_GRAPH_PATH = path.join(__dirname, 'life-graph-data.json');
var lifeGraphData = null;

function loadLifeGraph() {
  try {
    var raw = fs.readFileSync(LIFE_GRAPH_PATH, 'utf-8');
    lifeGraphData = JSON.parse(raw);
    console.log('Life graph loaded: ' +
      (lifeGraphData.senderRegistry || []).length + ' senders, ' +
      (lifeGraphData.lifeThreads || []).length + ' life threads, ' +
      (lifeGraphData.coordinationCircle || []).length + ' people');
  } catch (err) {
    console.warn('Could not load life graph data:', err.message);
    lifeGraphData = null;
  }
}
loadLifeGraph();


// ---- Build LLM System Prompt from Life Graph ----

function buildPulseSystemPrompt() {
  var lg = lifeGraphData;
  var identity = lg && lg.identity || {};
  var circle = lg && lg.coordinationCircle || [];
  var threads = lg && lg.lifeThreads || [];
  var distillation = lg && lg.contentDistillation || {};

  var peopleSec = circle.map(function (p) {
    var parts = ['- ' + p.name];
    if (p.email) parts[0] += ' (' + p.email + ')';
    parts[0] += ' — ' + (p.relationship || p.role);
    if (p.communicationNorms && p.communicationNorms.typicalTopics) {
      parts[0] += '. Topics: ' + p.communicationNorms.typicalTopics.join(', ');
    }
    return parts[0];
  }).join('\n');

  var threadsSec = threads.filter(function (t) {
    return t.status === 'active' || t.status === 'recurring';
  }).map(function (t) {
    var line = '- **' + t.name + '** (' + t.status + ')';
    if (t.description) line += ' — ' + t.description;
    if (t.nextExpectedAction) line += ' Next: ' + t.nextExpectedAction;
    return line;
  }).join('\n');

  var upstyleRules = (distillation.upstyleRules || []).map(function (r) {
    var line = '- For **' + r.senderPattern + '** (' + r.contentPattern + '): ' + r.distillAs;
    if (r.exampleGood) line += '\n  Good: "' + r.exampleGood + '"';
    if (r.exampleBad) line += '\n  Bad: "' + r.exampleBad + '"';
    return line;
  }).join('\n');

  return [
    'You are ' + (identity.name || 'Matt') + '\'s personal email intelligence assistant.',
    'Your job is to transform raw email metadata into clear, conversational "upshot" summaries.',
    '',
    '## About ' + (identity.name || 'Matt'),
    '- ' + (identity.occupation || 'Works in tech'),
    '- Lives in ' + (identity.location || 'Indianapolis') + ' with ' + (identity.household || []).join(', '),
    '- Interests: ' + (identity.interests || []).join(', '),
    '',
    '## Key People (Coordination Circle)',
    peopleSec,
    '',
    '## Active Life Threads',
    'These are the ongoing projects, commitments, and threads in Matt\'s life right now.',
    'When an email relates to one of these, mention it by name in the summary.',
    threadsSec,
    '',
    '## Upshot Voice — Content Distillation Rules',
    upstyleRules,
    '',
    '## General Style Rules',
    '- Write like a knowledgeable friend giving Matt the bottom line',
    '- Lead with WHAT and WHO — the most important fact first',
    '- Be direct and specific: name names, dates, dollar amounts, items',
    '- For school emails: name the kid it affects',
    '- For people: convey human intent, not just the subject line',
    '- For deliveries: name the item + status in one line',
    '- For finance: state the specific alert/action without alarm',
    '- Keep each summary under 30 words — one sentence is ideal',
    '- Do NOT fabricate details not present in the subject/snippet/sender',
    '',
    '## Output Format',
    'For each email, generate:',
    '1. **summary**: The "upshot" — a single clear sentence.',
    '2. **action**: Short imperative if Matt needs to do something, or null.',
    '3. **why**: 2-4 word context tag (e.g., "Jennie\'s school", "Tax deadline").',
    '4. **lifeThread**: ID of the matching life thread (e.g., "innovation-unit-visit"), or null.',
    '5. **relevanceNote**: One sentence explaining why this matters to Matt personally, or null.',
    '',
    'Return valid JSON:',
    '{ "summaries": [ { "id": "email_id", "summary": "...", "action": "..." or null, "why": "...", "lifeThread": "..." or null, "relevanceNote": "..." or null } ] }',
  ].join('\n');
}


// ---- Priority Reassessment Agent Prompt (enriched with life graph) ----

function buildPriorityAgentPrompt() {
  var lg = lifeGraphData;
  var identity = lg && lg.identity || {};
  var rules = lg && lg.priorityRules || {};

  var alwaysHigh = (rules.alwaysHighPriority || []).map(function (r) {
    return '- ' + r.condition + ' (' + r.reason + ')';
  }).join('\n');

  var alwaysLow = (rules.alwaysLowPriority || []).map(function (r) {
    return '- ' + r.condition + ' (' + r.reason + ')';
  }).join('\n');

  var engagement = lg && lg.mailboxProfile && lg.mailboxProfile.engagementPatterns || {};

  return [
    'You are a priority reassessment agent for ' + (identity.name || 'Matt') + '\'s email triage.',
    '',
    'A rules-based classifier has already sorted emails. Review items NOT in "Needs Attention"',
    'and identify any that genuinely deserve Matt\'s direct attention.',
    '',
    '## What Matt\'s Actual Engagement Data Shows',
    '- Matt reads only ~18% of incoming email — he is highly selective',
    '- Always reads: ' + (engagement.alwaysReads || []).join('; '),
    '- Usually reads: ' + (engagement.usuallyReads || []).join('; '),
    '- Never reads: ' + (engagement.usuallyIgnores || []).join('; '),
    '',
    '## ALWAYS Promote to "Needs Attention"',
    alwaysHigh,
    '',
    '## NEVER Promote (confirmed noise from engagement data)',
    alwaysLow,
    '',
    '## Output Format',
    'Return valid JSON:',
    '{ "promote": [ { "id": "email_id", "reason": "...", "type": "person|planning|urgent|coordination|legal", "urgency": "person|action|update", "summary": "..." or null, "action": "..." or null, "why": "..." or null } ] }',
    '',
    'If nothing should be promoted, return: { "promote": [] }',
    'Be selective — Matt\'s inbox is 82% noise. Only promote what truly matters.',
  ].join('\n');
}


// ---- Legacy Life Graph Rules (fallback if life-graph-data.json missing) ----

var LEGACY_RULES = {
  selfEmail: 'katzmat@gmail.com',
  schoolSignal: {
    senders: ['isind.org', 'managebac', 'seesaw', 'dayearlylearning', 'day early learning', 'brightwheel', 'rueffer', 'navarro', 'rnavarro', 'srueffer', 'cheribin', 'hollinger'],
    subjects: ['scholastic', 'book club', 'checkpoint', 'conference', 'innovation unit', 'picture day', 'field trip', 'snow day', 'school closed', 'early dismissal', 'report card', 'schedule', 'read to the final four', 'cabin chronicles', 'ready for the week', 'lower school'],
  },
  humanContacts: {
    senders: ['christiemockdavis', 'christie davis', 'rnavarro@isind', 'srueffer@isind', 'cheribin', 'ajoseph@indymca', 'alanti', 'troop', 'scout'],
  },
  healthcare: {
    senders: ['simplepractice', 'joyful counseling', 'therapyappointment', 'katy feeser', 'guardian pediatrics', 'mychart', 'unitedhealth', 'uhc.com', 'anthem', 'cigna'],
    subjects: ['appointment', 'session', 'telehealth', 'counseling', 'explanation of benefits', 'eob', 'claim'],
  },
  activeOrders: {
    subjects: ['shipped', 'delivered', 'out for delivery', 'on the way', 'arriving', 'your delivery', 'order confirmed', 'has been delivered', 'is on its way'],
    senders: ['ship-confirm@amazon', 'auto-confirm@amazon', 'notify@instacart', 'no-reply@instacart', 'doordash', 'fedex', 'ups.com', 'usps'],
  },
  financialAlerts: {
    senders: ['chase.com', 'capitalone', 'fidelity', 'venmo', 'turbotax', 'old national'],
    subjects: ['w-2', '1099', 'tax', 'hsa', 'transaction', 'alert', 'payment', 'statement ready', 'eob', 'claim', 'suspicious', 'fraud', 'security'],
  },
  familyCoordination: {
    subjects: ['brownie', 'troop', 'cookie', 'cookie booth', 'ymca', 'basketball'],
  },
  politicalNoise: {
    senders: ['turnoutpac', 'progressive turnout', 'actblue', 'moveon', 'ossoff', 'indivisible', 'sierra club', 'aclu', 'planned parenthood', 'campaign', 'pac.com'],
    subjects: ['impeach', 'petition', 'donate', 'chip in', 'matching', 'double your'],
  },
  retailNoise: {
    senders: ['oldnavy', 'old navy', 'gap.com', 'hm.com', 'h&m', 'nike', 'birkenstock', 'minisousa', 'miniolie', 'southwest', 'aa.com', 'aadvantage', 'wyndham', 'marriott', 'hilton', 'hertz', 'enterprise', 'audible', 'fubo', 'rover.com', 'ugmonk', 'artarama', 'blurb.com', 'ebth.com', 'warmies', 'pinterest'],
  },
  newsletterNoise: {
    senders: ['substack', 'every.to', 'tldr', 'morning consult', 'chartr', 'reforge', 'fermat', 'newcomer', 'duckbill', 'a16z', 'schoolofthepossible', 'priyaparker', 'noigroup', 'healthbegins', 'indyschild', 'iheart'],
  },
  jobNoise: {
    senders: ['glassdoor', 'indeed', 'linkedin.com/comm'],
    subjects: ['job alert', 'new jobs', 'jobs for you'],
  },
  appNoise: {
    senders: ['nextdoor', 'reddit', 'facebook', 'instagram', 'twitter', 'x.com', 'tiktok', 'reclaim.ai', 'tripit', 'testflight'],
  },
  curatedReading: {
    senders: ['newyorker', 'new yorker', 'bonappetit', 'bon appetit', 'americastestkitchen', 'cooks illustrated', 'nytimes', 'new york times', 'indystar', 'wfyi'],
    subjects: ['daily', 'newsletter', 'briefing', 'what to cook', 'this week', 'recipe'],
  },
};


// ---- Processor Class ----

class PulseProcessor {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = config.processor.cacheTTL || 300000; // 5 min
  }

  // Main entry
  async process(rawEmails) {
    if (!rawEmails || rawEmails.length === 0) {
      return this._emptyResult();
    }

    // Check cache
    var cacheKey = this._cacheKey(rawEmails);
    if (this.cache.has(cacheKey)) {
      var cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
    }

    // Step 1: Classify using life graph scoring
    var classified = this._classifyAll(rawEmails);

    // Step 2: Enrich with LLM summaries
    var backend = 'rules';
    if (config.processor.anthropicApiKey) {
      try {
        var signalCount = classified.needsYou.length + classified.tracking.length +
          classified.awareness.length + classified.reading.length;
        console.log('Pulse: calling LLM for', signalCount, 'signal items...');
        await this._enrichWithSummaries(classified);
        backend = 'llm';
        console.log('Pulse: LLM enrichment succeeded');
      } catch (err) {
        console.warn('Pulse LLM enrichment failed:', err.status || '', err.message);
      }

      // Step 2.5: Priority reassessment agent
      try {
        await this._reassessPriority(classified, rawEmails);
      } catch (err) {
        console.warn('Pulse priority reassessment failed:', err.status || '', err.message);
      }
    } else {
      console.log('Pulse: no API key configured, using rules-only classification');
    }

    // Step 3: Build response
    var result = this._buildResponse(classified, rawEmails, backend);

    // Cache
    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    this._evictOldCache();

    return result;
  }


  // ============================================================
  // LIFE-GRAPH SCORING ENGINE
  //
  // Each email gets a priority score based on:
  //   1. Sender registry match (known sender → known priority)
  //   2. Life thread match (connected to an active thread?)
  //   3. Priority rule match (always-high / contextual / always-low)
  //   4. Engagement prediction (based on observed open patterns)
  //   5. Structural signals (unsubscribe, labels, domain type)
  // ============================================================

  _scoreEmail(email) {
    var from = (email.from || '').toLowerCase();
    var subj = (email.subject || '').toLowerCase();
    var snip = (email.snippet || '').toLowerCase();
    var labels = email.labelIds || [];

    var score = {
      priority: 0,        // -100 (definite noise) to +100 (critical)
      category: null,      // person, school, healthcare, finance, delivery, etc.
      subcategory: null,
      type: null,          // icon type for rendering
      urgency: 'info',     // action, person, update, info
      matchedSender: null, // which sender registry entry matched
      matchedThreads: [],  // life thread IDs
      isPersonal: false,
      isAutomated: true,
      reason: null,
      engagementPrediction: 'unknown', // will-read, might-read, will-ignore
    };

    if (!lifeGraphData) {
      return score; // fall through to legacy classification
    }

    var registry = lifeGraphData.senderRegistry || [];
    var threads = lifeGraphData.lifeThreads || [];
    var rules = lifeGraphData.priorityRules || {};

    // ---- 1. Sender Registry Match ----
    for (var i = 0; i < registry.length; i++) {
      var entry = registry[i];
      if (from.indexOf(entry.pattern) !== -1) {
        score.matchedSender = entry;
        score.category = entry.category;
        score.subcategory = entry.subcategory || null;
        score.isPersonal = !!entry.isPersonal;
        score.isAutomated = entry.isAutomated !== false;

        // Base priority from registry
        var priorityScores = { critical: 90, high: 70, medium: 40, low: 10, noise: -50 };
        score.priority = priorityScores[entry.priority] || 0;

        // Engagement prediction
        var engScores = { high: 'will-read', medium: 'might-read', selective: 'might-read', low: 'will-ignore', none: 'will-ignore' };
        score.engagementPrediction = engScores[entry.engagementRate] || 'unknown';

        break;
      }
    }

    // ---- 2. Life Thread Match ----
    for (var t = 0; t < threads.length; t++) {
      var thread = threads[t];
      if (thread.status !== 'active' && thread.status !== 'recurring') continue;

      var matched = false;

      // Match by sender
      if (thread.relatedSenders) {
        for (var s = 0; s < thread.relatedSenders.length; s++) {
          if (from.indexOf(thread.relatedSenders[s].toLowerCase()) !== -1) {
            matched = true;
            break;
          }
        }
      }

      // Match by keywords
      if (!matched && thread.keywords) {
        for (var k = 0; k < thread.keywords.length; k++) {
          if (subj.indexOf(thread.keywords[k]) !== -1 || snip.indexOf(thread.keywords[k]) !== -1) {
            matched = true;
            break;
          }
        }
      }

      if (matched) {
        score.matchedThreads.push(thread.id);
        // Boost score for active life threads
        var threadUrgencyBoost = { high: 20, medium: 10, low: 5 };
        score.priority += threadUrgencyBoost[thread.urgencyDefault] || 5;
      }
    }

    // ---- 3. Priority Rule Match ----
    // Always-high rules
    var highRules = rules.alwaysHighPriority || [];
    for (var h = 0; h < highRules.length; h++) {
      var patterns = highRules[h].senderPatterns || [];
      for (var hp = 0; hp < patterns.length; hp++) {
        if (from.indexOf(patterns[hp].toLowerCase()) !== -1) {
          score.priority = Math.max(score.priority, 80);
          score.reason = highRules[h].reason;
          break;
        }
      }
    }

    // Always-low rules (override if matches)
    var lowRules = rules.alwaysLowPriority || [];
    for (var l = 0; l < lowRules.length; l++) {
      var lowPatterns = lowRules[l].senderPatterns || [];
      for (var lp = 0; lp < lowPatterns.length; lp++) {
        if (from.indexOf(lowPatterns[lp].toLowerCase()) !== -1) {
          score.priority = Math.min(score.priority, -40);
          score.engagementPrediction = 'will-ignore';
          break;
        }
      }
    }

    // ---- 4. Time-Sensitive Pattern Boost ----
    var timePatterns = rules.timeSensitivePatterns || [];
    for (var tp = 0; tp < timePatterns.length; tp++) {
      var keywords = timePatterns[tp].keywords || [];
      for (var tk = 0; tk < keywords.length; tk++) {
        if (subj.indexOf(keywords[tk]) !== -1 || snip.indexOf(keywords[tk]) !== -1) {
          score.priority += 15;
          if (timePatterns[tp].urgencyWindow === 'immediate — show in next brief') {
            score.urgency = 'action';
          }
          break;
        }
      }
    }

    // ---- 5. Structural Signals ----
    // Personal domain with no unsubscribe = likely human
    if (!score.matchedSender) {
      var emailDomain = this._extractDomain(from);
      var personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];
      if (personalDomains.indexOf(emailDomain) !== -1 && !email.hasUnsubscribe) {
        score.priority += 30;
        score.isPersonal = true;
        score.isAutomated = false;
        score.category = score.category || 'person';
      }
    }

    // Gmail CATEGORY labels
    if (labels.indexOf('CATEGORY_PROMOTIONS') !== -1 && score.priority > -20) {
      score.priority = Math.min(score.priority, -10);
    }
    if (labels.indexOf('CATEGORY_SOCIAL') !== -1 && score.priority > -20) {
      score.priority = Math.min(score.priority, -15);
    }

    // Unsubscribe header without high engagement = newsletter/noise
    if (email.hasUnsubscribe && score.engagementPrediction !== 'will-read' && score.priority < 40) {
      score.priority -= 20;
    }

    // Self-sent emails (daily planner)
    var selfEmails = (lifeGraphData.identity && lifeGraphData.identity.aliases) || [];
    selfEmails.push(lifeGraphData.identity && lifeGraphData.identity.email || 'katzmat@gmail.com');
    for (var se = 0; se < selfEmails.length; se++) {
      if (from.indexOf(selfEmails[se]) !== -1) {
        score.category = 'planning';
        score.priority = 75;
        score.type = 'planning';
        score.reason = 'Self-sent daily planner';
        break;
      }
    }

    // ---- Determine type for icon rendering ----
    if (!score.type) {
      var catToType = {
        person: 'person',
        school: 'school',
        healthcare: 'health',
        finance: 'finance',
        delivery: 'order',
        retail: 'order',
        legal: 'urgent',
        planning: 'planning',
        newsletter: 'reading',
        political: 'person',
        social: 'person',
        service: 'order',
      };
      score.type = catToType[score.category] || 'person';
    }

    return score;
  }


  // ============================================================
  // CLASSIFICATION ENGINE — Life-graph-driven
  // ============================================================

  _classifyAll(emails) {
    var result = {
      needsYou: [],
      tracking: [],
      awareness: [],
      reading: [],
      noise: {
        political: [],
        promos: [],
        newsletters: [],
        jobs: [],
        apps: [],
        other: [],
      },
      selfSent: [],
    };

    // Use life-graph scoring if available, otherwise fall back to legacy rules
    if (!lifeGraphData) {
      return this._classifyAllLegacy(emails);
    }

    for (var i = 0; i < emails.length; i++) {
      var e = emails[i];
      var score = this._scoreEmail(e);

      // Build item with life-graph metadata
      var item = this._toItem(e, score.type || 'person', this._senderName(e.from), score.urgency);
      item.lifeGraphScore = score.priority;
      item.matchedThreads = score.matchedThreads;
      item.engagementPrediction = score.engagementPrediction;
      item.category = score.category;
      if (score.reason) item.reason = score.reason;

      // Self-sent
      if (score.category === 'planning') {
        result.selfSent.push(e);
        item.type = 'planning';
        result.needsYou.push(item);
        continue;
      }

      // Route based on score
      if (score.priority >= 60) {
        // High priority — Needs Attention
        if (score.isPersonal) item.urgency = 'person';
        else if (this._isActionRequired((e.subject || '').toLowerCase(), (e.snippet || '').toLowerCase())) {
          item.urgency = 'action';
        } else {
          item.urgency = item.urgency || 'update';
        }
        result.needsYou.push(item);
      } else if (score.priority >= 30) {
        // Medium — Tracking or Awareness
        if (score.category === 'delivery') {
          var subj = (e.subject || '').toLowerCase();
          if (subj.indexOf('delivered') !== -1 || subj.indexOf('arrived') !== -1) item.urgency = 'delivered';
          else if (subj.indexOf('shipped') !== -1 || subj.indexOf('on the way') !== -1) item.urgency = 'shipping';
          else item.urgency = 'ordered';
          result.tracking.push(item);
        } else if (score.category === 'finance') {
          result.awareness.push(item);
        } else {
          result.awareness.push(item);
        }
      } else if (score.priority >= 0 && score.engagementPrediction !== 'will-ignore') {
        // Low but engaged — Reading
        if (score.matchedSender && score.matchedSender.isDeepRead) {
          item.type = 'reading';
          result.reading.push(item);
        } else if (score.category === 'newsletter' || score.category === 'reading') {
          item.type = 'reading';
          result.reading.push(item);
        } else {
          // Borderline — route to noise
          this._routeToNoise(e, result, score);
        }
      } else {
        // Noise
        this._routeToNoise(e, result, score);
      }
    }

    return result;
  }

  _routeToNoise(email, result, score) {
    var from = (email.from || '').toLowerCase();
    var labels = email.labelIds || [];

    if (score.category === 'political') {
      result.noise.political.push(email);
    } else if (score.category === 'social') {
      result.noise.apps.push(email);
    } else if (this._matchAny(from, LEGACY_RULES.jobNoise.senders) ||
               this._matchAny((email.subject || '').toLowerCase(), LEGACY_RULES.jobNoise.subjects)) {
      result.noise.jobs.push(email);
    } else if (labels.indexOf('CATEGORY_PROMOTIONS') !== -1 || score.category === 'retail') {
      result.noise.promos.push(email);
    } else if (email.hasUnsubscribe || score.category === 'newsletter') {
      result.noise.newsletters.push(email);
    } else if (labels.indexOf('CATEGORY_SOCIAL') !== -1) {
      result.noise.apps.push(email);
    } else {
      result.noise.other.push(email);
    }
  }


  // ---- Legacy Classification (fallback) ----

  _classifyAllLegacy(emails) {
    var g = LEGACY_RULES;
    var result = {
      needsYou: [],
      tracking: [],
      awareness: [],
      reading: [],
      noise: { political: [], promos: [], newsletters: [], jobs: [], apps: [], other: [] },
      selfSent: [],
    };

    for (var i = 0; i < emails.length; i++) {
      var e = emails[i];
      var from = (e.from || '').toLowerCase();
      var subj = (e.subject || '').toLowerCase();
      var snip = (e.snippet || '').toLowerCase();
      var labels = e.labelIds || [];

      if (from.indexOf(g.selfEmail) !== -1) {
        result.selfSent.push(e);
        if (this._matchAny(subj, g.familyCoordination.subjects)) {
          result.awareness.push(this._toItem(e, 'family', 'Self-sent note'));
        }
        continue;
      }

      var classified = false;

      if (this._matchAny(from, g.schoolSignal.senders) || this._matchAny(subj, g.schoolSignal.subjects)) {
        var urg = this._isActionRequired(subj, snip) ? 'action' : 'update';
        result.needsYou.push(this._toItem(e, 'school', this._senderName(e.from), urg));
        classified = true;
      }
      if (!classified && this._matchAny(from, g.humanContacts.senders)) {
        result.needsYou.push(this._toItem(e, 'person', this._senderName(e.from), 'person'));
        classified = true;
      }
      if (!classified && (this._matchAny(from, g.healthcare.senders) || this._matchAny(subj, g.healthcare.subjects))) {
        var hUrg = this._isActionRequired(subj, snip) ? 'action' : 'update';
        result.needsYou.push(this._toItem(e, 'health', this._senderName(e.from), hUrg));
        classified = true;
      }
      if (!classified && (this._matchAny(subj, g.activeOrders.subjects) || this._matchAny(from, g.activeOrders.senders))) {
        var status = 'ordered';
        if (subj.indexOf('delivered') !== -1) status = 'delivered';
        else if (subj.indexOf('shipped') !== -1 || subj.indexOf('out for delivery') !== -1) status = 'shipping';
        result.tracking.push(this._toItem(e, 'order', this._senderName(e.from), status));
        classified = true;
      }
      if (!classified && (this._matchAny(from, g.financialAlerts.senders) || this._matchAny(subj, g.financialAlerts.subjects))) {
        if (labels.indexOf('CATEGORY_PROMOTIONS') === -1) {
          result.awareness.push(this._toItem(e, 'finance', this._senderName(e.from)));
          classified = true;
        }
      }
      if (!classified && this._matchAny(subj, g.familyCoordination.subjects)) {
        result.awareness.push(this._toItem(e, 'family', this._senderName(e.from)));
        classified = true;
      }

      if (classified) continue;

      if (this._matchAny(from, g.politicalNoise.senders) || this._matchAny(subj, g.politicalNoise.subjects)) { result.noise.political.push(e); continue; }
      if (this._matchAny(from, g.retailNoise.senders) || labels.indexOf('CATEGORY_PROMOTIONS') !== -1) { result.noise.promos.push(e); continue; }
      if (this._matchAny(from, g.jobNoise.senders) || this._matchAny(subj, g.jobNoise.subjects)) { result.noise.jobs.push(e); continue; }
      if (this._matchAny(from, g.appNoise.senders) || labels.indexOf('CATEGORY_SOCIAL') !== -1) { result.noise.apps.push(e); continue; }
      if (this._matchAny(from, g.curatedReading.senders) || this._matchAny(subj, g.curatedReading.subjects)) {
        result.reading.push(this._toItem(e, 'reading', this._senderName(e.from)));
        continue;
      }
      if (this._matchAny(from, g.newsletterNoise.senders) || e.hasUnsubscribe) { result.noise.newsletters.push(e); continue; }
      if (e.isUnread && !e.hasUnsubscribe && labels.indexOf('CATEGORY_PROMOTIONS') === -1 && labels.indexOf('CATEGORY_SOCIAL') === -1) {
        var parts = from.split('@');
        var domain = parts.length > 1 ? parts[parts.length - 1].replace('>', '') : '';
        if (['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'].indexOf(domain) !== -1) {
          result.needsYou.push(this._toItem(e, 'person', this._senderName(e.from), 'person'));
          continue;
        }
      }
      result.noise.other.push(e);
    }

    return result;
  }


  // ---- LLM Enrichment ----

  async _enrichWithSummaries(classified) {
    var Anthropic = require('@anthropic-ai/sdk');
    var client = new Anthropic({ apiKey: config.processor.anthropicApiKey });

    var allSignal = [];
    var sections = ['needsYou', 'tracking', 'awareness', 'reading'];
    for (var s = 0; s < sections.length; s++) {
      var items = classified[sections[s]] || [];
      for (var i = 0; i < items.length; i++) {
        allSignal.push(items[i]);
      }
    }

    if (allSignal.length === 0) return;

    // Build email data with life-graph context
    var emailData = allSignal.map(function (item) {
      var data = {
        id: item.id,
        type: item.type,
        urgency: item.urgency,
        from: item.from,
        subject: item.subject,
        snippet: item.snippet,
        source: item.source,
      };
      // Include life-graph metadata for richer summaries
      if (item.matchedThreads && item.matchedThreads.length > 0) {
        data.lifeThreads = item.matchedThreads;
      }
      if (item.category) data.category = item.category;
      if (item.reason) data.classificationReason = item.reason;
      return data;
    });

    var systemPrompt = lifeGraphData ? buildPulseSystemPrompt() : require('./pulse-processor-legacy-prompt');

    var response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: 'Generate intelligence summaries for these ' +
          emailData.length + ' emails:\n\n' +
          JSON.stringify(emailData, null, 2),
      }],
    });

    var text = response.content[0].text;
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('Pulse LLM returned non-JSON response');
      return;
    }

    var parsed = JSON.parse(jsonMatch[0]);
    var summaries = parsed.summaries || [];

    var summaryMap = {};
    for (var j = 0; j < summaries.length; j++) {
      summaryMap[summaries[j].id] = summaries[j];
    }

    for (var k = 0; k < sections.length; k++) {
      var secItems = classified[sections[k]] || [];
      for (var m = 0; m < secItems.length; m++) {
        var item = secItems[m];
        var sm = summaryMap[item.id];
        if (sm) {
          item.summary = sm.summary || null;
          item.action = sm.action || null;
          item.why = sm.why || null;
          if (sm.lifeThread) item.lifeThread = sm.lifeThread;
          if (sm.relevanceNote) item.relevanceNote = sm.relevanceNote;
        }
      }
    }
  }


  // ---- Priority Reassessment Agent ----

  async _reassessPriority(classified, rawEmails) {
    var Anthropic = require('@anthropic-ai/sdk');
    var client = new Anthropic({ apiKey: config.processor.anthropicApiKey });

    var candidates = [];

    var signalSections = ['tracking', 'awareness', 'reading'];
    for (var s = 0; s < signalSections.length; s++) {
      var items = classified[signalSections[s]] || [];
      for (var i = 0; i < items.length; i++) {
        candidates.push({
          id: items[i].id,
          from: items[i].from,
          subject: items[i].subject,
          snippet: items[i].snippet,
          source: items[i].source,
          currentSection: signalSections[s],
          lifeGraphScore: items[i].lifeGraphScore || null,
          matchedThreads: items[i].matchedThreads || [],
        });
      }
    }

    var noiseCats = ['political', 'promos', 'newsletters', 'jobs', 'apps', 'other'];
    for (var n = 0; n < noiseCats.length; n++) {
      var noiseItems = classified.noise[noiseCats[n]] || [];
      for (var j = 0; j < noiseItems.length; j++) {
        var e = noiseItems[j];
        candidates.push({
          id: e.id,
          from: e.from || '',
          subject: e.subject || '(no subject)',
          snippet: e.snippet || '',
          source: this._senderName(e.from),
          currentSection: 'noise.' + noiseCats[n],
        });
      }
    }

    if (candidates.length === 0) return;

    console.log('Pulse priority agent: reviewing', candidates.length, 'items for promotion...');

    var agentPrompt = lifeGraphData ? buildPriorityAgentPrompt() : LEGACY_RULES.priorityAgentPrompt;

    var response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: agentPrompt || 'You are a priority reassessment agent. Review emails and promote important ones.',
      messages: [{
        role: 'user',
        content: 'Review these ' + candidates.length + ' emails currently NOT in "Needs Attention" and identify any that should be promoted:\n\n' +
          JSON.stringify(candidates, null, 2),
      }],
    });

    var text = response.content[0].text;
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('Pulse priority agent returned non-JSON response');
      return;
    }

    var parsed = JSON.parse(jsonMatch[0]);
    var promotions = parsed.promote || [];

    if (promotions.length === 0) {
      console.log('Pulse priority agent: no promotions needed');
      return;
    }

    console.log('Pulse priority agent: promoting', promotions.length, 'items to needsYou');

    var promoMap = {};
    for (var p = 0; p < promotions.length; p++) {
      promoMap[promotions[p].id] = promotions[p];
    }

    // Move promoted signal items
    for (var ss = 0; ss < signalSections.length; ss++) {
      var secName = signalSections[ss];
      var secItems = classified[secName] || [];
      var remaining = [];
      for (var si = 0; si < secItems.length; si++) {
        var item = secItems[si];
        if (promoMap[item.id]) {
          var promo = promoMap[item.id];
          item.promoted = true;
          item.promotionReason = promo.reason || 'Promoted by priority assessment';
          item.reason = promo.reason || null;
          item.urgency = promo.urgency || 'person';
          item.type = promo.type || item.type;
          if (promo.summary) item.summary = promo.summary;
          if (promo.action) item.action = promo.action;
          if (promo.why) item.why = promo.why;
          classified.needsYou.push(item);
        } else {
          remaining.push(item);
        }
      }
      classified[secName] = remaining;
    }

    // Move promoted noise items
    for (var nc = 0; nc < noiseCats.length; nc++) {
      var cat = noiseCats[nc];
      var catItems = classified.noise[cat] || [];
      var catRemaining = [];
      for (var ci = 0; ci < catItems.length; ci++) {
        var ne = catItems[ci];
        if (promoMap[ne.id]) {
          var nPromo = promoMap[ne.id];
          var promoted = this._toItem(ne, nPromo.type || 'person', this._senderName(ne.from), nPromo.urgency || 'person');
          promoted.promoted = true;
          promoted.promotionReason = nPromo.reason || 'Promoted by priority assessment';
          promoted.reason = nPromo.reason || null;
          if (nPromo.summary) promoted.summary = nPromo.summary;
          if (nPromo.action) promoted.action = nPromo.action;
          if (nPromo.why) promoted.why = nPromo.why;
          classified.needsYou.push(promoted);
        } else {
          catRemaining.push(ne);
        }
      }
      classified.noise[cat] = catRemaining;
    }
  }


  // ---- Response Builder ----

  _buildResponse(classified, rawEmails, backend) {
    var noiseTotal = classified.noise.political.length +
      classified.noise.promos.length +
      classified.noise.newsletters.length +
      classified.noise.jobs.length +
      classified.noise.apps.length +
      classified.noise.other.length;

    var signalCount = classified.needsYou.length +
      classified.tracking.length +
      classified.awareness.length;

    var noiseItems = {};
    var noiseCats = ['political', 'promos', 'newsletters', 'jobs', 'apps', 'other'];
    for (var i = 0; i < noiseCats.length; i++) {
      var cat = noiseCats[i];
      var items = classified.noise[cat] || [];
      noiseItems[cat] = items.map(function (e) {
        return {
          id: e.id,
          from: e.from,
          subject: e.subject || '(no subject)',
          snippet: e.snippet || '',
          date: e.date,
          time: this._formatTime(e.date),
        };
      }.bind(this));
    }

    return {
      generatedAt: new Date().toISOString(),
      backend: backend,
      lifeGraphVersion: lifeGraphData && lifeGraphData._meta ? lifeGraphData._meta.version : null,
      summary: {
        total: rawEmails.length,
        signal: signalCount,
        noise: noiseTotal,
        reading: classified.reading.length,
        signalRatio: rawEmails.length > 0 ? Math.round((signalCount / rawEmails.length) * 100) : 0,
      },
      sections: {
        needsYou: classified.needsYou,
        tracking: classified.tracking,
        awareness: classified.awareness,
        reading: classified.reading,
        noise: {
          total: noiseTotal,
          political: classified.noise.political.length,
          promos: classified.noise.promos.length,
          newsletters: classified.noise.newsletters.length,
          jobs: classified.noise.jobs.length,
          apps: classified.noise.apps.length,
          other: classified.noise.other.length,
          items: noiseItems,
        },
      },
    };
  }


  // ---- Helpers ----

  _toItem(email, type, source, urgency) {
    return {
      id: email.id,
      subject: email.subject || '(no subject)',
      snippet: email.snippet || '',
      from: email.from || '',
      date: email.date || '',
      time: this._formatTime(email.date),
      type: type,
      source: source || '',
      urgency: urgency || 'info',
      isUnread: email.isUnread,
      summary: null,
      action: null,
      why: null,
    };
  }

  _matchAny(text, patterns) {
    if (!text || !patterns) return false;
    for (var i = 0; i < patterns.length; i++) {
      if (text.indexOf(patterns[i]) !== -1) return true;
    }
    return false;
  }

  _isActionRequired(subj, snip) {
    var words = [
      'action', 'required', 'urgent', 'rsvp', 'respond', 'reply',
      'due', 'deadline', 'order', 'sign', 'confirm', 'approve',
      'needs your', 'please', 'reminder', 'don\'t forget',
      'schedule', 'book club', 'picture day',
    ];
    var combined = subj + ' ' + snip;
    for (var i = 0; i < words.length; i++) {
      if (combined.indexOf(words[i]) !== -1) return true;
    }
    return false;
  }

  _senderName(from) {
    if (!from) return 'Unknown';
    var match = from.match(/^"?([^"<]*)"?\s*<?/);
    if (match && match[1].trim()) return match[1].trim();
    return from.split('@')[0] || from;
  }

  _extractDomain(from) {
    var match = from.match(/@([^>]+)/);
    if (match) return match[1].trim().toLowerCase();
    return '';
  }

  _formatTime(dateStr) {
    if (!dateStr) return '';
    try {
      var d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
      return dateStr;
    }
  }

  _cacheKey(rawEmails) {
    return rawEmails.map(function (e) { return e.id; }).sort().join(',');
  }

  _evictOldCache() {
    if (this.cache.size > 50) {
      var oldest = null;
      var oldestKey = null;
      this.cache.forEach(function (v, k) {
        if (!oldest || v.timestamp < oldest) {
          oldest = v.timestamp;
          oldestKey = k;
        }
      });
      if (oldestKey) this.cache.delete(oldestKey);
    }
  }

  _emptyResult() {
    return {
      generatedAt: new Date().toISOString(),
      backend: 'rules',
      lifeGraphVersion: lifeGraphData && lifeGraphData._meta ? lifeGraphData._meta.version : null,
      summary: { total: 0, signal: 0, noise: 0, reading: 0, signalRatio: 0 },
      sections: {
        needsYou: [],
        tracking: [],
        awareness: [],
        reading: [],
        noise: { total: 0, political: 0, promos: 0, newsletters: 0, jobs: 0, apps: 0, other: 0, items: {} },
      },
    };
  }
}

// Singleton
var pulseProcessor = new PulseProcessor();
module.exports = pulseProcessor;
