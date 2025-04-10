// lib/cli.js (Register react and achievements)
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
const summaryCmd = require('./commands/summary');
const reactCmd = require('./commands/react'); // <-- Import react command
const achievementsCmd = require('./commands/achievements'); // <-- Import achievements command

// --- Configure Yargs ---
yargs(hideBin(process.argv))
  // Register Commands
  .command(statusCmd)
  .command(feedCmd)
  .command(playCmd)
  .command(nameCmd)
  .command(hooksCmd)
  .command(configCmd)
  .command(summaryCmd)
  .command(reactCmd) // <-- Register react command (will be hidden by its builder)
  .command(achievementsCmd) // <-- Register achievements command

  // General Options / Configuration
  .demandCommand(1, chalk.yellow('Tip: Use `git-pet status` to see your pet, or `--help` for all commands.'))
  .recommendCommands() // Suggest commands on typo
  .help()
  .alias('h', 'help')
  .version() // Reads version from package.json in parent directory
  .alias('v', 'version')
  .strict() // Show help if unknown command/option is used
  .wrap(yargs().terminalWidth()) // Adjust help layout to terminal width
  .epilogue(`For more info or to report issues, visit: ${chalk.cyan('https://github.com/technotastic/git-pet')}`) // Update URL if needed
  .argv; // Parse arguments and run appropriate command handler