# Git Pet 🐾

[![License](https://img.shields.io/github/license/technotastic/git-pet)](https://github.com/technotastic/git-pet/blob/main/LICENSE)

Your interactive Git repository Tamagotchi-inspired pet in the terminal! Watch your pet's mood change based on your Git activity, feed it, play with it, and level it up by being a productive developer.

```
--- gitty (happy) ---
  .--.
 / ^.^\\
 \\ \\_/ /
 /\\__/\\
(_\\** /_)
  "  "
✨
Mood: happy (New commit detected)
Hunger: 85/100
Happiness: 92/100
Level: 2
EXP:   15 / 150 [==------------------]
```

---

## Features ✨

*   **Visual Pet:** An ASCII art pet that lives in your terminal.
*   **Mood Dynamics:** Pet's mood (happy, sad, stressed, bored, thinking) reflects your repository's state:
    *   Uncommitted changes
    *   Merge conflicts
    *   Remote sync status (ahead/behind)
    *   Commit frequency
    *   Branch health (old branches)
*   **Basic Needs:** Hunger and Happiness stats decay over time.
*   **Interaction:** `feed` and `play` with your pet to keep it happy. Give it a `name`!
*   **Leveling System:** Gain Experience Points (EXP) for performing Git actions like committing changes, merging branches, and pushing code.
*   **Achievements:** Unlock achievements for Git milestones (first commit, first merge, reaching levels, etc.). 🏆
*   **Hook Integration:** Install simple Git hooks (`post-commit`, `pre-push`, etc.) to make your pet react automatically to your actions and gain EXP.
*   **Configuration:** Customize behavior like remote status checks via the `config` command.

## Installation 🚀

Make sure you have [Node.js](https://nodejs.org/) (v14 or later recommended) installed.

Install Git Pet globally using npm:

```bash
npm install -g git-pet
```

This will install the `git-pet` command globally, making it available in any directory.

## Usage 🔧

Navigate to any Git repository and run commands:

*   **Check Status (Default):**
    ```bash
    git-pet status
    # Or simply:
    git-pet
    ```

*   **Feed your Pet:**
    ```bash
    git-pet feed
    ```

*   **Play with your Pet:**
    ```bash
    git-pet play
    ```

*   **Name your Pet:**
    ```bash
    git-pet name GittyMcGitface
    ```

*   **View Detailed Summary:**
    ```bash
    git-pet summary
    ```

*   **List Unlocked Achievements:**
    ```bash
    git-pet achievements
    ```

*   **Configure Settings:**
    ```bash
    git-pet config list                       # See current config
    git-pet config set checkRemoteStatus true # Enable remote checks
    ```

*   **Install Git Hooks (Recommended!):**
    *   Run this *inside* your Git repository.
    *   This enables automatic EXP gain and reactions.
    ```bash
    git-pet hooks install
    # Use --force to overwrite existing hooks if needed
    ```

*   **Get Help:**
    ```bash
    git-pet --help
    ```

## Git Hooks

Installing hooks via `git-pet hooks install` places small scripts in your repository's `.git/hooks/` directory. These scripts automatically run the internal `git-pet react <event> [args]` command after certain Git actions (like commits or merges), allowing Git Pet to award EXP and potentially unlock achievements based on your workflow. The installation command automatically determines the correct path to the main `git-pet` script.

## Resetting Your Pet

If you want to start over with a completely new pet (resetting name, stats, level, EXP, and achievements back to defaults), you need to manually delete the global state file.

The pet's data is stored at: `~/.config/git-pet/state.json`

**To reset your pet:**

1.  Open your terminal.
2.  Run the command:
    ```bash
    rm ~/.config/git-pet/state.json
    ```

**Note:** Running `npm uninstall -g git-pet` removes the application, but **does not** remove this state file. The state file will be automatically recreated with defaults the next time you run a `git-pet` command after deleting it.

## Completely Uninstalling Git Pet

If you wish to remove Git Pet entirely from your system, including the command, all persistent data, and any installed repository hooks, follow these steps:

1.  **Uninstall Hooks from Repositories:**
    *   Git hooks are installed *per repository*. You need to uninstall them from each repository where you previously ran `git pet hooks install`.
    *   **Method 1 (Recommended):** Navigate into each relevant repository directory in your terminal and run:
        ```bash
        git pet hooks uninstall
        ```
    *   **Method 2 (Manual):** Alternatively, you can manually delete the specific hook files created by Git Pet (commonly `post-commit`, `post-merge`, `pre-push`) from the `.git/hooks/` directory within each repository. Be careful not to delete other custom hooks you might have.

2.  **Remove Global State and Configuration:**
    *   This deletes your pet's persistent data (stats, level, achievements, etc.) and any custom configurations.
    *   Run the following command in your terminal to remove the directory:
        ```bash
        rm -r ~/.config/git-pet/
        ```
        *(This removes both the `state.json` file and the containing directory).*

3.  **Uninstall the Global Command:**
    *   This removes the `git-pet` command itself from your system.
    *   Run the following command in your terminal:
        ```bash
        npm uninstall -g git-pet
        ```

After completing these three steps, Git Pet should be fully removed from your system.

## Contributing

Contributions, bug reports, and feature requests are welcome! Please feel free to open an Issue or Pull Request on the [GitHub repository](https://github.com/technotastic/git-pet).

## License

This project is licensed under the MIT License.

---

*Happy coding, and take care of your Git Pet!*
