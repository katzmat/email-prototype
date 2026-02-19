/**
 * Deep analysis of email data for contextual life graph.
 * Outputs structured analysis to life-graph-analysis.json
 */

var fs = require('fs');
var path = require('path');
var data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'life-graph-data.json'), 'utf8'));

var emails = data.emails;

// =====================================================
// 1. SENDER ANALYSIS
// =====================================================

var senderMap = {};
emails.forEach(function(e) {
  var from = e.from || '';
  var match = from.match(/<([^>]+)>/);
  var emailAddr = match ? match[1].toLowerCase() : from.toLowerCase().trim();
  var name = from.replace(/<[^>]+>/, '').replace(/"/g, '').trim();

  if (!senderMap[emailAddr]) {
    senderMap[emailAddr] = {
      name: name,
      email: emailAddr,
      count: 0,
      subjects: [],
      snippets: [],
      dates: [],
      labels: {},
      unread: 0,
      starred: 0,
      important: 0,
      hasUnsubscribe: false,
      categories: {},
    };
  }
  var s = senderMap[emailAddr];
  s.count++;
  s.subjects.push(e.subject);
  s.snippets.push(e.snippet);
  s.dates.push(e.date);
  if (e.isUnread) s.unread++;
  if (e.isStarred) s.starred++;
  if (e.isImportant) s.important++;
  if (e.hasUnsubscribe) s.hasUnsubscribe = true;

  (e.labelIds || []).forEach(function(l) {
    s.labels[l] = (s.labels[l] || 0) + 1;
    if (l.startsWith('CATEGORY_')) s.categories[l] = (s.categories[l] || 0) + 1;
  });
});

// =====================================================
// 2. CLASSIFICATION
// =====================================================

// Personal / Self-sent
var selfSent = [];
var personal = [];
var family = [];
var financial = [];
var healthcare = [];
var childcare = [];
var logistics = [];
var subscriptions = [];
var newsletters = [];
var promos = [];
var social = [];
var political = [];
var travel = [];
var homeServices = [];
var legal = [];
var work = [];
var entertainment = [];
var food = [];
var education = [];
var other = [];

emails.forEach(function(e) {
  var from = (e.from || '').toLowerCase();
  var subj = (e.subject || '').toLowerCase();
  var snip = (e.snippet || '').toLowerCase();
  var all = from + ' ' + subj + ' ' + snip;
  var to = (e.to || '').toLowerCase();

  var classified = false;

  // Self-sent
  if (from.includes('katzmat@gmail.com')) {
    selfSent.push(e);
    classified = true;
  }

  // Childcare / School
  if (/seesaw|managebac|day early learning|daycare|school|student|child|brightwheel|classdojo|remind\.com|parentvue/.test(all)) {
    childcare.push(e);
    classified = true;
  }

  // Healthcare
  if (/simplepractice|joyful counseling|health|medical|doctor|dental|pediatric|pharmacy|rx|prescription|mychart|patient|anthem|cigna|aetna|united\s?health|humana|kaiser|clinic|therapy|counseling|care\.com/.test(all)) {
    healthcare.push(e);
    classified = true;
  }

  // Financial
  if (/bank|chase|wells fargo|citi|capital one|amex|american express|venmo|paypal|zelle|mint|turbotax|tax|irs|w-2|1099|insurance|premium|policy|claim|coverage|deductible|mortgage|loan|credit|debt|invest|fidelity|vanguard|schwab|401k|ira|hsa|autopay|bill|payment|invoice|statement|balance|account alert/.test(all)) {
    financial.push(e);
    classified = true;
  }

  // Travel
  if (/southwest|american airlines|aadvantage|delta|united airlines|wyndham|marriott|hilton|airbnb|hotel|flight|booking|reservation|travel|tsa|airport|boarding pass|rental car|hertz|avis|enterprise/.test(all)) {
    travel.push(e);
    classified = true;
  }

  // Food & Dining
  if (/instacart|doordash|ubereats|grubhub|restaurant|recipe|bon app|food|grocery|meal|cooking|chef|kitchen/.test(all)) {
    food.push(e);
    classified = true;
  }

  // Logistics (deliveries, orders, shipping)
  if (/amazon\.com|order|shipped|delivered|tracking|ups|fedex|usps|package|delivery|shipment|return|refund/.test(all)) {
    logistics.push(e);
    classified = true;
  }

  // Political
  if (/progressive turnout|electjon|ossoff|campaign|petition|vote|democrat|republican|senate|congress|pac|actblue|moveon|indivisible|aclu|sierra club|planned parenthood|political|election/.test(all)) {
    political.push(e);
    classified = true;
  }

  // Home & Neighborhood
  if (/nextdoor|emerson heights|neighbor|hoa|home|house|plumber|hvac|electrician|contractor|remodel|repair|lawn|garden|pest|roofing|gutters/.test(all)) {
    homeServices.push(e);
    classified = true;
  }

  // Legal
  if (/access legal|attorney|lawyer|legal|court|filing|notary/.test(all)) {
    legal.push(e);
    classified = true;
  }

  // Entertainment & Arts
  if (/netflix|hulu|spotify|apple tv|disney|hbo|moth|ticketing|ticket|concert|show|museum|gallery|auction|artarama|wright.*lama|landry|blurb|tiktok|fubo/.test(all)) {
    entertainment.push(e);
    classified = true;
  }

  // Education / Learning
  if (/managebac|school|class|course|lesson|homework|grade|report card|curriculum/.test(all)) {
    education.push(e);
    classified = true;
  }

  // Social
  if (/reddit|nextdoor|social|facebook|instagram|linkedin|twitter/.test(all) || (e.labelIds || []).includes('CATEGORY_SOCIAL')) {
    social.push(e);
    classified = true;
  }

  // Newsletters (substack, known newsletters)
  if (/substack|every\.to|tldr|morning consult|newsletter|digest|briefing|new yorker.*daily/.test(all) || e.hasUnsubscribe) {
    if (!classified) newsletters.push(e);
    else newsletters.push(e);
  }

  // Promos
  if ((e.labelIds || []).includes('CATEGORY_PROMOTIONS')) {
    promos.push(e);
    if (!classified) classified = true;
  }

  if (!classified && !e.hasUnsubscribe) {
    other.push(e);
  }
});

// =====================================================
// 3. PERSONAL CONTACTS ANALYSIS
// =====================================================

var selfSentSubjects = selfSent.map(function(e) {
  return { subject: e.subject, to: e.to, snippet: e.snippet, date: e.date };
});

// =====================================================
// 4. FINANCIAL DETAIL
// =====================================================

var financialDetail = financial.map(function(e) {
  return { from: e.from, subject: e.subject, snippet: e.snippet, date: e.date };
});

// =====================================================
// 5. OUTPUT
// =====================================================

var analysis = {
  meta: {
    totalEmails: emails.length,
    dateRange: data.dateRange,
    fetchedAt: data.fetchedAt,
    userEmail: data.userEmail,
  },
  stats: {
    unread: emails.filter(function(e) { return e.isUnread; }).length,
    starred: emails.filter(function(e) { return e.isStarred; }).length,
    important: emails.filter(function(e) { return e.isImportant; }).length,
    uniqueSenders: Object.keys(senderMap).length,
    hasUnsubscribeHeader: emails.filter(function(e) { return e.hasUnsubscribe; }).length,
    inInbox: emails.filter(function(e) { return (e.labelIds || []).includes('INBOX'); }).length,
  },
  categoryCounts: {
    selfSent: selfSent.length,
    childcare: childcare.length,
    healthcare: healthcare.length,
    financial: financial.length,
    travel: travel.length,
    food: food.length,
    logistics: logistics.length,
    political: political.length,
    homeServices: homeServices.length,
    legal: legal.length,
    entertainment: entertainment.length,
    education: education.length,
    social: social.length,
    newsletters: newsletters.length,
    promos: promos.length,
    other: other.length,
  },
  selfSent: selfSentSubjects,
  childcare: childcare.map(function(e) { return { from: e.from, subject: e.subject, snippet: e.snippet, date: e.date }; }),
  healthcare: healthcare.map(function(e) { return { from: e.from, subject: e.subject, snippet: e.snippet, date: e.date }; }),
  financial: financialDetail,
  travel: travel.map(function(e) { return { from: e.from, subject: e.subject, snippet: e.snippet, date: e.date }; }),
  food: food.map(function(e) { return { from: e.from, subject: e.subject, snippet: e.snippet, date: e.date }; }),
  logistics: logistics.map(function(e) { return { from: e.from, subject: e.subject, snippet: e.snippet, date: e.date }; }),
  political: political.map(function(e) { return { from: e.from, subject: e.subject, snippet: e.snippet, date: e.date }; }),
  homeServices: homeServices.map(function(e) { return { from: e.from, subject: e.subject, snippet: e.snippet, date: e.date }; }),
  legal: legal.map(function(e) { return { from: e.from, subject: e.subject, snippet: e.snippet, date: e.date }; }),
  entertainment: entertainment.map(function(e) { return { from: e.from, subject: e.subject, snippet: e.snippet, date: e.date }; }),
  social: social.map(function(e) { return { from: e.from, subject: e.subject, snippet: e.snippet, date: e.date }; }),
  newsletters: newsletters.map(function(e) { return { from: e.from, subject: e.subject, snippet: e.snippet, date: e.date }; }),
  other: other.map(function(e) { return { from: e.from, subject: e.subject, snippet: e.snippet, date: e.date }; }),

  // Top senders with details
  topSenders: Object.values(senderMap)
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, 80)
    .map(function(s) {
      return {
        name: s.name,
        email: s.email,
        count: s.count,
        unread: s.unread,
        starred: s.starred,
        important: s.important,
        hasUnsubscribe: s.hasUnsubscribe,
        categories: s.categories,
        subjects: s.subjects,
      };
    }),
};

var outputPath = path.join(__dirname, '..', 'life-graph-analysis.json');
fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
console.log('Analysis written to', outputPath);

// Print summary
console.log('\n=== CATEGORY COUNTS ===');
Object.entries(analysis.categoryCounts).forEach(function(c) {
  console.log('  ' + c[0] + ': ' + c[1]);
});

console.log('\n=== STATS ===');
Object.entries(analysis.stats).forEach(function(s) {
  console.log('  ' + s[0] + ': ' + s[1]);
});
