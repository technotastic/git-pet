// lib/commands/react.js (Cleaned)
const {
  loadState,
  saveState,
  getExpToNextLevel,
  levelingConfig,
} = require("../state");
const chalk = require("chalk"); // Keep chalk for regular output
const moment = require("moment");

// --- Helper Functions ---
// (awardExp and unlockAchievement functions remain the same - no debug logs added there)
/**
 * Awards EXP to the pet and handles level ups.
 * MUTATES the state object directly.
 */
async function awardExp(state, amount, reason) {
  if (!amount || amount <= 0) return false;
  const pet = state.globalPet;
  const levelBefore = pet.level;
  pet.experience += amount;
  console.log(
    chalk.greenBright(`+${amount} EXP`) +
      chalk.dim(` (${reason})`) +
      chalk.greenBright(`! | Total EXP: ${pet.experience}`)
  );
  let leveledUp = false;
  let expToNext = getExpToNextLevel(pet.level);
  while (pet.experience >= expToNext) {
    pet.level++;
    const levelExpCost = expToNext;
    pet.experience -= levelExpCost;
    leveledUp = true;
    console.log(
      chalk.cyanBright.bold(
        `\n*** LEVEL UP! ${pet.name} reached Level ${pet.level}! ***\n`
      )
    );
    pet.happiness = Math.min(100, (pet.happiness || 50) + 20);
    pet.hunger = Math.min(100, (pet.hunger || 50) + 10);
    expToNext = getExpToNextLevel(pet.level);
  }
  if (leveledUp) {
    if (pet.level >= 5)
      await unlockAchievement(state, "REACH_LEVEL_5", "Reached Level 5");
    if (pet.level >= 10)
      await unlockAchievement(state, "REACH_LEVEL_10", "Reached Level 10");
    console.log(
      chalk.cyan(
        ` -> EXP towards Level ${pet.level + 1}: ${
          pet.experience
        } / ${expToNext}\n`
      )
    );
  }
  return leveledUp;
}

/**
 * Unlocks an achievement if not already unlocked, awarding bonus EXP.
 * MUTATES the state object directly.
 */
async function unlockAchievement(state, achievementKey, achievementReason) {
  if (!state.globalPet.achievements) {
    state.globalPet.achievements = {};
  }
  if (!state.globalPet.achievements[achievementKey]) {
    const reward = levelingConfig.rewards[achievementKey];
    console.log(
      chalk.yellowBright.bold(
        `\n*** Achievement Unlocked: ${achievementReason}! ***\n`
      )
    );
    state.globalPet.achievements[achievementKey] = moment().toISOString();
    if (reward > 0) {
      await awardExp(state, reward, `Achievement Bonus: ${achievementReason}`);
    }
    return true;
  }
  return false;
}

// --- Main Handler Logic (handleReactCommand - Cleaned) ---
/**
 * Processes a Git event triggered by a hook.
 */
async function handleReactCommand(event, hookArgs = []) {
  let state;
  try {
    state = await loadState();
    // Removed debug log
    if (!state.globalPet.achievements) state.globalPet.achievements = {};

    console.log(
      chalk.dim(
        `Reacting to event: ${chalk.magenta(event)} with args: [${hookArgs.join(
          ", "
        )}]`
      )
    ); // Keep this minimal log

    let expAwarded = 0;
    let reason = "";
    let achievementKey = null;
    let achievementReason = "";

    switch (event) {
      case "post-commit":
        const changesMade = hookArgs.includes("changes");
        // Removed debug log
        if (changesMade) {
          // Removed debug log
          expAwarded = levelingConfig.rewards.COMMIT_WITH_CHANGES;
          reason = "Commit with Changes";
          achievementKey = "FIRST_COMMIT";
          achievementReason = "First Commit!";
        } else {
          console.log(
            chalk.grey(
              "React: Skipping EXP for commit - hook provided no changes argument."
            )
          );
        }
        break;

      case "post-merge":
        const wasConflict = hookArgs.includes("was-conflict");
        // Removed debug log
        if (wasConflict) {
          expAwarded = levelingConfig.rewards.RESOLVE_CONFLICT;
          reason = "Conflict Resolved (hook indicated)";
          achievementKey = "FIRST_CONFLICT_RESOLVED";
          achievementReason = "Resolved First Conflict";
        } else {
          expAwarded = levelingConfig.rewards.MERGE_SUCCESS;
          reason = "Branch Merged";
          achievementKey = "FIRST_MERGE";
          achievementReason = "First Merge!";
        }
        break;
      case "pre-push":
        // Removed debug log
        expAwarded = levelingConfig.rewards.PUSH_CHANGES;
        reason = "Push Attempted";
        break;
      case "branch-deleted":
        const wasOld = hookArgs.includes("was-old");
        const wasMerged = hookArgs.includes("was-merged");
        // Removed debug log
        if (wasOld || wasMerged) {
          expAwarded = levelingConfig.rewards.CLEAN_BRANCH;
          reason = wasOld
            ? "Old Branch Cleaned"
            : wasMerged
            ? "Merged Branch Cleaned"
            : "Cleaned Branch";
        } else {
          /* skip */
        }
        break;

      default:
        console.warn(
          chalk.yellow(`React: Unknown event type received: ${event}`)
        );
        break;
    }

    if (expAwarded > 0) {
      await awardExp(state, expAwarded, reason);
    }
    if (achievementKey && achievementReason) {
      await unlockAchievement(state, achievementKey, achievementReason);
    }
  } catch (error) {
    console.error(
      chalk.red(
        `Error processing react event '${event}' with args [${hookArgs.join(
          ", "
        )}]:`
      ),
      error
    );
  } finally {
    if (state) {
      await saveState(state);
    } else {
      console.error(chalk.red("React: State was not loaded, cannot save."));
    }
  }
}

// --- Yargs Command Definition (Simplified V3 - Cleaned) ---
module.exports = {
  command: "react",
  describe:
    "Internal command for reacting to Git events (usually called by hooks)",
  builder: (yargs) => {
    yargs
      .strict(false) // Allow any arguments after 'react'
      .hide("react");
  },
  handler: async (argv) => {
    // Removed debug logs
    if (argv._.length < 2) {
      console.error(
        chalk.red(
          'React handler Error: No event name provided after "react". Aborting.'
        )
      );
      return;
    }
    const event = argv._[1];
    const hookArgs = argv._.slice(2);
    // Removed debug logs
    await handleReactCommand(event, hookArgs);
  },
};
