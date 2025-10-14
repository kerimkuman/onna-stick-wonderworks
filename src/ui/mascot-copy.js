/**
 * MASCOT BARD COPY SETS
 * Pratchett-adjacent, dark-arts tone: wry, witty, short, crisp
 * No spam, no cringe, just tasteful nudges
 */

// POI (Point of Interest) tips - triggered when user hovers/focuses specific elements
export const POI_TIPS = {
  doorway: "See that doorway? Perfectly safe. Well, statistically acceptable.",
  'faq-link': "Our FAQ knows answers and questions. Very nosy.",
  carousel: "Wheel over the gallery—slides obey sideways gravity here."
};

export const IDLE_COPY = {
  HOME: [
    { text: "Welcome to Wonderworks. Mind the enchantments; they mind you back." },
    { text: "Things here are perfectly safe. By which we mean: statistically comforting." },
    { text: "If it glows, it's either important or hungry. Possibly both." },
    { text: "We sell solutions. Side-effects included at no extra charge." },
    { text: "Curiosity killed the cat. Satisfaction filed a robust appeal." },
    { text: "See that doorway? Perfectly safe. Well, statistically acceptable.", cta: { id:'doorway', label:'Enter, boldly' } },
    { text: "Our FAQ knows answers and questions. Very nosy.", cta: { id:'faq', label:'Show me' } },
    { text: "Wheel over the gallery—slides obey sideways gravity here." },
    { text: "Music too chatty? The mute sigil lives up top, trying not to look obvious.", cta: { id:'mute', label:'Found it' } }
  ],

  WONDERWORKS: [
    { text: "The cauldron hums when you're here. Leave, and it sulks until you return." },
    { text: "If you hear whispering, that's ambience. If it answers—still ambience." },
    { text: "Witches recommend responsible browsing. We recommend it faster." },
    { text: "Doors open both ways. Fewer complaints that way.", cta: { id:'doorway', label:'Step through' } }
  ],

  FAQ: [
    { text: "Our FAQ knows answers and questions. Very nosy." },
    { text: "Ask something sensible. We'll dress it in a robe and give it a staff." },
    { text: "Try not to feed the terminal after midnight. It gets ideas." },
    { text: "Press G for a little recreational chaos.", cta: { id:'game', label:'Summon game' } }
  ],

  CAROUSEL: [
    { text: "Slides obey sideways gravity. Give the wheel a nudge." },
    { text: "One at a time. Reality appreciates queues." },
    { text: "This one bites. Gently.", cta: { id:'carousel', label:'Next wonder' } }
  ],

  GAME: [
    { text: "If the sprites look at you, don't blink. They love initiative." },
    { text: "Bullets are a suggestion. Ice cream is a calling." }
  ],

  CONTACT: [
    { text: "We do miracles. Receipts available upon request." },
    { text: "Tell us your impossible. We'll quote you something eminently unreasonable." },
    { text: "Contracts in ink, blood optional. Kidding. Mostly.", cta: { id:'contact', label:'Enquire' } }
  ]
};
