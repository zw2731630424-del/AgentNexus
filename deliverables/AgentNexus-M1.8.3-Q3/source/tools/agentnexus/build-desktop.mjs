import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const candidates = [join(root, 'package.json'), fileURLToPath(new URL('../../../../AgentNexus-Model-Provider-UI/source/package.json', import.meta.url))];
const tools = candidates.find(p => existsSync(join(p, '../node_modules/typescript/package.json')));
if (!tools) throw new Error('PINNED_DESKTOP_TYPE_TOOLS_MISSING');
const require = createRequire(tools), ts = require('typescript');
if (ts.version !== '5.9.3') throw new Error('PINNED_DESKTOP_TYPE_TOOLS_MISMATCH');
async function build(relative) {
  for (const item of await readdir(join(root, relative), { withFileTypes: true })) {
    const rel = join(relative, item.name), destination = join(root, 'dist', rel.replace(/\.ts$/, '.js'));
    if (item.isDirectory()) { await build(rel); continue; }
    await mkdir(join(destination, '..'), { recursive: true });
    if (rel.endsWith('.ts')) {
      const source = (await readFile(join(root, rel), 'utf8')).replace(/(from\s+['"][^'"]+)\.ts(['"])/g, '$1.js$2').replace(/(import\(['"][^'"]+)\.ts(['"]\))/g, '$1.js$2');
      const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true }, reportDiagnostics: true });
      if (compiled.diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error)) throw new Error('DESKTOP_BUILD_FAILED:' + rel);
      await writeFile(destination, compiled.outputText);
    } else await copyFile(join(root, rel), destination);
  }
}
await build('src'); await build('config');
process.stdout.write('Desktop Host compiled; renderer and preload use native modules.\n');
