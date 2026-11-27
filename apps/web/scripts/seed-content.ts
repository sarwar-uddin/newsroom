/**
 * Demonstration content. Every piece is clearly labelled as sample material. None of it is
 * reporting: there are no real sources, interviews, quotations, statistics or incidents.
 * Contributors are fictional profiles. Replace all of this before launch.
 */

export const DEMO_NOTE =
  '*Demonstration content. This piece was written to exercise the publication’s design and CMS. It contains no reporting, no sources, no quotations and no statistics, and it describes no real events or people.*';

export const seedCategories = [
  {
    name: 'Investigations',
    slug: 'investigations',
    description: 'Long-term reporting on power, money and accountability.',
  },
  {
    name: 'Politics & Power',
    slug: 'politics',
    description: 'How power is won, held, performed and contested.',
  },
  {
    name: 'Society',
    slug: 'society',
    description: 'Public life, cities, institutions and the people who live with them.',
  },
  {
    name: 'Culture',
    slug: 'culture',
    description: 'Criticism and reporting on the forces shaping how we live and what we make.',
  },
  {
    name: 'Music & Underground',
    slug: 'music',
    description: 'Independent scenes, sounds and the spaces that hold them.',
  },
  {
    name: 'Screen & Page',
    slug: 'screen-and-page',
    description: 'Cinema, literature and the arguments they start.',
  },
  {
    name: 'Opinion',
    slug: 'opinion',
    description: 'Essays and arguments from writers who sign their names.',
  },
];

export const seedAuthors = [
  {
    name: 'Tanvir Hasan',
    slug: 'tanvir-hasan',
    biography:
      'Fictional sample contributor profile used to demonstrate investigative bylines. Not a real person.',
  },
  {
    name: 'Farzana Akter',
    slug: 'farzana-akter',
    biography:
      'Fictional sample contributor profile used to demonstrate culture and criticism bylines. Not a real person.',
  },
  {
    name: 'Rafiq Chowdhury',
    slug: 'rafiq-chowdhury',
    biography:
      'Fictional sample contributor profile used to demonstrate opinion bylines. Not a real person.',
  },
  {
    name: 'The Editors',
    slug: 'the-editors',
    biography: 'Pieces published under the masthead’s collective byline.',
  },
];

export type SeedArticle = {
  title: string;
  slug: string;
  dek: string;
  excerpt: string;
  category: string;
  author: string;
  tags: string[];
  featured?: boolean;
  status?: 'published' | 'draft' | 'review';
  daysAgo: number;
  image?: number;
  body: string;
};

export const seedArticles: SeedArticle[] = [
  {
    title: 'Who Watches the Watchers? Notes Toward an Investigation of Moral Policing',
    slug: 'notes-toward-an-investigation-of-moral-policing',
    dek: 'A working outline for a long-term project on public exposure, social control and the appetite for humiliation, published to show how an investigation might be framed before any reporting begins.',
    excerpt:
      'Before a single interview, an investigation needs a question it can actually answer. This sample outline shows how one might be built.',
    category: 'investigations',
    author: 'tanvir-hasan',
    tags: ['Moral policing', 'Public exposure', 'Methodology'],
    featured: true,
    daysAgo: 1,
    image: 0,
    body: `${DEMO_NOTE}

Every serious investigation begins as a suspicion that something is being hidden in plain sight. The hard part is not the suspicion. It is turning it into a question narrow enough to be answered with evidence, and honest enough to be abandoned if the evidence points elsewhere.

This outline concerns a subject that is easy to describe and difficult to report: the relationship between moral policing, public exposure and the audience that gathers to watch. It is an editorial research direction, not a finding. Nothing below is an established fact about Bangladesh or anywhere else.

## The question, stated carefully

A loose version of the question would be: *why do people enjoy watching others be shamed?* That question belongs to philosophy, not journalism. A reportable version might look more like this: *who produces moments of public exposure, who distributes them, who profits from the attention, and what happens afterwards to the person exposed?*

Each clause of that sentence points to a different kind of evidence. Production points to people and institutions. Distribution points to platforms and their incentives. Profit points to money and influence. Consequence points to individuals whose lives can be documented with their consent.

## What we would need to know

- Who initiates acts of exposure, and whether they claim any formal or informal authority to do so.
- How recordings travel: which accounts, pages and channels carry them, and how quickly.
- Whether attention is monetised, and by whom.
- What legal and institutional responses, if any, follow.
- What the people exposed say about what happened next, in their own words and on their own terms.

## What we must not do

An investigation into humiliation can easily become another instrument of it. Republishing the material we are investigating would make us part of the distribution chain. The working rule would be simple: we document systems, not spectacles. We do not identify people who did not choose to be identified. We do not embed or link the recordings themselves.

> A story about exposure that exposes people again has failed before it begins.

## Methods worth considering

Documentary research comes first: public records, court filings, platform transparency reports and academic literature. Interviews would come later, with informed consent and with the understanding that some sources may need protection. Any data analysis would be published with its methodology so that readers can check our work.

### A note on uncertainty

It is entirely possible that the reporting would show something different from what this outline expects. A good investigation plan includes the conditions under which its own premise would be proven wrong. If we cannot imagine that, we are not investigating; we are campaigning.

---

This sample exists to demonstrate how the publication presents long-form investigative work: headings, lists, pull quotes and a reading width designed for sustained attention.`,
  },
  {
    title: 'Who Owns the News? A Framework for Mapping Media Ownership',
    slug: 'a-framework-for-mapping-media-ownership',
    dek: 'Public trust depends partly on knowing who stands behind a masthead. A sample methodology for tracing it.',
    excerpt:
      'A demonstration piece describing how ownership research could be structured, sourced and published transparently.',
    category: 'investigations',
    author: 'tanvir-hasan',
    tags: ['Media', 'Public trust', 'Methodology'],
    featured: true,
    daysAgo: 3,
    image: 1,
    body: `${DEMO_NOTE}

Readers are often told to consider the source. Far fewer are given the tools to do it. A newspaper's name tells you very little about who funds it, who appoints its editors or whose interests sit alongside its own.

## Why ownership matters

Ownership does not determine coverage, but it shapes the conditions under which coverage happens. It influences which stories are pursued, which are quietly dropped and which are never assigned at all. Mapping it is not an accusation. It is basic context.

## A possible structure

- Identify the legal entity that publishes each outlet.
- Trace that entity through public corporate filings where they exist.
- Record board memberships and declared affiliations.
- Note other business interests held by the same owners.
- Publish every source document alongside the map.

## The limits of the method

Corporate records can be incomplete or out of date. Nominal owners are not always the people in control. Any published map would need to say clearly what is documented, what is inferred and what remains unknown.

Transparency about our own ownership would have to come first. A publication that asks these questions of others should answer them about itself.`,
  },
  {
    title: 'The Grammar of Political Messaging',
    slug: 'the-grammar-of-political-messaging',
    dek: 'Slogans, symbols and silences: a sample essay on reading political communication as a text.',
    excerpt:
      'Political messages are written to be felt before they are understood. Reading them slowly is a civic skill.',
    category: 'politics',
    author: 'the-editors',
    tags: ['Propaganda', 'Political communication'],
    daysAgo: 4,
    image: 2,
    body: `${DEMO_NOTE}

Every political message has a grammar. It has a subject who acts, an object that is acted upon and, often, an enemy left unnamed but clearly implied. Learning to read that grammar is one of the more useful things a citizen can do.

## Three questions for any message

**Who is "we"?** Political language constantly draws a circle around an in-group. Noticing where the circle is drawn, and who is left outside it, tells you more than the slogan itself.

**What is assumed?** The most powerful claims in a message are often the ones it never states, because stating them would invite argument.

**What is missing?** Silence is a form of messaging. The subjects a campaign refuses to discuss can be as revealing as the ones it repeats.

## Reading without cynicism

None of this requires believing that all political communication is manipulation. Persuasion is a legitimate part of public life. The aim is simply to read actively, so that agreement, when it comes, is chosen rather than absorbed.`,
  },
  {
    title: 'The City After Midnight',
    slug: 'the-city-after-midnight',
    dek: 'Who keeps a megacity running while it sleeps, and what would it take to report their lives with care? A sample essay.',
    excerpt:
      'The night shift is where a city’s inequalities are easiest to see and hardest to report responsibly.',
    category: 'society',
    author: 'farzana-akter',
    tags: ['Urban life', 'Inequality', 'Dhaka'],
    featured: true,
    daysAgo: 6,
    image: 3,
    body: `${DEMO_NOTE}

Cities are usually described from the vantage point of the people who sleep at night. The traffic, the noise and the crowds are the daytime city. There is another one, built and maintained by people who work while everyone else is absent.

## A reporting challenge

Writing about night workers raises immediate questions of power. The reporter goes home; the subject stays. A good story would need to be built on long relationships, consent that can be withdrawn and a refusal to turn hardship into atmosphere.

## What such a series might ask

- Which jobs a city depends on but rarely sees.
- How workers travel, eat and rest when public services close.
- What protections exist on paper, and how they work in practice.

Inequality is often discussed in numbers. The night city suggests another approach: describing the hours, distances and small negotiations that make up a working life, with the permission of the people living it.`,
  },
  {
    title: 'A Changing Cultural Landscape, and the Questions It Raises',
    slug: 'a-changing-cultural-landscape',
    dek: 'Culture changes faster than the institutions built to describe it. A sample critical essay on what criticism is for.',
    excerpt: 'When the places culture happens keep moving, critics have to move with them.',
    category: 'culture',
    author: 'farzana-akter',
    tags: ['Criticism', 'Culture'],
    featured: true,
    daysAgo: 2,
    image: 4,
    body: `${DEMO_NOTE}

For a long time, culture had addresses. There were galleries, concert halls, publishers and broadcasters, and critics knew where to stand to see what was happening. Those addresses still exist, but more and more cultural life happens somewhere else: in feeds, in rented rooms, in group chats and in formats that did not have names a decade ago.

## Criticism as attention

The first job of a critic is to pay attention to something on behalf of readers who cannot. That job becomes harder when work appears and disappears quickly, and when the audience is fragmented into communities that barely overlap.

## Criticism as argument

The second job is to argue. Not to rank or to scold, but to say clearly why something matters and to invite disagreement. A culture section that only celebrates is a marketing department.

> Taste is not a verdict. It is the beginning of a conversation.

This publication's culture coverage would aim to take popular and underground work equally seriously, and to treat readers as people capable of disagreeing with us.`,
  },
  {
    title: 'Basements, Rooftops and Rented Rooms',
    slug: 'basements-rooftops-and-rented-rooms',
    dek: 'Independent music lives or dies by its spaces. A sample piece on how a scene might be documented without being flattened.',
    excerpt:
      'Underground scenes are fragile. Writing about them carries responsibilities that ordinary music journalism rarely considers.',
    category: 'music',
    author: 'farzana-akter',
    tags: ['Independent music', 'Underground'],
    daysAgo: 8,
    image: 5,
    body: `${DEMO_NOTE}

Every independent scene depends on a handful of places that make it possible: a room with tolerant neighbours, a rooftop with a borrowed sound system, a shop that lets people put flyers in the window. Lose those and the scene goes with them.

## The problem with attention

Coverage can help a scene grow. It can also expose it to scrutiny it was never built to withstand. A responsible music section would ask before naming venues, think about who benefits from visibility and accept that some things are better left off the record.

## What we would want to capture

- How musicians learn, rehearse and record with limited resources.
- How audiences find out about shows.
- How scenes connect to each other, locally and across borders.

The story of independent music is rarely about a single star. It is about networks of people who keep showing up.`,
  },
  {
    title: 'Reading Against the Grain',
    slug: 'reading-against-the-grain',
    dek: 'Counterculture needs criticism as much as any establishment does. A sample essay on cinema, literature and dissent.',
    excerpt:
      'Work that positions itself against the mainstream deserves rigorous reading, not automatic applause.',
    category: 'screen-and-page',
    author: 'rafiq-chowdhury',
    tags: ['Cinema', 'Literature', 'Counterculture'],
    daysAgo: 10,
    image: 6,
    body: `${DEMO_NOTE}

There is a temptation, when writing about work that defies convention, to treat defiance as a virtue in itself. A film that shocks, a novel that refuses a plot, a poem that rejects its inherited form: each can be praised for courage before anyone has asked whether it is any good.

## The case for rigour

Counterculture is not served by uncritical cheerleading. Taking dissenting work seriously means reading it as closely as we would read anything else, noticing where it succeeds and saying plainly where it does not.

## The case for context

Equally, work made outside institutions often lacks the resources that make polish possible. Criticism should be able to distinguish between a limitation of means and a limitation of vision.

Good criticism holds both truths at once. It asks what a work is trying to do, whether it does it and whether it was worth doing.`,
  },
  {
    title: 'The Appetite for Humiliation',
    slug: 'the-appetite-for-humiliation',
    dek: 'Why does public shaming draw such large audiences, and what does watching make of us? A sample opinion essay.',
    excerpt:
      'A demonstration opinion piece on spectatorship, shame and the responsibilities of the audience.',
    category: 'opinion',
    author: 'rafiq-chowdhury',
    tags: ['Public exposure', 'Moral policing', 'Ethics'],
    featured: true,
    daysAgo: 5,
    image: 7,
    body: `${DEMO_NOTE}

Humiliation is an old form of public entertainment. What has changed is its scale. A moment of exposure that once played out before a few dozen witnesses can now be watched by strangers anywhere, replayed indefinitely and commented on by people who will never meet the person on the screen.

## The audience is not innocent

It is comfortable to blame whoever records or posts the moment. But a spectacle needs spectators. Each view, share and reaction is a small vote for more of the same.

## Against easy outrage

The answer is not a louder outrage directed at new targets. Outrage is itself a form of attention, and attention is the currency that makes humiliation profitable. The harder discipline is to look away, to refuse to share and to ask who benefits.

This is an argument, not a finding. It is offered as an example of the kind of opinion writing the publication would carry: signed, clearly labelled and open to response.`,
  },
  {
    title: 'In Defence of the Slow Story',
    slug: 'in-defence-of-the-slow-story',
    dek: 'Speed is not the same as relevance. A sample editorial on why some journalism should take its time.',
    excerpt: 'The fastest story is rarely the most important one. A demonstration editorial.',
    category: 'opinion',
    author: 'the-editors',
    tags: ['Journalism', 'Public trust'],
    daysAgo: 12,
    body: `${DEMO_NOTE}

The pressure to publish first is relentless, and it is not always wrong. Some information is urgent. But a newsroom organised entirely around speed tends to produce the same story everyone else has, slightly earlier and slightly less checked.

## What slowness buys

Time allows a reporter to verify, to find the second source, to call back the person who was quoted and to notice that the obvious story is not the real one.

## What it costs

Slow journalism is expensive and often invisible until it lands. It requires editors willing to fund work that may not produce anything publishable for months.

An independent publication cannot outrun larger newsrooms. It can choose to out-think them.`,
  },
  {
    title: 'The Zine Is Not Dead',
    slug: 'the-zine-is-not-dead',
    dek: 'Photocopied, stapled and stubbornly physical: a sample culture piece on small-press publishing.',
    excerpt:
      'In an age of infinite feeds, the handmade publication still carries a particular kind of authority.',
    category: 'culture',
    author: 'farzana-akter',
    tags: ['Zines', 'Underground', 'Literature'],
    daysAgo: 14,
    image: 8,
    body: `${DEMO_NOTE}

Every few years someone declares the zine obsolete, and every few years a new generation discovers that a stapled stack of photocopies can say things a feed cannot.

## Why paper persists

A zine is finite. It has a first page and a last page. It is passed hand to hand, which means it arrives with a recommendation attached. And it cannot be algorithmically amplified, which is precisely its appeal.

## What it would mean to cover small press

Coverage of independent publishing would treat these works as literature and design, not as curiosities. It would review them, interview their makers with consent and keep an archive of what might otherwise disappear.`,
  },
  {
    title: 'Draft: Example of a Story Still in Progress',
    slug: 'example-story-still-in-progress',
    dek: 'This draft is seeded to prove that unpublished work never appears on the public site.',
    excerpt: 'Unpublished demonstration draft.',
    category: 'society',
    author: 'tanvir-hasan',
    tags: ['Methodology'],
    status: 'draft',
    daysAgo: 0,
    body: `${DEMO_NOTE}

If you can read this on the public website, the draft visibility rules are broken. It should only be reachable from the editorial CMS.`,
  },
  {
    title: 'In Review: Example of a Story Awaiting an Editor',
    slug: 'example-story-awaiting-an-editor',
    dek: 'A seeded article in the review state, waiting for an editor’s decision.',
    excerpt: 'Unpublished demonstration piece awaiting review.',
    category: 'politics',
    author: 'rafiq-chowdhury',
    tags: ['Political communication'],
    status: 'review',
    daysAgo: 0,
    body: `${DEMO_NOTE}

This piece is in review. It should be visible in the CMS dashboard under “Awaiting review” and nowhere on the public site.`,
  },
];
