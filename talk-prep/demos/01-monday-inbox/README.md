# Demo 1: The Monday Morning Inbox

## The Shift
- **Mode 1 (Tool):** "Summarize my unread emails"
- **Mode 2 (Partner):** "Here's my inbox, my role, my week — what actually needs my attention and why?"

## The Dataset
`inbox-emails.json` — 50 emails for Jeff Martin, VP of Sales at Hartland Industrial, a mid-size industrial distributor in the Kansas City area. ~65 employees, $28M revenue. Sells bearings, power transmission, seals, and industrial MRO.

## What's Buried in the Inbox

### Urgent (they'd miss with a simple summary)
- **Dairyland Cooperative** (msg_046) — Production line down, losing $8K/hour, needs bearings delivered TODAY to Topeka
- **Acme Bearing price increase** (msg_004) — 6-8% increase effective March 21 (3 days away). They have open quotes using current pricing that need to go out NOW
- **Great Lakes Stamping** (msg_025) — Angry customer, third fulfillment error, threatening to leave. Related to Rachel's internal forward (msg_006)
- **Tom Brennan / Midwest Mechanical** (msg_001 + msg_034) — Both a coupling emergency AND a 3-week-old valve quote going cold. Same customer, two problems

### Strategic (important but not screaming)
- **Parker Hannifin fluid power opportunity** (msg_050) — Jim Hartland forwarded, $500K+ potential new line. Needs a thoughtful response, not a quick reply
- **New prospect from referral** (msg_038) — Prairie State CNC, aerospace shop, unhappy with Applied. Warm lead from a happy customer
- **Consolidated Packaging RFQ** (msg_013) — 340-unit conveyor bearing replacement, $large. Competing against Applied and Kaman
- **Amazon Business threat** (msg_017 + msg_042) — Third account lost to Amazon this quarter, and the CEO wants a slide about it for the board deck Thursday
- **Distributor agreement expiring** (msg_031) — ValvTechnologies renewal, exclusivity clause issue, expires April 15

### Requires Action But Not Urgent
- **Discount approval** (msg_020) — Jake needs OK on $8K discount for Central Iowa Machining. 18% margin.
- **New rep starting Monday** (msg_008) — No onboarding plan exists
- **Warehouse at 94% capacity** (msg_027) — $180K slow-moving inventory
- **Safety incident** (msg_036) — Minor but pallet jack issue flagged twice
- **Board deck slides due Tuesday EOD** (msg_002 + msg_042) — Two requests from Karen Wu
- **Leadership meeting moved to Wednesday** (msg_010)

### Noise (a good AI triage would de-prioritize)
- Shipping notifications, newsletter digests, AutoZone rewards, NAPA promo, LinkedIn views, Microsoft storage warning, company picnic, Cintas invoice

## Demo Script
1. Show the raw inbox — 50 emails, half unread. "This is 9:30 on a Monday morning."
2. **Mode 1:** Paste into ChatGPT, ask "summarize my unread emails." Get a flat list.
3. **Mode 2:** Give AI the inbox + context about Jeff's role, this week's priorities (board deck Thursday, Great Plains visit tomorrow, new rep starting next week), and ask: "What needs my attention first, what's time-sensitive, what can wait, and what should I ignore?"
4. **The moment:** AI catches that the Acme Bearing price increase (buried in email #4 from last night) means Jeff needs to re-quote every open deal using Acme pricing TODAY — and connects it to the Consolidated Packaging RFQ that's also pending. It also connects Rachel's internal email about Great Lakes with Dan Morrison's angry direct email as the same situation requiring one response, not two.
