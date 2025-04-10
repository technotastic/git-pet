// lib/commands/summary.js (Displays Level/EXP)
const { loadState, saveState, getExpToNextLevel } = require('../state'); // Import helper
const { determineCurrentMood, updatePetStats } = require('../pet');
const { getRepoState } = require('../git');
const chalk = require('chalk');
const moment = require('moment');

// Re-define or import constants if needed (ensure consistency with pet.js)
const OLD_BRANCH_THRESHOLD_WEEKS = 2; // Example from git-pet.txt

module.exports = {
  command: 'summary',
  describe: 'Show a summary of factors affecting Git Pet\'s current state',
  handler: async (argv) => {
    console.log(chalk.cyan.bold('--- Git Pet State Summary ---'));

    const state = await loadState();
    const pet = state.globalPet;
    const config = state.config || {};

    // Get repo state FIRST, as mood logic might depend on it
    const repoState = await getRepoState();

    // Apply decay based on last activity timestamps BEFORE determining mood
    updatePetStats(pet);

    // Determine mood AFTER decay and getting repo state
    const moodInfo = await determineCurrentMood(state); // Uses potentially updated stats and repoState

    // --- Display Pet Info ---
    console.log(`\n${chalk.bold('Pet:')} ${chalk.cyan(pet.name)}`);
    console.log(`${chalk.bold('Current Mood:')} ${chalk.magenta(moodInfo.mood)} (Reason: ${chalk.dim(moodInfo.reason || 'N/A')})`);
    console.log(`${chalk.bold('Hunger:')} ${chalk.yellow(pet.hunger)}/100`);
    console.log(`${chalk.bold('Happiness:')} ${chalk.green(pet.happiness)}/100`);

    // --- Add Level/EXP Display ---
    const expToNext = getExpToNextLevel(pet.level);
    console.log(chalk.blueBright(`${chalk.bold('Level:')} ${pet.level}`));
    console.log(chalk.blueBright(`${chalk.bold('EXP:')} ${pet.experience} / ${expToNext}`));
    // --- End Level/EXP Display ---

    // --- Display Timestamps ---
    console.log(chalk.bold('\nRecent Activity:'));
    console.log(`  Last Fed: ${pet.lastFed ? chalk.cyan(moment(pet.lastFed).fromNow()) : chalk.grey('Never')}`);
    console.log(`  Last Played: ${pet.lastPlayed ? chalk.cyan(moment(pet.lastPlayed).fromNow()) : chalk.grey('Never')}`);
    // Use lastCommitTimestamp from pet state (updated by react or determineMood)
    console.log(`  Last Commit Seen: ${pet.lastCommitTimestamp ? chalk.cyan(moment(pet.lastCommitTimestamp).fromNow()) : chalk.grey('None')}`);
    console.log(`  Pet Created: ${chalk.grey(moment(pet.createdAt).format('YYYY-MM-DD'))}`); // Optional

    // --- Display Repository Factors ---
    console.log(chalk.bold('\nRepository State:'));
    if (!repoState.isGitRepo) {
        console.log(chalk.yellow(`  ${repoState.error || 'Not currently in a Git repository.'}`)); // Show error if available
    } else {
        console.log(`  Repository Root: ${chalk.grey(repoState.repoRootDir)}`);
        console.log(`  Current Branch: ${chalk.cyan(repoState.currentBranch)}`);
        console.log(`  Uncommitted Changes: ${repoState.hasUncommittedChanges ? chalk.yellow('Yes') : chalk.green('No')}`);
        console.log(`  Merge Conflicts: ${repoState.hasConflicts ? chalk.red('YES') : chalk.green('No')}`);

        // Remote Status (conditional display)
        const remoteCheckEnabled = config.checkRemoteStatus === true;
        console.log(`  Remote Status Check: ${remoteCheckEnabled ? chalk.green('Enabled') : chalk.grey('Disabled')}`);
        if (remoteCheckEnabled) {
            console.log(`    Ahead of Remote: ${repoState.aheadCount > 0 ? chalk.yellow(repoState.aheadCount) : chalk.green(0)}`);
            console.log(`    Behind Remote: ${repoState.behindCount > 0 ? chalk.red(repoState.behindCount) : chalk.green(0)}`);
        } else if (!remoteCheckEnabled && (repoState.aheadCount > 0 || repoState.behindCount > 0)) {
            // Handle edge case where remote check is disabled but git status still reports ahead/behind (e.g., no upstream set)
             console.log(chalk.dim('    (Remote status may be outdated or upstream not configured)'));
        } else if (!remoteCheckEnabled) {
            console.log(chalk.dim('    (Enable via `git pet config set checkRemoteStatus true`)'));
        }


        // Branch Info
         const oldBranchThreshold = moment().subtract(OLD_BRANCH_THRESHOLD_WEEKS, 'weeks');
         const oldBranches = (repoState.branches || []).filter(b => // Add safety check for branches array
             b.lastCommit.isBefore(oldBranchThreshold) &&
             !['main', 'master', 'develop', 'HEAD'].includes(b.name) && // Common main branches
             b.name !== repoState.currentBranch // Don't list current branch as old
         );
         console.log(`  Old Branches (> ${OLD_BRANCH_THRESHOLD_WEEKS} weeks): ${oldBranches.length > 0 ? chalk.yellow(oldBranches.length) : chalk.green(0)}`);
         if (oldBranches.length > 0 && oldBranches.length <= 5) { // Show names of a few old branches
              console.log(chalk.dim(`    (${oldBranches.slice(0, 5).map(b => b.name).join(', ')}${oldBranches.length > 5 ? ', ...' : ''})`));
         }
         // Display any general repo error found during getRepoState
         if(repoState.error && repoState.error !== 'Not currently in a Git repository.') { // Avoid duplicate message
             console.log(chalk.red(`  Repository Error Detected: ${repoState.error}`));
         }
    }

    // Save state because stats/mood/timestamps might have been mutated by decay or mood determination
    await saveState(state);

    console.log(chalk.cyan.bold('\n--- End Summary ---'));
  },
};