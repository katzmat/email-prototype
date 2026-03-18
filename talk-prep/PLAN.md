# AI Workflow Talk — Rego-Fix
## "Beyond the Basics: From AI Prompts to AI-Powered Workflows"

### Detailed Production Plan

---

## 1. TALK THESIS & ARC

**Core argument:** Most people use AI like a smarter Google or a faster copywriter. The real unlock — the 10x-100x multiplier — comes from three shifts that anyone can learn:

1. **Prompt for outcomes, not tasks** — "Write me an email" vs. "Analyze this aging report and draft a prioritized collections plan that maximizes cash recovery this quarter"
2. **Give it your context** — A structured reference document that tells the AI *who you are, what you're working with, and what matters* turns generic answers into answers that know your business
3. **Let it use tools and work in steps** — When AI can read your spreadsheets, search the web, and chain steps together, it stops being an assistant and becomes a workflow engine

**Emotional arc:**
- Open with recognition: "You already use AI. You're good at it. Here's why that's the perfect foundation."
- Build the framework: Three shifts (10 min)
- Prove it with their world: 5 worked examples from roles like theirs (25 min)
- Close with adoption path: "Here's how to start Monday morning" (5 min)
- Q&A (15+ min)

---

## 2. TALK STRUCTURE (45 min + Q&A)

### Part 1: The Three Shifts (10 min)

#### Shift 1: Task Prompts → Outcome Prompts (3 min)
- **The spectrum:** Task ("summarize this") → Analysis ("what matters here and why") → Outcome ("given these constraints, what should I do and how")
- **Key concept: The Outcome Frame** — Every powerful prompt has:
  - **Role**: Who the AI should think as
  - **Goal**: The desired end state (not the task)
  - **Constraints**: Budget, timeline, brand voice, compliance rules
  - **Success criteria**: How you'd judge if the output is excellent
- **Live comparison:** Show same data, task prompt vs. outcome prompt, night-and-day difference in output quality

#### Shift 2: Blank Slate → Context-Loaded (4 min)
- **The problem:** AI gives generic answers because it knows nothing about your business
- **The solution: Context Documents** — Structured markdown/text files you maintain and reference
  - Company context doc (who we are, what we sell, our market position)
  - Role context doc (my responsibilities, my KPIs, my current priorities)
  - Project context docs (specific initiatives with their data and constraints)
- **Key insight:** You write these once, update occasionally, and reference them in every prompt. It's like giving a new hire a briefing packet instead of expecting them to figure everything out from scratch.
- **Show a real example:** A 1-page Rego-Fix company context doc → how it transforms a generic marketing prompt into one that knows powRgrip vs. ER vs. competitors

#### Shift 3: One-Shot → Agentic Workflows (3 min)
- **What changes with tool access:** AI can read files, search the web, do calculations, write documents, chain steps
- **The agent pattern:** Instead of you doing 5 steps and asking AI to help with step 3, you describe the whole workflow and let it execute
- **Spectrum of autonomy:**
  - **Copilot mode**: AI helps with each step as you go (Claude chat)
  - **Workflow mode**: AI executes a defined multi-step process (Claude with tools)
  - **Agent mode**: AI plans and executes, checking in at decision points (Claude Code, custom agents)
- **Safety note:** You always review outputs. AI proposes, you approve. The value is in the 90% of grunt work it handles so you can focus on the 10% that needs your judgment.

### Part 2: Five Worked Examples (25 min, ~5 min each)

*Each example follows this structure:*
1. Meet the persona (30 sec)
2. The situation — what they're dealing with (30 sec)
3. How most people would use AI today — the "before" (1 min)
4. The three shifts applied — the "after" (2.5 min)
5. The multiplier — what changed (30 sec)

#### Example 1: Marketing Manager — Competitive Positioning Analysis
*No sensitive data needed — uses public product specs and market info*

- **Persona:** Sarah, Marketing Manager. Responsible for campaigns, trade show materials, and competitive positioning for the US market.
- **Situation:** Preparing materials for IMTS 2026. Needs to create a competitive comparison that positions Rego-Fix's powRgrip system against Schunk TENDO, Haimer shrink-fit, and MST collet systems.
- **Before:** Asks AI "Write a comparison of powRgrip vs competitors." Gets generic fluff.
- **After:**
  - **Context doc:** Company positioning doc with Rego-Fix's key differentiators, brand voice guidelines, and target customer profiles (job shop owners, aerospace manufacturers, medical device makers)
  - **Data source:** Spreadsheet of published product specs (TIR, clamping force, tool change time, price points) compiled from public catalogs and trade publications
  - **Outcome prompt:** "You are a technical marketing strategist for precision toolholding. Using the attached competitive spec data and our brand positioning guide, create a multi-format competitive analysis package: (1) a technical comparison matrix for our sales team, (2) a customer-facing one-pager emphasizing TCO advantages, and (3) three targeted email sequences for each customer segment. Success criteria: every claim must be traceable to a spec in the data, messaging must align with our brand voice doc, and the TCO argument must include tool life and changeover time savings."
  - **Result:** A complete campaign package that would normally take 2-3 weeks of research and iteration, grounded in real specs, not hallucinated claims.

#### Example 2: Accounts Receivable / Finance — Collections Prioritization
*Uses realistic but fictional financial data*

- **Persona:** Mike, AR/Finance Analyst. Manages collections for ~150 active distributor accounts.
- **Situation:** End of Q1, cash flow is tight, and $2.1M is outstanding across accounts with different payment histories, order volumes, and relationship importance.
- **Before:** Asks AI "Help me write a collections email." Gets one generic template.
- **After:**
  - **Context doc:** Role context with collection policies, escalation thresholds, and notes about key accounts (e.g., "Precision Tool Supply is our #2 account — white-glove treatment")
  - **Data source:** AR aging report (CSV) with account names, invoice numbers, amounts, days outstanding, payment history scores, annual order volume, and last contact date
  - **Outcome prompt:** "You are a collections strategist for a B2B precision manufacturing supplier. Analyze the attached AR aging report against our collection policies and account relationship context. Produce: (1) a prioritized action list ranked by expected cash recovery × probability of collection, (2) draft communications for each tier (gentle reminder, firm follow-up, escalation), customized per account using their history and relationship status, (3) a summary for my manager showing total exposure by risk tier and recommended write-off candidates. Constraint: accounts with annual volume over $100K get personalized language, not templates."
  - **Result:** A complete collections strategy with 40+ customized communications, risk analysis, and management reporting — work that would take 2-3 full days compressed to 30 minutes of review and refinement.

#### Example 3: Project Manager — New Distributor Onboarding
*Uses realistic but fictional operational data*

- **Persona:** Lisa, Project Manager. Oversees operational projects including distributor onboarding, system implementations, and process improvements.
- **Situation:** Rego-Fix is onboarding 3 new distributors this quarter. Each onboarding has 47 steps across 6 departments, and she's tracking everything in spreadsheets.
- **Before:** Asks AI "Create an onboarding checklist for a new distributor." Gets a generic list.
- **After:**
  - **Context doc:** Rego-Fix distributor onboarding playbook (the actual process doc with all steps, owners, SLAs, and common failure points from past onboardings)
  - **Data source:** Spreadsheet tracking all 3 distributors' progress, plus a log of issues/delays from the last 5 onboardings
  - **Outcome prompt:** "You are an operations analyst supporting distributor onboarding for a precision toolholding manufacturer. Using our onboarding playbook and the current tracking spreadsheet for 3 in-progress distributors, produce: (1) a risk-flagged status report highlighting tasks that are behind SLA or approaching deadlines, (2) for each flagged item, a recommended unblock action based on how similar delays were resolved in the historical issues log, (3) a weekly email update for each distributor's primary contact with their personalized status and next steps, (4) an executive summary for leadership showing portfolio health across all 3 onboardings. Flag any steps where the playbook's SLA seems unrealistic based on historical data."
  - **Result:** Complete program management output — risk analysis, communications, executive reporting, and process improvement recommendations — from data she already had but couldn't synthesize fast enough.

#### Example 4: Sales Operations — Quote Optimization & Win Rate Analysis
*Uses realistic but fictional sales data*

- **Persona:** James, Sales Operations Analyst. Supports the sales team with quoting, pipeline reporting, and win/loss analysis.
- **Situation:** The sales team quoted $4.2M last quarter but only closed $1.8M. Leadership wants to know why and what to change.
- **Before:** Asks AI "What are common reasons for low win rates in manufacturing sales?" Gets generic industry advice.
- **After:**
  - **Context doc:** Company context with product lines, typical deal sizes, sales process stages, and strategic priorities (e.g., "push powRgrip adoption in aerospace accounts")
  - **Data source:** Quote log (CSV) with 200+ quotes showing customer, product mix, discount level, deal size, competitor mentioned, sales rep, region, days-to-close, and win/loss outcome
  - **Outcome prompt:** "You are a sales analytics consultant for a precision toolholding manufacturer. Analyze the attached quote log to identify statistically meaningful patterns in our win/loss data. Produce: (1) a win rate analysis segmented by product line, deal size, discount tier, region, and sales rep, (2) identification of our 'sweet spot' deals (highest win rate × margin), (3) a list of quotes we likely over-discounted (won deals where win probability was already high), (4) recommended pricing guardrails and quoting guidelines based on the patterns, (5) a 'deals we should have won' analysis for losses over $25K. Present findings with specific numbers, not generalities."
  - **Result:** Data-driven sales strategy that would normally require a BI analyst and 2 weeks of work — specific, actionable, grounded in their actual numbers.

#### Example 5: Customer Service / Technical Support — Product Recommendation Engine
*No sensitive data needed — uses public product catalog data*

- **Persona:** David, Technical Customer Service Rep. Handles inbound inquiries from machinists and purchasing managers trying to select the right toolholding system.
- **Situation:** Gets 30+ inquiries/day asking "which collet/holder do I need for X application?" Currently relies on personal knowledge and flipping through catalogs.
- **Before:** Asks AI "What Rego-Fix product should I recommend for high-speed aluminum milling?" Gets a vague answer that might be wrong.
- **After:**
  - **Context doc:** Product selection guide with decision trees (material → operation → speed/feed range → holder type → specific SKU), plus common gotchas and upsell opportunities
  - **Data source:** Complete product catalog data (CSV) with SKUs, specs, compatibility matrices, and application notes; plus a FAQ log of the 50 most common customer questions with expert-verified answers
  - **Outcome prompt:** "You are a technical toolholding specialist for Rego-Fix. A customer asks: [paste inquiry]. Using the product selection guide and catalog data, provide: (1) a primary recommendation with the specific SKU and why it's the best fit for their stated application, (2) an alternative option if budget is a concern, (3) any compatibility warnings (spindle taper, coolant requirements, speed limitations), (4) a suggested upsell if appropriate (e.g., reCool upgrade, secuRgrip for heavy milling), (5) a draft response email that's technical but accessible. All recommendations must trace to actual SKUs in the catalog."
  - **Result:** Expert-level technical recommendations in seconds instead of 15 minutes of catalog searching. Consistent quality regardless of which rep handles the call. New reps productive in days instead of months.

### Part 3: Your Monday Morning Playbook (5 min)

#### Start Here: The Context Doc (Week 1)
- Spend 30 minutes writing a "My Role" context doc:
  - What I'm responsible for
  - What I'm measured on
  - My current top 3 priorities
  - Key constraints (budget, timeline, compliance)
  - Tools/systems I use daily
- Start every AI conversation by referencing it: "Using the context in [doc], help me..."

#### Next: Identify Your First Workflow (Week 2)
- Find a task you do repeatedly that involves: data → analysis → output
- Map the steps you do manually
- Write an outcome prompt that describes the end state
- Test it, refine it, save the prompt as a template

#### Then: Build Your Prompt Library (Ongoing)
- Save prompts that work well
- Share them with colleagues
- Iterate: each use teaches you what to add to your context docs

#### The Adoption Ladder
1. **Better prompts** — Outcome framing (this talk)
2. **Context docs** — Your AI knows your job (this talk)
3. **Prompt templates** — Reusable workflows you share with your team
4. **Tool-connected AI** — Claude with file access, web search, data analysis
5. **Custom agents** — Purpose-built AI workflows for specific business processes

### Part 4: Q&A (15+ min)

---

## 3. DELIVERABLES TO BUILD

### A. Talk Materials
1. **`talk-outline.md`** — Speaker-ready outline with talking points, transitions, and timing notes
2. **`slides-outline.md`** — Slide-by-slide content guide (they'll build actual slides from this)

### B. Framework Assets (usable beyond the talk)
3. **`framework/outcome-prompting-guide.md`** — The Outcome Frame explained with templates
4. **`framework/context-doc-template.md`** — Blank template + filled example for Rego-Fix
5. **`framework/workflow-mapping-worksheet.md`** — How to identify and design AI workflows

### C. Example Data & Prompts (the "wow" moments)
6. **`examples/01-marketing-competitive-analysis/`**
   - `company-context.md` — Rego-Fix positioning & brand voice context doc
   - `competitor-specs.csv` — Realistic public-sourced competitive spec data
   - `prompt.md` — The outcome prompt
   - `sample-output.md` — What the AI produces (abbreviated)

7. **`examples/02-finance-collections/`**
   - `role-context.md` — AR analyst role context doc
   - `ar-aging-report.csv` — Fictional but realistic aging report (~150 accounts)
   - `prompt.md` — The outcome prompt
   - `sample-output.md` — Prioritized strategy output

8. **`examples/03-pm-distributor-onboarding/`**
   - `onboarding-playbook.md` — Process doc with steps, owners, SLAs
   - `tracking-spreadsheet.csv` — 3 distributors in progress
   - `historical-issues.csv` — Past onboarding delay log
   - `prompt.md` — The outcome prompt
   - `sample-output.md` — Risk report + communications

9. **`examples/04-sales-ops-win-loss/`**
   - `company-context.md` — Sales process & strategy context
   - `quote-log.csv` — 200+ fictional quotes with outcomes
   - `prompt.md` — The outcome prompt
   - `sample-output.md` — Analytics output

10. **`examples/05-tech-support-product-rec/`**
    - `product-selection-guide.md` — Decision tree context doc
    - `product-catalog.csv` — Realistic SKU/spec data from public sources
    - `prompt.md` — The outcome prompt (with sample customer inquiry)
    - `sample-output.md` — Technical recommendation output

### D. Live Demo Recommendation
Given the audience is comfortable with AI, I recommend **one live demo** during the talk:
- **Best candidate:** Example 5 (Technical Support) — it's visual, has no sensitive data, and the audience can see the AI "think through" a product recommendation in real time
- **Setup:** Pre-load the context doc and catalog CSV, paste a customer inquiry, show the output forming
- **Backup:** Pre-recorded screencast in case of connectivity issues
- The other 4 examples work better as "before/after" slides since the data is more complex

---

## 4. DATA CREATION APPROACH

For each example, the data will be:
- **Realistic in structure and scale** — Real column headers, realistic distributions, plausible names/numbers
- **Fictional in content** — No actual Rego-Fix customer data, made-up account names and figures
- **Internally consistent** — Numbers add up, dates make sense, patterns exist to be found
- **Analytically interesting** — The data contains actual patterns that the AI can surface (not random noise)

For Examples 1 and 5 (no sensitive data needed), product specs and catalog data will be based on publicly available information from Rego-Fix's published catalogs and competitor public marketing materials.

---

## 5. BUILD ORDER

1. Framework docs (they anchor everything else)
2. Example 1 (Marketing) + Example 5 (Tech Support) — no sensitive data, can demo
3. Example 2 (Finance) + Example 4 (Sales Ops) — data-heavy, high impact
4. Example 3 (PM Onboarding) — operational, ties it all together
5. Talk outline + slides outline (written last, after examples are solid)
6. Review pass for consistency, timing, and narrative flow

---

## 6. KEY MESSAGING NOTES

### What to AVOID
- Don't say "AI will replace jobs" — say "AI will replace *tasks* so you can focus on judgment"
- Don't show overly technical setups — keep it to copy-paste accessible
- Don't promise perfection — always frame as "AI drafts, you refine"
- Don't use Silicon Valley jargon — "agentic" becomes "multi-step AI workflows"

### What to EMPHASIZE
- They already have the hardest skill (prompting). The three shifts build on what they know.
- The examples use data they already have. No new tools needed to start.
- Context docs are the highest-ROI investment — 30 minutes of writing transforms every future interaction
- This is about working smarter on the stuff that's tedious, so they have more time for the stuff that matters
- Rego-Fix's business is built on precision — applying that same precision to how they use AI is a natural fit
