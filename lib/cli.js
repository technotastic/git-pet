// lib/cli.js
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');

// Import command modules
const statusCmd = require('./commands/status');
const feedCmd = require('./commands/feed');
const playCmd = require('./commands/play'); // Assuming you created these
const nameCmd = require('./commands/name');   // Assuming you created these
const hooksCmd = require('./commands/hooks');

yargs(hideBin(process.argv))
  // Register Commands
  .command(statusCmd)
  .command(feedCmd)
  .command(playCmd)
  .command(nameCmd)
  .command(hooksCmd)

  // General Options / Config
  .demandCommand(1, chalk.red('You need to provide a command! Use --help to see options.'))
  .help()
  .alias('h', 'help')
  .version() // Reads version from package.json
  .alias('v', 'version')
  .strict() // Show help if unknown command/option is used
  .epilogue(`For more information, check ${chalk.cyan('https://github.com/YourUsername/git-pet')}`) // Update URL
  .argv; // Parse arguments and run handler