// lib/commands/summary.js (Added missing constant definition)
const { loadState, saveState } = require('../state');
const { determineCurrentMood, updatePetStats } = require('../pet');
const { getRepoState } = require('../git');
const chalk = require('chalk');
const moment = require('moment');

// --- Define necessary constants locally ---
// It's better to export/import these from a central config or from pet.js,
// but redefining here is the quickest fix. Ensure this matches pet.js!
const OLD_BRANCH_THRESHOLD_WEEKS = 2;
// --- End Constant Definition ---


module.exports = {
  command: 'summary',
  describe: 'Show a summary of factors affecting Git Pet\'s current state',
  handler: async (argv) => {
    console.log(chalk.cyan('--- Git Pet State Summary ---'));

    const state = await loadState();
    const pet = state.globalPet;
    const config = state.config || {};
    const repoState = await getRepoState();

    // Apply decay FIRST
    updatePetStats(pet);

    // Determine mood object { mood, reason }
    const moodInfo = await determineCurrentMood(state);

    // --- Display Current State ---
    console.log(`\n${chalk.bold('Pet:')} ${chalk.cyan(pet.name)}`);
    // Use moodInfo.mood and moodInfo.reason
    console.log(`${chalk.bold('Current Mood:')} ${chalk.magenta(moodInfo.mood)} (Reason: ${chalk.dim(moodInfo.reason || 'N/A')})`);
    console.log(`${chalk.bold('Hunger:')} ${chalk.yellow(pet.hunger)}/100`);
    console.log(`${chalk.bold('Happiness:')} ${chalk.green(pet.happiness)}/100`);

    // --- Display Timestamps ---
    console.log(chalk.bold('\nRecent Activity:'));
    console.log(`  Last Fed: ${pet.lastFed ? chalk.cyan(moment(pet.lastFed).fromNow()) : chalk.grey('Never')}`);
    console.log(`  Last Played: ${pet.lastPlayed ? chalk.cyan(moment(pet.lastPlayed).fromNow()) : chalk.grey('Never')}`);
    console.log(`  Last Commit Seen: ${pet.lastCommitTimestamp ? chalk.cyan(moment(pet.lastCommitTimestamp).fromNow()) : chalk.grey('None')}`);

    // --- Display Repository Factors ---
    console.log(chalk.bold('\nRepository State:'));
    if (!repoState.isGitRepo) {
        console.log(chalk.yellow('  Not currently in a Git repository.'));
    } else {
        console.log(`  Repository Root: ${chalk.grey(repoState.repoRootDir)}`);
        console.log(`  Current Branch: ${chalk.cyan(repoState.currentBranch)}`);
        console.log(`  Uncommitted Changes: ${repoState.hasUncommittedChanges ? chalk.yellow('Yes') : chalk.green('No')}`);
        console.log(`  Merge Conflicts: ${repoState.hasConflicts ? chalk.red('YES') : chalk.green('No')}`);

        // --- Remote Status ---
        const remoteCheckEnabled = config.checkRemoteStatus === true;
        console.log(`  Remote Status Check: ${remoteCheckEnabled ? chalk.green('Enabled') : chalk.grey('Disabled (use "config set checkRemoteStatus true" to enable)')}`);
        if (remoteCheckEnabled) {
            console.log(`    Ahead of Remote: ${repoState.aheadCount > 0 ? chalk.yellow(repoState.aheadCount) : chalk.green(0)}`);
            console.log(`    Behind Remote: ${repoState.behindCount > 0 ? chalk.red(repoState.behindCount) : chalk.green(0)}`);
        }

        // --- Branch Info ---
        // Use the locally defined constant
         const oldBranchThreshold = moment().subtract(OLD_BRANCH_THRESHOLD_WEEKS, 'weeks');
         const oldBranches = repoState.branches.filter(b =>
             b.lastCommit.isBefore(oldBranchThreshold) &&
             !['main', 'master', 'develop', 'HEAD'].includes(b.name) &&
             b.name !== repoState.currentBranch
         );
         // Now use the locally defined constant name
         console.log(`  Old Branches (> ${OLD_BRANCH_THRESHOLD_WEEKS} weeks): ${oldBranches.length > 0 ? chalk.yellow(oldBranches.length) : chalk.green(0)}`);
         if (oldBranches.length > 0 && oldBranches.length <= 5) {
              console.log(chalk.dim(`    (${oldBranches.slice(0, 5).map(b => b.name).join(', ')}${oldBranches.length > 5 ? ', ...' : ''})`));
         }
    }

    // --- Save State ---
    // Save state because updatePetStats might have changed hunger/happiness
    await saveState(state);

    console.log(chalk.cyan('\n--- End Summary ---'));
  },
};