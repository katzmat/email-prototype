const express = require('express');
const config = require('../config');
const requireAuth = require('../middleware/requireAuth');
const { fetchInboxMessages, assignThreadIds } = require('../services/imap');
const { verifyToken } = require('../services/jwt');
const { loadProfile, getProfileStatus, buildProfile } = require('../services/profile-agent');
const { classifyEmails, classifyEmailsFast } = require('../services/agent-classifier');

const router = express.Router();

// Session status
router.get('/session', async (req, res) => {
  const token = req.cookies.session;
  if (!token) {
    return res.json({ connected: false, userEmail: null, provider: null });
  }
  try {
    const payload = await verifyToken(token);
    res.json({
      connected: true,
      userEmail: payload.email,
      provider: payload.provider,
    });
  } catch {
    res.json({ connected: false, userEmail: null, provider: null });
  }
});

// List inbox emails
router.get('/emails', requireAuth, async (req, res) => {
  try {
    const maxResults = parseInt(req.query.maxResults || '30', 10);
    const result = await fetchInboxMessages(req.user, maxResults);
    res.json(result);
  } catch (error) {
    console.error('Email fetch error:', error.message, error.stack);

    if (error.authenticationFailed || error.message?.includes('AUTHENTICATIONFAILED')) {
      return res.status(401).json({
        error: 'AUTH_EXPIRED',
        message: 'Email credentials expired. Please log in again.',
      });
    }

    res.status(500).json({ error: 'INTERNAL', message: 'Failed to fetch emails.' });
  }
});

// Agent-classified briefing
router.get('/briefing', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    let profileStatus = getProfileStatus(userEmail);
    let lifeGraph = loadProfile(userEmail);

    // Start profile build if needed (don't block the response)
    if (!lifeGraph && profileStatus === 'none') {
      // Fire-and-forget — first call returns without profile
      buildProfile(req.user).catch(err => {
        console.error('[briefing] Profile build failed:', err.message);
      });
      profileStatus = 'building';
    }

    // Fetch emails and assign conversation threads
    const maxResults = parseInt(req.query.maxResults || String(config.processor.maxEmails), 10);
    const { messages: rawMessages } = await fetchInboxMessages(req.user, maxResults);
    const messages = assignThreadIds(rawMessages);

    console.log(`[briefing] ${userEmail}: ${messages.length} emails, profileStatus=${profileStatus}, hasLifeGraph=${!!lifeGraph}`);

    // Classify — returns instantly (rules-based or cached agent results)
    const { classifications, backend: classifierBackend } = await classifyEmailsFast(messages, lifeGraph);
    console.log(`[briefing] Classifier backend: ${classifierBackend}`);

    // Build classified map
    const classMap = new Map();
    for (const c of classifications) {
      classMap.set(String(c.id), c);
    }

    // Helper to extract sender name
    function senderName(from) {
      if (!from) return 'Unknown';
      const match = from.match(/^"?([^"<]*)"?\s*<?/);
      if (match && match[1].trim()) return match[1].trim();
      return from.split('@')[0] || from;
    }

    // Assemble sections
    const needsAttention = [];
    const glanceMap = {};
    const low = [];

    for (const msg of messages) {
      const c = classMap.get(String(msg.id)) || { tier: 'low', reason: 'Unclassified' };

      const item = {
        id: msg.id,
        threadId: msg.threadId,
        from: senderName(msg.from),
        fromFull: msg.from,
        subject: msg.subject || '(no subject)',
        snippet: msg.snippet || '',
        date: msg.date,
        webLink: msg.webLink,
        summary: c.summary || null,
        reason: c.reason || null,
        suggestedAction: c.suggestedAction || null,
        urgencyType: c.urgencyType || null,
        glanceCategory: c.glanceCategory || null,
      };

      if (c.tier === 'needsAttention') {
        needsAttention.push(item);
      } else if (c.tier === 'glance' && c.glanceCategory) {
        const cat = c.glanceCategory;
        if (!glanceMap[cat]) glanceMap[cat] = [];
        glanceMap[cat].push(item);
      } else if (c.tier === 'glance') {
        // Glance without category → Updates & Alerts
        const cat = 'Updates & Alerts';
        if (!glanceMap[cat]) glanceMap[cat] = [];
        glanceMap[cat].push(item);
      } else {
        low.push(item);
      }
    }

    const glanceTotal = Object.values(glanceMap).reduce((sum, arr) => sum + arr.length, 0);

    console.log(`[briefing] Response: ${needsAttention.length} needsAttention, ${glanceTotal} glance (${Object.keys(glanceMap).join(', ')}), ${low.length} low`);

    res.json({
      generatedAt: new Date().toISOString(),
      backend: 'agent',
      profileStatus,
      summary: {
        total: messages.length,
        needsAttention: needsAttention.length,
        glance: glanceTotal,
        low: low.length,
      },
      sections: {
        needsAttention,
        glance: glanceMap,
        low,
      },
    });
  } catch (error) {
    console.error('[briefing] Error:', error.message, error.stack);

    if (error.authenticationFailed || error.message?.includes('AUTHENTICATIONFAILED')) {
      return res.status(401).json({
        error: 'AUTH_EXPIRED',
        message: 'Email credentials expired. Please log in again.',
      });
    }

    res.status(500).json({ error: 'INTERNAL', message: 'Failed to generate briefing.' });
  }
});

// User profile (life graph summary)
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const profile = loadProfile(req.user.email);
    if (!profile) {
      return res.json({ status: getProfileStatus(req.user.email), profile: null });
    }

    // Return a summary — not the full sender registry
    const identity = profile.identity || {};
    const circle = (profile.coordinationCircle || []).map(p => ({
      name: p.name,
      role: p.role || p.relationship,
      email: p.email,
      priorityWeight: p.priorityWeight,
    }));
    const threads = (profile.lifeThreads || []).map(t => ({
      name: t.name,
      status: t.status,
      description: t.description,
    }));
    const mailbox = profile.mailboxProfile || {};
    const meta = profile._meta || {};

    res.json({
      status: 'ready',
      profile: {
        identity,
        coordinationCircle: circle,
        lifeThreads: threads,
        mailboxProfile: {
          primaryUses: mailbox.primaryUses || [],
          signalToNoise: mailbox.volumeProfile?.signalToNoiseRatio || null,
        },
        meta: {
          generatedAt: meta.generatedAt,
          messagesSampled: meta.messagesSampled,
        },
      },
    });
  } catch (error) {
    console.error('[profile] Error:', error.message);
    res.status(500).json({ error: 'INTERNAL', message: 'Failed to load profile.' });
  }
});

module.exports = router;
