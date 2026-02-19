# Reimagining Email Around AI Autocomplete: Design Vision

## The Core Insight

Hero's AI Autocomplete SDK demonstrates a paradigm shift: instead of chat-based back-and-forth or static form-filling, **a single input line can expand into structured, context-aware intent** through inline slot-filling and tab-completion. The user types a seed phrase, and the system surfaces all necessary parameters to execute the action in one pass.

Applied to email, this isn't "Smart Compose for replies." It's **making the autocomplete bar the entire operating system of your inbox** — the single surface through which you read, triage, search, compose, organize, and automate your email life.

---

## The Paradigm: Autocomplete as Command Line for Life

Traditional email clients give you folders, buttons, toolbars, and multi-step workflows. This vision collapses all of that into a single, always-present input bar that understands email-native intents and progressively discloses structure as you type.

**The autocomplete bar replaces:**
- The search box
- The compose window
- The folder/label sidebar
- The filter/rule builder
- The settings panel
- The "mark as / move to / snooze" action menus

Everything is an utterance. Everything is one shot.

---

## Use Cases & Interaction Patterns

### 1. Triage Mode — "The River"

**Concept:** Instead of an inbox list you scroll through, the autocomplete bar becomes a *triage stream*. You don't open emails — you flow through them via the bar.

**Interaction:**
```
User types: "triage"
Bar expands:  triage [unread] [from:anyone] [since:today] [action:decide-each]
                      ↑ tab    ↑ tab         ↑ tab          ↑ tab
```

Pressing Enter starts a mode where emails appear one at a time *inside the autocomplete region* — a card with sender, subject, snippet — and the bar transforms into action slots:

```
┌─────────────────────────────────────────────────────────┐
│ From: Sarah Chen  ·  "Q3 Budget Review"                 │
│ "Hi, attached is the updated budget. Can you approve—"  │
├─────────────────────────────────────────────────────────┤
│ [archive] [reply:thanks] [snooze:tomorrow] [star] [skip]│
│           ↑ tab-editable                                │
└─────────────────────────────────────────────────────────┘
```

You tab through actions, customize inline ("reply: thanks, will review tonight"), hit Enter, and the next email flows in. **Zero navigation. Zero context switching. The bar IS the inbox.**

**Why this is central, not incremental:** Traditional triage requires: open inbox → scan list → click email → read → decide action → click button → go back. This collapses it to a single keystroke flow without ever leaving the bar context.

---

### 2. Compose as Structured Intent

**Concept:** Composing an email isn't "open a blank window." It's expressing intent that auto-scaffolds.

**Interaction:**
```
User types: "email sarah about"
Bar expands:  email [sarah.chen@work.com ▼] about [Q3 budget] [tone:professional]
                    ↑ resolved from contacts    ↑ inferred from recent threads
```

Tab into any slot to override. The `about` slot doesn't just set a subject — it pulls recent thread context and pre-drafts body content:

```
User types: "email sarah about budget approval"
Bar expands → generates:

  to: sarah.chen@work.com
  subject: Re: Q3 Budget Review
  body: |
    Hi Sarah,
    Approved the Q3 budget — looks good. [Let me know if you need
    anything else / One note: the marketing line item seems high]
                                         ↑ tab to pick alternative closings
  [send] [edit-body] [add-cc:finance-team] [attach:Q3-budget-v2.xlsx]
```

**Why this is central:** The compose window disappears entirely. The bar IS the compose flow. You never leave context. You never see a blank text area. Every email starts from intent + context, not from zero.

---

### 3. Search as Progressive Refinement

**Concept:** Search isn't a separate mode — it's the bar's default state, and results reshape the entire view below.

**Interaction:**
```
User types: "from"
Bar suggests: from [sarah] [this week] [has:attachment] [about:budget]
                    ↑ most frequent sender this week
```

Each slot you fill immediately filters the email view below in real-time. But the key difference from traditional search: **the bar suggests the next useful filter based on what's already narrowed.**

```
from [sarah] →  bar now suggests: [unread-only] [has:action-item] [in:thread-with-me]
```

This turns search into a **conversational narrowing flow** — like a database query builder, but entirely in natural language with tab-completion.

**Bonus — Saved Searches as Aliases:**
```
User types: "save-view urgent-from-boss"
Bar expands:  save-view [urgent-from-boss] = from:[boss@company.com] [is:unread] [has:action-item]
```

Now typing "urgent-from-boss" in the bar at any time restores that full filtered view. **The bar becomes your personalized navigation system.**

---

### 4. The Inbox as "What Do You Want to Do?"

**Concept:** The landing state of the email client isn't a list of emails. It's the bar, with a prompt-like invitation, and a contextual summary below it.

**Landing View:**
```
┌─────────────────────────────────────────────────────────┐
│  ▸ What do you want to do?                    [▾ 14 new]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ● 3 need replies     ● 2 meetings changed              │
│  ● 1 urgent from boss ● 8 newsletters                   │
│                                                         │
│  Suggested:                                             │
│  [reply to Sarah] [review expense report] [triage new]  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

The suggestion chips below the bar are autocomplete seeds — clicking one fills the bar and starts that flow. The "inbox" is now a **contextual launchpad** rather than a chronological dump.

**Why this is central:** The email list becomes secondary. The bar + suggestions are the primary interface. You interact with your email *by intent*, not by scanning.

---

### 5. Bulk Operations as One-Liners

**Concept:** Operations that normally require select-all → dropdown → action become single bar expressions.

**Interaction:**
```
User types: "archive all"
Bar expands:  archive all [from:linkedin] [older-than:7 days] [unread] [confirm:34 emails]
                           ↑ suggested based on common bulk targets
```

```
User types: "unsubscribe from"
Bar expands:  unsubscribe from [newsletters] [marketing] [specific:sender-name]
              ↑ auto-categorized
```

```
User types: "move"
Bar expands:  move [all from:jira] [to:notifications] [and:mark-read] [apply-going-forward:yes]
```

That last slot — `apply-going-forward` — turns a one-time action into a persistent rule, all from the same bar interaction.

---

### 6. Email as Executable Actions — "Do the Thing"

**Concept:** Many emails contain implicit actions (approve this, schedule that, pay this). The bar can surface these as executable intents.

**Interaction:**
```
User types: "pending"
Bar expands:  pending [approvals:2] [rsvps:3] [payments:1] [reviews:1]
```

Selecting `approvals:2` shows:
```
┌─────────────────────────────────────────────────────────┐
│ 1. Expense Report — $2,340 — from: Mike                 │
│    [approve] [reject:reason] [ask-mike:about-line-item] │
│                                                         │
│ 2. PTO Request — Dec 22-26 — from: Lisa                 │
│    [approve] [approve:with-note] [check-calendar-first] │
└─────────────────────────────────────────────────────────┘
```

The bar extracts actionable items from email content and presents them as structured, completable slots. Email stops being a reading activity and becomes a **doing activity**.

---

### 7. Relationship & Context Threads — "Tell Me About"

**Concept:** The bar becomes a way to pull up relationship context, not just messages.

**Interaction:**
```
User types: "tell me about sarah"
Bar expands:  about [sarah.chen@work.com] [show:timeline] [include:shared-files]
```

The view below transforms into a relationship dashboard:
- Last 5 exchanges (summarized, not full emails)
- Pending items between you
- Shared attachments
- Response time patterns
- Common topics

This makes the bar a **CRM-like query interface** for your personal contacts, built entirely from email data.

---

### 8. Time-Based Views — "My Morning"

**Concept:** Instead of "Inbox Zero" as a goal, the bar supports temporal intent.

**Interaction:**
```
User types: "morning"
Bar expands:  morning [briefing:5-min] [include:calendar] [priority:high-only]
```

This generates a synthesized morning briefing — not showing you 50 emails, but:
```
┌─────────────────────────────────────────────────────────┐
│  ☀ Morning Briefing · Feb 19                            │
│                                                         │
│  3 things that need you today:                          │
│   1. Reply to Sarah re: budget (she's waiting)          │
│   2. Review attached contract from legal (due today)    │
│   3. RSVP to team lunch (11:30am)                       │
│                                                         │
│  5 FYIs:                                                │
│   - Deploy went well (from: CI bot)                     │
│   - New hire starts Monday (from: HR)                   │
│   - ...3 more                                           │
│                                                         │
│  [start-triage] [reply-to-sarah] [open-contract]        │
└─────────────────────────────────────────────────────────┘
```

---

### 9. Rules & Automation — "From Now On"

**Concept:** Email rules today are buried in settings. With the bar, they're first-class utterances.

**Interaction:**
```
User types: "from now on"
Bar expands:  from-now-on [emails from:jira] [auto:archive] [unless:assigned-to-me]
```

```
User types: "when"
Bar expands:  when [i-get:calendar-invite] [auto:check-conflicts] [if-free:accept] [if-busy:tentative]
```

The bar becomes a **natural language rule engine**. Every rule is expressible as a single bar interaction with slot-filling. Rules become discoverable and manageable — type "my rules" to see them all as editable bar expressions.

---

### 10. Multi-Account / Persona Switching

**Concept:** Many people manage work + personal email. The bar handles this as a slot.

**Interaction:**
```
User types: "email"
Bar expands:  email [as:work ▼] [to:...] [about:...]
                     ↑ defaults to context-appropriate account
```

Or switching views:
```
User types: "switch"
Bar expands:  switch [to:personal] [show:unread-only] [since:last-checked]
```

---

## Architectural Vision

### The Bar as Universal Input Layer

```
┌──────────────────────────────────────────────────────────────┐
│                        THE BAR                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ▸ [intent] [slot1:value] [slot2:value] [slot3:value]  │  │
│  └────────────────────────────────────────────────────────┘  │
│           │              │              │                     │
│     Intent Engine   Slot Resolver   Context Engine           │
│           │              │              │                     │
│  ┌────────┴──────────────┴──────────────┴─────────┐         │
│  │              Action Schemas Registry            │         │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────────┐ │         │
│  │  │ triage  │ │ compose  │ │ search / filter   │ │         │
│  │  │ archive │ │ reply    │ │ bulk-ops          │ │         │
│  │  │ snooze  │ │ forward  │ │ rules             │ │         │
│  │  │ approve │ │ schedule │ │ relationships     │ │         │
│  │  └─────────┘ └──────────┘ └──────────────────┘ │         │
│  └────────────────────────────────────────────────┘         │
│           │                                                  │
│  ┌────────┴────────────────────────────────────────┐        │
│  │              View Renderer                       │        │
│  │  Transforms bar state into the view below:       │        │
│  │  - Email list (filtered/sorted per bar state)    │        │
│  │  - Triage cards (one-at-a-time flow)             │        │
│  │  - Briefings (synthesized summaries)             │        │
│  │  - Relationship views (contact context)          │        │
│  │  - Compose preview (structured draft)            │        │
│  └──────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

### Key Architectural Components

1. **Intent Engine** — Recognizes the seed phrase and maps it to an action schema (triage, compose, search, etc.)

2. **Slot Resolver** — For each action schema, determines which slots to surface, in what order, with what defaults. Uses:
   - Email corpus (frequent senders, recent threads, labels)
   - Calendar context (meetings, deadlines)
   - User behavior patterns (what you usually do at 9am, how you handle newsletters)
   - Active thread context (if you're "in" a conversation)

3. **Context Engine** — Maintains awareness of:
   - Time of day and day of week
   - What you've already triaged this session
   - Pending items and their urgency
   - Your response patterns and preferences

4. **Action Schema Registry** — Defines the slot structure for every intent:
   ```
   schema: triage
   slots:
     - filter: enum[unread, starred, flagged, all]  default: unread
     - from: contact | "anyone"                     default: anyone
     - since: relative-time                          default: today
     - action: enum[decide-each, bulk-archive, summarize]
   ```

5. **View Renderer** — The area below the bar isn't a fixed inbox layout. It's a **reactive canvas** that reshapes based on the current bar state. Triage intent → card flow. Search intent → filtered list. Briefing intent → summary view. Compose intent → draft preview.

---

## What Makes This "Central" vs. "Feature"

| Traditional Email + AI | Autocomplete-Centered Email |
|---|---|
| AI assists within existing paradigms (smart compose, suggested replies) | AI defines the interaction paradigm itself |
| Inbox list is the home screen | The bar is the home screen |
| Navigation via folders, buttons, menus | Navigation via intent expression |
| Multiple modes (reading, composing, searching, managing) | One mode: the bar |
| Email is a reading activity | Email is a doing activity |
| Features are discovered via UI exploration | Features are discovered via typing |
| Power user features hidden in settings | Power user features are just longer bar expressions |
| Context requires manual assembly (open email, check calendar, look up contact) | Context is automatically surfaced as slots |

---

## Design Principles

1. **The bar is never empty.** Even at rest, it shows intent suggestions based on context (time, unread count, pending items).

2. **Every view is a bar state.** There's no navigation that can't be expressed as a bar input. The URL *is* the bar expression.

3. **Slots are suggestions, not requirements.** You can always fire the action with partial slots — the system infers or asks only when truly ambiguous.

4. **Tab is the primary interaction key.** Tab cycles through slots, Enter executes, Escape backs up one slot, Backspace clears the current slot.

5. **The view below the bar is reactive.** It updates in real-time as you fill slots, showing preview of what the action will affect.

6. **History is replayable.** Every bar interaction is logged. Typing "history" shows recent bar expressions you can re-invoke or modify.

7. **Progressive disclosure over modal complexity.** The bar starts simple and reveals structure only as you engage with it. A novice can type "reply to sarah" and get a working flow. A power user can type "reply to sarah.chen@work.com about:budget tone:brief cc:finance attach:latest-spreadsheet send:delay-2h" and get the same.

---

## Implementation Phases for This Prototype

### Phase 1: The Bar + Search
- Replace the current search box with the autocomplete bar
- Implement intent detection for `search`, `from`, `about`, `has` intents
- Real-time slot-filling with email corpus context
- View below updates reactively as slots are filled

### Phase 2: Triage Flow
- Add `triage` intent with one-at-a-time card view
- Action slots: archive, reply (with inline draft), snooze, star, skip
- Keyboard-driven flow (tab + enter)

### Phase 3: Compose via Bar
- Add `email`, `reply`, `forward` intents
- Contact resolution from email corpus
- Thread context injection for replies
- Inline draft preview below bar

### Phase 4: Contextual Landing
- Replace inbox list as default view with intent suggestions
- Morning briefing / end-of-day summary intents
- Pending action extraction from email content

### Phase 5: Rules & Automation
- `from-now-on` and `when` intents for rule creation
- `my-rules` intent for rule management
- Rule expressions stored as bar-syntax strings

---

*This document describes a vision where the autocomplete bar isn't a feature bolted onto email — it's the fundamental interaction layer through which all email activity flows. The inbox list, the compose window, the search box, the settings panel — all collapse into variations of the same bar interaction.*
