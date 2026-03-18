# Demo 3: Why Are We Losing Deals?

## The Shift
- **Mode 1 (Tool):** "What are common reasons for low win rates in manufacturing distribution?"
- **Mode 2 (Partner):** "Here's 6 months of our actual quote data — 220 quotes with win/loss outcomes. Find the patterns and tell me what to fix."

## The Dataset
`quote-log.csv` — 220 quotes from Q4 2025 through Q1 2026 for Hartland Industrial. Includes customer, product category, deal size, margin, days to quote, competitor, win/loss, discount given, and sales rep.

## Patterns Embedded in the Data (what AI should find)

### 1. The Speed Problem (the big insight)
Win rate is ~45% for deals under $10K but only ~12% for deals over $50K. The obvious explanation is "we're not competitive on big deals." But the *real* cause is quoting speed:
- Small deals: quoted in 1-2 days → 45% win rate
- Large deals: quoted in 5-8 days → 12% win rate
- Large deals quoted in under 3 days (rare): ~40% win rate

**The insight:** We don't have a pricing problem on large deals. We have a speed problem. Competitors are getting quotes out faster and winning on responsiveness.

### 2. The Jake Finley Effect
Jake's overall win rate is ~42% vs. team average of ~30%. He doesn't discount more — his average discount is actually lower. He wins because:
- He quotes faster (avg 2 days even on large deals)
- He picks his battles (fewer quotes, but higher conversion)
- He knows when NOT to quote (doesn't waste time on deals he'll lose)

**The insight:** The best rep isn't the one who closes the hardest. It's the one who responds fastest and qualifies best.

### 3. Commodity Commoditization
Bearing win rate is lowest (~25%) and increasingly shows Amazon Business and McMaster as competitors. Power Transmission and Valves have higher win rates because they require more expertise.

**The insight:** Stop fighting on commodity bearings. Double down on application-specific and engineered solutions where knowledge is the differentiator.

### 4. The Discount Leak
~15% of won deals show discounts of 12%+ in situations where the deal likely would have been won at a lower discount (small deal size, no strong competitor mentioned, fast close time).

**The insight:** We're leaving $X on the table per quarter in unnecessary discounting. The estimate should be in the $40-60K/quarter range based on the data.

### 5. Competitor-Specific Patterns
- Motion Industries: most common on large deals, they compete on inventory depth
- Amazon Business: small commodity orders, we're losing the convenience battle
- Ferguson: shows up specifically on valve deals, they have stock advantage
- Applied Industrial: power transmission, competitive on pricing

## Demo Script
1. Show the CSV on screen briefly — "This is 6 months of our quoting data. 220 quotes, $4.2M quoted, $1.8M won."
2. **Mode 1:** "What are common reasons for low win rates in distribution?" → Generic bullet points about pricing, relationships, market conditions. True but useless.
3. **Mode 2:** Upload the CSV. "Analyze this quote log. Find the statistically meaningful patterns. I want to know: why are we losing, where are we winning, and what should we change?"
4. **The moment:** AI surfaces the speed-vs-size insight. "Your win rate on large deals is 12%, but when you quote large deals in under 3 days — which you rarely do — your win rate jumps to 40%. Your problem isn't pricing. It's quoting speed." The room goes quiet because this is exactly the kind of insight that would take a BI analyst two weeks to find.
5. **Follow-up in the same conversation:** "Now look at our discounting. Where are we giving away margin we don't need to?" AI finds the discount leak and estimates the quarterly cost.
