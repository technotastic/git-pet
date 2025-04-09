// lib/git.js (Complete with config check)
const execa = require('execa');
const moment = require('moment');
const chalk = require('chalk');
const { loadState } = require('./state'); // <-- Import loadState

// =======================================================
// runGit, getBranchInfo, checkRemoteStatus functions
// remain exactly the same as the previous complete version.
// Ensure they are present here in your actual file.
// (Pasting them again for absolute clarity)
// =======================================================

/**
 * Runs a git command asynchronously and handles basic errors.
 * @param {string[]} args - Array of arguments to pass to the git command.
 * @returns {Promise<{error: string|null, output: string|null, stderr: string|null}>}
 */
async function runGit(args) {
  try {
    const { stdout, stderr, failed, exitCode } = await execa('git', args, { reject: false });
    if (failed || exitCode !== 0) {
        if (stderr?.includes('not a git repository')) {
            return { error: 'Not currently in a Git repository.', output: null, stderr };
        }
        if (stderr?.includes('no upstream configured')) {
            // Let checkRemoteStatus handle this case based on output
        } else {
            console.warn(chalk.yellow(`Git command 'git ${args.join(' ')}' failed (exit code ${exitCode}). Stderr:`));
            console.warn(chalk.yellow(stderr || 'No stderr output.'));
        }
        const returnError = stderr?.includes('no upstream configured') ? null : `Git command failed: ${stderr}`;
        return { error: returnError, output: stdout?.trim() ?? null, stderr: stderr?.trim() ?? null };
    }
    return { error: null, output: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    console.error(chalk.red(`Critical error running git command 'git ${args.join(' ')}':`), error);
    return { error: `Failed to execute git: ${error.message}`, output: null, stderr: null };
  }
}

/**
 * Gets information about local branches sorted by commit date.
 * @returns {Promise<{error: string|null, branches: Array<{name: string, lastCommit: moment.Moment}>}>}
 */
async function getBranchInfo() {
    const format = '%(refname:short)%09%(committerdate:unix)';
    const branchResult = await runGit(['branch', '--list', '--format=' + format, '--sort=-committerdate']);
    if (branchResult.error) {
        return { error: branchResult.error, branches: [] };
    }
    if (!branchResult.output) {
         return { error: null, branches: [] };
    }
    const branches = branchResult.output.split('\n')
      .map(line => {
        const parts = line.split('\t');
        const name = parts[0]?.trim();
        const timestampStr = parts[1]?.trim();
        if (name && timestampStr && /^\d+$/.test(timestampStr)) {
            return { name: name, lastCommit: moment.unix(parseInt(timestampStr, 10)) };
        }
        return null;
    }).filter(Boolean);
    return { error: null, branches };
}

/**
 * Checks the ahead/behind status relative to the upstream branch after fetching.
 * @returns {Promise<{error: string|null, ahead: number, behind: number}>}
 */
async function checkRemoteStatus() {
    const fetchResult = await runGit(['remote', 'update']);
    if (fetchResult.error && !fetchResult.stderr?.includes('no remote repositories configured') && !fetchResult.stderr?.includes('could not prune')) {
        console.warn(chalk.yellow('Failed to run git remote update:'), fetchResult.stderr || fetchResult.error);
        return { error: `Failed to update remote status: ${fetchResult.stderr || fetchResult.error}`, ahead: 0, behind: 0 };
    } else if (fetchResult.stderr?.includes('no remote repositories configured')) {
         return { error: null, ahead: 0, behind: 0 };
    }

    const statusResult = await runGit(['status', '-uno', '--branch']);
    if (statusResult.error) {
         if (statusResult.stderr?.includes('no upstream configured')) {
             return { error: null, ahead: 0, behind: 0 };
         }
         return { error: statusResult.error, ahead: 0, behind: 0 };
    }
    if (!statusResult.output) {
         return { error: 'Failed to get status output.', ahead: 0, behind: 0 };
    }

    let ahead = 0;
    let behind = 0;
    const aheadMatch = statusResult.output.match(/ahead (\d+)/);
    if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
    const behindMatch = statusResult.output.match(/behind (\d+)/);
    if (behindMatch) behind = parseInt(behindMatch[1], 10);
    return { error: null, ahead, behind };
}


// =======================================================
// Updated getRepoState Function
// =======================================================

/**
 * Gets the overall state of the current Git repository, respecting config.
 * @returns {Promise<object>} Object containing various repo state properties.
 */
async function getRepoState() {
  // --- Load configuration FIRST ---
  let state;
  let shouldCheckRemote = false; // Default to false
  try {
     state = await loadState();
     // Check if remote check is explicitly enabled in config
     shouldCheckRemote = state?.config?.checkRemoteStatus === true;
     // console.log(chalk.dim(`Remote check status configured to: ${shouldCheckRemote}`)); // For debugging config load
  } catch (loadError) {
      console.error(chalk.red('Failed to load state for configuration check:'), loadError);
      // Proceed with remote check disabled if state load fails
      shouldCheckRemote = false;
  }

  // --- Check if it's a git repo and get root ---
  const rootCheck = await runGit(['rev-parse', '--show-toplevel']);
   if (rootCheck.error) {
       return { isGitRepo: false, error: rootCheck.error };
   }
   const repoRootDir = rootCheck.output;

  // --- Prepare list of promises to run ---
  const promises = [
    runGit(['status', '--porcelain']),           // Check for changes/conflicts
    runGit(['log', '-1', '--format=%ct']),      // Get timestamp of last commit
    runGit(['branch', '--show-current']),       // Get current branch name
    // Conditionally add the remote check promise based on config
    shouldCheckRemote
        ? checkRemoteStatus()
        : Promise.resolve({ error: null, ahead: 0, behind: 0 }), // Return default if disabled
    getBranchInfo()                             // Get list of branches + commit dates
  ];

  // --- Execute promises in parallel ---
  const results = await Promise.all(promises).catch(err => {
       console.error(chalk.red('Critical error during parallel git calls:'), err);
       return [ // Return default error structure matching promise order
            {error: 'Parallel check failed'},
            {error: 'Parallel check failed'},
            {error: 'Parallel check failed'},
            {error: 'Parallel check failed', ahead:0, behind:0},
            {error: 'Parallel check failed', branches:[]}
        ];
   });

    // --- Destructure results ---
    // Note: Index 3 is now potentially the resolved default if remote check was off
    const [statusResult, logResult, branchResult, remoteResult, branchListResult] = results;

    // --- Parse Results (with null/error checks) ---
    let hasUncommittedChanges = false;
    let hasConflicts = false;
    if (statusResult && !statusResult.error && statusResult.output != null) {
        hasUncommittedChanges = statusResult.output.length > 0;
        hasConflicts = statusResult.output.split('\n').some(line => line.startsWith('UU'));
    }

    let lastCommitTimestamp = null;
    if (logResult && !logResult.error && logResult.output && /^\d+$/.test(logResult.output)) {
      lastCommitTimestamp = moment.unix(parseInt(logResult.output, 10)).toISOString();
    }

    const currentBranch = (branchResult && !branchResult.error && branchResult.output) ? branchResult.output : 'detached HEAD';

    // Combine potential errors (less likely for remoteResult if check disabled)
    const combinedError = statusResult?.error || logResult?.error || branchResult?.error || remoteResult?.error || branchListResult?.error || null;


    // --- Construct Final State Object ---
    return {
        isGitRepo: true,
        repoRootDir,
        hasUncommittedChanges,
        hasConflicts,
        lastCommitTimestamp,
        currentBranch,
        // Use the values from remoteResult, which will be {0,0} if check was skipped
        aheadCount: remoteResult?.ahead || 0,
        behindCount: remoteResult?.behind || 0,
        branches: branchListResult?.branches || [],
        error: combinedError
    };
}


// Export the necessary functions
module.exports = { getRepoState, runGit /* others potentially needed later */ };