// lib/state.js
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const moment = require('moment');

const configDir = path.join(os.homedir(), '.config', 'git-pet');
const stateFile = path.join(configDir, 'state.json');

// Default state structure
const defaultState = {
  pets: {}, // We'll store per-repo state here, keyed by repo path hash/ID later
            // For now, let's use a single global pet for simplicity
  globalPet: {
    name: 'Git Pet',
    mood: 'neutral', // happy, sad, bored, stressed, hungry, etc.
    hunger: 50,      // 0-100 (0 = starving, 100 = full)
    happiness: 50,   // 0-100
    lastFed: moment().toISOString(),
    lastPlayed: moment().toISOString(),
    lastCommitTimestamp: null, // Store timestamp of last known commit
    createdAt: moment().toISOString(),
  }
};

async function ensureStateFile() {
  try {
    await fs.ensureDir(configDir);
    if (!(await fs.pathExists(stateFile))) {
      await fs.writeJson(stateFile, defaultState, { spaces: 2 });
    }
  } catch (error) {
    console.error(chalk.red('Error ensuring state file:'), error);
    // Consider exiting or handling differently
  }
}

async function loadState() {
  await ensureStateFile();
  try {
    const state = await fs.readJson(stateFile);
    // Basic migration/validation could happen here if format changes
    return state || defaultState;
  } catch (error) {
    console.error(chalk.red('Error loading state file, using defaults:'), error);
    return defaultState;
  }
}

async function saveState(newState) {
  await ensureStateFile();
  try {
    await fs.writeJson(stateFile, newState, { spaces: 2 });
  } catch (error) {
    console.error(chalk.red('Error saving state file:'), error);
  }
}

module.exports = { loadState, saveState };