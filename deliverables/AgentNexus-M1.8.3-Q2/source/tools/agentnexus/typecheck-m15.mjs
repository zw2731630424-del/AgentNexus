import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../../', import.meta.url));
const workspace = fileURLToPath(new URL('../../../../../', import.meta.url));
const expected = { node: '24.15.0', typescript: '5.9.3', nodeTypes: '24.10.1' };
if (process.versions.node !== expected.node) throw new Error(`Node ${expected.node} required; found ${process.versions.node}`);

// Local npm ci is supported for a standalone source bundle. The workspace run uses
// isolated, lockfile-pinned tools, without installing packages into the candidate.
const candidates = [
  ...(process.env.AGENTNEXUS_TYPE_TOOLS ? [resolve(process.env.AGENTNEXUS_TYPE_TOOLS, 'node_modules')] : []),
  join(root, 'node_modules'),
  ...(existsSync(join(workspace, '.workflow-kit', 'governance', 'policy.json'))
    ? [join(workspace, '.workflow-kit', 'runtime', 'AgentNexus-M1.5', 'type-tools', 'node_modules')] : []),
];
const modules = candidates.find(path => existsSync(join(path, 'typescript', 'lib', 'tsc.js')) && existsSync(join(path, '@types', 'node', 'package.json')));
if (!modules) throw new Error('Pinned type tools unavailable. Run npm ci --ignore-scripts, or set AGENTNEXUS_TYPE_TOOLS to the isolated tools root.');
const metadata = path => JSON.parse(readFileSync(path, 'utf8'));
const compilerVersion = metadata(join(modules, 'typescript', 'package.json')).version;
const typesVersion = metadata(join(modules, '@types', 'node', 'package.json')).version;
if (compilerVersion !== expected.typescript || typesVersion !== expected.nodeTypes) throw new Error(`Type tool version mismatch: TypeScript ${compilerVersion}, @types/node ${typesVersion}`);

process.stdout.write(`Node ${expected.node}; TypeScript ${compilerVersion}; @types/node ${typesVersion}; strict noEmit NodeNext; full src/tests/tools\n`);
const result = spawnSync(process.execPath, [
  join(modules, 'typescript', 'lib', 'tsc.js'), '--project', join(root, 'tsconfig.json'),
  '--typeRoots', join(modules, '@types'), '--pretty', 'false',
], { cwd: root, stdio: 'inherit', shell: false, windowsHide: true });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
