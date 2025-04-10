#!/usr/bin/env node

// --- START DEBUG LOGGING ---
console.log('[DEBUG bin/git-pet.js] Raw process.argv:', process.argv);
// --- END DEBUG LOGGING ---


// Handle potential ES Module loading if needed
// (async () => {
//  if (process.env.NODE_ENV !== 'production') {
//      // Potentially setup source map support for dev
//  }
//  await import('../lib/cli.js'); // Assuming cli.js is ESM
// })();

// Or for CommonJS:
try {
    require('../lib/cli.js');
} catch (error) {
     console.error("[ERROR bin/git-pet.js] Failed to load cli.js:", error);
     process.exit(1); // Exit if CLI can't load
}