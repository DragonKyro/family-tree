/**
 * Catalog of every sign surfaced in the side panel's "Born under" + "Personal"
 * sections — Western zodiac, Chinese zodiac, Wu Xing element, birthstone, and
 * MBTI type. The Signs explorer panel reads from this file.
 *
 * Compatibility within each category follows the traditional pairings:
 *   • Western zodiac — same-element trine + air/fire affinity
 *   • Chinese zodiac — San He triangles (Rat/Dragon/Monkey, Ox/Snake/Rooster,
 *     Tiger/Horse/Dog, Rabbit/Goat/Pig) and lunar matches
 *   • Wu Xing — generative cycle neighbors (the element that feeds it + the
 *     element it feeds): Wood→Fire→Earth→Metal→Water→Wood
 *   • Birthstones — color/season-adjacent stones, not a strict tradition
 *   • MBTI — classic NF↔NT and SP↔SJ shadow-function pairings
 */

import type { MBTI } from '../types'

export type SignCategory =
  | 'zodiac'
  | 'chineseZodiac'
  | 'element'
  | 'birthstone'
  | 'mbti'

export interface Sign {
  /** Stable lookup key. Lowercase for everything except MBTI codes. */
  key: string
  category: SignCategory
  name: string
  emoji: string
  /** 2-3 sentence overview. */
  summary: string
  /** Short bullet points. */
  strengths: string[]
  weaknesses: string[]
  /** Names (matching the `name` field) of compatible signs in the same category. */
  compatibility: string[]
  /** Category-specific extras shown as a meta line under the name. */
  meta?: Record<string, string>
}

// ── Western zodiac ──────────────────────────────────────────────────────────

const ZODIAC: Sign[] = [
  {
    key: 'aries', category: 'zodiac', name: 'Aries', emoji: '♈',
    summary: 'First sign of the zodiac, ruled by Mars — pure forward momentum. Aries leads from the front, charges into challenges, and gets bored the second things stop moving. Their best and worst trait is the same: they don\'t think before acting.',
    strengths: ['Bold and direct', 'Natural leader', 'High energy', 'Honest', 'Fast decision-maker'],
    weaknesses: ['Impatient', 'Quick to anger', 'Can steamroll others', 'Loses interest fast', 'Self-focused'],
    compatibility: ['Leo', 'Sagittarius', 'Gemini', 'Aquarius'],
    meta: { Dates: 'Mar 21 – Apr 19', Element: 'Fire', Modality: 'Cardinal', Ruler: 'Mars' },
  },
  {
    key: 'taurus', category: 'zodiac', name: 'Taurus', emoji: '♉',
    summary: 'Venus\'s earth sign — patient, sensual, immovable. Taurus builds slowly and keeps what it builds. Once their mind is made up, no force on earth shifts them.',
    strengths: ['Reliable', 'Patient', 'Grounded and sensual', 'Practical', 'Deeply loyal'],
    weaknesses: ['Stubborn', 'Possessive', 'Resistant to change', 'Indulgent', 'Can be lazy'],
    compatibility: ['Virgo', 'Capricorn', 'Cancer', 'Pisces'],
    meta: { Dates: 'Apr 20 – May 20', Element: 'Earth', Modality: 'Fixed', Ruler: 'Venus' },
  },
  {
    key: 'gemini', category: 'zodiac', name: 'Gemini', emoji: '♊',
    summary: 'Mercury\'s first home — quick, curious, plural. Gemini is the wit of the zodiac, juggling ideas and conversations effortlessly. The downside: they want all of it, all at once, and rarely stick around for the depths.',
    strengths: ['Witty and curious', 'Adaptable', 'Excellent communicators', 'Sociable', 'Fast learners'],
    weaknesses: ['Inconsistent', 'Indecisive', 'Restless', 'Surface-level at times', 'Easily bored'],
    compatibility: ['Libra', 'Aquarius', 'Aries', 'Leo'],
    meta: { Dates: 'May 21 – Jun 20', Element: 'Air', Modality: 'Mutable', Ruler: 'Mercury' },
  },
  {
    key: 'cancer', category: 'zodiac', name: 'Cancer', emoji: '♋',
    summary: 'Ruled by the moon — emotional, protective, deeply tied to home and family. Cancer feels everything, remembers everything, and builds a shell to protect a soft inside.',
    strengths: ['Loyal and protective', 'Empathetic', 'Intuitive', 'Nurturing', 'Tenacious'],
    weaknesses: ['Moody', 'Easily hurt', 'Clingy', 'Holds grudges', 'Avoids confrontation'],
    compatibility: ['Scorpio', 'Pisces', 'Taurus', 'Virgo'],
    meta: { Dates: 'Jun 21 – Jul 22', Element: 'Water', Modality: 'Cardinal', Ruler: 'Moon' },
  },
  {
    key: 'leo', category: 'zodiac', name: 'Leo', emoji: '♌',
    summary: 'The sun\'s only sign — warm, generous, unmistakably the center of attention. Leo plays big, loves dramatically, and gives full-spectrum loyalty to anyone they consider theirs.',
    strengths: ['Generous', 'Charismatic', 'Loyal', 'Confident', 'Creative'],
    weaknesses: ['Egotistical', 'Domineering', 'Drama-prone', 'Stubborn', 'Needs constant praise'],
    compatibility: ['Aries', 'Sagittarius', 'Gemini', 'Libra'],
    meta: { Dates: 'Jul 23 – Aug 22', Element: 'Fire', Modality: 'Fixed', Ruler: 'Sun' },
  },
  {
    key: 'virgo', category: 'zodiac', name: 'Virgo', emoji: '♍',
    summary: 'Mercury\'s earth sign — analytical, useful, allergic to mess. Virgo fixes what\'s broken and notices what nobody else does. Their love language is competence.',
    strengths: ['Analytical', 'Hardworking', 'Detail-oriented', 'Practical', 'Reliable'],
    weaknesses: ['Critical (of self and others)', 'Worry-prone', 'Perfectionist', 'Hard to please', 'Reserved'],
    compatibility: ['Taurus', 'Capricorn', 'Cancer', 'Scorpio'],
    meta: { Dates: 'Aug 23 – Sep 22', Element: 'Earth', Modality: 'Mutable', Ruler: 'Mercury' },
  },
  {
    key: 'libra', category: 'zodiac', name: 'Libra', emoji: '♎',
    summary: 'Venus\'s air sign — diplomatic, aesthetic, allergic to ugliness in any form. Libra weighs every option, courts every viewpoint, and works hard to keep the room balanced.',
    strengths: ['Diplomatic', 'Charming', 'Fair-minded', 'Aesthetic eye', 'Cooperative'],
    weaknesses: ['Indecisive', 'Avoids confrontation', 'Conflict-averse', 'Can be superficial', 'Self-pitying'],
    compatibility: ['Gemini', 'Aquarius', 'Leo', 'Sagittarius'],
    meta: { Dates: 'Sep 23 – Oct 22', Element: 'Air', Modality: 'Cardinal', Ruler: 'Venus' },
  },
  {
    key: 'scorpio', category: 'zodiac', name: 'Scorpio', emoji: '♏',
    summary: 'Pluto\'s water sign — intense, magnetic, all-or-nothing. Scorpio doesn\'t do small talk and doesn\'t do half-loyalty. They go deep or they don\'t go.',
    strengths: ['Loyal beyond measure', 'Brave', 'Resourceful', 'Passionate', 'Strategic'],
    weaknesses: ['Jealous', 'Secretive', 'Vindictive', 'Distrustful', 'Manipulative when wounded'],
    compatibility: ['Cancer', 'Pisces', 'Virgo', 'Capricorn'],
    meta: { Dates: 'Oct 23 – Nov 21', Element: 'Water', Modality: 'Fixed', Ruler: 'Pluto' },
  },
  {
    key: 'sagittarius', category: 'zodiac', name: 'Sagittarius', emoji: '♐',
    summary: 'Jupiter\'s fire sign — restless, philosophical, the zodiac\'s traveler and truth-teller. Sagittarius needs a horizon to chase and will say the uncomfortable thing nobody else will.',
    strengths: ['Optimistic', 'Adventurous', 'Honest', 'Open-minded', 'Generous'],
    weaknesses: ['Tactless', 'Restless', 'Overconfident', 'Promises more than they deliver', 'Commitment-shy'],
    compatibility: ['Aries', 'Leo', 'Libra', 'Aquarius'],
    meta: { Dates: 'Nov 22 – Dec 21', Element: 'Fire', Modality: 'Mutable', Ruler: 'Jupiter' },
  },
  {
    key: 'capricorn', category: 'zodiac', name: 'Capricorn', emoji: '♑',
    summary: 'Saturn\'s earth sign — disciplined, ambitious, the long game personified. Capricorn climbs slowly, takes responsibility seriously, and is funnier than they let on.',
    strengths: ['Disciplined', 'Ambitious', 'Responsible', 'Patient', 'Self-controlled'],
    weaknesses: ['Pessimistic', 'Stiff or formal', 'Workaholic', 'Slow to trust', 'Status-conscious'],
    compatibility: ['Taurus', 'Virgo', 'Scorpio', 'Pisces'],
    meta: { Dates: 'Dec 22 – Jan 19', Element: 'Earth', Modality: 'Cardinal', Ruler: 'Saturn' },
  },
  {
    key: 'aquarius', category: 'zodiac', name: 'Aquarius', emoji: '♒',
    summary: 'Uranus\'s air sign — independent, future-leaning, often the eccentric in the room. Aquarius cares about humanity in the abstract and about a small handful of people in detail.',
    strengths: ['Original', 'Independent', 'Humanitarian', 'Intellectual', 'Inventive'],
    weaknesses: ['Aloof', 'Contrarian', 'Emotionally detached', 'Unpredictable', 'Rebellious for its own sake'],
    compatibility: ['Gemini', 'Libra', 'Aries', 'Sagittarius'],
    meta: { Dates: 'Jan 20 – Feb 18', Element: 'Air', Modality: 'Fixed', Ruler: 'Uranus' },
  },
  {
    key: 'pisces', category: 'zodiac', name: 'Pisces', emoji: '♓',
    summary: 'Neptune\'s water sign — empathic, dreamy, the zodiac\'s mystic. Pisces feels the room before they read it and tend to take on emotions that aren\'t theirs.',
    strengths: ['Empathetic', 'Imaginative', 'Compassionate', 'Artistic', 'Gentle'],
    weaknesses: ['Escapist', 'Overly trusting', 'Avoids conflict', 'Indecisive', 'Easily overwhelmed'],
    compatibility: ['Cancer', 'Scorpio', 'Taurus', 'Capricorn'],
    meta: { Dates: 'Feb 19 – Mar 20', Element: 'Water', Modality: 'Mutable', Ruler: 'Neptune' },
  },
]

// ── Chinese zodiac ──────────────────────────────────────────────────────────

const CHINESE_ZODIAC: Sign[] = [
  {
    key: 'rat', category: 'chineseZodiac', name: 'Rat', emoji: '🐀',
    summary: 'The rat won the great race by riding on the ox — and that\'s the rat in a nutshell: clever, observant, and willing to use the resources at hand. Practical charmers who notice everything.',
    strengths: ['Quick-witted', 'Resourceful', 'Adaptable', 'Charming', 'Observant'],
    weaknesses: ['Opportunistic', 'Stingy with trust', 'Restless', 'Calculating', 'Critical'],
    compatibility: ['Dragon', 'Monkey', 'Ox'],
    meta: { 'Recent years': '1984, 1996, 2008, 2020' },
  },
  {
    key: 'ox', category: 'chineseZodiac', name: 'Ox', emoji: '🐂',
    summary: 'Steady, dependable, the slow-and-strong type. Ox keeps going long after everyone else has tapped out. Trust takes years to build but lasts a lifetime once given.',
    strengths: ['Reliable', 'Patient', 'Hardworking', 'Honest', 'Disciplined'],
    weaknesses: ['Stubborn', 'Slow to adapt', 'Withdrawn', 'Resistant to new ideas', 'Conservative'],
    compatibility: ['Snake', 'Rooster', 'Rat'],
    meta: { 'Recent years': '1985, 1997, 2009, 2021' },
  },
  {
    key: 'tiger', category: 'chineseZodiac', name: 'Tiger', emoji: '🐅',
    summary: 'Bold, independent, born to lead — the tiger doesn\'t follow well. Charismatic risk-takers with a streak of warmth that sneaks up on you.',
    strengths: ['Brave', 'Confident', 'Charismatic', 'Generous', 'Competitive'],
    weaknesses: ['Reckless', 'Impatient', 'Short-tempered', 'Hates rules', 'Restless'],
    compatibility: ['Horse', 'Dog', 'Pig'],
    meta: { 'Recent years': '1986, 1998, 2010, 2022' },
  },
  {
    key: 'rabbit', category: 'chineseZodiac', name: 'Rabbit', emoji: '🐇',
    summary: 'Gentle, refined, and sharper than they look. Rabbits prefer harmony to confrontation and quietly run circles around louder personalities.',
    strengths: ['Kind', 'Diplomatic', 'Artistic', 'Thoughtful', 'Self-protective'],
    weaknesses: ['Conflict-averse', 'Reserved', 'Pessimistic at times', 'Indecisive', 'Holds back'],
    compatibility: ['Goat', 'Pig', 'Dog'],
    meta: { 'Recent years': '1987, 1999, 2011, 2023' },
  },
  {
    key: 'dragon', category: 'chineseZodiac', name: 'Dragon', emoji: '🐉',
    summary: 'The most auspicious of the twelve — confident, magnetic, lucky. Dragons walk into rooms and tilt them. Big personalities with bigger ambitions.',
    strengths: ['Confident', 'Charismatic', 'Ambitious', 'Energetic', 'Lucky'],
    weaknesses: ['Arrogant', 'Demanding', 'Impulsive', 'Doesn\'t take criticism well', 'Overestimates self'],
    compatibility: ['Rat', 'Monkey', 'Rooster'],
    meta: { 'Recent years': '1988, 2000, 2012, 2024' },
  },
  {
    key: 'snake', category: 'chineseZodiac', name: 'Snake', emoji: '🐍',
    summary: 'Wise, observant, deeply private. Snakes think before they speak and often a few moves ahead. The mystery is part of the charm.',
    strengths: ['Wise', 'Strategic', 'Intuitive', 'Elegant', 'Determined'],
    weaknesses: ['Secretive', 'Suspicious', 'Jealous', 'Slow to forgive', 'Aloof'],
    compatibility: ['Ox', 'Rooster', 'Monkey'],
    meta: { 'Recent years': '1989, 2001, 2013, 2025' },
  },
  {
    key: 'horse', category: 'chineseZodiac', name: 'Horse', emoji: '🐎',
    summary: 'Free-spirited, energetic, independent — the horse needs room to run. Sociable, optimistic, and a little allergic to long-term plans they didn\'t make themselves.',
    strengths: ['Energetic', 'Sociable', 'Independent', 'Optimistic', 'Adventurous'],
    weaknesses: ['Impatient', 'Restless', 'Inconsistent', 'Self-centered at times', 'Hot-tempered'],
    compatibility: ['Tiger', 'Dog', 'Goat'],
    meta: { 'Recent years': '1990, 2002, 2014, 2026' },
  },
  {
    key: 'goat', category: 'chineseZodiac', name: 'Goat', emoji: '🐐',
    summary: 'Gentle, artistic, and quietly stubborn about beauty. Goats avoid conflict, value comfort, and give the most thoughtful gifts at the lunar new year.',
    strengths: ['Creative', 'Compassionate', 'Calm', 'Resilient', 'Thoughtful'],
    weaknesses: ['Worry-prone', 'Indecisive', 'Pessimistic', 'Avoids confrontation', 'Sensitive to criticism'],
    compatibility: ['Rabbit', 'Pig', 'Horse'],
    meta: { 'Recent years': '1991, 2003, 2015, 2027' },
  },
  {
    key: 'monkey', category: 'chineseZodiac', name: 'Monkey', emoji: '🐒',
    summary: 'Sharp, mischievous, endlessly curious — the monkey is the trickster of the cycle. Brilliant problem-solvers who get bored if a challenge doesn\'t move fast enough.',
    strengths: ['Clever', 'Inventive', 'Witty', 'Versatile', 'Sociable'],
    weaknesses: ['Opportunistic', 'Easily bored', 'Mischievous to a fault', 'Vain', 'Impatient'],
    compatibility: ['Rat', 'Dragon', 'Snake'],
    meta: { 'Recent years': '1992, 2004, 2016, 2028' },
  },
  {
    key: 'rooster', category: 'chineseZodiac', name: 'Rooster', emoji: '🐓',
    summary: 'Confident, observant, and never afraid to tell you what they think. Roosters are sharp dressers and sharper observers, with a perfectionist streak that runs deep.',
    strengths: ['Honest', 'Hardworking', 'Observant', 'Confident', 'Punctual'],
    weaknesses: ['Critical', 'Boastful at times', 'Perfectionist', 'Vain', 'Inflexible'],
    compatibility: ['Ox', 'Snake', 'Dragon'],
    meta: { 'Recent years': '1993, 2005, 2017, 2029' },
  },
  {
    key: 'dog', category: 'chineseZodiac', name: 'Dog', emoji: '🐕',
    summary: 'Loyal, honest, and a moral compass for everyone around them. Dogs read people well, take fairness seriously, and pick their pack carefully.',
    strengths: ['Loyal', 'Honest', 'Protective', 'Fair-minded', 'Reliable'],
    weaknesses: ['Anxious', 'Quick to judge', 'Stubborn', 'Pessimistic', 'Overprotective'],
    compatibility: ['Tiger', 'Horse', 'Rabbit'],
    meta: { 'Recent years': '1994, 2006, 2018, 2030' },
  },
  {
    key: 'pig', category: 'chineseZodiac', name: 'Pig', emoji: '🐖',
    summary: 'Generous, easy-going, and genuinely warm — the pig is the most enjoyed company in the cycle. They believe the best in people and host the best dinners.',
    strengths: ['Generous', 'Honest', 'Optimistic', 'Kind', 'Sincere'],
    weaknesses: ['Naive', 'Indulgent', 'Lazy at times', 'Easily taken advantage of', 'Avoids hard truths'],
    compatibility: ['Rabbit', 'Goat', 'Tiger'],
    meta: { 'Recent years': '1995, 2007, 2019, 2031' },
  },
]

// ── Wu Xing elements ────────────────────────────────────────────────────────

const ELEMENTS: Sign[] = [
  {
    key: 'metal', category: 'element', name: 'Metal', emoji: '🪙',
    summary: 'Metal is the element of structure, refinement, and clear judgment. People shaped by Metal think in clean lines, value order, and prize integrity over warmth — though they have plenty of both.',
    strengths: ['Disciplined', 'Principled', 'Articulate', 'Decisive', 'Resilient'],
    weaknesses: ['Rigid', 'Critical', 'Cold at times', 'Slow to forgive', 'Perfectionist'],
    compatibility: ['Earth', 'Water'],
    meta: { Color: 'Gold', 'Year endings': '0, 1' },
  },
  {
    key: 'water', category: 'element', name: 'Water', emoji: '💧',
    summary: 'Water is wisdom in motion — adaptive, deep, patient. Water people are often quiet observers who get to the truth of a situation by going around obstacles, not through them.',
    strengths: ['Wise', 'Adaptable', 'Empathetic', 'Persuasive', 'Resourceful'],
    weaknesses: ['Indirect', 'Withdrawn', 'Indecisive', 'Easily overwhelmed', 'Conflict-averse'],
    compatibility: ['Metal', 'Wood'],
    meta: { Color: 'Black', 'Year endings': '2, 3' },
  },
  {
    key: 'wood', category: 'element', name: 'Wood', emoji: '🌳',
    summary: 'Wood is growth, expansion, and benevolent ambition. Wood people are visionaries — generous-hearted, idealistic, and constantly stretching toward something larger than themselves.',
    strengths: ['Visionary', 'Generous', 'Cooperative', 'Energetic', 'Idealistic'],
    weaknesses: ['Overcommits', 'Impatient when growth stalls', 'Frustrated by limits', 'Stubborn ideals', 'Restless'],
    compatibility: ['Water', 'Fire'],
    meta: { Color: 'Green', 'Year endings': '4, 5' },
  },
  {
    key: 'fire', category: 'element', name: 'Fire', emoji: '🔥',
    summary: 'Fire is passion, warmth, and presence — the element that draws everyone in. Fire people lead with feeling, light up the room, and burn out fast if they don\'t pace themselves.',
    strengths: ['Passionate', 'Charismatic', 'Joyful', 'Inspiring', 'Brave'],
    weaknesses: ['Burns out', 'Impulsive', 'Drama-prone', 'Restless', 'Quick to anger'],
    compatibility: ['Wood', 'Earth'],
    meta: { Color: 'Red', 'Year endings': '6, 7' },
  },
  {
    key: 'earth', category: 'element', name: 'Earth', emoji: '🪨',
    summary: 'Earth is the steady ground everyone else stands on — nurturing, dependable, deeply rooted. Earth people are the caretakers, the ones who quietly hold communities together.',
    strengths: ['Reliable', 'Nurturing', 'Patient', 'Practical', 'Loyal'],
    weaknesses: ['Stuck in routines', 'Worry-prone', 'Reluctant to change', 'Boundaries blur', 'Stubborn'],
    compatibility: ['Fire', 'Metal'],
    meta: { Color: 'Yellow', 'Year endings': '8, 9' },
  },
]

// ── Birthstones ─────────────────────────────────────────────────────────────

const BIRTHSTONES: Sign[] = [
  {
    key: 'garnet', category: 'birthstone', name: 'Garnet', emoji: '🔴',
    summary: 'A deep red stone of vitality and protection — historically carried by travelers as a guard against danger. Garnet is associated with energy, perseverance, and devotion.',
    strengths: ['Energizing', 'Protective talisman', 'Promotes loyalty', 'Boosts confidence', 'Encourages courage'],
    weaknesses: ['Said to amplify intensity', 'Can heighten passion into stubbornness', 'Reads heavy in soft palettes', 'Less prestigious than ruby', 'Color can feel somber'],
    compatibility: ['Amethyst', 'Ruby'],
    meta: { Month: 'January' },
  },
  {
    key: 'amethyst', category: 'birthstone', name: 'Amethyst', emoji: '🟣',
    summary: 'A purple quartz long linked to clarity, sobriety, and spiritual calm. Ancient Greeks believed it warded off intoxication; modern lore makes it the stone of the level head.',
    strengths: ['Calming', 'Promotes clarity', 'Spiritual focus', 'Eases restlessness', 'Soothing energy'],
    weaknesses: ['Color fades in sunlight', 'Said to dampen enthusiasm', 'Encourages overthinking in some', 'Cools the room emotionally', 'Less flashy than peers'],
    compatibility: ['Aquamarine', 'Sapphire'],
    meta: { Month: 'February' },
  },
  {
    key: 'aquamarine', category: 'birthstone', name: 'Aquamarine', emoji: '🔷',
    summary: 'The pale-blue stone of seafarers — said to keep sailors safe and waters calm. Aquamarine is linked with courage under pressure, clear communication, and emotional steadiness.',
    strengths: ['Calming', 'Encourages honesty', 'Eases anxiety', 'Cools tempers', 'Promotes courage'],
    weaknesses: ['Believed to invite passivity', 'Color easily fades', 'Cool tones feel distant', 'Not bold enough for some', 'Can encourage withdrawal'],
    compatibility: ['Amethyst', 'Pearl'],
    meta: { Month: 'March' },
  },
  {
    key: 'diamond', category: 'birthstone', name: 'Diamond', emoji: '💎',
    summary: 'The hardest natural substance, born of carbon under enormous pressure — fitting metaphor and all. Diamonds symbolize endurance, clarity, and the kind of love meant to last.',
    strengths: ['Enduring', 'Symbol of commitment', 'Amplifies inner strength', 'Catches every light', 'Universally treasured'],
    weaknesses: ['Carries heavy expectations', 'Easily ostentatious', 'Conflict-mining concerns', 'Pricey to live up to', 'Can feel cold without context'],
    compatibility: ['Emerald', 'Sapphire'],
    meta: { Month: 'April' },
  },
  {
    key: 'emerald', category: 'birthstone', name: 'Emerald', emoji: '🟢',
    summary: 'The vivid green stone of Cleopatra and the Mughals — symbol of rebirth, fertility, and patient growth. Emerald is for the ones who build slowly and beautifully.',
    strengths: ['Symbolizes renewal', 'Promotes loyalty', 'Calming green energy', 'Inspires patience', 'Lush and rich'],
    weaknesses: ['Brittle, often included with flaws', 'Easily damaged', 'Can attract envy', 'Demanding to display well', 'Pricey for clean stones'],
    compatibility: ['Diamond', 'Peridot'],
    meta: { Month: 'May' },
  },
  {
    key: 'pearl', category: 'birthstone', name: 'Pearl', emoji: '⚪',
    summary: 'Not a mineral but its own miracle — formed inside a living shell over years. Pearls symbolize purity, wisdom gained slowly, and the beauty of patience.',
    strengths: ['Symbolizes purity', 'Calming presence', 'Subtle elegance', 'Heirloom-friendly', 'Tied to water and lunar energy'],
    weaknesses: ['Soft, easily damaged', 'Loses luster without care', 'Reads old-fashioned to some', 'Sensitive to perfume and oils', 'Not flashy enough for big statements'],
    compatibility: ['Aquamarine', 'Opal'],
    meta: { Month: 'June' },
  },
  {
    key: 'ruby', category: 'birthstone', name: 'Ruby', emoji: '❤️',
    summary: 'The lord of gemstones — deep red, durable, historically associated with kings. Ruby stands for passion, courage, and the kind of vitality that draws every eye.',
    strengths: ['Passionate', 'Bold', 'Symbol of courage', 'Highly durable', 'Color-saturated'],
    weaknesses: ['Said to inflame tempers', 'Easily ostentatious', 'Pricey to wear well', 'Can read as dramatic', 'Demands the right setting'],
    compatibility: ['Garnet', 'Diamond'],
    meta: { Month: 'July' },
  },
  {
    key: 'peridot', category: 'birthstone', name: 'Peridot', emoji: '🟩',
    summary: 'A green-yellow gem born of volcanic earth (and even meteorites). Peridot is associated with sunlight, warmth, and freedom from emotional ballast.',
    strengths: ['Bright and uplifting', 'Said to ward off bad dreams', 'Promotes letting go', 'Affordable elegance', 'Pairs with most metals'],
    weaknesses: ['Color can feel dated', 'Soft compared to harder gems', 'Easily scratched', 'Not formal-event flashy', 'Yellow-green not for everyone'],
    compatibility: ['Emerald', 'Topaz'],
    meta: { Month: 'August' },
  },
  {
    key: 'sapphire', category: 'birthstone', name: 'Sapphire', emoji: '🔵',
    summary: 'A deep blue corundum (cousin to ruby) symbolizing wisdom, royalty, and faithful love. Sapphires were worn by clergy, kings, and now pretty much anyone with taste.',
    strengths: ['Symbol of wisdom', 'Highly durable', 'Royal connotations', 'Holds color well', 'Versatile in jewelry'],
    weaknesses: ['Deep blue can feel formal', 'Pricey for premium grades', 'Often associated with seriousness', 'Less dramatic than ruby', 'Imitations are common'],
    compatibility: ['Diamond', 'Amethyst'],
    meta: { Month: 'September' },
  },
  {
    key: 'opal', category: 'birthstone', name: 'Opal', emoji: '🌈',
    summary: 'A play of every color trapped in a single stone — opal is the chameleon of the gem world. It stands for creativity, emotional range, and the beauty of inconsistency.',
    strengths: ['Mesmerizing color play', 'Symbol of creativity', 'Each stone unique', 'Lighter than most gems', 'Boho-friendly'],
    weaknesses: ['Soft and brittle', 'Cracks if dehydrated', 'Iridescence reads chaotic to some', 'Superstition links to bad luck', 'Demands careful wear'],
    compatibility: ['Pearl', 'Turquoise'],
    meta: { Month: 'October' },
  },
  {
    key: 'topaz', category: 'birthstone', name: 'Topaz', emoji: '🟡',
    summary: 'A warm yellow-orange gem (though it comes in many colors) associated with strength, healing, and the autumn sun. Topaz lifts mood and brings clarity to muddled thinking.',
    strengths: ['Warm and inviting', 'Symbol of strength', 'Affordable in many shades', 'Highly durable', 'Brings clarity'],
    weaknesses: ['Color often treated or enhanced', 'Yellow can read dated', 'Imperial topaz is pricey', 'Easily confused with citrine', 'Less prestige than ruby or sapphire'],
    compatibility: ['Peridot', 'Garnet'],
    meta: { Month: 'November' },
  },
  {
    key: 'turquoise', category: 'birthstone', name: 'Turquoise', emoji: '🟦',
    summary: 'A blue-green stone treasured by ancient civilizations from Egypt to the American Southwest. Turquoise symbolizes friendship, protection, and grounded creativity.',
    strengths: ['Cultural depth', 'Protective talisman', 'Pairs beautifully with silver', 'Distinct color', 'Affordable'],
    weaknesses: ['Soft, fades with sun and oil', 'Often stabilized or imitated', 'Color reads casual', 'Not formal-event ready', 'Easily damaged'],
    compatibility: ['Opal', 'Aquamarine'],
    meta: { Month: 'December' },
  },
]

// ── MBTI ────────────────────────────────────────────────────────────────────

const MBTI_TYPES: Sign[] = [
  {
    key: 'ISTJ', category: 'mbti', name: 'ISTJ — Logistician', emoji: '🧠',
    summary: 'Methodical, traditional, the keeper of how things are done. ISTJs are the institutional memory of any group — quietly making sure the systems actually work.',
    strengths: ['Reliable', 'Organized', 'Honest', 'Practical', 'Strong work ethic'],
    weaknesses: ['Rigid', 'Resistant to change', 'Reserved', 'Judgmental of "winging it"', 'Struggles with ambiguity'],
    compatibility: ['ESFP — Entertainer', 'ESTP — Entrepreneur'],
    meta: { Group: 'Sentinel', Functions: 'Si · Te · Fi · Ne' },
  },
  {
    key: 'ISFJ', category: 'mbti', name: 'ISFJ — Defender', emoji: '🧠',
    summary: 'Quietly devoted protectors of the people and traditions they love. ISFJs notice every birthday, every preference, every mood — and act on it without making a fuss.',
    strengths: ['Loyal', 'Observant', 'Kind', 'Hardworking', 'Detail-oriented'],
    weaknesses: ['Avoids confrontation', 'Self-sacrificing', 'Resistant to change', 'Takes criticism personally', 'Bottles things up'],
    compatibility: ['ESFP — Entertainer', 'ESTP — Entrepreneur'],
    meta: { Group: 'Sentinel', Functions: 'Si · Fe · Ti · Ne' },
  },
  {
    key: 'INFJ', category: 'mbti', name: 'INFJ — Advocate', emoji: '🧠',
    summary: 'Rare, mission-driven, deeply private. INFJs read people uncannily well and quietly shape the rooms they\'re in. The trade-off: they spend a lot of energy on the world and need to retreat to refill.',
    strengths: ['Insightful', 'Empathetic', 'Idealistic', 'Quietly determined', 'Creative'],
    weaknesses: ['Burns out', 'Perfectionist', 'Conflict-averse', 'Holds others to high standards', 'Hard to know'],
    compatibility: ['ENTP — Debater', 'ENFP — Campaigner'],
    meta: { Group: 'Diplomat', Functions: 'Ni · Fe · Ti · Se' },
  },
  {
    key: 'INTJ', category: 'mbti', name: 'INTJ — Architect', emoji: '🧠',
    summary: 'Strategic systems thinkers who see the long arc and quietly engineer toward it. INTJs are the type that figures out the answer three steps before everyone else and waits.',
    strengths: ['Strategic', 'Independent', 'Decisive', 'Self-improving', 'High standards'],
    weaknesses: ['Aloof', 'Dismissive of inefficiency', 'Impatient with small talk', 'Stubborn', 'Emotionally unexpressive'],
    compatibility: ['ENFP — Campaigner', 'ENTP — Debater'],
    meta: { Group: 'Analyst', Functions: 'Ni · Te · Fi · Se' },
  },
  {
    key: 'ISTP', category: 'mbti', name: 'ISTP — Virtuoso', emoji: '🧠',
    summary: 'Hands-on, low-fuss, the type that fixes the thing instead of explaining the thing. ISTPs love mastery, mechanics, and being left alone to figure it out.',
    strengths: ['Practical', 'Calm under pressure', 'Independent', 'Adaptable', 'Excellent troubleshooters'],
    weaknesses: ['Detached', 'Conflict-averse (then sudden)', 'Bored by routine', 'Hard to read', 'Avoids long-term planning'],
    compatibility: ['ESFJ — Consul', 'ESTJ — Executive'],
    meta: { Group: 'Explorer', Functions: 'Ti · Se · Ni · Fe' },
  },
  {
    key: 'ISFP', category: 'mbti', name: 'ISFP — Adventurer', emoji: '🧠',
    summary: 'Quiet artists who live by feel. ISFPs are gentle, deeply individual, and surprisingly difficult to push around — they\'ll just walk away from what doesn\'t fit.',
    strengths: ['Artistic', 'Sensitive', 'Open-minded', 'Loyal', 'Lives in the present'],
    weaknesses: ['Conflict-averse', 'Easily stressed', 'Hard to plan with', 'Takes criticism hard', 'Loses self in others'],
    compatibility: ['ESFJ — Consul', 'ESTJ — Executive'],
    meta: { Group: 'Explorer', Functions: 'Fi · Se · Ni · Te' },
  },
  {
    key: 'INFP', category: 'mbti', name: 'INFP — Mediator', emoji: '🧠',
    summary: 'Idealists with rich inner worlds and uncompromising values. INFPs are gentle on the surface and immovable underneath when something matters.',
    strengths: ['Empathetic', 'Creative', 'Idealistic', 'Open-minded', 'Loyal to values'],
    weaknesses: ['Impractical', 'Too self-critical', 'Takes things personally', 'Avoids conflict', 'Easily overwhelmed'],
    compatibility: ['ENFJ — Protagonist', 'ENTJ — Commander'],
    meta: { Group: 'Diplomat', Functions: 'Fi · Ne · Si · Te' },
  },
  {
    key: 'INTP', category: 'mbti', name: 'INTP — Logician', emoji: '🧠',
    summary: 'Endlessly curious thinkers who would rather understand a system than change it. INTPs are the friends who notice the inconsistency in your argument and gently take it apart.',
    strengths: ['Analytical', 'Original', 'Open-minded', 'Inventive', 'Honest'],
    weaknesses: ['Detached', 'Procrastinator', 'Insensitive at times', 'Trouble committing', 'Disregards convention'],
    compatibility: ['ENTJ — Commander', 'ENFJ — Protagonist'],
    meta: { Group: 'Analyst', Functions: 'Ti · Ne · Si · Fe' },
  },
  {
    key: 'ESTP', category: 'mbti', name: 'ESTP — Entrepreneur', emoji: '🧠',
    summary: 'Bold, kinetic, here for the action. ESTPs read rooms fast, think on their feet, and are usually the ones laughing while everyone else panics.',
    strengths: ['Bold', 'Action-oriented', 'Sociable', 'Practical', 'Excellent in crises'],
    weaknesses: ['Impulsive', 'Impatient', 'Bored by theory', 'Risk-prone', 'Misses long-term picture'],
    compatibility: ['ISFJ — Defender', 'ISTJ — Logistician'],
    meta: { Group: 'Explorer', Functions: 'Se · Ti · Fe · Ni' },
  },
  {
    key: 'ESFP', category: 'mbti', name: 'ESFP — Entertainer', emoji: '🧠',
    summary: 'Warm, present, the human spark plug of any gathering. ESFPs live for connection, sensation, and genuinely enjoying the moment.',
    strengths: ['Charismatic', 'Generous', 'Energetic', 'Practical', 'Excellent people-readers'],
    weaknesses: ['Easily distracted', 'Sensitive to criticism', 'Avoids long-term planning', 'Conflict-averse', 'Lives in the moment to a fault'],
    compatibility: ['ISFJ — Defender', 'ISTJ — Logistician'],
    meta: { Group: 'Explorer', Functions: 'Se · Fi · Te · Ni' },
  },
  {
    key: 'ENFP', category: 'mbti', name: 'ENFP — Campaigner', emoji: '🧠',
    summary: 'Enthusiastic, idea-rich, allergic to boredom. ENFPs see possibility everywhere and pull people into their excitement — though they need depth as much as they need novelty.',
    strengths: ['Enthusiastic', 'Empathetic', 'Creative', 'Excellent communicators', 'Curious'],
    weaknesses: ['Easily distracted', 'Overthinks emotionally', 'Stress-prone', 'Trouble finishing', 'People-pleaser'],
    compatibility: ['INTJ — Architect', 'INFJ — Advocate'],
    meta: { Group: 'Diplomat', Functions: 'Ne · Fi · Te · Si' },
  },
  {
    key: 'ENTP', category: 'mbti', name: 'ENTP — Debater', emoji: '🧠',
    summary: 'Quick, irreverent, never not arguing. ENTPs are the friends who make you sharper just by sparring with you — they think out loud and reserve the right to change positions.',
    strengths: ['Quick-thinking', 'Original', 'Charismatic', 'Versatile', 'Loves a good argument'],
    weaknesses: ['Argumentative', 'Insensitive at times', 'Trouble with routine', 'Distracted', 'Plays devil\'s advocate too far'],
    compatibility: ['INFJ — Advocate', 'INTJ — Architect'],
    meta: { Group: 'Analyst', Functions: 'Ne · Ti · Fe · Si' },
  },
  {
    key: 'ESTJ', category: 'mbti', name: 'ESTJ — Executive', emoji: '🧠',
    summary: 'Organized, traditional, born to run things. ESTJs are the type who already made the agenda, distributed it, and are wondering why no one read it.',
    strengths: ['Organized', 'Decisive', 'Loyal', 'Honest', 'Strong willpower'],
    weaknesses: ['Inflexible', 'Judgmental', 'Stubborn', 'Uncomfortable with emotions', 'Workaholic'],
    compatibility: ['ISTP — Virtuoso', 'ISFP — Adventurer'],
    meta: { Group: 'Sentinel', Functions: 'Te · Si · Ne · Fi' },
  },
  {
    key: 'ESFJ', category: 'mbti', name: 'ESFJ — Consul', emoji: '🧠',
    summary: 'The classic host, organizer, and emotional thermostat of any group. ESFJs love their people loud and make sure everyone is fed, included, and on time.',
    strengths: ['Caring', 'Loyal', 'Organized', 'Sociable', 'Practical helpers'],
    weaknesses: ['Approval-seeking', 'Conflict-averse', 'Sensitive to criticism', 'Inflexible at times', 'Selfless to a fault'],
    compatibility: ['ISTP — Virtuoso', 'ISFP — Adventurer'],
    meta: { Group: 'Sentinel', Functions: 'Fe · Si · Ne · Ti' },
  },
  {
    key: 'ENFJ', category: 'mbti', name: 'ENFJ — Protagonist', emoji: '🧠',
    summary: 'Charismatic, mission-driven mentors who make people believe in themselves. ENFJs put a lot of themselves into helping others grow — and need to remember to do the same for themselves.',
    strengths: ['Charismatic', 'Empathetic', 'Inspiring', 'Reliable', 'Natural mentors'],
    weaknesses: ['People-pleaser', 'Overly idealistic', 'Sensitive to criticism', 'Self-neglecting', 'Emotionally porous'],
    compatibility: ['INFP — Mediator', 'INTP — Logician'],
    meta: { Group: 'Diplomat', Functions: 'Fe · Ni · Se · Ti' },
  },
  {
    key: 'ENTJ', category: 'mbti', name: 'ENTJ — Commander', emoji: '🧠',
    summary: 'Strategic, results-driven, the type who walks into a problem and immediately starts solving. ENTJs build empires (or at least teams that feel like one) and don\'t suffer fools.',
    strengths: ['Decisive', 'Strategic', 'Confident', 'Charismatic', 'Strong-willed'],
    weaknesses: ['Impatient', 'Dominating', 'Cold to feelings', 'Stubborn', 'Intolerant of inefficiency'],
    compatibility: ['INFP — Mediator', 'INTP — Logician'],
    meta: { Group: 'Analyst', Functions: 'Te · Ni · Se · Fi' },
  },
]

// ── Public catalog + lookup helpers ─────────────────────────────────────────

export const SIGN_CATEGORIES: Array<{ key: SignCategory; label: string; emoji: string }> = [
  { key: 'zodiac',        label: 'Zodiac',         emoji: '♈' },
  { key: 'chineseZodiac', label: 'Chinese',        emoji: '🐉' },
  { key: 'element',       label: 'Element',        emoji: '🪨' },
  { key: 'birthstone',    label: 'Birthstone',     emoji: '💎' },
  { key: 'mbti',          label: 'MBTI',           emoji: '🧠' },
]

const ALL_SIGNS: Sign[] = [
  ...ZODIAC,
  ...CHINESE_ZODIAC,
  ...ELEMENTS,
  ...BIRTHSTONES,
  ...MBTI_TYPES,
]

const BY_CATEGORY: Record<SignCategory, Sign[]> = {
  zodiac: ZODIAC,
  chineseZodiac: CHINESE_ZODIAC,
  element: ELEMENTS,
  birthstone: BIRTHSTONES,
  mbti: MBTI_TYPES,
}

export function signsByCategory(category: SignCategory): Sign[] {
  return BY_CATEGORY[category]
}

/** Look up a sign by category + raw display value (e.g. "Aries", "Rat", "INTJ"). */
export function getSign(category: SignCategory, value: string): Sign | null {
  const target = category === 'mbti' ? value.toUpperCase() : value.toLowerCase()
  for (const s of BY_CATEGORY[category]) {
    if (s.key === target) return s
  }
  return null
}

export function allSigns(): Sign[] {
  return ALL_SIGNS
}

/** Convenience: type-safe MBTI lookup. */
export function getMbtiSign(code: MBTI): Sign | null {
  return getSign('mbti', code)
}
