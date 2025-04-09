// lib/commands/status.js (Corrected to use moodInfo.mood)
const { loadState, saveState } = require('../state');
const { determineCurrentMood } = require('../pet'); // This now returns { mood, reason }
const { getPetArt, getMoodFrameCount } = require('../art');
const chalk = require('chalk');
const moment = require('moment');

module.exports = {
  command: 'status',
  aliases: ['$0'], // Default command
  describe: 'Check the status and mood of your Git Pet',
  handler: async (argv) => {
    // console.log(chalk.cyan('Checking Git Pet status...')); // Optional: Can be removed for cleaner output

    const state = await loadState();
    const pet = state.globalPet;
    const previousMood = pet.mood; // Store mood before determination

    // Determine current mood object { mood, reason }
    // This also runs updatePetStats internally
    const moodInfo = await determineCurrentMood(state);
    const currentMood = moodInfo.mood; // <-- Extract the mood string

    // --- Animation Frame Logic ---
    let currentFrame = pet.animationFrame || 0;
    const frameCount = getMoodFrameCount(currentMood); // Use extracted mood string

    if (currentMood !== previousMood) {
        currentFrame = 0;
        // console.log(chalk.dim(`Mood changed from ${previousMood} to ${currentMood}. Resetting animation.`));
    } else if (frameCount > 1) {
        const secondsSinceLastUpdate = moment().diff(moment(pet.lastStatusUpdate), 'seconds');
        if (secondsSinceLastUpdate > 0.5) {
             currentFrame = (currentFrame + 1) % frameCount;
             // console.log(chalk.dim(`Advancing frame to ${currentFrame}`));
        }
    }
    // --- End Animation Frame Logic ---

    // --- Use extracted mood string for art and logging ---
    console.log(getPetArt(currentMood, pet.name, currentFrame));
    console.log(chalk.magenta(`Mood: ${currentMood}`)); // <-- Use extracted mood string
    console.log(chalk.yellow(`Hunger: ${pet.hunger}/100`));
    console.log(chalk.green(`Happiness: ${pet.happiness}/100`));

    // Update state before saving
    pet.animationFrame = currentFrame;
    pet.lastStatusUpdate = moment().toISOString();
    // Note: pet.mood was already updated inside determineCurrentMood

    // Save the potentially updated state
    await saveState(state);
  },
};