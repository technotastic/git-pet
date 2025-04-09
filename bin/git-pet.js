#!/usr/bin/env node

// Handle potential ES Module loading if needed
// (async () => {
//  if (process.env.NODE_ENV !== 'production') {
//      // Potentially setup source map support for dev
//  }
//  await import('../lib/cli.js'); // Assuming cli.js is ESM
// })();

// Or for CommonJS:
require('../lib/cli.js');