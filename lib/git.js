// lib/git.js
const execa = require('execa'); // Use execa for better process handling
const moment = require('moment');
const chalk = require('chalk');

async function runGit(args) {
  try {
    // console.log(chalk.dim(`Running: git ${args.join(' ')}`)); // For debugging
    const { stdout, stderr, failed, exitCode } = await execa('git', args, { reject: false }); // Don't reject on non-zero exit
    if (failed || exitCode !== 0) {
        // Handle common non-fatal errors gracefully (e.g., 'not a git repository')
        if (stderr.includes('not a git repository')) {
            return { error: 'Not currently in a Git repository.', output: null, stderr };
        }
        console.warn(chalk.yellow(`Git command 'git ${args.join(' ')}' failed (exit code ${exitCode}). Stderr:`));
        console.warn(chalk.yellow(stderr || 'No stderr output.'));
        return { error: `Git command failed: ${stderr}`, output: null, stderr };
    }
    return { error: null, output: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    console.error(chalk.red(`Critical error running git command 'git ${args.join(' ')}':`), error);
    return { error: `Failed to execute git: ${error.message}`, output: null, stderr: '' };
  }
}

async function getRepoState() {
  // Check if it's a git repo first
  const rootCheck = await runGit(['rev-parse', '--show-toplevel']);
   if (rootCheck.error) {
       // Handle case where user is not in a git repo
       if (rootCheck.stderr?.includes('not a git repository')) {
            return { isGitRepo: false, error: 'Not currently in a Git repository.' };
       }
       return { isGitRepo: false, error: rootCheck.error || 'Failed to determine git repository root.' };
   }

  // Run commands in parallel for efficiency
  const [statusResult, logResult, branchResult] = await Promise.all([
    runGit(['status', '--porcelain']), // Faster, parseable status
    runGit(['log', '-1', '--format=%ct']), // Get commit timestamp of HEAD
    runGit(['branch', '--show-current']) // Get current branch name
  ]);

   // Basic error checking after parallel execution
   if (statusResult.error || logResult.error || branchResult.error) {
       console.warn(chalk.yellow('One or more git commands failed while checking repo state.'));
       // Decide how to handle partial failure, maybe return partial data or a specific error state
   }

  // Parse Status
  let hasUncommittedChanges = false;
  let hasConflicts = false;
  if (statusResult.output) {
      hasUncommittedChanges = statusResult.output.length > 0;
      hasConflicts = statusResult.output.split('\n').some(line => line.startsWith('UU'));
  }

  // Parse Log Timestamp
  let lastCommitTimestamp = null;
  if (logResult.output && /^\d+$/.test(logResult.output)) {
    lastCommitTimestamp = moment.unix(parseInt(logResult.output, 10)).toISOString();
  }

  // Current Branch
  const currentBranch = branchResult.output || 'detached HEAD'; // Handle detached HEAD

  return {
    isGitRepo: true,
    hasUncommittedChanges,
    hasConflicts,
    lastCommitTimestamp,
    currentBranch,
    error: null // Explicitly null if successful check
  };
}

module.exports = { getRepoState, runGit };