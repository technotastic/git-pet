// lib/art.js
const chalk = require('chalk');

const basePet = [
  '  ____',
  ' /_ \\\\',
  ' L L \\\\',
  '(\\_/) \\\\____',
  '(=\'.\'=)______)',
  '(")_(")   U'
];

const moods = {
  happy: {
    color: chalk.greenBright,
    eyes: "= '.' =",
    mouth: '  )_(")', // Subtle smile change maybe?
    extras: ['*｡✲*`¯\\*.｡☆｡*'], // Sparkles!
  },
  neutral: {
    color: chalk.white,
    eyes: "= '.' =",
    mouth: ' ")_(")',
    extras: [],
  },
  bored: {
    color: chalk.gray,
    eyes: "– . –", // Sleepy eyes
    mouth: ' ")_(")',
    extras: [' Zzz...'],
  },
  stressed: {
    color: chalk.yellow,
    eyes: "o . o", // Wide eyes
    mouth: ' ")_(")',
    extras: ['⚡️', ' <(Sweating!)'],
  },
  sad: {
    color: chalk.blue,
    eyes: "> . <", // Sad eyes
    mouth: ' ". ." ', // Frown? Hard in ASCII!
    extras: ['💧'],
  },
  // Add more moods: hungry, sick (conflicts?), etc.
};

function getPetArt(moodKey = 'neutral', name = 'Git Pet') {
  const mood = moods[moodKey] || moods.neutral;
  let petArt = [...basePet]; // Copy base art

  // Modify eyes
  petArt[4] = petArt[4].replace(/=\'.\'=/, mood.eyes);
  // Modify mouth area
  petArt[5] = petArt[5].replace(/\"\)_\(\"\)/, mood.mouth);

  // Apply color
  petArt = petArt.map(line => mood.color(line));

  // Add title and extras
  const title = chalk.bold(`--- ${name} (${moodKey}) ---`);
  const extras = mood.extras.map(e => mood.color(e));

  return [title, ...petArt, ...extras].join('\n');
}

module.exports = { getPetArt };