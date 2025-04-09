// lib/commands/play.js
const { loadState, saveState } = require('../state');
const { updatePetStats } = require('../pet'); // May not be strictly needed here if mood is set directly
const { getPetArt } = require('../art');
const chalk = require('chalk');
const moment = require('moment');

module.exports = {
  command: 'play',
  describe: 'Play with your Git Pet to boost happiness',
  handler: async (argv) => {
    const state = await loadState();
    const pet = state.globalPet;

    // Optional: Apply decay first to see effect relative to current state
    // updatePetStats(pet);

    // Play with the pet
    pet.happiness = Math.min(100, pet.happiness + 35); // Big happiness boost!
    pet.hunger = Math.max(0, pet.hunger - 5); // Playing makes them slightly hungry
    pet.lastPlayed = moment().toISOString();
    pet.mood = 'happy'; // Playing definitely makes it happy

    console.log(chalk.cyanBright(`${pet.name} looks happy after playing!`));
    console.log(getPetArt(pet.mood, pet.name));

    // Display updated stats
    console.log(chalk.yellow(`Hunger: ${pet.hunger}/100`));
    console.log(chalk.green(`Happiness: ${pet.happiness}/100`));

    await saveState(state);
  },
};