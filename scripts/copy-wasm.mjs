// Copies the Swiss Ephemeris WASM + data files into public/ so the browser can fetch them.
import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'public'), { recursive: true });
cpSync(join(root, 'node_modules/swisseph-wasm/wasm'), join(root, 'public/wasm'), { recursive: true });
console.log('Copied swisseph wasm -> public/wasm');
