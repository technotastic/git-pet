// lib/pet.js
const moment = require('moment');
const { loadState, saveState } = require('./state');
const { getRepoState } = require('./git');
const chalk = require('chalk');

const HUNGER_RATE_PER_HOUR = 5;
const BOREDOM_RATE_PER_HOUR = 4; // Happiness decreases
const BOREDOM_THRESHOLD_HOURS = 6; // Hours since last commit/play to get bored
const STRESS_THRESHOLD_HOURS = 1; // Hours since commit if uncommitted changes exist

// Function to update pet state based on time passing
function updatePetStats(petState) {
    const now = moment();
    const lastUpdatePoint = moment(petState.lastFed > petState.lastPlayed ? petState.lastFed : petState.lastPlayed); // Rough time reference

    const hoursPassed = now.diff(lastUpdatePoint, 'hours', true); // Use float for accuracy

    if (hoursPassed > 0) {
        // Decrease hunger (gets hungrier)
        petState.hunger = Math.max(0, petState.hunger - hoursPassed * HUNGER_RATE_PER_HOUR);

        // Decrease happiness (gets bored)
        petState.happiness = Math.max(0, petState.happiness - hoursPassed * BOREDOM_RATE_PER_HOUR);
    }

    // Ensure stats stay within bounds 0-100
    petState.hunger = Math.round(Math.min(100, Math.max(0, petState.hunger)));
    petState.happiness = Math.round(Math.min(100, Math.max(0, petState.happiness)));
}


// Main logic to determine mood based on stats and repo state
async function determineCurrentMood(state) {
    const pet = state.globalPet; // Using global pet for now
    const repoState = await getRepoState();

    // --- Update stats based on time passed ---
    updatePetStats(pet); // Apply hunger/boredom decay *before* checking repo


    // --- Determine Mood ---
    let mood = 'neutral'; // Default

    if (!repoState.isGitRepo) {
        // Handle case where not in a git repo (maybe show a specific 'confused' state?)
        console.log(chalk.yellow("You're not in a Git repository. Git Pet is a bit confused!"));
        // Optionally return a specific mood or just stick with neutral/sad
        pet.mood = 'sad'; // Or 'confused' if you add art for it
        return pet.mood; // Exit early
    }

    // **Check Repo State First (Overrides base mood)**
    if (repoState.hasConflicts) {
        mood = 'stressed'; // Conflicts are stressful!
    } else if (repoState.hasUncommittedChanges) {
        // Get stressed if changes are old
        if (repoState.lastCommitTimestamp && moment().diff(moment(repoState.lastCommitTimestamp), 'hours') > STRESS_THRESHOLD_HOURS) {
             mood = 'stressed';
        }
    }

    // **Check Basic Needs & Time-based Moods (If not overridden by repo state)**
    if (mood === 'neutral') { // Only check if not already stressed etc.
        if (pet.hunger < 20) {
            mood = 'sad'; // Or hungry if you add that mood
        } else if (pet.happiness < 30) {
             mood = 'bored';
        } else {
             // Check for boredom based on commits
             if (repoState.lastCommitTimestamp && moment().diff(moment(repoState.lastCommitTimestamp), 'hours') > BOREDOM_THRESHOLD_HOURS) {
                  mood = 'bored';
             }
             // Maybe check lastPlayed too
              else if (moment().diff(moment(pet.lastPlayed), 'hours') > BOREDOM_THRESHOLD_HOURS * 1.5) { // Longer threshold for play
                  mood = 'bored';
              }
        }
    }

    // **Check for Happiness**
     // Only if not overridden by negative states
    if (mood === 'neutral' || mood === 'bored') {
        if (pet.happiness > 80 && pet.hunger > 50) {
            mood = 'happy';
        }
        // Got happy recently from feed/play?
        else if (moment().diff(moment(pet.lastFed > pet.lastPlayed ? pet.lastFed : pet.lastPlayed), 'minutes') < 30 && pet.happiness > 60) {
             mood = 'happy';
        }
    }


    // Update commit timestamp if needed
    if (repoState.lastCommitTimestamp && repoState.lastCommitTimestamp !== pet.lastCommitTimestamp) {
        // If mood wasn't negative, a new commit makes pet happy!
        if (mood !== 'stressed' && mood !== 'sad') {
            mood = 'happy';
            pet.happiness = Math.min(100, pet.happiness + 25); // Big happiness boost
        }
        pet.lastCommitTimestamp = repoState.lastCommitTimestamp; // Update known commit time
    }

    // Update the state object
    pet.mood = mood;

    return mood; // Return the determined mood string
}


module.exports = { determineCurrentMood, updatePetStats }; // Export updatePetStats if needed by feed/play