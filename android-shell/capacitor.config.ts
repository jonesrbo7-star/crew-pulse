import type { CapacitorConfig } from '@capacitor/cli';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readServerUrl(): string {
  const fromEnv = process.env.CAP_SERVER_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  const file = resolve(process.cwd(), 'server.url');
  if (!existsSync(file)) return '';
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .find((item) => item.length > 0 && !item.startsWith('#'));
  return line || '';
}

const url = readServerUrl();

const config: CapacitorConfig = {
  appId: 'dev.crewpulse.shell',
  appName: 'Crew',
  webDir: 'www'
};

if (/^https?:\/\//i.test(url)) {
  config.server = {
    url,
    cleartext: url.startsWith('http://')
  };
}

export default config;
