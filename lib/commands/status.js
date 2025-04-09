// lib/commands/status.js
const { loadState, saveState } = require('../state');
const { determineCurrentMood } = require('../pet');
const { getPetArt } = require('../art');
const chalk = require('chalk');

module.exports = {
  command: 'status',
  aliases: ['$0'], // Default command
  describe: 'Check the status and mood of your Git Pet',
  handler: async (argv) => {
    console.log(chalk.cyan('Checking Git Pet status...'));

    const state = await loadState();
    const currentMood = await determineCurrentMood(state); // This updates the mood in the state object too
    const pet = state.globalPet;

    console.log(getPetArt(currentMood, pet.name));

    // Display some stats
    console.log(chalk.magenta(`Mood: ${currentMood}`));
    console.log(chalk.yellow(`Hunger: ${pet.hunger}/100`));
    console.log(chalk.green(`Happiness: ${pet.happiness}/100`));
    // console.log(chalk.dim(`Last Fed: ${moment(pet.lastFed).fromNow()}`)); // moment is useful here
    // console.log(chalk.dim(`Last Played: ${moment(pet.lastPlayed).fromNow()}`));

    // Save the potentially updated state (hunger/happiness decay, mood change)
    await saveState(state);
  },
};