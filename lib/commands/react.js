// lib/commands/react.js
const { loadState, saveState, getExpToNextLevel, levelingConfig } = require('../state');
const chalk = require('chalk');
const moment = require('moment');
// NOTE: We avoid requiring ../git here to keep react simple.
// It should rely on information passed via args by the hook.

// --- Helper Functions ---

/**
 * Awards EXP to the pet and handles level ups.
 * MUTATES the state object directly.
 * @param {object} state - The global state object.
 * @param {number} amount - The amount of EXP to award.
 * @param {string} reason - The reason for the EXP award (for logging).
 * @returns {Promise<boolean>} - True if a level up occurred, false otherwise.
 */
async function awardExp(state, amount, reason) {
    if (!amount || amount <= 0) return false;

    const pet = state.globalPet;
    const levelBefore = pet.level; // Track level before changes

    pet.experience += amount;
    console.log(chalk.greenBright(`+${amount} EXP`) + chalk.dim(` (${reason})`) + chalk.greenBright(`! | Total EXP: ${pet.experience}`));

    let leveledUp = false;
    let expToNext = getExpToNextLevel(pet.level);

    // Loop in case of multiple level ups from one EXP award
    while (pet.experience >= expToNext) {
        pet.level++;
        const levelExpCost = expToNext; // Store cost before recalculating
        pet.experience -= levelExpCost; // Carry over remaining EXP based on cost to reach *this* level
        leveledUp = true;
        console.log(chalk.cyanBright.bold(`\n*** LEVEL UP! ${pet.name} reached Level ${pet.level}! ***\n`));

        // Optional: Boost stats on level up
        pet.happiness = Math.min(100, (pet.happiness || 50) + 20); // Use default if stat is missing somehow
        pet.hunger = Math.min(100, (pet.hunger || 50) + 10);

        // Set temporary mood? Needs 'celebrating' mood/art added
        // pet.mood = 'celebrating';

        // Recalculate EXP needed for the *new* next level
        expToNext = getExpToNextLevel(pet.level);
    }

    if (leveledUp) {
         // Check for level-based achievements AFTER the loop finishes
         if (pet.level >= 5) await unlockAchievement(state, 'REACH_LEVEL_5', 'Reached Level 5');
         if (pet.level >= 10) await unlockAchievement(state, 'REACH_LEVEL_10', 'Reached Level 10');
         // Add more level checks...

         console.log(chalk.cyan(` -> EXP towards Level ${pet.level + 1}: ${pet.experience} / ${expToNext}\n`));
    }
    return leveledUp;
}

/**
 * Unlocks an achievement if not already unlocked, awarding bonus EXP.
 * MUTATES the state object directly.
 * @param {object} state - The global state object.
 * @param {string} achievementKey - The key for the achievement (must match levelingConfig).
 * @param {string} achievementReason - User-friendly description of the achievement.
 * @returns {Promise<boolean>} - True if the achievement was newly unlocked, false otherwise.
 */
async function unlockAchievement(state, achievementKey, achievementReason) {
     // Ensure achievements object exists
     if (!state.globalPet.achievements) {
         state.globalPet.achievements = {};
     }
     // Check if already unlocked
     if (!state.globalPet.achievements[achievementKey]) {
         const reward = levelingConfig.rewards[achievementKey]; // Get bonus EXP from config

         console.log(chalk.yellowBright.bold(`\n*** Achievement Unlocked: ${achievementReason}! ***\n`));
         state.globalPet.achievements[achievementKey] = moment().toISOString(); // Store timestamp when unlocked

         if (reward > 0) {
             // Award the bonus EXP associated with this achievement
             // Pass a specific reason indicating it's an achievement bonus
             await awardExp(state, reward, `Achievement Bonus: ${achievementReason}`);
         } else if (typeof reward === 'undefined') {
              // Only warn if the key exists in knownAchievements but has no reward defined
              // This allows adding achievements without EXP rewards initially.
              // Could check against a separate list of known keys if needed.
              // console.warn(chalk.yellow(`[Achievement] No EXP reward defined for achievement key: ${achievementKey}`));
         }
         return true; // Newly unlocked
     }
     return false; // Already unlocked
}


// --- Main Handler for the 'react' Command ---
/**
 * Processes a Git event triggered by a hook.
 * @param {string} event - Name of the Git event (e.g., 'post-commit').
 * @param {string[]} args - Arguments potentially passed from the hook script (e.g., ['--changes']).
 */
async function handleReactCommand(event, args = []) {
    let state; // Declare state here to ensure it's accessible in finally block
    try {
        state = await loadState();
        // Ensure achievements object exists (double check after load)
        if (!state.globalPet.achievements) state.globalPet.achievements = {};

        console.log(chalk.dim(`Reacting to event: ${chalk.magenta(event)} with args: [${args.join(', ')}]`));

        let expAwarded = 0;
        let reason = '';
        let achievementKey = null;
        let achievementReason = '';

        switch (event) {
            case 'post-commit':
                // Rely on the hook passing '--changes' flag
                const changesMade = args.includes('--changes');

                if (changesMade) {
                    expAwarded = levelingConfig.rewards.COMMIT_WITH_CHANGES;
                    reason = 'Commit with Changes';
                    achievementKey = 'FIRST_COMMIT';
                    achievementReason = 'First Commit!';
                    // Future: Check total commits for achievements like COMMIT_10, COMMIT_50 etc.
                    // Requires storing commit count in state.
                } else {
                     console.log(chalk.grey('React: Skipping EXP for commit - hook indicated no file changes.'));
                }
                // Update last commit timestamp seen in state (useful for mood logic)
                 // This part might need the git.js module IF we want the actual timestamp here.
                 // For now, let's assume status/summary will handle updating the timestamp
                 // from the repo state when they run. If immediate update is needed here,
                 // we'd need to import and call getRepoState().
                 // Example:
                 // const { getRepoState } = require('../git'); // Would need careful handling
                 // const repoState = await getRepoState();
                 // if (repoState && repoState.lastCommitTimestamp) {
                 //     state.globalPet.lastCommitTimestamp = repoState.lastCommitTimestamp;
                 // }
                break;

            case 'post-merge':
                // Rely on hook passing '--was-conflict' flag (if possible)
                // This flag is HARD to determine reliably in a post-merge hook.
                // A simpler approach might be to just award MERGE_SUCCESS.
                // Detecting conflict *resolution* is better handled by checking
                // commit messages or perhaps a pre-commit hook interaction.
                const wasConflict = args.includes('--was-conflict'); // Ideal but potentially unreliable

                if (wasConflict) {
                    // Only award if the flag is confidently passed
                    expAwarded = levelingConfig.rewards.RESOLVE_CONFLICT;
                    reason = 'Conflict Resolved (hook indicated)';
                    achievementKey = 'FIRST_CONFLICT_RESOLVED';
                    achievementReason = 'Resolved First Conflict';
                } else {
                    // Default award for any merge completion
                    expAwarded = levelingConfig.rewards.MERGE_SUCCESS;
                    reason = 'Branch Merged';
                    achievementKey = 'FIRST_MERGE';
                    achievementReason = 'First Merge!';
                }
                break;

            case 'pre-push': // Hook calls 'git pet react pre-push'
                 // Award small EXP for the intent to push
                 expAwarded = levelingConfig.rewards.PUSH_CHANGES;
                 reason = 'Push Attempted';
                 // Could add FIRST_PUSH achievement here or in post-push if preferred
                break;
             // case 'post-push': // Alternative: react after push succeeds
             //      expAwarded = levelingConfig.rewards.PUSH_CHANGES;
             //      reason = 'Changes Pushed';
             //      break;

            case 'branch-deleted': // Hook needs logic to pass --was-old or --was-merged
                 const wasOld = args.includes('--was-old');
                 const wasMerged = args.includes('--was-merged');
                 if (wasOld || wasMerged) { // Only award if hook indicates clean-up
                    expAwarded = levelingConfig.rewards.CLEAN_BRANCH;
                    reason = wasOld ? 'Old Branch Cleaned' : (wasMerged ? 'Merged Branch Cleaned' : 'Cleaned Branch');
                    // Add achievements like CLEAN_FIVE_BRANCHES later (requires count in state)
                 } else {
                     console.log(chalk.grey('React: Skipping EXP for branch delete - hook provided no reason (old/merged).'));
                 }
                 break;

            // Add more event cases: post-checkout, post-rebase, etc. as hooks are developed

            default:
                console.warn(chalk.yellow(`React: Unknown event type received: ${event}`));
                break;
        }

        // Award base EXP for the action first
        if (expAwarded > 0) {
            await awardExp(state, expAwarded, reason);
        }

        // Attempt to unlock related achievement (checks internally if already unlocked)
        if (achievementKey && achievementReason) {
             await unlockAchievement(state, achievementKey, achievementReason);
        }

    } catch (error) {
        console.error(chalk.red(`Error processing react event '${event}' with args [${args.join(', ')}]:`), error);
        // Decide if state should still be saved even if processing failed partially?
        // It's generally safer to save to persist any partial progress (like an achievement unlock before an error).
    } finally {
        // Always save state after processing an event if state was loaded
        if (state) {
            await saveState(state);
            // console.log(chalk.dim('React: State saved.')); // Optional debug log
        } else {
            console.error(chalk.red('React: State was not loaded successfully, cannot save.'));
        }
    }
}

// --- Yargs Command Definition ---
module.exports = {
    command: 'react <event> [args..]', // Allows 'git pet react post-commit --changes' etc.
    describe: 'Internal command for reacting to Git events (usually called by hooks)',
    // Hide this command from the default help output
    builder: (yargs) => {
         yargs
           .positional('event', {
               describe: 'The Git event name (e.g., post-commit, post-merge)',
               type: 'string',
               demandOption: true, // Event name is required
           })
           .positional('args', {
                describe: 'Optional arguments/flags passed from the hook script (e.g., --changes)',
                type: 'array', // Collect all remaining arguments as an array
                default: []     // Ensure args is always an array
            })
           .hide('react'); // Hide from --help listing
    },
    handler: async (argv) => {
        // Ensure args is always an array before passing
        const argsArray = Array.isArray(argv.args) ? argv.args : [];
        await handleReactCommand(argv.event, argsArray);
    },
};