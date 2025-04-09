// lib/art.js (Revised Concept)
const chalk = require('chalk');

// --- Base Structure (Maybe make simpler?) ---
const basePetLines = [
  '  .--.  ',
  ' / .. \\ ', // Eyes line (index 1)
  ' \\ ## / ', // Mouth/Nose line (index 2)
  ' /\\__/\\ ',
  '(_\\** /_) ', // Body/Paws line (index 4)
  '  "  "  '
];
const eyesIndex = 1;
const mouthIndex = 2;
const bodyIndex = 4; // Example if paws change

// --- Mood Definitions with Frames ---
const moods = {
  // Simple static mood
  neutral: {
    color: chalk.white,
    frames: [ // Only one frame needed
      { eyes: ' .. ', mouth: ' ## ' }
    ],
    extras: [],
  },

  // Animated mood
  happy: {
    color: chalk.greenBright,
    frames: [
      { eyes: ' ^.^', mouth: ' \\_/ ' }, // Frame 1: Happy eyes, smile
      { eyes: ' ^.^', mouth: ' \\_/ ', body: '(**)' }, // Frame 1 variation: Wiggle paws?
      { eyes: ' ^u^', mouth: ' \\_/ ' }, // Frame 2: Even happier eyes
    ],
    extras: ['✨'], // Add optional static extras
    interval: 500 // Suggested ms between frames (for future advanced use)
  },

  bored: {
      color: chalk.gray,
      frames: [
          { eyes: ' -.-', mouth: ' -- '},         // Frame 1: Sleepy
          { eyes: ' -.-', mouth: ' -- ', extras: [' Z'] }, // Frame 2: Z
          { eyes: ' o.-', mouth: ' -- '},         // Frame 3: One eye open briefly
          { eyes: ' -.-', mouth: ' -- ', extras: [' Zz'] },// Frame 4: Zz
      ],
      extras: [],
      interval: 800
  },

  stressed: {
    color: chalk.yellow,
    frames: [
      { eyes: ' O.O', mouth: ' ww ' },        // Frame 1: Wide eyes
      { eyes: ' O.O', mouth: ' ww ', extras: ['⚡️'] }, // Frame 2: Add sweat/zap
      { eyes: ' >.<', mouth: ' MmM' },        // Frame 3: Scrunched eyes
      { eyes: ' >.<', mouth: ' MmM', extras: ['!!'] }, // Frame 4: Emphasis
    ],
    extras: [],
    interval: 400
  },

  thinking: { // New mood example
      color: chalk.cyan,
      frames: [
          { eyes: ' .o.', mouth: ' __ '},
          { eyes: ' o.o', mouth: ' __ '},
          { eyes: ' o.o', mouth: ' __ ', extras: ['...'] }
      ],
      extras: [],
      interval: 700
  },

   sad: { // Updated Sad
       color: chalk.blue,
       frames: [
           { eyes: ' v.v', mouth: ' ~~ ' }, // Downturned eyes
           { eyes: ' T.T', mouth: ' ~~ ' }, // Crying eyes
       ],
       extras: ['💧'],
       interval: 1000
   }

  // Add more moods: hungry, sick, confused, celebrating, pushing, pulling etc.
};

// --- Function to Generate Art ---
function getPetArt(moodKey = 'neutral', name = 'Git Pet', frameIndex = 0) {
  const moodData = moods[moodKey] || moods.neutral;
  const safeFrameIndex = frameIndex % moodData.frames.length; // Cycle through frames
  const frame = moodData.frames[safeFrameIndex];

  let petArt = [...basePetLines]; // Start with base

  // Apply frame modifications
  if (frame.eyes) petArt[eyesIndex] = petArt[eyesIndex].replace(' .. ', frame.eyes);
  if (frame.mouth) petArt[mouthIndex] = petArt[mouthIndex].replace(' ## ', frame.mouth);
  if (frame.body) petArt[bodyIndex] = petArt[bodyIndex].replace('\\** /', frame.body);
  // Add more replaceable parts if needed

  // Apply color
  petArt = petArt.map(line => moodData.color(line));

  // Add title and extras
  const title = chalk.bold(`--- ${name} (${moodKey}) ---`);
  const currentExtras = [...(moodData.extras || []), ...(frame.extras || [])]; // Combine mood and frame extras
  const extrasLines = currentExtras.map(e => moodData.color(e));


  return [title, ...petArt, ...extrasLines].join('\n');
}

function getMoodFrameCount(moodKey = 'neutral') {
    return (moods[moodKey] || moods.neutral).frames.length;
}

module.exports = { getPetArt, getMoodFrameCount }; // Export frame count getter