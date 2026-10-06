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
export const PLANET_WORLD = {
  jupiter: { verb: 'Growth, optimism and expansion are concentrated in', domain: 'growth, law, belief and economic confidence' },
  saturn: { verb: 'Structure, rules and accountability are tightening around', domain: 'government, regulation and economic limits' },
  uranus: { verb: 'Disruption and innovation are reshaping', domain: 'technology, revolt and sudden change' },
  neptune: { verb: 'Ideals, illusions and dissolving certainties are playing out in', domain: 'ideals, media narratives and public trust' },
  pluto: { verb: 'A deep, long-running transformation of power is working through', domain: 'power, wealth and deep restructuring' },
};

// Hand-written readings for the placements that define the current era (planet:signIndex).
export const WORLD_OVERRIDE = {
  'pluto:10': 'Pluto in Aquarius is the long restructuring of technology, data and networks, and of who holds collective power. Expect recurring fights over AI, surveillance, platforms and institutional legitimacy.',
  'neptune:0': 'Neptune in Aries is dissolving old ideas of strength, leadership and identity. New ideals take shape alongside confusion, myth-making and uncertainty around conflict.',
  'saturn:0': 'Saturn in Aries tests independence and leadership. Old structures around authority, defence and who is in charge are being rebuilt from the ground up.',
  'uranus:2': 'Uranus in Gemini is rewiring how information moves. Expect rapid change in media, AI, communication and education, with truth and attention as the battlegrounds.',
  'jupiter:3': 'Jupiter in Cancer brings growth and generosity to housing, family, food and care, and to ideas of home and belonging.',
  'jupiter:4': 'Jupiter in Leo expands appetite for culture, entertainment, bold leadership and celebration, with the risk of ego and overreach.',
};
