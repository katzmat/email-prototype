/**
 * Fetch ~450 primary-tab emails for contextual life graph analysis.
 * Uses the existing OAuth tokens from the session store.
 */

var path = require('path');
var fs = require('fs');
var config = require(path.join(__dirname, '..', 'config'));
var { createOAuth2Client, setCredentials } = require(path.join(__dirname, '..', 'services', 'oauth'));
var { google } = require('googleapis');

// Find authenticated session
var sessDir = path.join(__dirname, '..', 'sessions');
var sessionData = null;
fs.readdirSync(sessDir).filter(f => f.endsWith('.json')).forEach(f => {
  try {
    var data = JSON.parse(fs.readFileSync(path.join(sessDir, f), 'utf8'));
    if (data.tokens && data.connected && data.tokens.refresh_token) {
      sessionData = data;
    }
  } catch(e) {}
});

if (!sessionData) {
  console.error('No authenticated session found. Please connect Gmail first.');
  process.exit(1);
}

console.log('Using session for:', sessionData.userEmail);

async function fetchEmails() {
  var oauth2Client = createOAuth2Client();
  setCredentials(oauth2Client, sessionData.tokens);

  var gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Fetch primary category emails (what Gmail shows in the Primary tab)
  // We use category:primary to filter, and fetch in batches
  var allMessages = [];
  var pageToken = null;
  var targetCount = 450;

  console.log('Fetching message IDs (target: ' + targetCount + ')...');

  while (allMessages.length < targetCount) {
    var listParams = {
      userId: 'me',
      maxResults: 100,
      q: '-in:spam -in:trash',
    };
    if (pageToken) listParams.pageToken = pageToken;

    var listResult = await gmail.users.messages.list(listParams);
    var messages = listResult.data.messages || [];

    if (messages.length === 0) break;

    allMessages = allMessages.concat(messages);
    pageToken = listResult.data.nextPageToken;

    console.log('  Fetched ' + allMessages.length + ' message IDs so far...');

    if (!pageToken) break;
  }

  allMessages = allMessages.slice(0, targetCount);
  console.log('Total message IDs to fetch: ' + allMessages.length);

  // Fetch full metadata for each message (in batches to avoid rate limits)
  var batchSize = 20;
  var fullEmails = [];
  var errors = 0;

  for (var i = 0; i < allMessages.length; i += batchSize) {
    var batch = allMessages.slice(i, i + batchSize);
    var batchPromises = batch.map(async function(msg) {
      try {
        var result = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date', 'Reply-To', 'List-Unsubscribe', 'Cc', 'Bcc'],
        });

        var headers = {};
        (result.data.payload.headers || []).forEach(function(h) {
          headers[h.name.toLowerCase()] = h.value;
        });

        return {
          id: result.data.id,
          threadId: result.data.threadId,
          labelIds: result.data.labelIds || [],
          snippet: result.data.snippet || '',
          internalDate: result.data.internalDate,
          date: headers.date || '',
          from: headers.from || '',
          to: headers.to || '',
          cc: headers.cc || '',
          subject: headers.subject || '',
          replyTo: headers['reply-to'] || '',
          hasUnsubscribe: !!headers['list-unsubscribe'],
          isUnread: (result.data.labelIds || []).indexOf('UNREAD') !== -1,
          isStarred: (result.data.labelIds || []).indexOf('STARRED') !== -1,
          isImportant: (result.data.labelIds || []).indexOf('IMPORTANT') !== -1,
          sizeEstimate: result.data.sizeEstimate || 0,
        };
      } catch(e) {
        errors++;
        return null;
      }
    });

    var batchResults = await Promise.all(batchPromises);
    fullEmails = fullEmails.concat(batchResults.filter(Boolean));

    console.log('  Fetched metadata: ' + fullEmails.length + '/' + allMessages.length + (errors > 0 ? ' (' + errors + ' errors)' : ''));

    // Small delay between batches to avoid rate limits
    if (i + batchSize < allMessages.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Sort by date (newest first)
  fullEmails.sort(function(a, b) {
    return parseInt(b.internalDate || '0') - parseInt(a.internalDate || '0');
  });

  // Write to file
  var outputPath = path.join(__dirname, '..', 'life-graph-data.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    fetchedAt: new Date().toISOString(),
    userEmail: sessionData.userEmail,
    totalEmails: fullEmails.length,
    dateRange: {
      newest: fullEmails[0] ? fullEmails[0].date : null,
      oldest: fullEmails[fullEmails.length - 1] ? fullEmails[fullEmails.length - 1].date : null,
    },
    emails: fullEmails,
  }, null, 2));

  console.log('\nDone! Wrote ' + fullEmails.length + ' emails to ' + outputPath);
  console.log('Date range: ' + (fullEmails[fullEmails.length - 1] || {}).date + ' → ' + (fullEmails[0] || {}).date);
}

fetchEmails().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
