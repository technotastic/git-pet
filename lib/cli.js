// lib/cli.js
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');

// --- Import ALL command modules ---
const statusCmd = require('./commands/status');
const feedCmd = require('./commands/feed');
const playCmd = require('./commands/play');
const nameCmd = require('./commands/name');
const hooksCmd = require('./commands/hooks');
const configCmd = require('./commands/config'); // <-- Import the new config command

// --- Configure Yargs ---
yargs(hideBin(process.argv))
  // Register Commands
  .command(statusCmd)
  .command(feedCmd)
  .command(playCmd)
  .command(nameCmd)
  .command(hooksCmd)
  .command(configCmd) // <-- Register the new config command

  // General Options / Configuration
  .demandCommand(1, chalk.yellow('Tip: Use `git-pet status` to see your pet, or `--help` for commands.')) // Nicer default message
  .recommendCommands() // Suggest commands on typo
  .help()
  .alias('h', 'help')
  .version() // Reads version from package.json
  .alias('v', 'version')
  .strict() // Show help if unknown command/option is used
  .wrap(yargs().terminalWidth()) // Wrap help output nicely
  .epilogue(`For more information, visit ${chalk.cyan('https://github.com/YourUsername/git-pet')}`) // Update URL
  .argv; // Parse arguments and execute the corresponding command handler