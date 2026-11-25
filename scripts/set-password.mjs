#!/usr/bin/env node
// Rewrites PASSWORD_HASH in config/site.js.
// Usage: node scripts/set-password.mjs <password>
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const password = process.argv[2];
if (!password) {
  console.error('usage: node scripts/set-password.mjs <password>');
  process.exit(1);
}

const hash = createHash('sha256').update(password, 'utf8').digest('hex');
const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'config', 'site.js');
const source = readFileSync(file, 'utf8');
const pattern = /PASSWORD_HASH:\s*"[a-fA-F0-9]{64}"/;
if (!pattern.test(source)) {
  console.error('PASSWORD_HASH was not found in config/site.js');
  process.exit(1);
}
const next = source.replace(pattern, `PASSWORD_HASH: "${hash}"`);

writeFileSync(file, next);
console.log(hash);
