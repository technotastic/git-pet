// lib/commands/feed.js
const { loadState, saveState } = require('../state');
const { updatePetStats } = require('../pet'); // Keep updatePetStats available if needed elsewhere
const { getPetArt } = require('../art');
const { determineCurrentMood } = require('../pet'); // Import if needed for Strategy 4 check
const chalk = require('chalk');
const moment = require('moment');

// Use constants defined in pet.js if preferred, or redefine here for clarity
const FEED_HUNGER_GAIN = 25; // Matched from pet.js
const FEED_HAPPINESS_GAIN = 5;  // Matched from pet.js

module.exports = {
  command: 'feed',
  describe: 'Feed your Git Pet',
  handler: async (argv) => {
    const state = await loadState();
    const pet = state.globalPet;

    // Optional: Apply decay first to get current state before applying gains
    // updatePetStats(pet);

    // Feed the pet - Use defined constants
    pet.hunger = Math.min(100, pet.hunger + FEED_HUNGER_GAIN);
    pet.happiness = Math.min(100, pet.happiness + FEED_HAPPINESS_GAIN);
    pet.lastFed = moment().toISOString();

    /* --- Optional Strategy 4: Decouple Mood ---
       If you enable this, the pet's mood won't instantly become "happy" after feeding.
       Instead, the *next* `git pet status` command will evaluate the new stats
       (higher hunger/happiness) and determine the mood based on the main logic.
       This can feel more realistic but less immediately rewarding.

       To enable: Comment out the following line:
    */
    // pet.mood = 'happy'; // <-- Comment this out to decouple immediate mood change

    /* --- End Optional Strategy 4 --- */


    console.log(chalk.green(`${pet.name} enjoys the virtual snack!`));

    // --- Mood Determination after Action ---
    // If you *didn't* decouple mood above, pet.mood might be manually set to 'happy'.
    // If you *did* decouple, you might want to run determineCurrentMood here to update
    // the state object *before* saving and display the calculated mood.
    // let moodToShow = pet.mood; // Use potentially manually set mood
    // Alternatively, always recalculate:
    // let moodToShow = await determineCurrentMood(state); // This recalculates based on new stats

    // For now, we'll display based on pet.mood as it exists after the interaction logic above.
    // If not decoupled, it shows 'happy'. If decoupled, it shows the PREVIOUS mood
    // until the next status check OR until determineCurrentMood is called here.
    let moodToShow = pet.mood;

    // Let's explicitly recalculate mood right after the action if decoupling is intended conceptually
    // If the line `pet.mood = 'happy'` is commented out above, uncomment the next line:
    // moodToShow = await determineCurrentMood(state); // Recalculate mood NOW

    console.log(getPetArt(moodToShow, pet.name));

    // Display updated stats
    console.log(chalk.yellow(`Hunger: ${pet.hunger}/100`));
    console.log(chalk.green(`Happiness: ${pet.happiness}/100`));

    // Save the state including updated stats and potentially updated mood
    await saveState(state);
  },
};