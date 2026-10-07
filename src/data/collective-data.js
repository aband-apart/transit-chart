// Interpretation tables for charts of countries, places, organizations and events, written to
// docs/voice-guide.md. Human metaphors (moods, feeling unsafe, meditating) don't fit these subjects,
// so they get their own wording. Strings avoid "you", and use "it/its" only where a pronoun is needed.
// Imperative tips are phrased so advice() can turn them into suggestions about the subject.

export const PLANET_C = {
  sun: {
    hard: 'Leadership and the public face can come under pressure. Friction with authority, or a push to prove itself, is common.',
    soft: 'Vitality and confidence tend to flow more easily, which makes this a good window to be visible and make a move.',
    conj: 'Attention and energy gather in one place, and what begins now often carries its signature.',
    hardTip: 'Pace the effort and pick one thing to lead on instead of taking on everything.',
    softTip: 'Step forward publicly; visibility can work in its favor right now.',
    avoid: 'Avoid ego-driven power struggles.',
    inHouse: 'is lighting up',
  },
  moon: {
    principle: 'public mood and everyday needs',
    hard: 'Public mood can run closer to the surface, and small events may have outsized effects.',
    soft: 'The public mood tends to feel steadier, and reactions are easier to read.',
    conj: 'Mood can be loud and hard to miss for a day or so.',
    hardTip: 'Name the mood before reacting to it.',
    softTip: 'Take the temperature of how people are responding today.',
    avoid: 'Avoid announcements made in the heat of the moment.',
    inHouse: 'is stirring public feeling in',
  },
  mercury: {
    hard: 'Mixed messages, over-analysis and tense talks can crop up, and details are worth double-checking.',
    soft: 'Communication, writing and decisions tend to come more easily, and ideas can connect.',
    conj: 'Attention is focused on a message, decision or idea, and one may land now.',
    hardTip: 'Re-read before publishing and confirm the details.',
    softTip: 'Pitch, write or negotiate; words tend to land well.',
    avoid: 'Avoid assuming what others mean. Ask.',
    retro: 'Mercury retrograde is traditionally a time for reviewing, revising and reconnecting rather than launching or signing. Double-checking communications, contracts and logistics are common precautions.',
    inHouse: 'is sharpening communication in',
  },
  venus: {
    principle: 'alliances, values and money',
    hard: 'Tension around alliances, money or values can surface, often through overindulgence or friction with a close partner.',
    soft: 'Goodwill and cooperation tend to come more easily, and partnerships and finances can feel smoother.',
    conj: 'Goodwill, an alliance or a financial opportunity moves closer to the foreground.',
    hardTip: 'State plainly what is wanted, and notice any pull to appease everyone.',
    softTip: 'Invest in an alliance or partnership that matters.',
    avoid: 'Avoid impulse spending, and avoid smoothing over real issues.',
    retro: 'Venus retrograde is traditionally a time to reassess alliances, finances and values. Old partners and old spending patterns can resurface, so it helps to hold off on drastic rebrands or new commitments.',
    inHouse: 'is warming up',
  },
  mars: {
    principle: 'drive, action, ambition and conflict',
    hard: 'A short fuse, impatience and friction are possible. Energy runs high and is easy to misdirect.',
    soft: 'Energy tends to feel strong and well directed, which suits decisive action.',
    conj: 'A surge of drive; whatever it is aimed at tends to get a big push.',
    hardTip: 'Channel the energy into a hard task and leave arguments alone.',
    softTip: 'Take decisive action on something that has been delayed.',
    avoid: 'Avoid rushing, risk-taking and picking fights.',
    retro: 'Mars retrograde is traditionally a time when drive slows and launches meet frustration. Finishing and refining usually serves better than starting new battles.',
    inHouse: 'is firing up',
  },
  jupiter: {
    hard: 'Overreach is the main risk: taking on too much, overpromising, overspending or inflating expectations.',
    soft: 'Opportunities, goodwill and support tend to appear, and growth can feel natural.',
    conj: 'A major opening and a real chance to grow; what is planted now can keep growing for years.',
    hardTip: 'Say yes selectively and keep a margin of safety.',
    softTip: 'Say yes to opportunity and make the ask; people are often inclined to help.',
    avoid: 'Avoid overcommitting or assuming it will all work out.',
    retro: 'Jupiter retrograde is traditionally a time to turn growth inward: consolidate what is already held and refine beliefs before expanding.',
    inHouse: 'is expanding',
  },
  saturn: {
    hard: 'Pressure, delays and a sense of being tested are common themes. Anything that is not solid tends to show itself, which is a chance to rebuild it better.',
    soft: 'Steady effort tends to count for more than usual, and commitments made now have a good chance of holding.',
    conj: 'A serious chapter can begin, with responsibility to take on and something durable to build.',
    hardTip: 'Do the unglamorous work and set a boundary that has been avoided.',
    softTip: 'Commit to a long-term plan; structure built now can become an asset.',
    avoid: 'Avoid shortcuts, and avoid reading delay as failure.',
    retro: 'Saturn retrograde invites an audit of commitments and structures, and a rework of anything built on weak foundations.',
    inHouse: 'is putting structure and pressure on',
  },
  uranus: {
    hard: 'Disruption is possible: sudden changes, restlessness and a need to break free of what feels confining.',
    soft: 'Fresh ideas and welcome change tend to show up, along with room to try something new.',
    conj: 'A turning point, often with an element of surprise and a pull toward a new version of itself.',
    hardTip: 'Make room for change and stay flexible instead of clamping down.',
    softTip: 'Experiment; the new approach may have more going for it than it seems.',
    avoid: 'Avoid burning bridges on impulse.',
    retro: 'Uranus retrograde turns the urge for change inward, which makes it a good time to work out what actually needs to be freed.',
    inHouse: 'is shaking up',
  },
  neptune: {
    principle: 'vision, ideals and dissolving boundaries',
    hard: 'Fog, confusion, wishful thinking or disappointment can creep in, and things may not be quite what they appear.',
    soft: 'Inspiration, goodwill and a creative openness tend to be easier to reach.',
    conj: 'A dreamlike chapter that can dissolve old certainties and open space for new meaning.',
    hardTip: 'Verify facts and keep boundaries clear. Hold off on big decisions while things feel foggy.',
    softTip: 'Make room for creativity and reflection, and check inspired ideas against the facts.',
    avoid: 'Avoid idealizing partners or drifting without a plan.',
    retro: 'Neptune retrograde is traditionally a time when the fog thins: illusions can come apart, and things may look clearer.',
    inHouse: 'is dissolving boundaries in',
  },
  pluto: {
    hard: 'The pressure to change can feel intense. Something outworn may be stripped back, and control issues can surface.',
    soft: 'A quiet but powerful transformation is possible, with the resolve to change something at its root.',
    conj: 'A deep shift that is hard to reverse, in which a part of it can be reborn.',
    hardTip: 'Stop trying to control the outcome, and choose what to let go of before it is taken.',
    softTip: 'Invest in deep change; the endurance for it tends to be there.',
    avoid: 'Avoid manipulation, fixation on control and power plays.',
    inHouse: 'is transforming',
  },
  chiron: {
    principle: 'old vulnerabilities and the repair that follows',
    hard: 'An old vulnerability may get pressed, which is uncomfortable and also an opening for repair.',
    soft: 'Repair and goodwill tend to come more easily, including toward others.',
    conj: 'A long-standing weakness can surface so that it can be addressed.',
    hardTip: 'Go carefully, and get support rather than pushing through.',
    softTip: 'Share what has been learned; a long history can help others.',
    avoid: 'Avoid scapegoating and harsh internal blame.',
    inHouse: 'is touching tender ground in',
  },
};

// What each chart point governs for a collective subject, and the gift and risk of a transit to it.
export const TARGET_C = {
  sun: { arena: 'its core identity, leadership and sense of purpose', gift: 'clarity about what it stands for', risk: 'ego clashes or a crisis of purpose' },
  moon: { arena: 'its public mood, base and sense of security', gift: 'rapport with the people it serves', risk: 'volatility or a loss of confidence' },
  mercury: { arena: 'its communication, messaging and decision-making', gift: 'clear, persuasive communication', risk: 'misunderstandings or scattered messaging' },
  venus: { arena: 'its partnerships, finances and values', gift: 'goodwill and stronger alliances', risk: 'friction with partners or overspending' },
  mars: { arena: 'its drive, competitiveness and capacity to act', gift: 'clean, effective action', risk: 'conflict or burnout' },
  jupiter: { arena: 'its growth, reach and confidence', gift: 'real opportunity and optimism', risk: 'overexpansion' },
  saturn: { arena: 'its structure, rules and long-term commitments', gift: 'solid foundations and earned credibility', risk: 'rigidity or heavy burdens' },
  uranus: { arena: 'its independence and appetite for change', gift: 'liberating innovation', risk: 'upheaval or revolt' },
  neptune: { arena: 'its ideals, image and vision', gift: 'inspiration and shared purpose', risk: 'confusion or a loss of trust' },
  pluto: { arena: 'its power, resources and capacity to transform', gift: 'deep renewal', risk: 'power struggles or crisis' },
  node: { arena: 'its path of growth and sense of direction', gift: 'a clearer next step', risk: 'second-guessing its direction' },
  chiron: { arena: 'its oldest vulnerabilities and its capacity to repair', gift: 'repair and insight', risk: 'old problems reopening' },
  asc: { arena: 'how it presents itself and moves through the world', gift: 'a fresh, confident public image', risk: 'being out of step or exposed' },
  mc: { arena: 'its reputation, leadership and public standing', gift: 'recognition and momentum', risk: 'scrutiny and public pressure' },
};

export const HOUSES_C = [
  { n: 1, label: 'identity and image', theme: 'its identity, brand and how it presents itself to the world' },
  { n: 2, label: 'finances and assets', theme: 'income, assets, resources and what it values' },
  { n: 3, label: 'communication and networks', theme: 'communication, media, education, transport and its immediate surroundings' },
  { n: 4, label: 'foundations and base', theme: 'its base, premises, heritage and foundations' },
  { n: 5, label: 'creativity and risk', theme: 'creativity, entertainment, new products and calculated risk' },
  { n: 6, label: 'operations and workforce', theme: 'daily operations, staff, public services and efficiency' },
  { n: 7, label: 'partners and rivals', theme: 'partners, contracts, allies, rivals and public relations' },
  { n: 8, label: 'debt and transformation', theme: 'debt, investment, shared resources, crises and deep change' },
  { n: 9, label: 'expansion and law', theme: 'expansion, law, publishing, education and international reach' },
  { n: 10, label: 'reputation and leadership', theme: 'reputation, leadership, authority and public standing' },
  { n: 11, label: 'allies and long-term goals', theme: 'supporters, networks, communities and long-term goals' },
  { n: 12, label: 'hidden matters and endings', theme: 'hidden matters, reserves, behind-the-scenes institutions, secrets and endings' },
];

export const PLACEMENT_C = {
  sun: 'Its core character and what it stands for',
  moon: 'Its public mood and everyday needs',
  mercury: 'How it communicates and makes decisions',
  venus: 'Its alliances, finances and what it values',
  mars: 'How it acts and competes',
  jupiter: 'Where it grows and finds opportunity',
  saturn: 'Where it builds structure and sets limits',
  uranus: 'Where it disrupts and innovates',
  neptune: 'Where its ideals, image and illusions live',
  pluto: 'Where power concentrates and deep change happens',
  chiron: 'Where an old vulnerability sits and repair is possible',
  node: 'The direction its growth is pulling toward',
  southnode: 'What is familiar and ready to be released',
  lilith: 'Where it resists being controlled or edited',
  pallas: 'How it strategizes and spots patterns',
  asc: 'How it presents itself to the world',
  mc: 'Its public image and role',
  ic: 'Its roots, heritage and base',
  dsc: 'Its partners, rivals and who it attracts',
};

// What each planet means in a relationship between two charts when a chart is a collective subject.
export const REL_C = {
  sun: 'identity and leadership', moon: 'public mood', mercury: 'communication', venus: 'alliances and values',
  mars: 'drive and competition', jupiter: 'growth and goodwill', saturn: 'structure and commitment',
  uranus: 'change and unpredictability', neptune: 'ideals and image', pluto: 'power and transformation',
  chiron: 'old vulnerabilities and repair', node: 'shared direction', asc: 'public image', mc: 'reputation and role',
};

export const SEXTILE_NOTE_C = 'In astrology, a sextile describes an opportunity that tends to need a nudge: a door that opens when it is approached.';

export const CLIMATE_C = {
  demanding: 'Challenging aspects outweigh supportive ones right now. That can bring pressure, and periods like this are often when long-delayed changes finally get made.',
  supportive: 'Supportive aspects outweigh challenging ones right now. Things can move more easily than usual, which makes this a good window to act on priorities.',
  mixed: 'Supportive and challenging influences are balanced right now. Expect competing pressures, and let the easier energy help carry the harder parts.',
};

export const COMPARE_THEMES_C = {
  sunMoon: 'Sun–Moon link: identity and public mood often line up.',
  venusMars: 'Venus–Mars link: a strong pull between values and drive is common.',
  moonMoon: 'Moon–Moon link: a shared public mood is typical.',
  venusVenus: 'Venus–Venus link: shared values and ways of forming alliances tend to show up.',
  asc: 'An Ascendant contact: first impressions tend to be strong.',
};
