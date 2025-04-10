#!/usr/bin/env node

// Removed debug log


// Handle potential ES Module loading if needed
// ...

// Or for CommonJS:
try {
    require('../lib/cli.js');
} catch (error) {
     console.error("[ERROR bin/git-pet.js] Failed to load cli.js:", error);
     process.exit(1);
}