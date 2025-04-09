// lib/commands/name.js
const { loadState, saveState } = require('../state');
const chalk = require('chalk');

module.exports = {
  // Define command structure to accept a name argument
  command: 'name <petname>',
  describe: 'Give your Git Pet a name',
  builder: (yargs) => {
    // Define the positional argument 'petname'
    yargs.positional('petname', {
      describe: 'The new name for your Git Pet',
      type: 'string',
    });
  },
  handler: async (argv) => {
    // argv.petname will contain the name provided by the user
    const newName = argv.petname;

    if (!newName || newName.length > 50) { // Basic validation
        console.error(chalk.red('Please provide a valid name (1-50 characters).'));
        return; // Exit if name is invalid
    }

    const state = await loadState();
    const oldName = state.globalPet.name;
    state.globalPet.name = newName; // Update the name in the state

    await saveState(state);

    console.log(chalk.green(`You renamed '${oldName}' to '${chalk.bold(newName)}'!`));
  },
};