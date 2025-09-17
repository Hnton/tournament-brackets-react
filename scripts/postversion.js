#!/usr/bin/env node
const { execSync } = require('child_process');

try {
  console.log('Running postversion: pushing HEAD and tags to origin');
  // Use explicit refspecs to avoid npm appending args and causing invalid refspecs
  execSync('git push origin HEAD', { stdio: 'inherit' });
  execSync('git push origin --tags', { stdio: 'inherit' });
  console.log('Postversion push complete');
} catch (err) {
  console.error('Postversion push failed:', err.message || err);
  process.exit(1);
}
