// lib/cli.js (Complete with summary command registered)
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');

// --- Import ALL command modules ---
const statusCmd = require('./commands/status');
const feedCmd = require('./commands/feed');
const playCmd = require('./commands/play');
const nameCmd = require('./commands/name');
const hooksCmd = require('./commands/hooks');
const configCmd = require('./commands/config');
const summaryCmd = require('./commands/summary'); // <-- Import the new summary command

// --- Configure Yargs ---
yargs(hideBin(process.argv))
  // Register Commands
  .command(statusCmd)
  .command(feedCmd)
  .command(playCmd)
  .command(nameCmd)
  .command(hooksCmd)
  .command(configCmd)
  .command(summaryCmd) // <-- Register the new summary command

  // General Options / Configuration
  .demandCommand(1, chalk.yellow('Tip: Use `git-pet status` to see your pet, or `--help` for commands.'))
  .recommendCommands()
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .strict()
  .wrap(yargs().terminalWidth())
  .epilogue(`For more information, visit ${chalk.cyan('https://github.com/YourUsername/git-pet')}`) // Update URL
  .argv;