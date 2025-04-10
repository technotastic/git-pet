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
const reactCmd = require('./commands/react');
const achievementsCmd = require('./commands/achievements');

// --- START DEBUG LOGGING ---
const argsForYargs = hideBin(process.argv);
console.log('[DEBUG lib/cli.js] Args passed to yargs():', argsForYargs);
// --- END DEBUG LOGGING ---


// --- Configure Yargs ---
try {
    yargs(argsForYargs) // Use the prepared args
      // Register Commands
      .command(statusCmd)
      .command(feedCmd)
      .command(playCmd)
      .command(nameCmd)
      .command(hooksCmd)
      .command(configCmd)
      .command(summaryCmd)
      .command(reactCmd) // react's builder has .strict(false)
      .command(achievementsCmd)

      // General Options / Configuration
      .demandCommand(1, chalk.yellow('Tip: Use `git-pet status` to see your pet, or `--help` for all commands.'))
      .recommendCommands()
      .help()
      .alias('h', 'help')
      .version()
      .alias('v', 'version')
      // REMOVED global .strict() - rely on command-specific strictness if needed
      .wrap(yargs().terminalWidth())
      .epilogue(`For more info or to report issues, visit: ${chalk.cyan('https://github.com/technotastic/git-pet')}`)
      .argv; // Parse arguments and run appropriate command handler
} catch (error) {
    console.error("[ERROR lib/cli.js] Error during yargs setup or execution:", error);
}