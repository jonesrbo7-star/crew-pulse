#!/usr/bin/env node
// Checks markdown under reports/ against the fixed frontmatter fields.
// Identity is bot_id. The display name does not have to match the registry.
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const yaml = require('../vendor/js-yaml.min.js');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const crew = JSON.parse(readFileSync(join(root, 'config', 'crew.json'), 'utf8'));
const errors = [];
const warnings = [];
// These words must stay out of the page chrome (headings, role/tag labels, source names). Body text may use them.
const bannedWords = ['系统', '看板', '报告'];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

if (!crew || !Array.isArray(crew.bots)) fail('config/crew.json needs a bots array');
const bots = Array.isArray(crew.bots) ? crew.bots : [];
const ids = new Set();
for (const bot of bots) {
  for (const key of ['bot_id', 'en_name', 'display_order']) {
    if (bot[key] === undefined || bot[key] === '') fail(`bot missing ${key}`);
  }
  if (ids.has(bot.bot_id)) fail(`duplicate bot_id ${bot.bot_id}`);
  ids.add(bot.bot_id);
  if (bot.color != null && !/^#[0-9A-Fa-f]{6}$/.test(String(bot.color))) fail(`bad color for ${bot.bot_id}`);
  if (!(Number(bot.cadence_hours) > 0)) fail(`cadence_hours for ${bot.bot_id}`);
  if (bot.role != null && [...String(bot.role)].length > 8) fail(`role for ${bot.bot_id} is longer than 8 characters`);
  if (bot.tag != null && ([...String(bot.tag)].length < 2 || [...String(bot.tag)].length > 3)) fail(`tag for ${bot.bot_id} must be 2–3 characters`);
  if (bot.folder != null && !/^[a-z][a-z0-9-]{1,23}$/.test(String(bot.folder))) fail(`folder for ${bot.bot_id} must be lowercase a-z, 0-9 or -`);
  for (const field of ['en_name', 'role', 'tag']) {
    for (const word of bannedWords) {
      if (bot[field] != null && String(bot[field]).includes(word)) fail(`${field} for ${bot.bot_id} contains ${word}`);
    }
  }
}
const folders = new Map();
for (const bot of bots) {
  if (bot.folder == null) continue;
  if (folders.has(bot.folder)) fail(`folder ${bot.folder} used by both ${folders.get(bot.folder)} and ${bot.bot_id}`);
  folders.set(bot.folder, bot.bot_id);
}

const fileName = /^(\d{4}-\d{2}-\d{2})-(\d{4})\.md$/;
const stamp = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):\d{2}[+-]\d{2}:\d{2}$/;

function walk(dir, found) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, found);
    else if (entry.endsWith('.md')) found.push(full);
  }
}

const files = [];
walk(join(root, 'reports'), files);

for (const full of files) {
  const rel = full.slice(root.length + 1).split(/[\\/]/).join('/');
  const name = rel.split('/').pop();
  const named = name.match(fileName);
  if (!named) {
    fail(`${rel} filename must be YYYY-MM-DD-HHmm.md`);
    continue;
  }
  const text = readFileSync(full, 'utf8');
  const fenced = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!fenced) {
    fail(`${rel} missing frontmatter`);
    continue;
  }
  let data;
  try {
    data = yaml.load(fenced[1]);
  } catch (error) {
    fail(`${rel} YAML: ${error.message}`);
    continue;
  }
  for (const key of ['bot_id', 'en_name', 'timestamp', 'status', 'summary', 'sources']) {
    if (!data || data[key] === undefined) fail(`${rel} missing ${key}`);
  }
  if (!data) continue;
  if (!ids.has(data.bot_id)) fail(`${rel} bot_id ${data.bot_id} is not registered`);
  if (!['ok', 'warn', 'down'].includes(data.status)) fail(`${rel} bad status ${data.status}`);
  if (typeof data.summary !== 'string' || !data.summary.trim() || data.summary.includes('\n')) {
    fail(`${rel} summary must be one line`);
  }
  const when = String(data.timestamp || '');
  const matched = when.match(stamp);
  if (!matched) fail(`${rel} timestamp must be ISO 8601 with a numeric offset`);
  else if (`${matched[1]}-${matched[2]}${matched[3]}` !== `${named[1]}-${named[2]}`) {
    fail(`${rel} filename clock does not match timestamp ${when}`);
  }
  if (data.role != null && [...String(data.role)].length > 8) fail(`${rel} role is longer than 8 characters`);
  if (data.tag != null) {
    const tagLength = [...String(data.tag)].length;
    if (tagLength < 2 || tagLength > 3) fail(`${rel} tag must be 2–3 characters`);
  }
  if (data.signal_strength != null) {
    const strength = Number(data.signal_strength);
    if (!Number.isFinite(strength) || strength < 0 || strength > 100) fail(`${rel} signal_strength out of 0–100`);
  }
  if (data.style != null && data.style !== 'fable') fail(`${rel} style must be fable or omitted`);
  if (data.flow != null) {
    if (!Array.isArray(data.flow)) fail(`${rel} flow must be a list`);
    else data.flow.forEach((step, index) => {
      if (!step || !['signal', 'path', 'impact'].includes(step.stage)) fail(`${rel} flow[${index}].stage`);
      if (!step || typeof step.text !== 'string' || !step.text.trim()) fail(`${rel} flow[${index}].text`);
    });
  }
  if (!Array.isArray(data.sources) || data.sources.length === 0) fail(`${rel} sources must be a non-empty list`);
  else data.sources.forEach((source, index) => {
    if (!source || typeof source.name !== 'string' || !source.name.trim()) fail(`${rel} sources[${index}].name`);
    if (!source || (source.url != null && source.url !== '' && (typeof source.url !== 'string' || !/^https?:\/\//i.test(source.url)))) fail(`${rel} sources[${index}].url`);
    if (!source || !['news', 'paper', 'patent'].includes(source.type)) fail(`${rel} sources[${index}].type`);
  });
  const body = text.slice(fenced[0].length);
  if (!body.trim()) fail(`${rel} empty body`);

  // Folder must belong to the registered bot (when the registry names a folder).
  const owner = bots.find((bot) => bot.bot_id === data.bot_id);
  const folder = rel.split('/')[1];
  if (owner && owner.folder != null && owner.folder !== folder) fail(`${rel} lives in reports/${folder}/ but ${data.bot_id} uses reports/${owner.folder}/`);

  // UI chrome must not carry the banned words: role, tag, source names, headings.
  const chrome = [data.role, data.tag, ...(Array.isArray(data.sources) ? data.sources.map((x) => x && x.name) : [])]
    .concat(body.split(/\r?\n/).filter((line) => /^#{1,6}\s/.test(line)));
  for (const piece of chrome) {
    for (const word of bannedWords) {
      if (piece != null && String(piece).includes(word)) fail(`${rel} chrome text contains ${word}: ${String(piece).slice(0, 40)}`);
    }
  }

  // Fable shape: citation chips must map to a source, and the reading sections must be there.
  if (data.style === 'fable') {
    const listed = Array.isArray(data.sources) ? data.sources.length : 0;
    const pre = body.split(/^## 来源\s*$/m)[0];
    const chips = [...pre.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
    if (chips.length && Math.max(...chips) > listed) fail(`${rel} chip [${Math.max(...chips)}] has no matching source (only ${listed})`);
    for (const heading of ['先看要点', '把握与缺口', '下一步', '来源']) {
      if (!new RegExp(`^## ${heading}\\s*$`, 'm').test(body)) fail(`${rel} fable shape is missing "## ${heading}"`);
    }
    const listItems = (body.split(/^## 来源\s*$/m)[1] || '').split(/\r?\n/).filter((line) => /^\d+\.\s/.test(line.trim())).length;
    if (listItems !== listed) fail(`${rel} 来源 list has ${listItems} entries but frontmatter sources has ${listed}`);
  }
  if (typeof data.summary === 'string' && /(…|\.\.\.)$/.test(data.summary.trim())) warn(`${rel} summary ends with an ellipsis (the page falls back to the first body paragraph)`);
}

const indexPath = join(root, 'reports', 'index.json');
if (existsSync(indexPath)) {
  const index = JSON.parse(readFileSync(indexPath, 'utf8'));
  const listed = new Set((index.reports || []).map((item) => item.path));
  const expected = files.map((full) => full.slice(root.length + 1).split(/[\\/]/).join('/'));
  for (const path of expected) {
    if (!listed.has(path)) fail(`reports/index.json missing ${path} — run node scripts/build-index.mjs`);
  }
  for (const path of listed) {
    if (!expected.includes(path)) fail(`reports/index.json has extra ${path} — run node scripts/build-index.mjs`);
  }
}

for (const message of warnings) console.warn(`warn: ${message}`);
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exit(1);
}
console.log(`ok (${bots.length} bots, ${files.length} files)`);
