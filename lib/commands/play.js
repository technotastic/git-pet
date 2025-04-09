// lib/commands/play.js
const { loadState, saveState } = require('../state');
const { updatePetStats } = require('../pet'); // Keep available if needed elsewhere
const { getPetArt } = require('../art');
const { determineCurrentMood } = require('../pet'); // Import if needed for Strategy 4 check
const chalk = require('chalk');
const moment = require('moment');

// Use constants defined in pet.js if preferred, or redefine here
const PLAY_HAPPINESS_GAIN = 20; // Matched from pet.js
const PLAY_HUNGER_LOSS = 8;     // Matched from pet.js

module.exports = {
  command: 'play',
  describe: 'Play with your Git Pet to boost happiness',
  handler: async (argv) => {
    const state = await loadState();
    const pet = state.globalPet;

    // Optional: Apply decay first
    // updatePetStats(pet);

    // Play with the pet - Use defined constants
    pet.happiness = Math.min(100, pet.happiness + PLAY_HAPPINESS_GAIN);
    pet.hunger = Math.max(0, pet.hunger - PLAY_HUNGER_LOSS); // Playing makes them hungry
    pet.lastPlayed = moment().toISOString();

    /* --- Optional Strategy 4: Decouple Mood ---
       To enable: Comment out the following line:
    */
    // pet.mood = 'happy'; // <-- Comment this out to decouple immediate mood change

    /* --- End Optional Strategy 4 --- */

    console.log(chalk.cyanBright(`${pet.name} looks happy after playing!`));

    // --- Mood Determination after Action ---
    // Similar logic as in feed.js - display based on pet.mood state after interaction.
    // Recalculate explicitly if the direct mood set above is commented out.
    let moodToShow = pet.mood;
    // If decoupling mood, uncomment the next line:
    // moodToShow = await determineCurrentMood(state); // Recalculate mood NOW

    console.log(getPetArt(moodToShow, pet.name));

    // Display updated stats
    console.log(chalk.yellow(`Hunger: ${pet.hunger}/100`));
    console.log(chalk.green(`Happiness: ${pet.happiness}/100`));

    // Save the state including updated stats and potentially updated mood
    await saveState(state);
  },
};