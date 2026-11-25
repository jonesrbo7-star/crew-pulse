#!/usr/bin/env node
// Checks registered bots' markdown against the fixed frontmatter fields.
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const yaml = require('../vendor/js-yaml.min.js');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const crew = JSON.parse(readFileSync(join(root, 'config', 'crew.json'), 'utf8'));
const errors = [];

function fail(message) {
  errors.push(message);
}

if (!crew || !Array.isArray(crew.bots)) {
  fail('config/crew.json needs a bots array');
}

const bots = Array.isArray(crew.bots) ? crew.bots : [];
const seenIds = new Set();
const seenFolders = new Set();

for (const bot of bots) {
  for (const key of ['bot_id', 'en_name', 'folder', 'display_order']) {
    if (bot[key] === undefined || bot[key] === '') fail(`bot missing ${key}: ${JSON.stringify(bot)}`);
  }
  if (seenIds.has(bot.bot_id)) fail(`duplicate bot_id ${bot.bot_id}`);
  if (seenFolders.has(bot.folder)) fail(`duplicate folder ${bot.folder}`);
  seenIds.add(bot.bot_id);
  seenFolders.add(bot.folder);
  if (!/^[a-z0-9-]+$/.test(String(bot.folder))) {
    fail(`folder must be lowercase ascii: ${bot.folder}`);
  }
}

const fileName = /^(\d{4}-\d{2}-\d{2})-(\d{4})\.md$/;
const stamp = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):\d{2}[+-]\d{2}:\d{2}$/;

for (const bot of bots) {
  const dir = join(root, 'reports', bot.folder);
  if (!existsSync(dir)) continue;
  const names = readdirSync(dir).filter((name) => name.endsWith('.md')).sort();
  for (const name of names) {
    const where = `reports/${bot.folder}/${name}`;
    const named = name.match(fileName);
    if (!named) {
      fail(`${where} filename must be YYYY-MM-DD-HHmm.md`);
      continue;
    }
    const text = readFileSync(join(dir, name), 'utf8');
    const fenced = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!fenced) {
      fail(`${where} missing frontmatter`);
      continue;
    }
    let data;
    try {
      data = yaml.load(fenced[1]);
    } catch (error) {
      fail(`${where} YAML: ${error.message}`);
      continue;
    }
    if (!data || typeof data !== 'object') {
      fail(`${where} frontmatter is empty`);
      continue;
    }
    for (const key of ['bot_id', 'en_name', 'timestamp', 'status', 'summary', 'sources']) {
      if (data[key] === undefined) fail(`${where} missing ${key}`);
    }
    if (data.bot_id !== bot.bot_id) fail(`${where} bot_id ${data.bot_id} != ${bot.bot_id}`);
    if (data.en_name !== bot.en_name) fail(`${where} en_name ${data.en_name} != ${bot.en_name}`);
    if (!['ok', 'warn', 'down'].includes(data.status)) fail(`${where} bad status ${data.status}`);
    if (typeof data.summary !== 'string' || !data.summary.trim() || data.summary.includes('\n')) {
      fail(`${where} summary must be one line`);
    }
    const when = String(data.timestamp || '');
    const matched = when.match(stamp);
    if (!matched) fail(`${where} timestamp must be ISO 8601 with a numeric offset`);
    else if (`${matched[1]}-${matched[2]}${matched[3]}` !== `${named[1]}-${named[2]}`) {
      fail(`${where} filename clock does not match timestamp ${when}`);
    }
    if (!Array.isArray(data.sources) || data.sources.length === 0) {
      fail(`${where} sources must be a non-empty list`);
    } else {
      data.sources.forEach((source, index) => {
        if (!source || typeof source.name !== 'string' || !source.name.trim()) {
          fail(`${where} sources[${index}].name`);
        }
        if (!source || typeof source.url !== 'string' || !/^https?:\/\//i.test(source.url)) {
          fail(`${where} sources[${index}].url`);
        }
      });
    }
    const body = text.slice(fenced[0].length).trim();
    if (!body) fail(`${where} empty body`);
  }
}

const indexPath = join(root, 'reports', 'index.json');
if (existsSync(indexPath)) {
  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  const listed = new Set((index.reports || []).map((item) => item.path));
  const expected = [];
  for (const bot of bots) {
    const dir = join(root, 'reports', bot.folder);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (name.endsWith('.md')) expected.push(`reports/${bot.folder}/${name}`);
    }
  }
  for (const path of expected) {
    if (!listed.has(path)) fail(`reports/index.json missing ${path} — run node scripts/build-index.mjs`);
  }
  for (const path of listed) {
    if (!expected.includes(path)) fail(`reports/index.json has extra ${path} — run node scripts/build-index.mjs`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log(`ok (${bots.length} bots)`);
