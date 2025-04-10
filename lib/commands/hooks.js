// lib/commands/hooks.js (Auto-injects correct script path during install)
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const execa = require('execa');

// Helper to find the .git directory reliably
async function findGitDir() {
    try {
        const { stdout } = await execa('git', ['rev-parse', '--git-dir'], { reject: false });
        if (stdout) {
            const gitDir = stdout.trim();
            return path.resolve(process.cwd(), gitDir);
        }
        const { stdout: rootDir } = await execa('git', ['rev-parse', '--show-toplevel'], { reject: false });
         if (rootDir) {
             return path.join(rootDir.trim(), '.git');
         }
         return null; // Not found
    } catch (error) {
        return null;
    }
}

// --- Hook Script Templates (with placeholder) ---

const PLACEHOLDER = '%%GIT_PET_SCRIPT_PATH%%'; // Placeholder for the script path

// v4: Uses placeholder, compares HEAD to HEAD~1
const postCommitHookContentTemplate = `#!/bin/sh
# Git Pet post-commit hook script v4 (Path injected by install)

echo "[GitPet Hook DEBUG] Starting hook..." >&2
PARENT=\$(git rev-parse --verify HEAD~1 2>/dev/null)
echo "[GitPet Hook DEBUG] Parent SHA: '$PARENT'" >&2
CHANGES_DETECTED=true
if [ -n "$PARENT" ]; then
    echo "[GitPet Hook DEBUG] Parent found. Running: git diff --quiet '$PARENT' HEAD --" >&2
    git diff --quiet "$PARENT" HEAD --
    DIFF_EXIT_CODE=$?
    echo "[GitPet Hook DEBUG] git diff exit code: \$DIFF_EXIT_CODE" >&2
    if [ \$DIFF_EXIT_CODE -eq 0 ]; then
        echo "[GitPet Hook DEBUG] git diff found NO changes." >&2
        CHANGES_DETECTED=false
    else
         echo "[GitPet Hook DEBUG] git diff FOUND changes." >&2
         CHANGES_DETECTED=true
    fi
else
    echo "[GitPet Hook DEBUG] No parent found (initial commit?). Assuming changes." >&2
    CHANGES_DETECTED=true
fi
echo "[GitPet Hook DEBUG] Final CHANGES_DETECTED value: \$CHANGES_DETECTED" >&2

# Path to the git-pet script (injected by install command)
GIT_PET_SCRIPT_PATH="${PLACEHOLDER}"

if [ ! -f "\$GIT_PET_SCRIPT_PATH" ]; then
    echo "[GitPet Hook ERROR] Cannot find git-pet script at: \$GIT_PET_SCRIPT_PATH" >&2
    echo "[GitPet Hook ERROR] Try running 'git pet hooks install --force' again." >&2
    exit 0
fi

if \$CHANGES_DETECTED; then
    echo "[GitPet Hook DEBUG] Calling react with --changes via node..." >&2
    node "\$GIT_PET_SCRIPT_PATH" react post-commit --changes || true
else
    echo "[GitPet Hook DEBUG] Calling react without --changes via node..." >&2
    node "\$GIT_PET_SCRIPT_PATH" react post-commit || true
fi

echo "[GitPet Hook DEBUG] Hook finished." >&2
exit 0
`;

// v3: Uses placeholder
const postMergeHookContentTemplate = `#!/bin/sh
# Git Pet post-merge hook script v3 (Path injected by install)

echo "[GitPet Hook DEBUG] Starting post-merge hook..." >&2
WAS_CONFLICT_FLAG=""
MERGE_COMMIT_MSG=\$(git log -1 --pretty=%B HEAD)
if echo "\$MERGE_COMMIT_MSG" | grep -qiE 'conflict|conflicts|resolved'; then
    echo "[GitPet Hook DEBUG] Merge commit message suggests conflicts were resolved." >&2
    # WAS_CONFLICT_FLAG="--was-conflict" # Still potentially unreliable
fi

# Path to the git-pet script (injected by install command)
GIT_PET_SCRIPT_PATH="${PLACEHOLDER}"

if [ ! -f "\$GIT_PET_SCRIPT_PATH" ]; then
    echo "[GitPet Hook ERROR] Cannot find git-pet script at: \$GIT_PET_SCRIPT_PATH" >&2
    echo "[GitPet Hook ERROR] Try running 'git pet hooks install --force' again." >&2
    exit 0
fi

echo "[GitPet Hook DEBUG] Calling react post-merge (\${WAS_CONFLICT_FLAG}) via node..." >&2
node "\$GIT_PET_SCRIPT_PATH" react post-merge \$WAS_CONFLICT_FLAG || true

echo "[GitPet Hook DEBUG] Hook finished." >&2
exit 0
`;

// v3: Uses placeholder
const prePushHookContentTemplate = `#!/bin/sh
# Git Pet pre-push hook script v3 (Path injected by install)

echo "[GitPet Hook DEBUG] Starting pre-push hook..." >&2

# Path to the git-pet script (injected by install command)
GIT_PET_SCRIPT_PATH="${PLACEHOLDER}"

if [ ! -f "\$GIT_PET_SCRIPT_PATH" ]; then
    echo "[GitPet Hook ERROR] Cannot find git-pet script at: \$GIT_PET_SCRIPT_PATH" >&2
    echo "[GitPet Hook ERROR] Try running 'git pet hooks install --force' again." >&2
    exit 0 # Allow push even if hook script path is wrong
fi

echo "[GitPet Hook DEBUG] Calling react pre-push via node..." >&2
node "\$GIT_PET_SCRIPT_PATH" react pre-push || true

echo "[GitPet Hook DEBUG] Hook finished." >&2
exit 0 # Must exit 0 to allow the push
`;


module.exports = {
  command: 'hooks <action>',
  describe: 'Manage or show instructions for Git hooks',
  builder: (yargs) => {
     yargs
        .positional('action', {
             describe: 'Action to perform',
             type: 'string',
             choices: ['install', 'uninstall', 'install-instructions', 'uninstall-instructions'],
         })
         .option('force', {
             alias: 'f',
             type: 'boolean',
             description: 'Overwrite existing hooks during install',
             default: false
         });
  },
  handler: async (argv) => {

    const gitDir = await findGitDir();
    // For install/uninstall, we MUST find the git dir.
    if (!gitDir && (argv.action === 'install' || argv.action === 'uninstall')) {
        console.error(chalk.red('Error: Could not find .git directory. Are you in a Git repository?'));
        return;
    }
    const hooksDir = gitDir ? path.join(gitDir, 'hooks') : '.git/hooks'; // Use found dir or default for instructions

    // Templates to manage automatically
    const hookTemplates = {
        'post-commit': postCommitHookContentTemplate,
        'post-merge': postMergeHookContentTemplate,
        'pre-push': prePushHookContentTemplate,
    };
    const hookFileNames = Object.keys(hookTemplates);

    // --- Determine the absolute path to the main git-pet script ---
    // This assumes the standard structure where hooks.js is in lib/commands
    // and git-pet.js is in bin/ relative to the project root.
    // Using `require.main.filename` might be more robust if packaged differently,
    // but `__dirname` is often reliable during development or typical installs.
    let gitPetScriptPath = '';
    try {
        // Path from this file (lib/commands/hooks.js) to project root is '../../'
        // Then go to bin/git-pet.js
        const scriptPath = path.resolve(__dirname, '..', '..', 'bin', 'git-pet.js');
        // Verify it exists
        if (await fs.pathExists(scriptPath)) {
             gitPetScriptPath = scriptPath;
             // console.log(chalk.dim(`Found git-pet script at: ${gitPetScriptPath}`));
        } else {
             throw new Error(`Script not found at expected path: ${scriptPath}`);
        }
    } catch (err) {
         console.error(chalk.red('Error: Could not determine the path to the main git-pet.js script.'), err);
         console.error(chalk.red('Hook installation failed. Manual path editing might be required.'));
         // For instructions, we can proceed, but install/uninstall should fail.
         if (argv.action === 'install' || argv.action === 'uninstall') {
             return;
         }
    }


    // --- Automatic Installation ---
    if (argv.action === 'install') {
        if (!gitPetScriptPath) return; // Stop if path determination failed

        console.log(chalk.cyan(`Attempting to install Git Pet hooks in: ${hooksDir}`));
        try {
            await fs.ensureDir(hooksDir);
        } catch (err) {
             console.error(chalk.red(`Error: Could not create hooks directory: ${hooksDir}`), err);
             console.error(chalk.red('Please check permissions.'));
             return;
        }

        let installedAny = false;
        for (const hookName in hookTemplates) {
            const hookPath = path.join(hooksDir, hookName);
            const templateContent = hookTemplates[hookName];
            // Inject the correct script path into the template
            const finalContent = templateContent.replace(PLACEHOLDER, gitPetScriptPath);

            try {
                if (await fs.pathExists(hookPath) && !argv.force) {
                    console.warn(chalk.yellow(`Hook already exists: ${hookName}. Use --force to overwrite.`));
                    continue;
                }
                // Write the content with the injected path and make executable
                await fs.writeFile(hookPath, finalContent, { mode: 0o755 });
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
         for (const hookName of hookFileNames) {
             const hookPath = path.join(hooksDir, hookName);
             try {
                  if (await fs.pathExists(hookPath)) {
                      // Check if it looks like our hook before deleting?
                      // Read first few lines or check for the placeholder comment maybe.
                      const currentContent = await fs.readFile(hookPath, 'utf-8');
                      if (currentContent.includes('# Git Pet post-') || currentContent.includes('# Git Pet pre-')) {
                          await fs.remove(hookPath);
                          console.log(chalk.green(`Removed hook: ${hookName}`));
                          uninstalledAny = true;
                      } else {
                           console.log(chalk.grey(`Skipping non-Git-Pet hook: ${hookName}`));
                      }
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

    // --- Manual Instructions (Still useful fallback) ---
    } else if (argv.action === 'install-instructions') {
        const hookDirDisplay = chalk.yellow(hooksDir);
        console.log(chalk.cyan.bold('--- Git Pet Hook Installation (Manual) ---'));
        console.log(`Run ${chalk.inverse(' git pet hooks install ')} to attempt automatic setup.`);
        console.log(`Alternatively, manually create/edit the following files in ${hookDirDisplay}.`);
        console.log(`Make sure each file is executable: ${chalk.yellow('chmod +x <hook_file_path>')}\n`);
        console.log(chalk.yellow(`If installing manually, you MUST replace '${PLACEHOLDER}' in the scripts below`));
        console.log(chalk.yellow(`with the correct absolute path to 'bin/git-pet.js' (likely: ${gitPetScriptPath || '<Could not determine path>'})\n`));


        console.log(chalk.bold(`1. ${hookDirDisplay}/post-commit`));
        console.log(chalk.greenBright(postCommitHookContentTemplate)); // Show template
        console.log(chalk.dim('(Reacts after a commit)\n'));

        console.log(chalk.bold(`2. ${hookDirDisplay}/post-merge`));
        console.log(chalk.greenBright(postMergeHookContentTemplate)); // Show template
        console.log(chalk.dim('(Reacts after a merge)\n'));

        console.log(chalk.bold(`3. ${hookDirDisplay}/pre-push`));
        console.log(chalk.greenBright(prePushHookContentTemplate)); // Show template
        console.log(chalk.dim('(Reacts before a push attempt)\n'));

        console.log(chalk.yellow.bold('Warning: Manual installation WILL overwrite existing hooks. Back them up first!'));

    } else if (argv.action === 'uninstall-instructions') {
         const hookDirDisplay = chalk.yellow(hooksDir);
         console.log(chalk.cyan.bold('--- Git Pet Hook Uninstallation (Manual) ---'));
         console.log(`Run ${chalk.inverse(' git pet hooks uninstall ')} to attempt automatic removal.`);
         console.log(`Alternatively, manually delete the Git Pet hook files (e.g., post-commit, post-merge, pre-push)`);
         console.log(`from your repository's ${hookDirDisplay} directory.`);
    }
  },
};