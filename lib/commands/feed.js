// lib/commands/feed.js (Example)
const { loadState, saveState } = require('../state');
const { updatePetStats } = require('../pet'); // Use this if needed
const { getPetArt } = require('../art');
const chalk = require('chalk');
const moment = require('moment');

module.exports = {
  command: 'feed',
  describe: 'Feed your Git Pet',
  handler: async (argv) => {
    const state = await loadState();
    const pet = state.globalPet;

    // Apply decay first to get current state
    updatePetStats(pet);

    // Feed the pet
    pet.hunger = Math.min(100, pet.hunger + 40); // Increase hunger (less hungry)
    pet.happiness = Math.min(100, pet.happiness + 10); // Small happiness boost
    pet.lastFed = moment().toISOString();
    pet.mood = 'happy'; // Feeding makes it happy short term

    console.log(chalk.green(`${pet.name} enjoys the virtual snack!`));
    console.log(getPetArt(pet.mood, pet.name));

    await saveState(state);
  },
};

// --- lib/commands/play.js (Example) ---
// Similar structure: update stats, increase happiness more, maybe decrease hunger slightly, update lastPlayed, set mood to happy, save.

// --- lib/commands/name.js (Example) ---
// Uses yargs to get the name: command: 'name <petname>'
// Updates state.globalPet.name, saves state.