#!/usr/bin/env node
// Lists reports/*/*.md into reports/index.json.
// The page fetches this manifest, then parses each file's frontmatter itself.
import { readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportsDir = join(root, 'reports');

function walk(dir) {
  const found = [];
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      found.push(full);
    }
  }
  return found;
}

const files = walk(reportsDir)
  .map((full) => {
    const rel = relative(root, full).split(sep).join('/');
    const parts = rel.split('/');
    return {
      path: rel,
      folder: parts[1] || '',
      file: parts[parts.length - 1]
    };
  })
  .sort((a, b) => (a.path < b.path ? 1 : a.path > b.path ? -1 : 0));

const manifest = {
  generated_at: new Date().toISOString(),
  reports: files
};

writeFileSync(join(reportsDir, 'index.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote reports/index.json (${files.length} files)`);
