// lib/commands/hooks.js (Corrected template literal escaping)
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const execa = require('execa'); // Use execa directly for finding git dir if needed

// Helper to find the .git directory reliably
async function findGitDir() {
    try {
        // Try finding the .git directory path
        const { stdout } = await execa('git', ['rev-parse', '--git-dir'], { reject: false });
        if (stdout) {
            const gitDir = stdout.trim();
            // If .git dir is relative, resolve it relative to CWD
            // If it's absolute (like in worktrees), use it directly
            return path.resolve(process.cwd(), gitDir);
        }
        // Try finding the root of the repository as a fallback
        const { stdout: rootDir } = await execa('git', ['rev-parse', '--show-toplevel'], { reject: false });
         if (rootDir) {
             return path.join(rootDir.trim(), '.git');
         }
         return null; // Not found
    } catch (error) {
        // Handle cases where git command fails (e.g., not in a repo)
        return null;
    }
}


// --- Example Hook Scripts ---

// v2: Checks diff-index and passes --changes flag
const postCommitHookContent = `#!/bin/sh
# Git Pet post-commit hook script v2

# Check if HEAD is reachable (e.g., not initial commit)
if git rev-parse --verify HEAD >/dev/null 2>&1; then
    # Check if there are actual file changes compared to the parent
    # This handles merges better than diff-tree HEAD^ HEAD
    if ! git diff-index --quiet HEAD --; then
        echo "[GitPet Hook] Detected changes in commit, running react --changes..." >&2
        git-pet react post-commit --changes || true # Call react command, ignore errors
    else
        echo "[GitPet Hook] No file changes detected in commit, running react..." >&2
        git-pet react post-commit || true
    fi
else
    # Handle initial commit (always treat as having changes)
    echo "[GitPet Hook] Initial commit detected, running react --changes..." >&2
    git-pet react post-commit --changes || true
fi

# Important: Exit with 0 so git operation is not blocked
exit 0
`;

// v2: Basic check for conflict markers (less reliable)
// Passing --was-conflict reliably is difficult here. Commit messages or pre-commit checks are better.
const postMergeHookContent = `#!/bin/sh
# Git Pet post-merge hook script v2

# This hook runs after a successful merge commit is made.
# Determining if it *resolved* conflicts is tricky here.
# We'll just trigger the standard merge event for now.
# A more advanced setup might use pre-commit or commit-msg hooks.
WAS_CONFLICT_FLAG="" # Default to no conflict known

# --- Attempt to check commit message (heuristics, may fail) ---
# Get the commit message of the merge commit (HEAD)
MERGE_COMMIT_MSG=$(git log -1 --pretty=%B HEAD)
# Simple check for keywords often added by Git during conflict resolution
if echo "$MERGE_COMMIT_MSG" | grep -qiE 'conflict|conflicts|resolved'; then
    echo "[GitPet Hook] Merge commit message suggests conflicts were resolved." >&2
    # WAS_CONFLICT_FLAG="--was-conflict" # Uncomment cautiously if heuristic is reliable enough
fi
# --- End Heuristic Check ---

# Escape \$ characters for JavaScript template literals:
echo "[GitPet Hook] Merge finished, running react \${WAS_CONFLICT_FLAG}..." >&2
git-pet react post-merge \$WAS_CONFLICT_FLAG || true

exit 0
`;

// v2: Simple pre-push trigger
const prePushHookContent = `#!/bin/sh
# Git Pet pre-push hook script v2

# This hook runs *before* the push attempt.
# Details about what's being pushed are on stdin, but complex to parse reliably here.
# We'll just react to the *intent* to push.

echo "[GitPet Hook] Pre-push detected, running react..." >&2
git-pet react pre-push || true

# Must exit 0 to allow the push. Exit non-zero to block it.
exit 0
`;

// --- Add more hooks as needed (e.g., branch deletion) ---


module.exports = {
  command: 'hooks <action>',
  describe: 'Manage or show instructions for Git hooks',
  builder: (yargs) => {
     yargs
        .positional('action', {
             describe: 'Action to perform',
             type: 'string',
             // Add install/uninstall for automatic management
             choices: ['install', 'uninstall', 'install-instructions', 'uninstall-instructions'],
         })
         .option('force', { // Option for install command
             alias: 'f',
             type: 'boolean',
             description: 'Overwrite existing hooks during install',
             default: false
         });
  },
  handler: async (argv) => {

    const gitDir = await findGitDir();
    if (!gitDir && (argv.action === 'install' || argv.action === 'uninstall')) {
        console.error(chalk.red('Error: Could not find .git directory. Are you in a Git repository?'));
        return; // Cannot proceed with install/uninstall
    }
    const hooksDir = gitDir ? path.join(gitDir, 'hooks') : '.git/hooks'; // Use found dir or default for instructions

    // Hooks to manage automatically (add more as implemented)
    const hooksToManage = {
        'post-commit': postCommitHookContent,
        'post-merge': postMergeHookContent,
        'pre-push': prePushHookContent,
        // 'post-delete-branch': postDeleteBranchHookContent, // If implemented
    };
    const hookFileNames = Object.keys(hooksToManage);


    // --- Automatic Installation ---
    if (argv.action === 'install') {
        console.log(chalk.cyan(`Attempting to install Git Pet hooks in: ${hooksDir}`));
        try {
            await fs.ensureDir(hooksDir); // Ensure .git/hooks exists
        } catch (err) {
             console.error(chalk.red(`Error: Could not create hooks directory: ${hooksDir}`), err);
             console.error(chalk.red('Please check permissions.'));
             return;
        }

        let installedAny = false;
        for (const hookName in hooksToManage) {
            const hookPath = path.join(hooksDir, hookName);
            const content = hooksToManage[hookName];

            try {
                if (await fs.pathExists(hookPath) && !argv.force) {
                    console.warn(chalk.yellow(`Hook already exists: ${hookName}. Use --force to overwrite.`));
                    continue; // Skip if exists and not forcing
                }
                await fs.writeFile(hookPath, content, { mode: 0o755 }); // Write content and make executable (chmod +x)
                console.log(chalk.green(`Installed hook: ${hookName}`));
                installedAny = true;
            } catch (err) {
                console.error(chalk.red(`Failed to install hook ${hookName}:`), err);
                console.error(chalk.red('Check file permissions.'));
            }
        }
        if (installedAny) {
            console.log(chalk.cyan('Installation process complete. Hooks are now active.'));
        } else {
            console.log(chalk.grey('No new hooks were installed (possibly due to existing hooks without --force).'));
        }

    // --- Automatic Uninstallation ---
    } else if (argv.action === 'uninstall') {
        console.log(chalk.cyan(`Attempting to uninstall Git Pet hooks from: ${hooksDir}`));
         if (!await fs.pathExists(hooksDir)) {
              console.log(chalk.grey('Hooks directory not found. Nothing to uninstall.'));
              return;
         }

         let uninstalledAny = false;
         for (const hookName of hookFileNames) { // Iterate over known hook names
             const hookPath = path.join(hooksDir, hookName);
             try {
                  if (await fs.pathExists(hookPath)) {
                      // Optional: More robust check - read file content and see if it contains "Git Pet" or a specific marker?
                      // const currentContent = await fs.readFile(hookPath, 'utf-8');
                      // if (currentContent.includes('# Git Pet')) { ... }

                      await fs.remove(hookPath);
                      console.log(chalk.green(`Removed hook: ${hookName}`));
                      uninstalledAny = true;
                  }
             } catch (err) {
                  console.error(chalk.red(`Error removing hook ${hookName}:`), err);
                  console.error(chalk.red('Check file permissions.'));
             }
         }
         if (uninstalledAny) {
             console.log(chalk.cyan('Uninstallation complete.'));
         } else {
             console.log(chalk.grey('No Git Pet managed hooks found to uninstall.'));
         }

    // --- Manual Instructions ---
    } else if (argv.action === 'install-instructions') {
        const hookDirDisplay = chalk.yellow(hooksDir); // Display path (even if not found for auto)
        console.log(chalk.cyan.bold('--- Git Pet Hook Installation (Manual) ---'));
        console.log(`You can run ${chalk.inverse(' git pet hooks install ')} to attempt automatic setup.`);
        console.log(`Alternatively, manually create/edit the following files in ${hookDirDisplay}.`);
        console.log(`Make sure each file is executable: ${chalk.yellow('chmod +x <hook_file_path>')}\n`);

        console.log(chalk.bold(`1. ${hookDirDisplay}/post-commit`));
        console.log(chalk.greenBright(postCommitHookContent));
        console.log(chalk.dim('(Reacts after a commit)\n'));

        console.log(chalk.bold(`2. ${hookDirDisplay}/post-merge`));
        console.log(chalk.greenBright(postMergeHookContent));
        console.log(chalk.dim('(Reacts after a merge)\n'));

        console.log(chalk.bold(`3. ${hookDirDisplay}/pre-push`));
        console.log(chalk.greenBright(prePushHookContent));
        console.log(chalk.dim('(Reacts before a push attempt)\n'));

        // Add instructions for others...
        console.log(chalk.yellow.bold('Warning: Manual installation WILL overwrite existing hooks. Back up any custom hooks first!'));

    } else if (argv.action === 'uninstall-instructions') {
         const hookDirDisplay = chalk.yellow(hooksDir);
         console.log(chalk.cyan.bold('--- Git Pet Hook Uninstallation (Manual) ---'));
         console.log(`You can run ${chalk.inverse(' git pet hooks uninstall ')} to attempt automatic removal.`);
         console.log(`Alternatively, manually delete the Git Pet hook files (e.g., post-commit, post-merge, pre-push)`);
         console.log(`from your repository's ${hookDirDisplay} directory.`);
    }
  },
};