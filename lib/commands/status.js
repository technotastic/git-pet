// lib/commands/status.js (Revised handler)
const { loadState, saveState } = require('../state');
const { determineCurrentMood } = require('../pet');
const { getPetArt, getMoodFrameCount } = require('../art'); // Import new function
const chalk = require('chalk');
const moment = require('moment'); // Make sure moment is required

module.exports = {
  command: 'status',
  aliases: ['$0'], // Default command
  describe: 'Check the status and mood of your Git Pet',
  handler: async (argv) => {
    console.log(chalk.cyan('Checking Git Pet status...'));

    const state = await loadState();
    const pet = state.globalPet;
    const previousMood = pet.mood; // Store mood before determination

    // Determine current mood and update base stats (like hunger decay)
    const currentMood = await determineCurrentMood(state);

    // --- Animation Frame Logic ---
    let currentFrame = pet.animationFrame || 0;
    const frameCount = getMoodFrameCount(currentMood);

    if (currentMood !== previousMood) {
        // Mood changed, reset animation frame
        currentFrame = 0;
        console.log(chalk.dim(`Mood changed from ${previousMood} to ${currentMood}.`)); // Debug log
    } else if (frameCount > 1) {
        // Mood is the same, advance frame if it's animated
        // Optionally: only advance if enough time passed since last status check
        const secondsSinceLastUpdate = moment().diff(moment(pet.lastStatusUpdate), 'seconds');
        // Advance frame roughly every second (adjust multiplier as needed)
        if (secondsSinceLastUpdate > 0.5) { // Avoid advancing too quickly if status run rapidly
             currentFrame = (currentFrame + 1) % frameCount;
             // console.log(chalk.dim(`Advancing frame to ${currentFrame}`)); // Debug log
        }
    }
    // --- End Animation Frame Logic ---

    console.log(getPetArt(currentMood, pet.name, currentFrame)); // Pass frame index

    // Display some stats
    console.log(chalk.magenta(`Mood: ${currentMood}`));
    console.log(chalk.yellow(`Hunger: ${pet.hunger}/100`));
    console.log(chalk.green(`Happiness: ${pet.happiness}/100`));

    // Update state before saving
    pet.animationFrame = currentFrame;
    pet.lastStatusUpdate = moment().toISOString(); // Record time of this status check

    // Save the potentially updated state
    await saveState(state);
  },
};