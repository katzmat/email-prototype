const config = require('../config');

// ============================================================
// Email Processor — classifies raw emails into a digest
// ============================================================

class EmailProcessor {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = config.processor.cacheTTL || 300000; // 5 min default
  }

  // Main entry point
  async process(rawEmails) {
    if (!rawEmails || rawEmails.length === 0) {
      return this._emptyDigest();
    }

    // Check cache
    var cacheKey = this._cacheKey(rawEmails);
    if (this.cache.has(cacheKey)) {
      var cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }
    }

    var result;
    if (config.processor.anthropicApiKey) {
      try {
        result = await this._processWithLLM(rawEmails);
      } catch (err) {
        console.warn('LLM processing failed, falling back to rules:', err.message);
        result = this._processWithRules(rawEmails);
      }
    } else {
      result = this._processWithRules(rawEmails);
    }

    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

    // Clean old cache entries
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

    return result;
  }

  // ---- Rule-Based Classifier ----

  _processWithRules(rawEmails) {
    var sections = {
      headlines: [],
      family: [],
      reading: [],
      logistics: [],
      upcoming: [],
      noise: { total: 0, categories: {} },
    };

    for (var i = 0; i < rawEmails.length; i++) {
      var email = rawEmails[i];
      var classification = this._classifyEmail(email);

      var item = {
        emailId: email.id,
        title: email.subject || '(no subject)',
        snippet: email.snippet || '',
        from: email.from || '',
        time: this._formatTime(email.date),
        date: email.date,
        originalEmail: email,
      };

      switch (classification.section) {
        case 'headlines':
          item.badge = classification.badge || 'info';
          item.priority = classification.priority || 'medium';
          item.source = classification.source || '';
          item.deck = email.snippet || '';
          item.context = classification.context || '';
          item.suggestedAction = null;
          item.topics = classification.topics || [];
          sections.headlines.push(item);
          break;

        case 'family':
          item.source = classification.source || '';
          item.context = classification.context || '';
          item.topics = classification.topics || [];
          sections.family.push(item);
          break;

        case 'reading':
          item.source = classification.source || '';
          item.relevance = classification.relevance || 'medium';
          item.topics = classification.topics || [];
          sections.reading.push(item);
          break;

        case 'logistics':
          item.status = classification.status || 'info';
          item.service = classification.source || '';
          item.detail = email.snippet || '';
          item.topics = classification.topics || [];
          sections.logistics.push(item);
          break;

        case 'upcoming':
          item.context = classification.context || '';
          sections.upcoming.push(item);
          break;

        case 'noise':
          var cat = classification.noiseCategory || 'Other';
          if (!sections.noise.categories[cat]) {
            sections.noise.categories[cat] = { count: 0, senders: [] };
          }
          sections.noise.categories[cat].count++;
          var senderName = this._extractSenderName(email.from);
          if (sections.noise.categories[cat].senders.indexOf(senderName) === -1) {
            sections.noise.categories[cat].senders.push(senderName);
          }
          sections.noise.total++;
          break;

        default:
          // Uncategorized goes to headlines as low priority
          item.badge = 'info';
          item.priority = 'low';
          item.source = '';
          item.deck = email.snippet || '';
          item.context = '';
          item.suggestedAction = null;
          item.topics = [];
          sections.headlines.push(item);
      }
    }

    // Sort headlines: action_required first, then by priority
    var priorityOrder = { high: 0, medium: 1, low: 2 };
    sections.headlines.sort(function (a, b) {
      if (a.badge === 'action_required' && b.badge !== 'action_required') return -1;
      if (b.badge === 'action_required' && a.badge !== 'action_required') return 1;
      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    });

    return {
      generatedAt: new Date().toISOString(),
      processorBackend: 'rules',
      summary: {
        total: rawEmails.length,
        actionRequired: sections.headlines.filter(function (h) { return h.badge === 'action_required'; }).length,
        updates: sections.family.length + sections.logistics.length,
        reading: sections.reading.length,
        noise: sections.noise.total,
      },
      sections: sections,
      raw: rawEmails,
    };
  }

  // ---- Classification Rules ----

  _classifyEmail(email) {
    var from = (email.from || '').toLowerCase();
    var subject = (email.subject || '').toLowerCase();
    var snippet = (email.snippet || '').toLowerCase();
    var labels = email.labelIds || [];

    // --- Noise patterns (check first — these are the most common) ---

    // Promotional labels
    if (labels.indexOf('CATEGORY_PROMOTIONS') !== -1) {
      return { section: 'noise', noiseCategory: this._noiseCategory(from, subject) };
    }

    // Known promotional senders
    if (this._matchesAny(from, PROMO_SENDERS)) {
      return { section: 'noise', noiseCategory: this._noiseCategory(from, subject) };
    }

    // Unsubscribe indicator in snippet
    if (snippet.includes('unsubscribe') && !email.isUnread) {
      return { section: 'noise', noiseCategory: this._noiseCategory(from, subject) };
    }

    // --- Logistics (deliveries, orders, receipts) ---

    if (this._matchesAny(from, LOGISTICS_SENDERS) ||
        this._matchesAny(subject, LOGISTICS_SUBJECTS)) {
      var status = 'info';
      if (subject.includes('delivered') || subject.includes('arrived')) status = 'delivered';
      else if (subject.includes('shipped') || subject.includes('on the way') || subject.includes('out for delivery')) status = 'shipping';
      else if (subject.includes('order confirmed') || subject.includes('order placed')) status = 'ordered';
      else if (subject.includes('receipt') || subject.includes('payment')) status = 'completed';

      return {
        section: 'logistics',
        status: status,
        source: this._extractSenderName(email.from),
        topics: ['delivery'],
      };
    }

    // --- Family / Kids / School ---

    if (this._matchesAny(from, FAMILY_SENDERS) ||
        this._matchesAny(subject, FAMILY_SUBJECTS)) {
      return {
        section: 'family',
        source: this._extractSenderName(email.from),
        context: '',
        topics: this._extractTopics(subject, FAMILY_TOPICS),
      };
    }

    // --- Reading (newsletters, digests) ---

    if (labels.indexOf('CATEGORY_UPDATES') !== -1 ||
        this._matchesAny(from, READING_SENDERS) ||
        this._matchesAny(subject, READING_SUBJECTS)) {
      return {
        section: 'reading',
        source: this._extractSenderName(email.from),
        relevance: email.isStarred ? 'high' : 'medium',
        topics: [],
      };
    }

    // --- Upcoming (events, calendar, deadlines) ---

    if (this._matchesAny(subject, UPCOMING_SUBJECTS) ||
        this._matchesAny(from, UPCOMING_SENDERS)) {
      return {
        section: 'upcoming',
        context: this._extractSenderName(email.from),
      };
    }

    // --- Headlines (everything else that's unread or starred) ---

    if (email.isUnread || email.isStarred) {
      var badge = 'info';
      var priority = 'medium';

      if (email.isStarred) {
        badge = 'action_required';
        priority = 'high';
      } else if (this._matchesAny(subject, URGENT_SUBJECTS)) {
        badge = 'action_required';
        priority = 'high';
      }

      return {
        section: 'headlines',
        badge: badge,
        priority: priority,
        source: this._extractSenderName(email.from),
        context: '',
        topics: [],
      };
    }

    // --- Read, non-promotional → low priority headline ---

    return {
      section: 'headlines',
      badge: 'info',
      priority: 'low',
      source: this._extractSenderName(email.from),
      context: '',
      topics: [],
    };
  }

  // ---- Noise sub-categorization ----

  _noiseCategory(from, subject) {
    if (this._matchesAny(from, ['actblue', 'moveon', 'indivisible', 'sierra club', 'aclu', 'planned parenthood', 'pac', 'campaign', 'petition'])) return 'Political / Advocacy';
    if (this._matchesAny(from, ['old navy', 'h&m', 'gap', 'nike', 'amazon', 'target', 'walmart', 'etsy', 'ebay', 'wayfair', 'birkenstock', 'sale', 'promo'])) return 'Retail Promos';
    if (this._matchesAny(from, ['netflix', 'hulu', 'disney', 'spotify', 'apple tv', 'hbo', 'paramount', 'peacock'])) return 'Streaming';
    if (this._matchesAny(from, ['substack', 'medium', 'mailchimp', 'convertkit', 'beehiiv'])) return 'Newsletters';
    if (this._matchesAny(from, ['udemy', 'coursera', 'masterclass', 'skillshare', 'linkedin learning'])) return 'Course Pitches';
    if (this._matchesAny(subject, ['notification', 'alert', 'reminder', 'update your', 'verify your'])) return 'App Notifications';
    return 'Other';
  }

  // ---- LLM-Based Classifier ----

  async _processWithLLM(rawEmails) {
    var Anthropic;
    try {
      Anthropic = require('@anthropic-ai/sdk');
    } catch (e) {
      throw new Error('Install @anthropic-ai/sdk to use LLM processing: npm install @anthropic-ai/sdk');
    }

    var client = new Anthropic({ apiKey: config.processor.anthropicApiKey });

    // Send only metadata, not full bodies, for privacy + token efficiency
    var emailSummaries = rawEmails.map(function (e) {
      return {
        id: e.id,
        from: e.from,
        subject: e.subject,
        snippet: e.snippet,
        date: e.date,
        isUnread: e.isUnread,
        isStarred: e.isStarred,
      };
    });

    var response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: 'You are an email digest assistant. Classify each email into exactly one section: headlines (important, action needed), family (kids, school, co-parenting), reading (newsletters worth reading), logistics (deliveries, orders, receipts), upcoming (events, deadlines), or noise (promotional, bulk, unimportant). Return valid JSON matching the schema provided.',
      messages: [
        {
          role: 'user',
          content: 'Classify these emails into a digest. For headlines, extract a suggested action if applicable. Rate priority as high/medium/low and relevance as high/medium/low.\n\nEmails:\n' + JSON.stringify(emailSummaries, null, 2) + '\n\nReturn JSON with this exact structure:\n{\n  "classifications": [\n    {\n      "id": "email_id",\n      "section": "headlines|family|reading|logistics|upcoming|noise",\n      "badge": "action_required|completed|confirmed|info",\n      "priority": "high|medium|low",\n      "relevance": "high|medium|low",\n      "source": "sender name",\n      "context": "brief contextual note",\n      "suggestedAction": "what to do, or null",\n      "noiseCategory": "only if noise",\n      "topics": ["keyword1", "keyword2"]\n    }\n  ]\n}',
        },
      ],
    });

    var text = response.content[0].text;
    // Extract JSON from response (may be wrapped in markdown code blocks)
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('LLM returned non-JSON response');

    var llmResult = JSON.parse(jsonMatch[0]);
    var classificationMap = {};
    (llmResult.classifications || []).forEach(function (c) {
      classificationMap[c.id] = c;
    });

    // Build digest using LLM classifications
    var sections = {
      headlines: [],
      family: [],
      reading: [],
      logistics: [],
      upcoming: [],
      noise: { total: 0, categories: {} },
    };

    for (var i = 0; i < rawEmails.length; i++) {
      var email = rawEmails[i];
      var cls = classificationMap[email.id];

      if (!cls) {
        // LLM missed this email, use rules fallback
        cls = this._classifyEmail(email);
        cls.source = cls.source || this._extractSenderName(email.from);
      }

      var item = {
        emailId: email.id,
        title: email.subject || '(no subject)',
        snippet: email.snippet || '',
        from: email.from || '',
        time: this._formatTime(email.date),
        date: email.date,
        source: cls.source || this._extractSenderName(email.from),
        context: cls.context || '',
        topics: cls.topics || [],
        originalEmail: email,
      };

      var section = cls.section || 'headlines';
      switch (section) {
        case 'headlines':
          item.badge = cls.badge || 'info';
          item.priority = cls.priority || 'medium';
          item.deck = email.snippet || '';
          item.suggestedAction = cls.suggestedAction || null;
          sections.headlines.push(item);
          break;
        case 'family':
          sections.family.push(item);
          break;
        case 'reading':
          item.relevance = cls.relevance || 'medium';
          sections.reading.push(item);
          break;
        case 'logistics':
          item.status = cls.badge || 'info';
          item.service = cls.source || '';
          item.detail = email.snippet || '';
          sections.logistics.push(item);
          break;
        case 'upcoming':
          sections.upcoming.push(item);
          break;
        case 'noise':
          var cat = cls.noiseCategory || 'Other';
          if (!sections.noise.categories[cat]) {
            sections.noise.categories[cat] = { count: 0, senders: [] };
          }
          sections.noise.categories[cat].count++;
          var sn = this._extractSenderName(email.from);
          if (sections.noise.categories[cat].senders.indexOf(sn) === -1) {
            sections.noise.categories[cat].senders.push(sn);
          }
          sections.noise.total++;
          break;
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      processorBackend: 'llm',
      summary: {
        total: rawEmails.length,
        actionRequired: sections.headlines.filter(function (h) { return h.badge === 'action_required'; }).length,
        updates: sections.family.length + sections.logistics.length,
        reading: sections.reading.length,
        noise: sections.noise.total,
      },
      sections: sections,
      raw: rawEmails,
    };
  }

  // ---- Helpers ----

  _extractSenderName(from) {
    if (!from) return 'Unknown';
    var match = from.match(/^"?([^"<]*)"?\s*<?/);
    if (match && match[1].trim()) return match[1].trim();
    return from.split('@')[0] || from;
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

  _matchesAny(text, patterns) {
    if (!text) return false;
    for (var i = 0; i < patterns.length; i++) {
      if (text.includes(patterns[i])) return true;
    }
    return false;
  }

  _extractTopics(subject, topicMap) {
    var topics = [];
    for (var i = 0; i < topicMap.length; i++) {
      if (subject.includes(topicMap[i])) topics.push(topicMap[i]);
    }
    return topics;
  }

  _cacheKey(rawEmails) {
    return rawEmails.map(function (e) { return e.id; }).sort().join(',');
  }

  _emptyDigest() {
    return {
      generatedAt: new Date().toISOString(),
      processorBackend: 'rules',
      summary: { total: 0, actionRequired: 0, updates: 0, reading: 0, noise: 0 },
      sections: {
        headlines: [],
        family: [],
        reading: [],
        logistics: [],
        upcoming: [],
        noise: { total: 0, categories: {} },
      },
      raw: [],
    };
  }
}

// ---- Pattern Lists ----

var PROMO_SENDERS = [
  'noreply@', 'no-reply@', 'marketing@', 'deals@', 'offers@', 'promo@',
  'sale@', 'newsletter@', 'info@shopify', 'email.campaign',
];

var LOGISTICS_SENDERS = [
  'instacart', 'doordash', 'ubereats', 'grubhub', 'amazon.com',
  'ups.com', 'fedex.com', 'usps.com', 'dhl.com',
  'shipt', 'walmart', 'target.com', 'chewy.com',
];

var LOGISTICS_SUBJECTS = [
  'delivered', 'shipped', 'out for delivery', 'order confirmed',
  'order placed', 'your order', 'tracking', 'receipt',
  'payment received', 'refund', 'return label',
];

var FAMILY_SENDERS = [
  'seesaw', 'brightwheel', 'classdojo', 'remind.com',
  'schoology', 'parentvue', 'powerschool', 'skyward',
  'daycare', 'childcare', 'pediatric', 'troop', 'scout',
];

var FAMILY_SUBJECTS = [
  'child', 'student', 'parent', 'school', 'daycare',
  'camp', 'troop', 'scout', 'pediatric', 'homework',
  'report card', 'field trip', 'pickup', 'carpool',
];

var FAMILY_TOPICS = [
  'school', 'camp', 'daycare', 'doctor', 'pediatric',
  'scout', 'troop', 'sports', 'homework',
];

var READING_SENDERS = [
  'substack', 'newsletter', 'digest', 'medium.com',
  'theatlantic', 'nytimes', 'washingtonpost', 'newyorker',
  'stratechery', 'morningbrew', 'thehustle', 'theskim',
];

var READING_SUBJECTS = [
  'newsletter', 'weekly digest', 'daily brief', 'roundup',
  'edition', 'issue #', 'this week in', 'what we\'re reading',
];

var UPCOMING_SENDERS = [
  'calendar-notification', 'google.com/calendar',
  'eventbrite', 'meetup.com', 'ticketmaster', 'stubhub',
];

var UPCOMING_SUBJECTS = [
  'reminder:', 'upcoming', 'rsvp', 'event', 'deadline',
  'due date', 'appointment', 'reservation', 'booking',
  'invitation', 'save the date',
];

var URGENT_SUBJECTS = [
  'urgent', 'action required', 'action needed', 'asap',
  'time sensitive', 'respond', 'please reply', 'needs your',
  'input needed', 'approval needed', 'sign by', 'due today',
];

// Singleton instance
var processor = new EmailProcessor();

module.exports = processor;
