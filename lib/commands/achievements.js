// lib/commands/achievements.js
const { loadState, levelingConfig } = require('../state'); // Need state and config
const chalk = require('chalk');
const moment = require('moment');

// Define known achievements details (User-facing descriptions)
// Keys MUST match achievement keys used in react.js and levelingConfig.rewards
const knownAchievements = {
    // --- Milestones ---
    FIRST_COMMIT: { name: "First Commit!", description: "Made your first commit since Git Pet started watching." },
    FIRST_MERGE: { name: "Merge Master!", description: "Successfully merged a branch for the first time." },
    FIRST_CONFLICT_RESOLVED: { name: "Conflict Conqueror!", description: "Resolved your first merge conflict (based on hook info)." },
    // --- Leveling ---
    REACH_LEVEL_5: { name: "Level 5!", description: "Reached Level 5. Keep it up!" },
    REACH_LEVEL_10: { name: "Level 10!", description: "Reached Level 10. Impressive!" },
    // --- Actions (Add if you want specific achievements for actions beyond first) ---
    // e.g., PUSH_MASTER: { name: "Push Master", description: "Pushed changes 10 times." }, // Requires tracking push count
    // e.g., BRANCH_CLEANER: { name: "Branch Cleaner", description: "Cleaned up 5 old/merged branches." }, // Requires tracking clean count

    // Add descriptions for all achievement keys defined in levelingConfig.rewards that are meant to be unlockable achievements
};

module.exports = {
  command: 'achievements',
  aliases: ['ach', 'awards', 'trophies'],
  describe: 'List unlocked achievements and their dates',
  handler: async (argv) => {
    console.log(chalk.cyanBright.bold('--- Git Pet Achievements ---'));
    const state = await loadState();

    // Ensure achievements object exists and is an object
    const unlocked = (typeof state.globalPet.achievements === 'object' && state.globalPet.achievements !== null)
                     ? state.globalPet.achievements
                     : {};
    const unlockedKeys = Object.keys(unlocked);

    if (unlockedKeys.length === 0) {
        console.log(chalk.grey('\n(No achievements unlocked yet! Keep using Git!)'));
    } else {
        console.log(chalk.grey(`\nUnlocked ${unlockedKeys.length} achievement(s):\n`));

        // Sort keys maybe? Alphabetical or by date? By date is harder as value is timestamp.
        // unlockedKeys.sort((a, b) => moment(unlocked[a]).diff(moment(unlocked[b]))); // Sort by unlock time

        unlockedKeys.forEach(key => {
            const achievementInfo = knownAchievements[key];
            const name = achievementInfo?.name || key.replace(/_/g, ' '); // Fallback name formatting
            const description = achievementInfo?.description;
            const timestamp = unlocked[key]; // Should be ISO string timestamp
            const dateString = timestamp ? chalk.dim(` (Unlocked: ${moment(timestamp).format('YYYY-MM-DD HH:mm')})`) : '';
            const bonusExp = levelingConfig.rewards[key]; // Get potential bonus EXP
            const expString = (bonusExp && achievementInfo) // Only show EXP for defined achievements
                              ? chalk.greenBright(` [+${bonusExp} EXP Bonus]`)
                              : '';

            console.log(`- ${chalk.yellowBright('🏆')} ${chalk.bold(name)}${expString}`);
            if (description) {
                 console.log(`    ${chalk.grey(description)}${dateString}`);
            } else {
                // If no description, show date on the main line
                console.log(`    ${dateString}`);
            }
            console.log(''); // Add a blank line for separation
        });
    }
    console.log(chalk.cyanBright.bold('--------------------------'));
  },
};