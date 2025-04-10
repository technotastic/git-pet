// lib/commands/hooks.js (Cleaned Templates)
const chalk = require("chalk");
const path = require("path");
const fs = require("fs-extra");
const execa = require("execa");

// Helper to find the .git directory reliably
async function findGitDir() {
  /* ... same as before ... */
  try {
    const { stdout } = await execa("git", ["rev-parse", "--git-dir"], {
      reject: false,
    });
    if (stdout) {
      const gitDir = stdout.trim();
      return path.resolve(process.cwd(), gitDir);
    }
    const { stdout: rootDir } = await execa(
      "git",
      ["rev-parse", "--show-toplevel"],
      { reject: false }
    );
    if (rootDir) {
      return path.join(rootDir.trim(), ".git");
    }
    return null; // Not found
  } catch (error) {
    return null;
  }
}

// --- Hook Script Templates (Cleaned) ---

const PLACEHOLDER = "%%GIT_PET_SCRIPT_PATH%%";

// v4 Cleaned: Uses placeholder, compares HEAD to HEAD~1, passes 'changes' string
const postCommitHookContentTemplate = `#!/bin/sh
# Git Pet post-commit hook script v4 (Path injected by install)

PARENT=\$(git rev-parse --verify HEAD~1 2>/dev/null)
CHANGES_DETECTED=true
if [ -n "\$PARENT" ]; then
    if git diff --quiet "\$PARENT" HEAD --; then
        CHANGES_DETECTED=false
    fi
fi

# Path to the git-pet script (injected by install command)
GIT_PET_SCRIPT_PATH="${PLACEHOLDER}"

if [ ! -f "\$GIT_PET_SCRIPT_PATH" ]; then
    echo "[GitPet Hook ERROR] Cannot find git-pet script at: \$GIT_PET_SCRIPT_PATH" >&2
    echo "[GitPet Hook ERROR] Try running 'git pet hooks install --force' again." >&2
    exit 0
fi

if \$CHANGES_DETECTED; then
    # Pass 'changes' as a simple string argument
    node "\$GIT_PET_SCRIPT_PATH" react post-commit changes || true
else
    # No extra argument needed here
    node "\$GIT_PET_SCRIPT_PATH" react post-commit || true
fi

exit 0
`;

// v3 Cleaned: Uses placeholder
const postMergeHookContentTemplate = `#!/bin/sh
# Git Pet post-merge hook script v3 (Path injected by install)

WAS_CONFLICT_FLAG=""
# Basic heuristic check (optional, can be removed if too unreliable)
MERGE_COMMIT_MSG=\$(git log -1 --pretty=%B HEAD)
if echo "\$MERGE_COMMIT_MSG" | grep -qiE 'conflict|conflicts|resolved'; then
     # WAS_CONFLICT_FLAG="was-conflict" # Pass string if enabling
     : # No-op placeholder
fi

GIT_PET_SCRIPT_PATH="${PLACEHOLDER}"

if [ ! -f "\$GIT_PET_SCRIPT_PATH" ]; then
    echo "[GitPet Hook ERROR] Cannot find git-pet script at: \$GIT_PET_SCRIPT_PATH" >&2
    exit 0
fi

node "\$GIT_PET_SCRIPT_PATH" react post-merge \$WAS_CONFLICT_FLAG || true

exit 0
`;

// v3 Cleaned: Uses placeholder
const prePushHookContentTemplate = `#!/bin/sh
# Git Pet pre-push hook script v3 (Path injected by install)

GIT_PET_SCRIPT_PATH="${PLACEHOLDER}"

if [ ! -f "\$GIT_PET_SCRIPT_PATH" ]; then
    echo "[GitPet Hook ERROR] Cannot find git-pet script at: \$GIT_PET_SCRIPT_PATH" >&2
    exit 0 # Allow push even if hook script path is wrong
fi

node "\$GIT_PET_SCRIPT_PATH" react pre-push || true

exit 0 # Must exit 0 to allow the push
`;

module.exports = {
  command: "hooks <action>",
  describe: "Manage or show instructions for Git hooks",
  builder: (yargs) => {
    /* ... same as before ... */
    yargs
      .positional("action", {
        describe: "Action to perform",
        type: "string",
        choices: [
          "install",
          "uninstall",
          "install-instructions",
          "uninstall-instructions",
        ],
      })
      .option("force", {
        alias: "f",
        type: "boolean",
        description: "Overwrite existing hooks during install",
        default: false,
      });
  },
  handler: async (argv) => {
    /* ... same logic as before for finding path and installing/uninstalling ... */

    const gitDir = await findGitDir();
    if (!gitDir && (argv.action === "install" || argv.action === "uninstall")) {
      console.error(
        chalk.red(
          "Error: Could not find .git directory. Are you in a Git repository?"
        )
      );
      return;
    }
    const hooksDir = gitDir ? path.join(gitDir, "hooks") : ".git/hooks";

    const hookTemplates = {
      "post-commit": postCommitHookContentTemplate,
      "post-merge": postMergeHookContentTemplate,
      "pre-push": prePushHookContentTemplate,
    };
    const hookFileNames = Object.keys(hookTemplates);

    let gitPetScriptPath = "";
    try {
      const scriptPath = path.resolve(
        __dirname,
        "..",
        "..",
        "bin",
        "git-pet.js"
      );
      if (await fs.pathExists(scriptPath)) {
        gitPetScriptPath = scriptPath;
      } else {
        throw new Error(`Script not found at expected path: ${scriptPath}`);
      }
    } catch (err) {
      console.error(
        chalk.red(
          "Error: Could not determine the path to the main git-pet.js script."
        ),
        err
      );
      if (argv.action === "install" || argv.action === "uninstall") {
        return;
      }
    }

    if (argv.action === "install") {
      if (!gitPetScriptPath) return;
      console.log(
        chalk.cyan(`Attempting to install Git Pet hooks in: ${hooksDir}`)
      );
      try {
        await fs.ensureDir(hooksDir);
      } catch (err) {
        /* error handling */
        console.error(
          chalk.red(`Error: Could not create hooks directory: ${hooksDir}`),
          err
        );
        console.error(chalk.red("Please check permissions."));
        return;
      }
      let installedAny = false;
      for (const hookName in hookTemplates) {
        const hookPath = path.join(hooksDir, hookName);
        const templateContent = hookTemplates[hookName];
        const finalContent = templateContent.replace(
          PLACEHOLDER,
          gitPetScriptPath
        );
        try {
          if ((await fs.pathExists(hookPath)) && !argv.force) {
            console.warn(
              chalk.yellow(
                `Hook already exists: ${hookName}. Use --force to overwrite.`
              )
            );
            continue;
          }
          await fs.writeFile(hookPath, finalContent, { mode: 0o755 });
          console.log(chalk.green(`Installed hook: ${hookName}`));
          installedAny = true;
        } catch (err) {
          /* error handling */
          console.error(chalk.red(`Failed to install hook ${hookName}:`), err);
          console.error(chalk.red("Check file permissions."));
        }
      }
      if (installedAny) {
        console.log(
          chalk.cyan("Installation process complete. Hooks are now active.")
        );
      } else {
        console.log(
          chalk.grey(
            "No new hooks were installed (possibly due to existing hooks without --force)."
          )
        );
      }
    } else if (argv.action === "uninstall") {
      /* ... same uninstall logic ... */
      console.log(
        chalk.cyan(`Attempting to uninstall Git Pet hooks from: ${hooksDir}`)
      );
      if (!(await fs.pathExists(hooksDir))) {
        console.log(
          chalk.grey("Hooks directory not found. Nothing to uninstall.")
        );
        return;
      }
      let uninstalledAny = false;
      for (const hookName of hookFileNames) {
        const hookPath = path.join(hooksDir, hookName);
        try {
          if (await fs.pathExists(hookPath)) {
            const currentContent = await fs.readFile(hookPath, "utf-8");
            // Check for marker comment
            if (
              currentContent.includes("# Git Pet post-") ||
              currentContent.includes("# Git Pet pre-")
            ) {
              await fs.remove(hookPath);
              console.log(chalk.green(`Removed hook: ${hookName}`));
              uninstalledAny = true;
            } else {
              console.log(chalk.grey(`Skipping non-Git-Pet hook: ${hookName}`));
            }
          }
        } catch (err) {
          /* error handling */
          console.error(chalk.red(`Error removing hook ${hookName}:`), err);
          console.error(chalk.red("Check file permissions."));
        }
      }
      if (uninstalledAny) {
        console.log(chalk.cyan("Uninstallation complete."));
      } else {
        console.log(chalk.grey("No Git Pet managed hooks found to uninstall."));
      }
    } else if (argv.action === "install-instructions") {
      /* ... same instruction logic ... */
      const hookDirDisplay = chalk.yellow(hooksDir);
      console.log(
        chalk.cyan.bold("--- Git Pet Hook Installation (Manual) ---")
      );
      console.log(
        `Run ${chalk.inverse(
          " git pet hooks install "
        )} to attempt automatic setup.`
      );
      console.log(
        `Alternatively, manually create/edit the following files in ${hookDirDisplay}.`
      );
      console.log(
        `Make sure each file is executable: ${chalk.yellow(
          "chmod +x <hook_file_path>"
        )}\n`
      );
      console.log(
        chalk.yellow(
          `If installing manually, you MUST replace '${PLACEHOLDER}' in the scripts below`
        )
      );
      console.log(
        chalk.yellow(
          `with the correct absolute path to 'bin/git-pet.js' (likely: ${
            gitPetScriptPath || "<Could not determine path>"
          })\n`
        )
      );
      console.log(chalk.bold(`1. ${hookDirDisplay}/post-commit`));
      console.log(chalk.greenBright(postCommitHookContentTemplate));
      console.log(chalk.dim("(Reacts after a commit)\n"));
      console.log(chalk.bold(`2. ${hookDirDisplay}/post-merge`));
      console.log(chalk.greenBright(postMergeHookContentTemplate));
      console.log(chalk.dim("(Reacts after a merge)\n"));
      console.log(chalk.bold(`3. ${hookDirDisplay}/pre-push`));
      console.log(chalk.greenBright(prePushHookContentTemplate));
      console.log(chalk.dim("(Reacts before a push attempt)\n"));
      console.log(
        chalk.yellow.bold(
          "Warning: Manual installation WILL overwrite existing hooks. Back them up first!"
        )
      );
    } else if (argv.action === "uninstall-instructions") {
      /* ... same instruction logic ... */
      const hookDirDisplay = chalk.yellow(hooksDir);
      console.log(
        chalk.cyan.bold("--- Git Pet Hook Uninstallation (Manual) ---")
      );
      console.log(
        `Run ${chalk.inverse(
          " git pet hooks uninstall "
        )} to attempt automatic removal.`
      );
      console.log(
        `Alternatively, manually delete the Git Pet hook files (e.g., post-commit, post-merge, pre-push)`
      );
      console.log(`from your repository's ${hookDirDisplay} directory.`);
    }
  },
};
