// lib/commands/config.js
const { loadState, saveState } = require('../state'); // Assuming state.js exports these
const chalk = require('chalk');

module.exports = {
  command: 'config <action> [key] [value]',
  describe: 'View or set configuration options (e.g., checkRemoteStatus true/false)',
  builder: (yargs) => {
    yargs
      .positional('action', {
        describe: 'Action to perform',
        type: 'string',
        choices: ['set', 'get', 'list'], // Add list/get actions
      })
      .positional('key', {
        describe: 'The configuration key to set/get (required for set/get)',
        type: 'string',
        // Add more valid keys here as config grows
        choices: ['checkRemoteStatus'],
      })
      .positional('value', {
        describe: 'The value to set the key to (required for set)',
        // Type validation will happen in handler based on key
      })
      .check((argv) => {
         // Add validation based on action
         if (argv.action === 'set' && (typeof argv.key === 'undefined' || typeof argv.value === 'undefined')) {
             throw new Error("Both <key> and <value> are required for 'set' action.");
         }
         if (argv.action === 'get' && typeof argv.key === 'undefined') {
             throw new Error("<key> is required for 'get' action.");
         }
         return true;
       });
  },
  handler: async (argv) => {
    const state = await loadState();
    // Ensure the config object exists in the state
    if (!state.config) state.config = {};

    switch (argv.action) {
      case 'set':
        const key = argv.key;
        let value = argv.value;

        // --- Add type validation/conversion based on key ---
        if (key === 'checkRemoteStatus') {
          // Convert string 'true'/'false' to boolean
          if (typeof value === 'string') {
             if (value.toLowerCase() === 'true') value = true;
             else if (value.toLowerCase() === 'false') value = false;
          }
          // Validate type
          if (typeof value !== 'boolean') {
            console.error(chalk.red(`Invalid value for ${key}. Expected true or false.`));
            return;
          }
          state.config[key] = value;
          await saveState(state);
          console.log(chalk.green(`Configuration updated: ${chalk.bold(key)} set to ${chalk.bold(value)}`));
        } else {
          // Handle other keys if added later
          console.error(chalk.red(`Unknown configuration key: ${key}`));
        }
        break; // End case 'set'

      case 'get':
        if (state.config.hasOwnProperty(argv.key)) {
           console.log(`${chalk.bold(argv.key)}: ${chalk.cyan(state.config[argv.key])}`);
        } else {
           console.log(`${chalk.bold(argv.key)} is not set (or using default).`);
           // Optionally show default value here
           if (argv.key === 'checkRemoteStatus') console.log(chalk.dim(`(Default is false)`))
        }
        break; // End case 'get'

      case 'list':
        console.log(chalk.cyan('--- Git Pet Configuration ---'));
        if (Object.keys(state.config).length === 0) {
            console.log(chalk.grey('(No specific configuration set)'));
        } else {
             for (const k in state.config) {
                 console.log(`${chalk.bold(k)}: ${chalk.cyan(state.config[k])}`);
             }
        }
        // Optionally list default values for known keys not present
        if (typeof state.config.checkRemoteStatus === 'undefined') {
            console.log(chalk.dim(`checkRemoteStatus: false (Default)`));
        }
        break; // End case 'list'
    }
  },
};