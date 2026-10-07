// Mundane (collective) astrology vocabulary. These describe themes in the wider world,
// not predictions of specific events.

// What each sign tends to govern at the collective level.
export const SIGN_WORLD = [
  'leadership, independence, conflict and new beginnings', // Aries
  'money, land, food and material security', // Taurus
  'information, media, communication and education', // Gemini
  'housing, family, nationhood and care', // Cancer
  'leadership, entertainment, creativity and national pride', // Leo
  'work, labor, health systems and public service', // Virgo
  'diplomacy, law, partnership and fairness', // Libra
  'shared finance, debt, secrets and power', // Scorpio
  'belief, travel, higher education and the legal system', // Sagittarius
  'government, institutions, business and authority', // Capricorn
  'technology, networks, social movements and the collective', // Aquarius
  'healthcare, faith, imagination and compassion', // Pisces
];

// How each slow planet works on the collective, and the domain it rules in world affairs.
// `verb` slots in front of a sign's domain: "<verb> housing, family, nationhood and care."
export const PLANET_WORLD = {
  jupiter: { verb: 'Growth and optimism tend to gather around', domain: 'growth, law, belief and economic confidence' },
  saturn: { verb: 'Structure, rules and accountability tend to tighten around', domain: 'government, regulation and economic limits' },
  uranus: { verb: 'Disruption and innovation tend to reshape', domain: 'technology, revolt and sudden change' },
  neptune: { verb: 'Ideals and shifting certainties tend to play out in', domain: 'ideals, media narratives and public trust' },
  pluto: { verb: 'A deep, long-running shift in power tends to work through', domain: 'power, wealth and deep restructuring' },
};

// Hand-written readings for the placements that define the current era (planet:signIndex).
// These are interpretations of collective themes, not predictions of particular events.
export const WORLD_OVERRIDE = {
  'pluto:10': 'Pluto in Aquarius is often read as a long restructuring of technology, data and networks, and of who holds collective power. Debates over AI, surveillance, platforms and institutional legitimacy may keep resurfacing.',
  'neptune:0': 'Neptune in Aries tends to dissolve old ideas of strength, leadership and identity. New ideals can take shape alongside confusion, myth-making and uncertainty around conflict.',
  'saturn:0': 'Saturn in Aries tends to test independence and leadership. Old structures around authority, defence and who is in charge can be rebuilt from the ground up.',
  'uranus:2': 'Uranus in Gemini is often read as a rewiring of how information moves. Change in media, AI, communication and education is likely, with truth and attention as recurring battlegrounds.',
  'jupiter:3': 'Jupiter in Cancer tends to bring growth and generosity to housing, family, food and care, and to ideas of home and belonging.',
  'jupiter:4': 'Jupiter in Leo can expand the appetite for culture, entertainment, bold leadership and celebration, with ego and overreach as the risk.',
};
