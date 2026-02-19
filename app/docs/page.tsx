export default function DesignDoc() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-gray-100">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-4xl mx-auto px-6 py-24">
          <p className="text-blue-400 font-mono text-sm tracking-widest uppercase mb-4">Design Vision</p>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
            Reimagining Email Around AI Autocomplete
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl leading-relaxed">
            What if the autocomplete bar wasn&apos;t a feature inside your inbox&mdash;but <em className="text-white not-italic font-medium">was</em> the inbox?
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6">

        {/* Core Insight */}
        <Section>
          <SectionLabel>The Core Insight</SectionLabel>
          <p className="text-lg text-gray-300 leading-relaxed mb-6">
            Hero&apos;s AI Autocomplete SDK demonstrates a paradigm shift: instead of chat-based back-and-forth or static form-filling, a single input line can expand into <Strong>structured, context-aware intent</Strong> through inline slot-filling and tab-completion.
          </p>
          <p className="text-lg text-gray-300 leading-relaxed mb-8">
            Applied to email, this isn&apos;t &ldquo;Smart Compose for replies.&rdquo; It&apos;s making the autocomplete bar the <Strong>entire operating system of your inbox</Strong>&mdash;the single surface through which you read, triage, search, compose, organize, and automate your email life.
          </p>
          <BarMockup
            label="The bar replaces everything"
            items={['Search box', 'Compose window', 'Folder sidebar', 'Filter builder', 'Settings panel', 'Action menus']}
          />
        </Section>

        {/* Paradigm */}
        <Section>
          <SectionLabel>The Paradigm</SectionLabel>
          <h2 className="text-3xl font-bold mb-4">Autocomplete as Command Line for Life</h2>
          <p className="text-gray-400 leading-relaxed mb-8">
            Traditional email clients give you folders, buttons, toolbars, and multi-step workflows. This vision collapses all of that into a single, always-present input bar that understands email-native intents and progressively discloses structure as you type.
          </p>
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 text-center">
            <p className="text-gray-500 font-mono text-sm mb-3">Everything is an utterance.</p>
            <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Everything is one shot.</p>
          </div>
        </Section>

        <div className="border-t border-gray-800 my-16" />
        <p className="text-center text-sm text-gray-500 font-mono tracking-widest uppercase mb-16">Use Cases &amp; Interaction Patterns</p>

        {/* Use Case 1: Triage */}
        <UseCase number={1} title='Triage Mode &mdash; "The River"'>
          <p className="text-gray-400 leading-relaxed mb-6">
            Instead of an inbox list you scroll through, the autocomplete bar becomes a <em>triage stream</em>. You don&apos;t open emails&mdash;you flow through them via the bar.
          </p>
          <InteractionDemo
            typing="triage"
            slots={[
              { label: 'unread', muted: false },
              { label: 'from:anyone', muted: true },
              { label: 'since:today', muted: true },
              { label: 'action:decide-each', muted: true },
            ]}
            hint="Tab through slots, Enter to start"
          />
          <div className="mt-6">
            <EmailCard
              from="Sarah Chen"
              subject="Q3 Budget Review"
              snippet="Hi, attached is the updated budget. Can you approve the new line items before&hellip;"
              actions={['archive', 'reply:thanks', 'snooze:tomorrow', 'star', 'skip']}
            />
          </div>
          <Callout>
            Traditional triage: open inbox &rarr; scan list &rarr; click email &rarr; read &rarr; decide action &rarr; click button &rarr; go back. This collapses it to a single keystroke flow without ever leaving the bar context.
          </Callout>
        </UseCase>

        {/* Use Case 2: Compose */}
        <UseCase number={2} title="Compose as Structured Intent">
          <p className="text-gray-400 leading-relaxed mb-6">
            Composing an email isn&apos;t &ldquo;open a blank window.&rdquo; It&apos;s expressing intent that auto-scaffolds.
          </p>
          <InteractionDemo
            typing="email sarah about"
            slots={[
              { label: 'sarah.chen@work.com', muted: false },
              { label: 'Q3 budget', muted: false },
              { label: 'tone:professional', muted: true },
            ]}
            hint="Contact resolved from corpus, topic inferred from recent threads"
          />
          <div className="mt-6 bg-gray-900/60 border border-gray-800 rounded-xl p-6 font-mono text-sm">
            <div className="text-gray-500 mb-1">to: <span className="text-blue-400">sarah.chen@work.com</span></div>
            <div className="text-gray-500 mb-1">subject: <span className="text-gray-300">Re: Q3 Budget Review</span></div>
            <div className="text-gray-500 mb-3">body:</div>
            <div className="text-gray-300 pl-4 border-l-2 border-gray-700 mb-4">
              Hi Sarah,<br/>
              Approved the Q3 budget&mdash;looks good.{' '}
              <span className="text-blue-400 bg-blue-400/10 px-1 rounded">[Let me know if you need anything else</span>
              {' / '}
              <span className="text-gray-600">One note: the marketing line item seems high]</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Slot active>send</Slot>
              <Slot>edit-body</Slot>
              <Slot>add-cc:finance-team</Slot>
              <Slot>attach:Q3-budget-v2.xlsx</Slot>
            </div>
          </div>
          <Callout>
            The compose window disappears entirely. The bar IS the compose flow. You never leave context. Every email starts from intent + context, not from zero.
          </Callout>
        </UseCase>

        {/* Use Case 3: Search */}
        <UseCase number={3} title="Search as Progressive Refinement">
          <p className="text-gray-400 leading-relaxed mb-6">
            Search isn&apos;t a separate mode&mdash;it&apos;s the bar&apos;s default state. Each slot you fill immediately filters the email view below in real-time. The bar suggests the <Strong>next useful filter</Strong> based on what&apos;s already narrowed.
          </p>
          <InteractionDemo
            typing="from"
            slots={[
              { label: 'sarah', muted: false },
              { label: 'this week', muted: true },
              { label: 'has:attachment', muted: true },
              { label: 'about:budget', muted: true },
            ]}
            hint="Most frequent sender this week suggested first"
          />
          <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
            <span className="font-mono">from [sarah]</span>
            <span className="text-gray-600">&rarr;</span>
            <span className="text-gray-400">bar now suggests:</span>
            <Slot>unread-only</Slot>
            <Slot>has:action-item</Slot>
            <Slot>in-thread</Slot>
          </div>
          <div className="mt-8 bg-gray-900/40 border border-dashed border-gray-700 rounded-xl p-6">
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-3">Saved Searches as Aliases</p>
            <InteractionDemo
              typing='save-view urgent-from-boss'
              slots={[
                { label: 'from:boss@co.com', muted: false },
                { label: 'is:unread', muted: false },
                { label: 'has:action-item', muted: false },
              ]}
              hint='Type "urgent-from-boss" anytime to restore this view'
            />
          </div>
        </UseCase>

        {/* Use Case 4: Landing */}
        <UseCase number={4} title='The Inbox as "What Do You Want to Do?"'>
          <p className="text-gray-400 leading-relaxed mb-6">
            The landing state isn&apos;t a list of emails. It&apos;s the bar with a prompt-like invitation and a contextual summary below it.
          </p>
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-blue-400">&#9656;</span>
                <span className="text-gray-400 italic">What do you want to do?</span>
              </div>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full font-mono">14 new</span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-6">
                <StatusChip color="red" label="3 need replies" />
                <StatusChip color="yellow" label="2 meetings changed" />
                <StatusChip color="orange" label="1 urgent from boss" />
                <StatusChip color="gray" label="8 newsletters" />
              </div>
              <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-3">Suggested</p>
              <div className="flex gap-2 flex-wrap">
                <SuggestionChip>reply to Sarah</SuggestionChip>
                <SuggestionChip>review expense report</SuggestionChip>
                <SuggestionChip>triage new</SuggestionChip>
              </div>
            </div>
          </div>
          <Callout>
            The email list becomes secondary. The bar + suggestions are the primary interface. You interact with email by intent, not by scanning.
          </Callout>
        </UseCase>

        {/* Use Case 5: Bulk */}
        <UseCase number={5} title="Bulk Operations as One-Liners">
          <p className="text-gray-400 leading-relaxed mb-6">
            Operations that normally require select-all &rarr; dropdown &rarr; action become single bar expressions.
          </p>
          <div className="space-y-4">
            <InteractionDemo
              typing="archive all"
              slots={[
                { label: 'from:linkedin', muted: false },
                { label: 'older-than:7d', muted: true },
                { label: 'unread', muted: true },
                { label: 'confirm:34 emails', muted: true },
              ]}
              hint="Suggested based on common bulk targets"
            />
            <InteractionDemo
              typing="unsubscribe from"
              slots={[
                { label: 'newsletters', muted: false },
                { label: 'marketing', muted: true },
                { label: 'specific:sender', muted: true },
              ]}
              hint="Auto-categorized"
            />
            <InteractionDemo
              typing="move"
              slots={[
                { label: 'all from:jira', muted: false },
                { label: 'to:notifications', muted: false },
                { label: 'and:mark-read', muted: true },
                { label: 'apply-going-forward:yes', muted: true },
              ]}
              hint='Last slot turns one-time action into persistent rule'
            />
          </div>
        </UseCase>

        {/* Use Case 6: Executable Actions */}
        <UseCase number={6} title='Email as Executable Actions &mdash; "Do the Thing"'>
          <p className="text-gray-400 leading-relaxed mb-6">
            Many emails contain implicit actions&mdash;approve this, schedule that, pay this. The bar surfaces these as executable intents.
          </p>
          <InteractionDemo
            typing="pending"
            slots={[
              { label: 'approvals:2', muted: false },
              { label: 'rsvps:3', muted: true },
              { label: 'payments:1', muted: true },
              { label: 'reviews:1', muted: true },
            ]}
            hint="Extracted from email content"
          />
          <div className="mt-6 space-y-3">
            <ActionCard
              title="Expense Report"
              meta="$2,340 &mdash; from: Mike"
              actions={['approve', 'reject:reason', 'ask-mike:about-line-item']}
            />
            <ActionCard
              title="PTO Request"
              meta="Dec 22-26 &mdash; from: Lisa"
              actions={['approve', 'approve:with-note', 'check-calendar-first']}
            />
          </div>
          <Callout>
            Email stops being a reading activity and becomes a <strong>doing</strong> activity.
          </Callout>
        </UseCase>

        {/* Use Case 7: Relationships */}
        <UseCase number={7} title='Relationship &amp; Context Threads &mdash; "Tell Me About"'>
          <p className="text-gray-400 leading-relaxed mb-6">
            The bar becomes a way to pull up relationship context, not just messages.
          </p>
          <InteractionDemo
            typing="tell me about sarah"
            slots={[
              { label: 'sarah.chen@work.com', muted: false },
              { label: 'show:timeline', muted: true },
              { label: 'include:shared-files', muted: true },
            ]}
            hint="CRM-like relationship view from email data"
          />
          <div className="mt-6 bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold">SC</div>
              <div>
                <div className="font-medium">Sarah Chen</div>
                <div className="text-xs text-gray-500">sarah.chen@work.com &middot; 47 exchanges this quarter</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-1">Last 5 exchanges</div>
                <div className="text-gray-300">Budget, hiring, Q3 plan, offsite, 1:1 notes</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-1">Pending between you</div>
                <div className="text-gray-300">Budget approval, headcount ask</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-1">Shared files</div>
                <div className="text-gray-300">Q3-budget.xlsx, hiring-plan.pdf</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-gray-500 text-xs mb-1">Avg. response time</div>
                <div className="text-gray-300">~2.5 hours</div>
              </div>
            </div>
          </div>
        </UseCase>

        {/* Use Case 8: Morning Briefing */}
        <UseCase number={8} title='Time-Based Views &mdash; "My Morning"'>
          <p className="text-gray-400 leading-relaxed mb-6">
            Instead of &ldquo;Inbox Zero&rdquo; as a goal, the bar supports temporal intent.
          </p>
          <InteractionDemo
            typing="morning"
            slots={[
              { label: 'briefing:5-min', muted: false },
              { label: 'include:calendar', muted: true },
              { label: 'priority:high-only', muted: true },
            ]}
            hint="Generates a synthesized morning briefing"
          />
          <div className="mt-6 bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
              <span className="text-yellow-400 text-lg">&#9728;</span>
              <span className="font-medium">Morning Briefing</span>
              <span className="text-gray-600 text-sm">&middot; Feb 19</span>
            </div>
            <div className="p-6">
              <div className="mb-5">
                <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-3">3 things that need you today</p>
                <div className="space-y-2 text-sm">
                  <BriefingItem number={1} text='Reply to Sarah re: budget' tag="she's waiting" />
                  <BriefingItem number={2} text='Review attached contract from legal' tag="due today" />
                  <BriefingItem number={3} text='RSVP to team lunch' tag="11:30am" />
                </div>
              </div>
              <div className="mb-5">
                <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-3">5 FYIs</p>
                <div className="space-y-1 text-sm text-gray-500">
                  <div>Deploy went well <span className="text-gray-600">(from: CI bot)</span></div>
                  <div>New hire starts Monday <span className="text-gray-600">(from: HR)</span></div>
                  <div className="text-gray-600">&hellip;3 more</div>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <SuggestionChip>start-triage</SuggestionChip>
                <SuggestionChip>reply-to-sarah</SuggestionChip>
                <SuggestionChip>open-contract</SuggestionChip>
              </div>
            </div>
          </div>
        </UseCase>

        {/* Use Case 9: Rules */}
        <UseCase number={9} title='Rules &amp; Automation &mdash; "From Now On"'>
          <p className="text-gray-400 leading-relaxed mb-6">
            Email rules today are buried in settings. With the bar, they&apos;re first-class utterances.
          </p>
          <div className="space-y-4">
            <InteractionDemo
              typing="from now on"
              slots={[
                { label: 'emails from:jira', muted: false },
                { label: 'auto:archive', muted: false },
                { label: 'unless:assigned-to-me', muted: true },
              ]}
              hint="Natural language rule creation"
            />
            <InteractionDemo
              typing="when"
              slots={[
                { label: 'i-get:calendar-invite', muted: false },
                { label: 'auto:check-conflicts', muted: true },
                { label: 'if-free:accept', muted: true },
                { label: 'if-busy:tentative', muted: true },
              ]}
              hint="Conditional automation in one expression"
            />
          </div>
          <Callout>
            The bar becomes a natural language rule engine. Type &ldquo;my rules&rdquo; to see them all as editable bar expressions.
          </Callout>
        </UseCase>

        {/* Use Case 10: Multi-Account */}
        <UseCase number={10} title="Multi-Account / Persona Switching">
          <p className="text-gray-400 leading-relaxed mb-6">
            Many people manage work + personal email. The bar handles this as a slot.
          </p>
          <div className="space-y-4">
            <InteractionDemo
              typing="email"
              slots={[
                { label: 'as:work', muted: false },
                { label: 'to:...', muted: true },
                { label: 'about:...', muted: true },
              ]}
              hint="Defaults to context-appropriate account"
            />
            <InteractionDemo
              typing="switch"
              slots={[
                { label: 'to:personal', muted: false },
                { label: 'show:unread-only', muted: true },
                { label: 'since:last-checked', muted: true },
              ]}
              hint="Persona context as just another slot"
            />
          </div>
        </UseCase>

        <div className="border-t border-gray-800 my-16" />

        {/* Architecture */}
        <Section>
          <SectionLabel>Architecture</SectionLabel>
          <h2 className="text-3xl font-bold mb-8">The Bar as Universal Input Layer</h2>
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8 space-y-6">
            <ArchLayer
              label="THE BAR"
              color="blue"
              description={<span className="font-mono text-sm">&#9656; [intent] [slot1:value] [slot2:value] [slot3:value]</span>}
            />
            <div className="flex gap-4 justify-center text-sm text-gray-500">
              <span className="bg-gray-800 px-3 py-1 rounded">Intent Engine</span>
              <span className="bg-gray-800 px-3 py-1 rounded">Slot Resolver</span>
              <span className="bg-gray-800 px-3 py-1 rounded">Context Engine</span>
            </div>
            <ArchLayer
              label="ACTION SCHEMA REGISTRY"
              color="purple"
              description={
                <div className="flex gap-3 flex-wrap justify-center text-xs font-mono">
                  <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded">triage</span>
                  <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded">compose</span>
                  <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded">search</span>
                  <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded">bulk-ops</span>
                  <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded">rules</span>
                  <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded">relationships</span>
                </div>
              }
            />
            <ArchLayer
              label="VIEW RENDERER"
              color="green"
              description={
                <div className="flex gap-3 flex-wrap justify-center text-xs text-gray-400">
                  <span>Email list</span>
                  <span className="text-gray-600">&middot;</span>
                  <span>Triage cards</span>
                  <span className="text-gray-600">&middot;</span>
                  <span>Briefings</span>
                  <span className="text-gray-600">&middot;</span>
                  <span>Relationship views</span>
                  <span className="text-gray-600">&middot;</span>
                  <span>Compose preview</span>
                </div>
              }
            />
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ComponentCard title="Intent Engine" description="Recognizes seed phrases and maps them to action schemas (triage, compose, search, etc.)" />
            <ComponentCard title="Slot Resolver" description="Determines which slots to surface, in what order, with what defaults from email corpus, calendar, and behavior patterns." />
            <ComponentCard title="Context Engine" description="Maintains awareness of time, session history, pending items, urgency, and response patterns." />
            <ComponentCard title="Action Schema Registry" description="Defines the slot structure for every intent with types, enums, defaults, and validation rules." />
            <ComponentCard title="View Renderer" description="Reactive canvas below the bar that reshapes based on current bar state. Not a fixed layout." />
            <ComponentCard title="History Manager" description="Logs every bar interaction. Replayable, modifiable, and searchable via the bar itself." />
          </div>
        </Section>

        <div className="border-t border-gray-800 my-16" />

        {/* Comparison Table */}
        <Section>
          <SectionLabel>The Shift</SectionLabel>
          <h2 className="text-3xl font-bold mb-8">What Makes This &ldquo;Central&rdquo; vs. &ldquo;Feature&rdquo;</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-500 font-mono text-xs uppercase tracking-wider">Traditional Email + AI</th>
                  <th className="text-left py-3 px-4 text-blue-400 font-mono text-xs uppercase tracking-wider">Autocomplete-Centered Email</th>
                </tr>
              </thead>
              <tbody className="text-gray-400">
                <ComparisonRow left="AI assists within existing paradigms" right="AI defines the interaction paradigm itself" />
                <ComparisonRow left="Inbox list is the home screen" right="The bar is the home screen" />
                <ComparisonRow left="Navigation via folders, buttons, menus" right="Navigation via intent expression" />
                <ComparisonRow left="Multiple modes (reading, composing, searching)" right="One mode: the bar" />
                <ComparisonRow left="Email is a reading activity" right="Email is a doing activity" />
                <ComparisonRow left="Features discovered via UI exploration" right="Features discovered via typing" />
                <ComparisonRow left="Power features hidden in settings" right="Power features are longer bar expressions" />
                <ComparisonRow left="Context requires manual assembly" right="Context automatically surfaced as slots" />
              </tbody>
            </table>
          </div>
        </Section>

        <div className="border-t border-gray-800 my-16" />

        {/* Design Principles */}
        <Section>
          <SectionLabel>Principles</SectionLabel>
          <h2 className="text-3xl font-bold mb-8">Design Principles</h2>
          <div className="space-y-6">
            <Principle number={1} title="The bar is never empty" description="Even at rest, it shows intent suggestions based on context (time, unread count, pending items)." />
            <Principle number={2} title="Every view is a bar state" description="There's no navigation that can't be expressed as a bar input. The URL is the bar expression." />
            <Principle number={3} title="Slots are suggestions, not requirements" description="You can always fire the action with partial slots — the system infers or asks only when truly ambiguous." />
            <Principle number={4} title="Tab is the primary interaction key" description="Tab cycles through slots, Enter executes, Escape backs up one slot, Backspace clears the current slot." />
            <Principle number={5} title="The view below is reactive" description="It updates in real-time as you fill slots, showing preview of what the action will affect." />
            <Principle number={6} title="History is replayable" description='Every bar interaction is logged. Typing "history" shows recent bar expressions you can re-invoke or modify.' />
            <Principle number={7} title="Progressive disclosure over modal complexity" description='A novice types "reply to sarah" and gets a working flow. A power user adds about:budget tone:brief cc:finance attach:latest send:delay-2h. Same bar.' />
          </div>
        </Section>

        <div className="border-t border-gray-800 my-16" />

        {/* Implementation Phases */}
        <Section>
          <SectionLabel>Roadmap</SectionLabel>
          <h2 className="text-3xl font-bold mb-8">Implementation Phases</h2>
          <div className="space-y-4">
            <Phase number={1} title="The Bar + Search" items={[
              'Replace the current search box with the autocomplete bar',
              'Implement intent detection for search, from, about, has',
              'Real-time slot-filling with email corpus context',
              'View below updates reactively as slots are filled',
            ]} />
            <Phase number={2} title="Triage Flow" items={[
              'Add triage intent with one-at-a-time card view',
              'Action slots: archive, reply, snooze, star, skip',
              'Keyboard-driven flow (tab + enter)',
            ]} />
            <Phase number={3} title="Compose via Bar" items={[
              'Add email, reply, forward intents',
              'Contact resolution from email corpus',
              'Thread context injection for replies',
              'Inline draft preview below bar',
            ]} />
            <Phase number={4} title="Contextual Landing" items={[
              'Replace inbox list as default view with intent suggestions',
              'Morning briefing / end-of-day summary intents',
              'Pending action extraction from email content',
            ]} />
            <Phase number={5} title="Rules & Automation" items={[
              'from-now-on and when intents for rule creation',
              'my-rules intent for rule management',
              'Rule expressions stored as bar-syntax strings',
            ]} />
          </div>
        </Section>

        {/* Footer */}
        <footer className="py-16 text-center">
          <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 border border-gray-800 rounded-2xl p-8">
            <p className="text-gray-400 text-sm leading-relaxed max-w-2xl mx-auto italic">
              &ldquo;This vision describes an email client where the autocomplete bar isn&apos;t a feature bolted onto email&mdash;it&apos;s the fundamental interaction layer through which all email activity flows. The inbox list, the compose window, the search box, the settings panel&mdash;all collapse into variations of the same bar interaction.&rdquo;
            </p>
          </div>
        </footer>
      </div>
    </main>
  )
}

/* ── Shared Components ──────────────────────────────────── */

function Section({ children }: { children: React.ReactNode }) {
  return <section className="mb-16">{children}</section>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-blue-400 font-mono text-xs tracking-widest uppercase mb-3">{children}</p>
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="text-white font-semibold">{children}</strong>
}

function BarMockup({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-3">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg text-sm font-mono line-through decoration-red-500/60">{item}</span>
        ))}
      </div>
    </div>
  )
}

function UseCase({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-20">
      <div className="flex items-baseline gap-4 mb-6">
        <span className="text-3xl font-bold text-gray-700 font-mono">{String(number).padStart(2, '0')}</span>
        <h3 className="text-2xl font-bold" dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      {children}
    </section>
  )
}

function InteractionDemo({ typing, slots, hint }: { typing: string; slots: { label: string; muted: boolean }[]; hint: string }) {
  return (
    <div className="bg-gray-900/80 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
        <span className="text-blue-400 font-mono text-sm">&#9656;</span>
        <span className="text-white font-mono text-sm">{typing}</span>
        {slots.map((slot) => (
          <span
            key={slot.label}
            className={`font-mono text-sm px-2 py-0.5 rounded ${
              slot.muted
                ? 'bg-gray-800 text-gray-500'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}
          >
            {slot.label}
          </span>
        ))}
      </div>
      <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-800">
        <span className="text-xs text-gray-600">{hint}</span>
      </div>
    </div>
  )
}

function EmailCard({ from, subject, snippet, actions }: { from: string; subject: string; snippet: string; actions: string[] }) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{from}</span>
          <span className="text-gray-600">&middot;</span>
          <span className="text-gray-400 text-sm">&ldquo;{subject}&rdquo;</span>
        </div>
        <p className="text-gray-500 text-sm">{snippet}</p>
      </div>
      <div className="px-5 py-3 bg-gray-800/30 border-t border-gray-800 flex gap-2 flex-wrap">
        {actions.map((action, i) => (
          <Slot key={action} active={i === 0}>{action}</Slot>
        ))}
      </div>
    </div>
  )
}

function Slot({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span className={`font-mono text-xs px-2 py-1 rounded ${
      active
        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
        : 'bg-gray-800 text-gray-500 border border-gray-700'
    }`}>
      {children}
    </span>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 pl-4 border-l-2 border-blue-500/50">
      <p className="text-sm text-gray-400 leading-relaxed">{children}</p>
    </div>
  )
}

function StatusChip({ color, label }: { color: string; label: string }) {
  const colors: Record<string, string> = {
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    gray: 'bg-gray-800 text-gray-400 border-gray-700',
  }
  return (
    <div className={`${colors[color]} border rounded-lg px-3 py-2 text-sm flex items-center gap-2`}>
      <span className={`w-2 h-2 rounded-full ${color === 'red' ? 'bg-red-400' : color === 'yellow' ? 'bg-yellow-400' : color === 'orange' ? 'bg-orange-400' : 'bg-gray-500'}`} />
      {label}
    </div>
  )
}

function SuggestionChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-sm font-mono cursor-pointer transition-colors border border-gray-700">
      {children}
    </span>
  )
}

function ActionCard({ title, meta, actions }: { title: string; meta: string; actions: string[] }) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <span className="font-medium text-sm">{title}</span>
        <span className="text-gray-600 text-sm ml-2" dangerouslySetInnerHTML={{ __html: meta }} />
      </div>
      <div className="flex gap-2 flex-wrap">
        {actions.map((action, i) => (
          <Slot key={action} active={i === 0}>{action}</Slot>
        ))}
      </div>
    </div>
  )
}

function BriefingItem({ number, text, tag }: { number: number; text: string; tag: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-600 font-mono text-xs w-4">{number}.</span>
      <span className="text-gray-300">{text}</span>
      <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full">{tag}</span>
    </div>
  )
}

function ArchLayer({ label, color, description }: { label: string; color: string; description: React.ReactNode }) {
  const colors: Record<string, string> = {
    blue: 'border-blue-500/30 bg-blue-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
    green: 'border-green-500/30 bg-green-500/5',
  }
  const labelColors: Record<string, string> = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
  }
  return (
    <div className={`${colors[color]} border rounded-xl p-4 text-center`}>
      <p className={`${labelColors[color]} font-mono text-xs tracking-widest uppercase mb-2`}>{label}</p>
      {description}
    </div>
  )
}

function ComponentCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
      <h4 className="font-medium text-sm mb-1">{title}</h4>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  )
}

function ComparisonRow({ left, right }: { left: string; right: string }) {
  return (
    <tr className="border-b border-gray-800/50">
      <td className="py-3 px-4 text-gray-500">{left}</td>
      <td className="py-3 px-4 text-gray-300">{right}</td>
    </tr>
  )
}

function Principle({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <span className="text-2xl font-bold text-gray-800 font-mono flex-shrink-0 w-8">{number}</span>
      <div>
        <h4 className="font-medium mb-1">{title}</h4>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function Phase({ number, title, items }: { number: number; title: string; items: string[] }) {
  return (
    <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="bg-blue-500/20 text-blue-400 text-xs font-mono px-2 py-1 rounded">Phase {number}</span>
        <h4 className="font-medium">{title}</h4>
      </div>
      <ul className="space-y-1 text-sm text-gray-400">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="text-gray-600 mt-1">&#8226;</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
