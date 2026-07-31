/**
 * Runs live verification while retaining a browser preview and its downloaded assets.
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const previewDirectory = path.join(repositoryRoot, 'tests', 'live', 'output');
const result = spawnSync('pnpm', ['exec', 'vitest', 'run', 'tests/live/notion.test.ts'], {
  cwd: repositoryRoot,
  env: { ...process.env, NOTION_LIVE_PREVIEW_DIR: previewDirectory },
  stdio: 'inherit',
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

console.log(`Live preview: ${path.join(previewDirectory, 'index.html')}`);
