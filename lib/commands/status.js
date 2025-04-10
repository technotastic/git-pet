// lib/commands/status.js (Displays Level/EXP)
const { loadState, saveState, getExpToNextLevel } = require('../state'); // Import helper
const { determineCurrentMood } = require('../pet');
const { getPetArt, getMoodFrameCount } = require('../art');
const chalk = require('chalk');
const moment = require('moment');

module.exports = {
  command: 'status',
  aliases: ['$0'], // Default command
  describe: 'Check the status and mood of your Git Pet',
  handler: async (argv) => {
    const state = await loadState();
    const pet = state.globalPet;
    const previousMood = pet.mood; // Store mood before determination

    // Determine current mood object { mood, reason }
    // This also runs updatePetStats internally now
    const moodInfo = await determineCurrentMood(state);
    const currentMood = moodInfo.mood; // Extract the mood string

    // --- Animation Frame Logic ---
    let currentFrame = pet.animationFrame || 0;
    const frameCount = getMoodFrameCount(currentMood);

    if (currentMood !== previousMood) {
        currentFrame = 0; // Reset animation on mood change
    } else if (frameCount > 1) {
        // Advance frame if enough time has passed since last status check
        const secondsSinceLastUpdate = moment().diff(moment(pet.lastStatusUpdate), 'seconds');
        // Adjust timing sensitivity as needed (e.g., 0.5 seconds)
        if (secondsSinceLastUpdate > 0.5) {
             currentFrame = (currentFrame + 1) % frameCount;
        }
    }
    // --- End Animation Frame Logic ---

    // Display Pet Art and Core Stats
    console.log(getPetArt(currentMood, pet.name, currentFrame));
    console.log(chalk.magenta(`Mood: ${currentMood}`) + chalk.dim(` (${moodInfo.reason})`)); // Show reason dimmed
    console.log(chalk.yellow(`Hunger: ${pet.hunger}/100`));
    console.log(chalk.green(`Happiness: ${pet.happiness}/100`));

    // --- Add Level/EXP Display ---
    const expToNext = getExpToNextLevel(pet.level);
    const progressBarLength = 20; // Width of the EXP bar
    const progress = Math.min(1, pet.experience / expToNext); // Ensure progress doesn't exceed 1
    const filledLength = Math.round(progressBarLength * progress);
    const emptyLength = progressBarLength - filledLength;
    const progressBar = `[${chalk.blueBright('='.repeat(filledLength))}${chalk.grey('-'.repeat(emptyLength))}]`;

    console.log(chalk.blueBright(`Level: ${pet.level}`));
    console.log(chalk.blueBright(`EXP:   ${pet.experience} / ${expToNext} ${progressBar}`));
    // --- End Level/EXP Display ---

    // Update state properties modified by this command
    pet.animationFrame = currentFrame;
    pet.lastStatusUpdate = moment().toISOString();
    // Note: pet.mood, pet.hunger, pet.happiness etc. were potentially updated inside determineCurrentMood

    // Save the potentially updated state
    await saveState(state);
  },
};