# CLAUDE.md — email-prototype (backend)

## What This Is
Express 5 backend for the email briefing prototype. Authenticates users via email app passwords, fetches real inbox data over IMAP, and classifies emails into tiered briefings using Claude (or rule-based fallback). Serves the Expo web frontend at `/app/` for single-tunnel ngrok access. This is sprint-grade prototype code, not production.

## Stack
- Node.js + Express 5
- IMAP via `imapflow` (Gmail + Yahoo)
- JWT auth via `jose` (HS256, 24h, httpOnly cookies)
- Claude API via `@anthropic-ai/sdk` (optional — falls back to rules)
- `dotenv`, `cookie-parser`, `cors`

## Running

```bash
# Install
npm install

# Start
node server.js
# or
npm start
```

Server runs on port 3000 by default.

### Required `.env`
```
JWT_SECRET=<random-hex-string>
CORS_ENABLED=true
ALLOWED_ORIGINS=http://localhost:8083
PORT=3000
```

### Optional `.env`
```
YAHOO_CLIENT_ID=...              # Only for Yahoo OAuth flow (not app password)
YAHOO_CLIENT_SECRET=...          # Only for Yahoo OAuth flow
ANTHROPIC_API_KEY=sk-ant-...     # Enables Claude-powered classification (without it, rules-based)
BASE_URL=http://localhost:3000
REFRESH_INTERVAL=30
CLASSIFIER_MODEL=claude-sonnet-4-20250514   # Model for email classification
PROFILE_MODEL=claude-sonnet-4-20250514      # Model for life-graph profile building
MAX_EMAILS=50                    # Default max emails for /api/briefing
PROFILE_MAX_EMAILS=200           # Emails sampled when building a user profile
CLASSIFIER_CACHE_TTL=1800000     # Agent classifier cache TTL in ms (default 30 min)
GMAIL_IMAP_HOST=imap.gmail.com   # Gmail IMAP server host
YAHOO_IMAP_HOST=imap.mail.yahoo.com  # Yahoo IMAP server host
```

Generate a JWT secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Remote access (ngrok)
```bash
node server.js
ngrok http 3000 --url sprintshellproto.ngrok.io
```
Stable URL: `https://sprintshellproto.ngrok.io/app/`

The server auto-serves the Expo web build from `../inbox-app/dist/` at `/app/`. After frontend changes, re-run `npx expo export --platform web` in `inbox-app/` and restart the server.

### Stale process
Sometimes the server goes stale on port 3000. Kill it: `lsof -ti:3000 | xargs kill -9`

## API Reference

### `GET /health`
No auth. Returns `{ status: "ok" }`.

### `GET /api/session`
No auth. Checks the `session` cookie.
```json
// Connected
{ "connected": true, "userEmail": "user@gmail.com", "provider": "gmail" }
// Not connected
{ "connected": false, "userEmail": null, "provider": null }
```

### `GET /api/emails?maxResults=30`
Auth required. Returns raw IMAP messages.
```json
{
  "messages": [
    {
      "id": "12345",
      "threadId": "12345",
      "from": "Jane Doe <jane@gmail.com>",
      "to": "user@gmail.com",
      "subject": "Meeting tomorrow",
      "snippet": "Hey, just wanted to confirm...",
      "date": "2026-02-19T10:00:00.000Z",
      "labelIds": ["INBOX", "UNREAD"],
      "isUnread": true,
      "isStarred": false,
      "webLink": "https://mail.google.com/mail/u/0/#inbox/12345"
    }
  ]
}
```

### `GET /api/briefing?maxResults=50`
Auth required. The main endpoint the frontend uses. Returns classified, tiered emails.
```json
{
  "generatedAt": "2026-02-19T10:00:00.000Z",
  "backend": "agent",
  "profileStatus": "ready",       // "none" | "building" | "ready"
  "summary": { "total": 50, "needsAttention": 3, "glance": 30, "low": 17 },
  "sections": {
    "needsAttention": [{ "id", "from", "fromFull", "subject", "snippet", "date", "webLink", "summary", "reason", "suggestedAction", "urgencyType", "glanceCategory" }],
    "glance": {
      "Shipping & Deliveries": [...],
      "Newsletters & Reads": [...]
    },
    "low": [...]
  }
}
```
On first call for a new user, fires off a background profile build (life graph). Returns `profileStatus: "building"` until complete.

### `GET /api/profile`
Auth required. Returns the user's life graph summary.
```json
{
  "status": "ready",
  "profile": {
    "identity": { ... },
    "coordinationCircle": [{ "name", "role", "email", "priorityWeight" }],
    "lifeThreads": [{ "name", "status", "description" }],
    "mailboxProfile": { "primaryUses": [], "signalToNoise": 0.3 },
    "meta": { "generatedAt": "...", "messagesSampled": 200 }
  }
}
```

### `POST /auth/gmail-password`
No auth. Body: `{ "email": "user@gmail.com", "appPassword": "xxxx xxxx xxxx xxxx" }`.
Test-connects to IMAP, sets `session` cookie. Returns `{ "success": true, "email": "..." }`.

### `POST /auth/yahoo-password`
No auth. Same shape as Gmail. Body: `{ "email": "user@yahoo.com", "appPassword": "..." }`.

### `POST /auth/yahoo-token`
No auth. Body: `{ "token": "<yahoo-oauth-access-token>" }`. Validates via Yahoo userinfo API.

### `GET /auth/yahoo` + `GET /auth/yahoo/callback`
Yahoo OAuth redirect flow. Requires `YAHOO_CLIENT_ID` and `YAHOO_CLIENT_SECRET` in `.env`. Not used by the inbox-app (which uses app passwords instead).

### `POST /auth/disconnect`
No auth needed (just clears cookie). Returns `{ "success": true }`.

### `GET /` — Landing page (legacy HTML)
### `GET /inbox?variant=default` — Legacy variant-based web views

## Auth Flow

1. Frontend POSTs to `/auth/gmail-password` or `/auth/yahoo-password` with email + app password
2. Server test-connects to IMAP to validate credentials
3. On success, creates a JWT containing `{ provider, email, name, credential }` (yes, the credential is in the JWT)
4. JWT is set as an httpOnly cookie named `session` (24h expiry, `SameSite=None` over HTTPS, `Lax` on localhost)
5. `requireAuth` middleware reads this cookie, verifies the JWT, and populates `req.user`
6. All `/api/*` routes (except `/api/session`) require auth

### Adding a new provider
1. Add a login route in `routes/auth.js` that validates credentials (test IMAP connect or API call)
2. Call `createToken({ provider: 'newprovider', email, name, credential })`
3. Call `setTokenCookie(res, jwt)`
4. Add IMAP config in `services/imap.js` `createImapClient()` — match on email domain or provider field
5. The rest (fetching, classification) works automatically

## Email Fetching

`services/imap.js` connects to IMAP on each request (no persistent connections). Returns a normalized message shape compatible with the old Gmail API format.

### What you get per message
`id`, `threadId`, `from`, `to`, `subject`, `date`, `snippet` (first 200 chars of body), `labelIds`, `isUnread`, `isStarred`, `webLink`

### Gmail extras
- `X-GM-LABELS` mapped to `labelIds`: `CATEGORY_PROMOTIONS`, `CATEGORY_SOCIAL`, `CATEGORY_UPDATES`, `CATEGORY_FORUMS`, `IMPORTANT`, `SPAM`
- `webLink` deep-links to the message in Gmail web

### Yahoo limitations
- No category labels (no equivalent to Gmail's tabs)
- `webLink` just goes to `https://mail.yahoo.com` (no per-message deep link)

### Extending
To fetch more data (e.g., full body, attachments), modify the `client.fetch()` call in `fetchInboxMessages()` and add fields to `normalizeImapMessage()`.

## Agent System

Two Claude-powered agents run server-side. Both gracefully degrade without `ANTHROPIC_API_KEY`.

### Profile Agent (`services/profile-agent.js`)
- On first `/api/briefing` call for a user, fetches ~200 emails and sends them to Claude to build a "life graph"
- Life graph includes: identity, coordination circle (key people), life threads (active projects/events), mailbox profile
- Stored as JSON in `services/profiles/<email>.json`, refreshed after 7 days
- Build is fire-and-forget (first briefing request returns without profile, subsequent requests use it)
- Exports: `loadProfile(email)`, `getProfileStatus(email)`, `buildProfile(user)`

### Agent Classifier (`services/agent-classifier.js`)
- Classifies emails into three tiers: `needsAttention`, `glance`, `low`
- With API key: sends emails + life graph to Claude for context-aware classification
- Without API key: falls back to rule-based classification
- Glance emails get sub-categories: Shipping & Deliveries, Purchases & Receipts, Newsletters & Reads, Events & Calendar, Updates & Alerts, Social & Community, School & Kids, Comments & Collab
- Results cached for 30 minutes (keyed by email ID set)
- Exports: `classifyEmails(emails, lifeGraph)`, `classifyEmailsFast(emails, lifeGraph)`, `GLANCE_CATEGORIES`

### Adding a new agent
1. Create `services/your-agent.js`
2. Use `@anthropic-ai/sdk` — check `config.processor.anthropicApiKey` before calling
3. Always provide a non-LLM fallback
4. Wire it into the relevant route in `routes/api.js`

## File Layout
```
server.js                          — Express app setup, CORS, static files, route mounting
config.js                          — All env var reading, structured config object
routes/
  auth.js                          — Login endpoints (Gmail/Yahoo password, Yahoo OAuth, disconnect)
  api.js                           — /session, /emails, /briefing, /profile
  pages.js                         — Landing page + legacy variant HTML views
middleware/
  requireAuth.js                   — JWT cookie verification, populates req.user
services/
  jwt.js                           — createToken, verifyToken, set/clearTokenCookie
  imap.js                          — IMAP connect + fetch + normalize (Gmail & Yahoo)
  agent-classifier.js              — Claude-powered email classification (+ rules fallback)
  profile-agent.js                 — Claude-powered life graph builder
  profiles/                        — Cached user profiles (JSON, gitignored)
  _archive/                        — Old processors (kept for reference)
public/
  landing/                         — Landing page HTML/CSS
  shared/                          — Legacy shared JS (adapters, bridge, data-layer)
  variants/                        — Legacy HTML email client variants
scripts/
  build-life-graph.js              — CLI script for manual life graph generation
  fetch-life-graph-data.js         — CLI script for fetching raw data
  analyze-life-graph.js            — CLI script for analysis
life-graph-data.json               — Sample life graph data (42 senders, 16 life threads)
contextual-life-graph.md           — Design doc for the life graph concept
```

## Adding New Endpoints

1. Decide if it needs auth — if yes, add `requireAuth` middleware
2. Add the route handler in `routes/api.js` (or create a new route file)
3. If new route file: `app.use('/prefix', require('./routes/newfile'))` in `server.js`
4. Use `req.user` for the authenticated user's `{ provider, email, name, credential }`
5. For IMAP operations, call `fetchInboxMessages(req.user, maxResults)` or create new IMAP helpers
6. Return JSON — the frontend expects `res.json(...)` responses
7. Handle auth errors: check for `error.authenticationFailed` and return 401 with `error: 'AUTH_EXPIRED'`

## Conventions
- CommonJS (`require`/`module.exports`) throughout — no ES modules
- Express 5 (wildcard routes use `{*path}` not `*`)
- All routes return JSON (except legacy HTML pages)
- Error responses: `{ error: "ERROR_CODE", message: "Human-readable message" }`
- Auth errors return 401 with `error: "AUTH_EXPIRED"` or `error: "NOT_AUTHENTICATED"`
- Console logging with `[tag]` prefixes for traceability: `[briefing]`, `[agent-classifier]`, etc.
- No ORM, no database — state is JWT cookies + JSON files on disk
- IMAP connections are ephemeral (connect, fetch, disconnect per request)
- Config is centralized in `config.js` — never read `process.env` directly elsewhere
- CORS allows `localhost:8083` + any `*.ngrok-free.app` / `*.ngrok.io` origin
