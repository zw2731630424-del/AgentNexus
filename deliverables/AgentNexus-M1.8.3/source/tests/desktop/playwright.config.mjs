import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const out = process.env.AGENTNEXUS_UI_EVIDENCE ?? fileURLToPath(new URL('../../../raw/ui-' + new Date().toISOString().replace(/[:.]/g, '-') + '/', import.meta.url));
process.env.AGENTNEXUS_UI_EVIDENCE = out;
export default defineConfig({ testDir: '.', testMatch: 'desktop.spec.mjs', timeout: 120000, workers: 1, retries: 0, outputDir: out + '/artifacts', reporter: [['list'], ['json', { outputFile: out + '/results.json' }]], use: { trace: 'off', video: 'off', screenshot: 'off' } });
