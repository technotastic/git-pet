// lib/pet.js (Complete: determineCurrentMood now returns { mood, reason })
const moment = require("moment");
const { loadState, saveState } = require("./state");
const { getRepoState } = require("./git");
const chalk = require("chalk");

// --- Constants ---
const HUNGER_RATE_PER_HOUR = 20;
const BOREDOM_RATE_PER_HOUR = 15;
const MIN_DECAY_THRESHOLD_HOURS = 0.005; // ~18 seconds
const BOREDOM_THRESHOLD_HOURS = 6;
const OLD_BRANCH_THRESHOLD_WEEKS = 2;
const OLD_BRANCH_COUNT_THRESHOLD = 2;
const STRESS_THRESHOLD_HOURS = 1;
const AHEAD_COUNT_THRESHOLD = 10;
const BEHIND_COUNT_THRESHOLD = 5;
const HAPPY_HAPPINESS_THRESHOLD = 85;
const HAPPY_HUNGER_THRESHOLD = 60;
const FEED_HUNGER_GAIN = 25;
const FEED_HAPPINESS_GAIN = 5;
const PLAY_HAPPINESS_GAIN = 20;
const PLAY_HUNGER_LOSS = 8;
const COMMIT_HAPPINESS_GAIN = 15;

// --- Function to Update Pet Stats Based on Time Passing ---
function updatePetStats(petState) {
  const now = moment();
  const timestamps = [petState.lastFed, petState.lastPlayed, petState.createdAt]
    .filter(Boolean)
    .map((ts) => moment(ts))
    .filter((m) => m.isValid());

  const lastKnownActivity =
    timestamps.length > 0 ? moment.max(timestamps) : null;

  if (!lastKnownActivity) {
    return;
  }

  const hoursPassed = now.diff(lastKnownActivity, "hours", true);

  if (hoursPassed > MIN_DECAY_THRESHOLD_HOURS) {
    // console.log(chalk.cyan(`[DEBUG updatePetStats] Threshold MET (${hoursPassed.toFixed(5)} > ${MIN_DECAY_THRESHOLD_HOURS}). Applying decay.`));
    const hungerBefore = petState.hunger;
    const happinessBefore = petState.happiness;
    const hungerDecayAmount = hoursPassed * HUNGER_RATE_PER_HOUR;
    const happinessDecayAmount = hoursPassed * BOREDOM_RATE_PER_HOUR;

    petState.hunger = petState.hunger - hungerDecayAmount;
    petState.happiness = petState.happiness - happinessDecayAmount;

    // console.log(chalk.cyan(`[DEBUG updatePetStats] Calculated Decay: Hunger -${hungerDecayAmount.toFixed(3)}, Happiness -${happinessDecayAmount.toFixed(3)}`));

    petState.hunger = Math.round(Math.min(100, Math.max(0, petState.hunger)));
    petState.happiness = Math.round(
      Math.min(100, Math.max(0, petState.happiness))
    );

    // console.log(chalk.cyan(`[DEBUG updatePetStats] Stats After Decay: Hunger ${hungerBefore} -> ${petState.hunger}, Happiness ${happinessBefore} -> ${petState.happiness}`));
  }
  // else { console.log(chalk.yellow(`[DEBUG updatePetStats] Threshold NOT MET (${hoursPassed.toFixed(5)} <= ${MIN_DECAY_THRESHOLD_HOURS}). Skipping decay.`)); }
}

// --- Main Logic to Determine Pet's Mood ---
async function determineCurrentMood(state) {
  const pet = state.globalPet;
  const repoState = await getRepoState();

  updatePetStats(pet); // Apply decay first

  if (!repoState.isGitRepo) {
    pet.mood = "confused";
    pet.repoRootDir = null;
    return { mood: pet.mood, reason: "not in a git repository" }; // <-- Return object
  }

  if (!pet.repoRootDir || pet.repoRootDir !== repoState.repoRootDir) {
    pet.repoRootDir = repoState.repoRootDir;
  }

  let calculatedMood = "neutral";
  let moodReason = "default";

  // --- Determine Mood Based on Priority States ---
  if (repoState.hasConflicts) {
    calculatedMood = "stressed";
    moodReason = "merge conflicts detected";
  } else if (repoState.behindCount > BEHIND_COUNT_THRESHOLD) {
    calculatedMood = "sad";
    moodReason = `behind remote by ${repoState.behindCount} commits`;
    pet.happiness = Math.max(0, pet.happiness - 15);
  } else if (repoState.aheadCount > AHEAD_COUNT_THRESHOLD) {
    calculatedMood = "thinking";
    moodReason = `ahead of remote by ${repoState.aheadCount} commits`;
  } else if (repoState.hasUncommittedChanges) {
    if (
      repoState.lastCommitTimestamp &&
      moment().diff(moment(repoState.lastCommitTimestamp), "hours") >
        STRESS_THRESHOLD_HOURS
    ) {
      calculatedMood = "stressed";
      moodReason = "old uncommitted changes";
    } else {
      calculatedMood = "thinking";
      moodReason = "uncommitted changes present";
    }
  }

  // --- Needs & Boredom Checks (If no higher priority mood was set) ---
  if (calculatedMood === "neutral") {
    if (pet.hunger < 20) {
      calculatedMood = "sad";
      moodReason = "hungry";
    } else if (pet.happiness < 30) {
      calculatedMood = "bored";
      moodReason = "low happiness";
    } else {
      const oldBranchThreshold = moment().subtract(
        OLD_BRANCH_THRESHOLD_WEEKS,
        "weeks"
      );
      const oldBranches = repoState.branches.filter(
        (b) =>
          b.lastCommit.isBefore(oldBranchThreshold) &&
          !["main", "master", "develop", "HEAD"].includes(b.name) &&
          b.name !== repoState.currentBranch
      );
      if (oldBranches.length > OLD_BRANCH_COUNT_THRESHOLD) {
        calculatedMood = "bored";
        moodReason = `${oldBranches.length} old branches detected`;
      } else if (
        repoState.lastCommitTimestamp &&
        moment().diff(moment(repoState.lastCommitTimestamp), "hours") >
          BOREDOM_THRESHOLD_HOURS
      ) {
        calculatedMood = "bored";
        moodReason = "no recent commit";
      } else if (
        moment().diff(moment(pet.lastPlayed), "hours") >
        BOREDOM_THRESHOLD_HOURS * 1.5
      ) {
        calculatedMood = "bored";
        moodReason = "not played with recently";
      }
    }
  }

  // --- Event Reaction: New Commit Detected ---
  let commitBoostApplied = false;
  if (
    repoState.lastCommitTimestamp &&
    repoState.lastCommitTimestamp !== pet.lastCommitTimestamp
  ) {
    if (calculatedMood !== "stressed" && calculatedMood !== "sad") {
      pet.happiness = Math.min(100, pet.happiness + COMMIT_HAPPINESS_GAIN);
      commitBoostApplied = true;
    }
    pet.lastCommitTimestamp = repoState.lastCommitTimestamp;
  }

  // --- Happiness Check (Final Check) ---
  if (calculatedMood === "neutral" || calculatedMood === "bored") {
    if (
      pet.happiness > HAPPY_HAPPINESS_THRESHOLD &&
      pet.hunger > HAPPY_HUNGER_THRESHOLD
    ) {
      calculatedMood = "happy";
      moodReason = "needs met (high stats)";
    }
  }
  if (
    commitBoostApplied &&
    calculatedMood !== "stressed" &&
    calculatedMood !== "sad"
  ) {
    calculatedMood = "happy";
    moodReason = "new commit detected"; // Reason priority for commit
  }

  // --- Final Mood Assignment in state ---
  pet.mood = calculatedMood;

  // --- RETURN MOOD AND REASON ---
  return { mood: calculatedMood, reason: moodReason }; // <-- Changed Return Value
}

// --- Export Functions ---
module.exports = { determineCurrentMood, updatePetStats };
