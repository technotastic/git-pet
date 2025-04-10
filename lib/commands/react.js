// lib/commands/react.js
const { loadState, saveState, getExpToNextLevel, levelingConfig } = require('../state');
const chalk = require('chalk'); // <<< ADD THIS LINE
const moment = require('moment');

// --- Helper Functions ---
// (awardExp and unlockAchievement functions remain exactly the same)
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

// --- Main Handler Logic (handleReactCommand - Checks for 'changes' string) ---
/**
 * Processes a Git event triggered by a hook.
 * @param {string} event - Name of the Git event (e.g., 'post-commit').
 * @param {string[]} hookArgs - Arguments potentially passed from the hook script (e.g., ['changes']).
 */
async function handleReactCommand(event, hookArgs = []) {
    let state;
    try {
        state = await loadState();
        // Debug log using chalk - requires chalk to be imported
        console.log(chalk.blueBright('[DEBUG react.js handleReactCommand-Mod] Received event:', event, 'Args:', hookArgs));
        if (!state.globalPet.achievements) state.globalPet.achievements = {};

        console.log(chalk.dim(`Reacting to event: ${chalk.magenta(event)} with args: [${hookArgs.join(', ')}]`));

        let expAwarded = 0;
        let reason = '';
        let achievementKey = null;
        let achievementReason = '';

        switch (event) {
            case 'post-commit':
                // Check if the hookArgs array contains the string 'changes'
                const changesMade = hookArgs.includes('changes'); // <<< USES STRING CHECK
                console.log(chalk.blueBright('[DEBUG react.js-Mod] Post-commit: changesMade flag =', changesMade));

                if (changesMade) {
                    console.log(chalk.blueBright('[DEBUG react.js-Mod] Awarding EXP for commit:', levelingConfig.rewards.COMMIT_WITH_CHANGES));
                    expAwarded = levelingConfig.rewards.COMMIT_WITH_CHANGES;
                    reason = 'Commit with Changes';
                    achievementKey = 'FIRST_COMMIT';
                    achievementReason = 'First Commit!';
                } else {
                     console.log(chalk.grey('React: Skipping EXP for commit - hook provided no changes argument.'));
                }
                break;

            case 'post-merge':
                const wasConflict = hookArgs.includes('was-conflict'); // Example adaptation
                console.log(chalk.blueBright('[DEBUG react.js-Mod] Post-merge: wasConflict flag =', wasConflict));
                 if (wasConflict) {
                    expAwarded = levelingConfig.rewards.RESOLVE_CONFLICT;
                    reason = 'Conflict Resolved (hook indicated)';
                    achievementKey = 'FIRST_CONFLICT_RESOLVED';
                    achievementReason = 'Resolved First Conflict';
                 } else {
                    expAwarded = levelingConfig.rewards.MERGE_SUCCESS;
                    reason = 'Branch Merged';
                    achievementKey = 'FIRST_MERGE';
                    achievementReason = 'First Merge!';
                 }
                 break;
            case 'pre-push':
                 console.log(chalk.blueBright('[DEBUG react.js-Mod] Pre-push: awarding EXP'));
                 expAwarded = levelingConfig.rewards.PUSH_CHANGES;
                 reason = 'Push Attempted';
                 break;
            case 'branch-deleted':
                 const wasOld = hookArgs.includes('was-old'); // Example adaptation
                 const wasMerged = hookArgs.includes('was-merged'); // Example adaptation
                 console.log(chalk.blueBright(`[DEBUG react.js-Mod] Branch-deleted: wasOld=${wasOld}, wasMerged=${wasMerged}`));
                 if (wasOld || wasMerged) {
                    expAwarded = levelingConfig.rewards.CLEAN_BRANCH;
                    reason = wasOld ? 'Old Branch Cleaned' : (wasMerged ? 'Merged Branch Cleaned' : 'Cleaned Branch');
                 } else { /* skip */ }
                 break;

            default:
                console.warn(chalk.yellow(`React: Unknown event type received: ${event}`));
                break;
        }

        if (expAwarded > 0) {
            await awardExp(state, expAwarded, reason);
        }
        if (achievementKey && achievementReason) {
             await unlockAchievement(state, achievementKey, achievementReason);
        }

    } catch (error) {
        console.error(chalk.red(`Error processing react event '${event}' with args [${hookArgs.join(', ')}]:`), error);
    } finally {
        if (state) { await saveState(state); } else { console.error(chalk.red('React: State was not loaded, cannot save.')) }
    }
}


// --- Yargs Command Definition (Simplified V3) ---
module.exports = {
    command: 'react',
    describe: 'Internal command for reacting to Git events (usually called by hooks)',
    builder: (yargs) => {
         yargs
           .strict(false) // Allow any arguments after 'react'
           .hide('react');
    },
    handler: async (argv) => {
        // Debug log using chalk - requires chalk to be imported
        console.log(chalk.blueBright(`[DEBUG react.js Handler V3-Mod] Received argv._: ${JSON.stringify(argv._)}`));

        if (argv._.length < 2) {
            console.error(chalk.red('React handler Error: No event name provided after "react". Aborting.'));
            return;
        }

        const event = argv._[1];
        const hookArgs = argv._.slice(2);

        console.log(chalk.blueBright(`[DEBUG react.js Handler V3-Mod] Extracted event: ${event}`));
        console.log(chalk.blueBright(`[DEBUG react.js Handler V3-Mod] Extracted hookArgs: ${JSON.stringify(hookArgs)}`));

        await handleReactCommand(event, hookArgs);
    },
};