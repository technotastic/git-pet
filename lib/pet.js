// lib/pet.js
const moment = require('moment');
const { loadState, saveState } = require('./state'); // Assuming state.js is correctly implemented
const { getRepoState } = require('./git'); // Assuming git.js is correctly implemented
const chalk = require('chalk');

// --- Constants for Pet Logic ---
const HUNGER_RATE_PER_HOUR = 5;
const BOREDOM_RATE_PER_HOUR = 4; // Happiness decreases
const BOREDOM_THRESHOLD_HOURS = 6; // Hours since last commit/play to get bored
const OLD_BRANCH_THRESHOLD_WEEKS = 2;
const OLD_BRANCH_COUNT_THRESHOLD = 2; // How many old branches trigger mood change
const STRESS_THRESHOLD_HOURS = 1; // Hours since commit if uncommitted changes exist
const AHEAD_COUNT_THRESHOLD = 10; // Trigger mood if this many commits ahead
const BEHIND_COUNT_THRESHOLD = 5; // Trigger mood if this many commits behind


// --- Function to Update Pet Stats Based on Time Passing ---
function updatePetStats(petState) {
    const now = moment();
    // Use the most recent valid timestamp from interactions or creation
    const timestamps = [
        petState.lastFed,
        petState.lastPlayed,
        petState.lastCommitTimestamp, // Consider last commit time too? Maybe not for decay.
        petState.createdAt
    ].filter(Boolean).map(ts => moment(ts)).filter(m => m.isValid());

    // Find the latest valid timestamp
    const lastKnownActivity = timestamps.length > 0 ? moment.max(timestamps) : null;

    if (!lastKnownActivity) {
        console.warn(chalk.yellow("Could not determine a valid timestamp for pet decay calculation. Skipping decay."));
        return; // Don't decay if timestamps are missing/invalid
    }

    const hoursPassed = now.diff(lastKnownActivity, 'hours', true); // Use float for accuracy

    if (hoursPassed > 0) {
        // Decrease hunger (gets hungrier)
        petState.hunger = petState.hunger - hoursPassed * HUNGER_RATE_PER_HOUR;

        // Decrease happiness (gets bored)
        petState.happiness = petState.happiness - hoursPassed * BOREDOM_RATE_PER_HOUR;

        // Ensure stats stay within bounds 0-100 and round them
        petState.hunger = Math.round(Math.min(100, Math.max(0, petState.hunger)));
        petState.happiness = Math.round(Math.min(100, Math.max(0, petState.happiness)));

        // Optional: Log decay for debugging
        // console.log(chalk.dim(`Decay Applied: ${hoursPassed.toFixed(2)} hours passed. Hunger: ${petState.hunger}, Happiness: ${petState.happiness}`));
    }
}


// --- Main Logic to Determine Pet's Mood ---
async function determineCurrentMood(state) {
    // NOTE: This function now MUTATES the pet state object directly for mood/timestamps
    // It might be cleaner to return a new state object in a larger refactor.

    const pet = state.globalPet; // Using global pet for now
    const repoState = await getRepoState();

    // --- Update time-based stats FIRST ---
    updatePetStats(pet);

    // --- Handle Non-Git Repo Case ---
    if (!repoState.isGitRepo) {
        pet.mood = 'confused'; // New mood maybe?
        if (pet.repoRootDir) { // Only log confusion if it thought it knew a repo before
             console.log(chalk.yellow(`${pet.name} can't find the Git repository it was tracking!`));
        }
        pet.repoRootDir = null; // Clear associated repo
        return pet.mood; // Return the 'confused' mood
    }

    // --- Store/Update Repo Root Association (for global pet state) ---
    // Simplistic check; better logic needed for true multi-repo support
    if (!pet.repoRootDir || pet.repoRootDir !== repoState.repoRootDir) {
         pet.repoRootDir = repoState.repoRootDir;
         // Maybe reset mood to neutral when switching repos?
         // pet.mood = 'neutral';
    }

    // --- Determine Mood Based on Priority States ---
    let calculatedMood = 'neutral'; // Start with neutral
    let moodReason = 'default'; // For debugging/understanding

    // 1. Highest Priority: Conflicts
    if (repoState.hasConflicts) {
        calculatedMood = 'stressed';
        moodReason = 'merge conflicts detected';
    }
    // 2. Behind Remote
    else if (repoState.behindCount > BEHIND_COUNT_THRESHOLD) {
        calculatedMood = 'sad'; // Or 'worried'
        moodReason = `behind remote by ${repoState.behindCount} commits`;
        pet.happiness = Math.max(0, pet.happiness - 15); // Decrease happiness
    }
    // 3. Ahead of Remote (Needs Push)
    else if (repoState.aheadCount > AHEAD_COUNT_THRESHOLD) {
        calculatedMood = 'thinking'; // Or 'needsPush'
        moodReason = `ahead of remote by ${repoState.aheadCount} commits`;
    }
    // 4. Uncommitted Changes
    else if (repoState.hasUncommittedChanges) {
        // Get stressed if changes are old relative to the last known commit
        if (repoState.lastCommitTimestamp && moment().diff(moment(repoState.lastCommitTimestamp), 'hours') > STRESS_THRESHOLD_HOURS) {
             calculatedMood = 'stressed';
             moodReason = 'old uncommitted changes';
        } else {
             calculatedMood = 'thinking'; // Actively working
             moodReason = 'uncommitted changes present';
        }
    }

    // --- Needs & Boredom Checks (If no higher priority mood was set) ---
    if (calculatedMood === 'neutral') {
         // 5. Basic Needs
         if (pet.hunger < 20) {
            calculatedMood = 'sad'; // Or 'hungry'
            moodReason = 'hungry';
         } else if (pet.happiness < 30) {
            calculatedMood = 'bored';
            moodReason = 'low happiness';
         }
         // 6. Environmental Boredom
         else {
             // Check branch age
            const oldBranchThreshold = moment().subtract(OLD_BRANCH_THRESHOLD_WEEKS, 'weeks');
            // Exclude common main branches and current branch from 'old' check
            const oldBranches = repoState.branches.filter(b =>
                b.lastCommit.isBefore(oldBranchThreshold) &&
                !['main', 'master', 'develop', 'HEAD'].includes(b.name) && // Add other common mains if needed
                b.name !== repoState.currentBranch // Don't warn about the current branch being old
            );

            if (oldBranches.length > OLD_BRANCH_COUNT_THRESHOLD) {
                 calculatedMood = 'bored'; // Or specific 'oldBranchWarning' mood
                 moodReason = `${oldBranches.length} old branches detected`;
            }
            // Check time since last commit
            else if (repoState.lastCommitTimestamp && moment().diff(moment(repoState.lastCommitTimestamp), 'hours') > BOREDOM_THRESHOLD_HOURS) {
                 calculatedMood = 'bored';
                 moodReason = 'no recent commit';
            }
             // Check time since last play
             else if (moment().diff(moment(pet.lastPlayed), 'hours') > BOREDOM_THRESHOLD_HOURS * 1.5) { // Longer threshold for play
                 calculatedMood = 'bored';
                 moodReason = 'not played with recently';
             }
        }
    }

    // --- Happiness Check (Can override neutral/bored) ---
    if (calculatedMood === 'neutral' || calculatedMood === 'bored' ) {
         // Happy if needs met
        if (pet.happiness > 80 && pet.hunger > 50) {
            calculatedMood = 'happy';
            moodReason = 'needs met';
        }
         // Happy if recently interacted with
        else if (moment().diff(moment(pet.lastFed > pet.lastPlayed ? pet.lastFed : pet.lastPlayed), 'minutes') < 30 && pet.happiness > 60) {
            calculatedMood = 'happy';
             moodReason = 'recently interacted';
        }
    }


    // --- Event Reaction: New Commit Detected ---
    // This happiness boost applies even if they were slightly bored/thinking
    if (repoState.lastCommitTimestamp && repoState.lastCommitTimestamp !== pet.lastCommitTimestamp) {
        if (calculatedMood !== 'stressed' && calculatedMood !== 'sad') { // Don't override critical negative states just for a commit
            calculatedMood = 'happy';
            moodReason = 'new commit detected';
            pet.happiness = Math.min(100, pet.happiness + 25); // Commit makes pet happy
        }
        pet.lastCommitTimestamp = repoState.lastCommitTimestamp; // Update the last known commit time
    }

    // --- Final Mood Assignment ---
    pet.mood = calculatedMood;
    // console.log(chalk.dim(`Mood determined as: ${pet.mood} (Reason: ${moodReason})`)); // Uncomment for debugging

    return pet.mood; // Return the final calculated mood
}


// --- Export Functions ---
module.exports = { determineCurrentMood, updatePetStats };