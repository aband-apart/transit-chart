// Interpretation tables for charts of countries, places, organizations and events.
// The human metaphors in astro-data.js (moods, feeling unsafe, meditating) don't fit these subjects,
// so they get their own wording. Strings are written without "you" and use "it/its" where a pronoun is needed.
// Imperative tips are phrased so advice() can turn them into "X may do well to ...".

export const PLANET_C = {
  sun: {
    hard: 'Leadership and the public face come under pressure. Expect friction with authority, or a push to prove itself.',
    soft: 'Vitality and confidence flow more easily. This is a good window to be visible and make a move.',
    conj: 'Attention and energy are focused here, and what begins now carries its signature.',
    hardTip: 'Pace the effort and pick one thing to lead on instead of taking on everything.',
    softTip: 'Step forward publicly. Visibility is rewarded now.',
    avoid: 'Avoid ego-driven power struggles.',
    inHouse: 'is lighting up',
  },
  moon: {
    principle: 'public mood and everyday needs',
    hard: 'Public mood runs closer to the surface, and small events can have outsized effects.',
    soft: 'The public mood is steady and reactions are easy to read.',
    conj: 'Mood is loud and unmissable for a day or so.',
    hardTip: 'Name the mood before reacting to it.',
    softTip: 'Trust the read on how people are responding today.',
    avoid: 'Avoid announcements made in the heat of the moment.',
    inHouse: 'is stirring public feeling in',
  },
  mercury: {
    hard: 'Mixed messages, over-analysis or tense talks. Details need double-checking.',
    soft: 'Communication, writing and decisions come more easily, and ideas connect.',
    conj: 'Attention is focused on a message, decision or idea, and one lands now.',
    hardTip: 'Re-read before publishing and confirm the details.',
    softTip: 'Pitch, write and negotiate. Words land well.',
    avoid: 'Avoid assuming what others mean. Ask.',
    retro: 'Mercury retrograde favors reviewing, revising and reconnecting over launching and signing. Double-check communications, contracts and logistics, and revisit unfinished business.',
    inHouse: 'is sharpening communication in',
  },
  venus: {
    principle: 'alliances, values and money',
    hard: 'Tension around alliances, money or values, from overindulgence or friction with a close partner.',
    soft: 'Goodwill and cooperation come easily, and partnerships and finances feel smoother.',
    conj: 'Goodwill, an alliance or a financial opportunity is directly in play.',
    hardTip: 'State plainly what is wanted and avoid appeasing everyone.',
    softTip: 'Invest in an alliance or partnership that matters.',
    avoid: 'Avoid impulse spending or smoothing over real issues.',
    retro: 'Venus retrograde is a time to reassess alliances, finances and values. Old partners and old spending patterns resurface, so avoid drastic rebrands or new commitments.',
    inHouse: 'is warming up',
  },
  mars: {
    principle: 'drive, action, ambition and conflict',
    hard: 'A short fuse, impatience and friction. Energy is high but easily misdirected.',
    soft: 'Strong, well-directed energy, good for decisive action.',
    conj: 'A surge of drive. Whatever it is aimed at gets a big push.',
    hardTip: 'Channel the energy into a hard task and leave arguments alone.',
    softTip: 'Take decisive action on something that has been delayed.',
    avoid: 'Avoid rushing, risk-taking and picking fights.',
    retro: 'Mars retrograde slows drive and brings frustration to launches. Finish and refine rather than starting new battles.',
    inHouse: 'is firing up',
  },
  jupiter: {
    hard: 'Overreach is the risk: taking on too much, overpromising, overspending or inflating expectations.',
    soft: 'Opportunities, goodwill and support appear. Growth feels natural and doors open.',
    conj: 'A major opening and a chance for real growth. What is planted now can grow for years.',
    hardTip: 'Say yes selectively and keep a margin of safety.',
    softTip: 'Say yes to opportunity and make the ask. People are inclined to help.',
    avoid: 'Avoid overcommitting or assuming it will all work out.',
    retro: 'Jupiter retrograde turns growth inward: consolidate what is already held and refine beliefs before expanding.',
    inHouse: 'is expanding',
  },
  saturn: {
    hard: 'Pressure, delays and a sense of being tested. Something that is not solid gets exposed so it can be rebuilt better.',
    soft: 'Steady, real progress. Effort now pays off, and commitments hold.',
    conj: 'A serious chapter begins, with responsibility to take on and something durable to build.',
    hardTip: 'Do the unglamorous work and set a boundary that has been avoided.',
    softTip: 'Commit to a long-term plan. Structure now becomes an asset.',
    avoid: 'Avoid shortcuts, and avoid reading delay as failure.',
    retro: 'Saturn retrograde calls for an audit of commitments and structures, and a rework of what was built on weak foundations.',
    inHouse: 'is putting structure and pressure on',
  },
  uranus: {
    hard: 'Disruption: sudden changes, restlessness and a need to break free of what feels confining.',
    soft: 'Fresh ideas, welcome change and room to try something new.',
    conj: 'A turning point. Expect the unexpected and a pull toward a new version of itself.',
    hardTip: 'Make room for change and stay flexible instead of clamping down.',
    softTip: 'Experiment. The new approach has more going for it than it seems.',
    avoid: 'Avoid burning bridges on impulse.',
    retro: 'Uranus retrograde internalizes the urge for change. Work out what actually needs to be freed.',
    inHouse: 'is shaking up',
  },
  neptune: {
    principle: 'vision, ideals and dissolving boundaries',
    hard: 'Fog, confusion, wishful thinking or disappointment. Things are not quite what they appear.',
    soft: 'Inspiration, goodwill and a creative openness.',
    conj: 'A dreamlike chapter that dissolves old certainties and invites new meaning.',
    hardTip: 'Verify facts and keep boundaries clear. Do not make big decisions in the fog.',
    softTip: 'Make room for creativity and reflection, and check inspired ideas against the facts.',
    avoid: 'Avoid idealizing partners or drifting without a plan.',
    retro: 'Neptune retrograde clears the fog. Illusions come apart and things look clearer.',
    inHouse: 'is dissolving boundaries in',
  },
  pluto: {
    hard: 'Intense pressure to change. Something outworn is being stripped back, and control issues surface.',
    soft: 'Quiet but powerful transformation, with the resolve to change something at its root.',
    conj: 'A deep, irreversible shift. A part of it is reborn.',
    hardTip: 'Stop trying to control the outcome. Choose what to let go of before it is taken.',
    softTip: 'Invest in deep change, because there is endurance for it.',
    avoid: 'Avoid manipulation, fixation on control and power plays.',
    inHouse: 'is transforming',
  },
  chiron: {
    principle: 'old vulnerabilities and the repair that follows',
    hard: 'An old vulnerability gets pressed, which is uncomfortable but an opening for repair.',
    soft: 'Repair and goodwill come more easily, including toward others.',
    conj: 'A long-standing weakness surfaces so it can be addressed.',
    hardTip: 'Go carefully. Get support rather than pushing through.',
    softTip: 'Share what has been learned. A long history can help others.',
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
  pluto: { arena: 'its power, resources and capacity to transform', gift: 'powerful renewal', risk: 'power struggles or crisis' },
  node: { arena: 'its path of growth and sense of destiny', gift: 'a clearer next step', risk: 'second-guessing its direction' },
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

// What each planet means in a relationship between two charts when the chart is a collective subject.
export const REL_C = {
  sun: 'identity and leadership', moon: 'public mood', mercury: 'communication', venus: 'alliances and values',
  mars: 'drive and competition', jupiter: 'growth and goodwill', saturn: 'structure and commitment',
  uranus: 'change and unpredictability', neptune: 'ideals and image', pluto: 'power and transformation',
  chiron: 'old vulnerabilities and repair', node: 'shared direction', asc: 'public image', mc: 'reputation and role',
};

export const SEXTILE_NOTE_C = 'A sextile is an opportunity that rewards action. It offers a door that has to be walked through.';

export const CLIMATE_C = {
  demanding: 'The weight of the sky is on the challenging side right now. That usually brings pressure, but it is also the kind of period that forces real growth and decisive change.',
  supportive: 'The sky is largely supportive right now. Things come more easily than usual, so this is a good window to act on priorities.',
  mixed: 'The sky is mixed right now, with supportive and challenging influences side by side. Expect competing pressures, and use the easy energy to carry the hard parts.',
};

export const COMPARE_THEMES_C = {
  sunMoon: 'Sun–Moon link: identity and public mood line up.',
  venusMars: 'Venus–Mars link: a strong pull between values and drive.',
  moonMoon: 'Moon–Moon link: a shared public mood.',
  venusVenus: 'Venus–Venus link: shared values and ways of forming alliances.',
  asc: 'An Ascendant contact: strong first impressions.',
};
