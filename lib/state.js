// lib/state.js
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const moment = require('moment');
const chalk = require('chalk'); // Keep chalk for potential logging

const configDir = path.join(os.homedir(), '.config', 'git-pet');
const stateFile = path.join(configDir, 'state.json');

// --- Default State Structure ---
const defaultGlobalPetState = {
    name: 'Git Pet',
    mood: 'neutral',
    hunger: 50,
    happiness: 50,
    lastFed: null, // Start as null, update on first feed
    lastPlayed: null, // Start as null, update on first play
    lastCommitTimestamp: null, // Track last known commit time from repo state
    createdAt: moment().toISOString(),
    lastMood: 'neutral', // Track previous mood for animation resets
    animationFrame: 0, // Current frame index for animation
    lastStatusUpdate: moment().toISOString(), // Track last time status was checked (for animation timing)
    repoRootDir: null, // Track associated repo root (simplistic global pet tracking)

    // --- NEW Leveling/Achievement Fields ---
    level: 1,
    experience: 0,
    achievements: {} // Store unlocked achievements: { "FIRST_COMMIT": timestamp, ... }
};

const defaultState = {
  globalPet: { ...defaultGlobalPetState }, // Use a copy
  config: { // Separate config object
    checkRemoteStatus: false // Default to FALSE
  }
};

// --- Leveling Configuration ---
// Can be moved to a separate config file later if it grows large
const levelingConfig = {
    expPerLevelBase: 100,
    expPerLevelIncrement: 50, // EXP needed = base + (increment * (currentLevel - 1))

    // EXP Rewards - Keys MUST match achievement keys and react event logic
    rewards: {
        // --- Actions (Awarded via react.js based on events) ---
        COMMIT_WITH_CHANGES: 10,
        MERGE_SUCCESS: 25,
        RESOLVE_CONFLICT: 50,
        PUSH_CHANGES: 5,        // Awarded for pre-push/post-push event
        CLEAN_BRANCH: 15,       // Awarded for branch-deleted event (if hook passes flag)

        // --- Achievements (Bonus EXP - Awarded ONCE via unlockAchievement in react.js) ---
        // Keys match achievement unlock keys
        FIRST_COMMIT: 50,
        FIRST_MERGE: 75,
        FIRST_CONFLICT_RESOLVED: 100,
        REACH_LEVEL_5: 150, // Example future achievement
        REACH_LEVEL_10: 300,
        // Add more achievement keys and their bonus EXP rewards here
    }
};

/**
 * Calculates the total EXP required to reach the *next* level.
 * @param {number} currentLevel - The pet's current level.
 * @returns {number} The total EXP needed for the next level up.
 */
function getExpToNextLevel(currentLevel) {
    if (currentLevel < 1) return levelingConfig.expPerLevelBase; // Safety check
    // Formula: Base + Increment * (Level - 1)
    return levelingConfig.expPerLevelBase + (levelingConfig.expPerLevelIncrement * (currentLevel - 1));
}

/**
 * Ensures the config directory and state file exist. Creates default if not found.
 */
async function ensureStateFile() {
  try {
    await fs.ensureDir(configDir);
    if (!(await fs.pathExists(stateFile))) {
      await fs.writeJson(stateFile, defaultState, { spaces: 2 });
      // console.log(chalk.dim(`Initialized default state file at: ${stateFile}`));
    }
  } catch (error) {
    console.error(chalk.red(`Error ensuring state file exists at ${configDir}:`), error);
    // Consider re-throwing or exiting if this fails critically
  }
}

/**
 * Loads the current state from the JSON file. Returns default state on error or ensures defaults exist.
 * Merges loaded state with defaults to handle potentially missing fields in older state files.
 * @returns {Promise<object>} The loaded and potentially migrated state object.
 */
async function loadState() {
  await ensureStateFile(); // Make sure file/dir exists before reading
  try {
    let loadedState = {};
    // Check if file exists before reading, handle potential empty file case
    if (await fs.pathExists(stateFile)) {
       try {
         // Read the file content first
         const fileContent = await fs.readFile(stateFile, 'utf-8');
         // Handle empty file case gracefully
         if (!fileContent.trim()) {
             console.warn(chalk.yellow(`State file ${stateFile} was empty. Initializing with defaults.`));
             loadedState = {}; // Treat as empty, defaults will merge
         } else {
             loadedState = JSON.parse(fileContent); // Parse non-empty content
         }
       } catch (readError) {
          // Handle case where file exists but is corrupted JSON
          console.error(chalk.red(`Error reading or parsing state file ${stateFile}. Check for corruption. Using defaults:`), readError);
          // Return a deep copy of defaults to avoid modifying the original
          return JSON.parse(JSON.stringify(defaultState));
       }
    } else {
        // File didn't exist, ensureStateFile should have created it with defaults
        // but if not, start fresh
        console.warn(chalk.yellow(`State file ${stateFile} not found after check. Initializing with defaults.`));
        loadedState = {};
    }

    // --- Merge loaded state with defaults to ensure all keys exist ---
    // Create deep copies to avoid modifying the original defaultState objects
    const finalState = {
        globalPet: { ...defaultGlobalPetState, ...(loadedState.globalPet || {}) },
        config: { ...defaultState.config, ...(loadedState.config || {}) },
    };

    // Explicitly ensure nested 'achievements' object exists
    if (typeof finalState.globalPet.achievements !== 'object' || finalState.globalPet.achievements === null) {
        finalState.globalPet.achievements = {};
    }
    // Ensure level and experience are numbers (might be undefined if loading very old state)
    if (typeof finalState.globalPet.level !== 'number') {
       finalState.globalPet.level = defaultGlobalPetState.level;
    }
    if (typeof finalState.globalPet.experience !== 'number') {
       finalState.globalPet.experience = defaultGlobalPetState.experience;
    }

    return finalState;

  } catch (error) {
    console.error(chalk.red('Critical error during state load/migration, using defaults:'), error);
    // Return a deep copy of defaultState to avoid accidental modification
    return JSON.parse(JSON.stringify(defaultState));
  }
}

/**
 * Saves the provided state object back to the JSON file.
 * @param {object} newState - The state object to save.
 */
async function saveState(newState) {
  await ensureStateFile(); // Ensure directory exists
  try {
    // Basic validation before saving
    if (!newState || !newState.globalPet || !newState.config || typeof newState.globalPet.achievements !== 'object') {
       console.error(chalk.red('Attempted to save invalid or incomplete state structure. Aborting save. State was:'), newState);
       return; // Prevent saving bad state
    }
    // Ensure required fields are numbers before saving
    newState.globalPet.level = Number(newState.globalPet.level) || 1;
    newState.globalPet.experience = Number(newState.globalPet.experience) || 0;

    await fs.writeJson(stateFile, newState, { spaces: 2 });
  } catch (error) {
    console.error(chalk.red('Error saving state file:'), error);
  }
}

// Export state functions and leveling helpers
module.exports = { loadState, saveState, getExpToNextLevel, levelingConfig, defaultState };