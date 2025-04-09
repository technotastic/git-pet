// lib/commands/hooks.js
const chalk = require('chalk');
// For now, just prints instructions. Real install is complex.

const postCommitHookContent = `#!/bin/sh
# Git Pet post-commit hook

# Run the git-pet react command (adjust path if needed)
git-pet react commit-success --no-output || true # Ignore errors for now
`; // Add more hooks similarly (post-merge, etc.)

module.exports = {
  command: 'hooks <action>',
  describe: 'Manage Git hooks for automatic reactions (install/uninstall)',
  builder: (yargs) => {
    yargs.positional('action', {
      describe: 'Action to perform',
      type: 'string',
      choices: ['install-instructions', 'uninstall-instructions'], // Keep it simple first
    })
    .option('no-output', { // Example option if react command exists
        type: 'boolean',
        description: 'Prevent hook from printing output',
        default: false
    });
  },
  handler: async (argv) => {
    if (argv.action === 'install-instructions') {
        console.log(chalk.cyan('--- Git Pet Hook Installation (Manual) ---'));
        console.log(`To make Git Pet react automatically, add the following script content`);
        console.log(`to the corresponding file inside your repository's ${chalk.yellow('.git/hooks/')} directory.`);
        console.log(`Make sure the hook file is executable (${chalk.yellow('chmod +x .git/hooks/<hookname>')}).\n`);

        console.log(chalk.bold('1. Create/Edit `.git/hooks/post-commit`:'));
        console.log(chalk.greenBright(postCommitHookContent));
        console.log(chalk.dim('(This runs after a successful commit)\n'));

        // Add instructions for post-merge, etc. similarly
        console.log(chalk.yellow('Note: This will overwrite existing hooks. Back them up if needed!'));
        console.log(chalk.yellow('Future versions might offer automatic installation.'));

    } else if (argv.action === 'uninstall-instructions') {
         console.log(chalk.cyan('--- Git Pet Hook Uninstallation (Manual) ---'));
         console.log(`To remove Git Pet hooks, simply delete the corresponding files`);
         console.log(`from your repository's ${chalk.yellow('.git/hooks/')} directory`);
         console.log(`(e.g., ${chalk.yellow('rm .git/hooks/post-commit')})`);
    }
    // Placeholder for a future 'react' command if needed by hooks:
    // else if (argv.action === 'react') { handleReaction(argv); }
  },
};

// async function handleReaction(argv) { /* Logic if hooks call back */ }