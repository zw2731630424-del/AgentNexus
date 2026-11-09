// Read-only comparison with the frozen M1.8.3 build procedure; never runs the app.
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { join } from 'node:path';
const workspace = 'I:/AI_AgentNexus';
const root = join(workspace, 'deliverables/AgentNexus-M1.8.3/source');
const require = createRequire(join(workspace, 'deliverables/AgentNexus-Model-Provider-UI/source/package.json'));
const ts = require('typescript');
if (ts.version !== '5.9.3') throw Error('PINNED_COMPILER_MISMATCH');
const digest = x => createHash('sha256').update(x).digest('hex');
const results = [];
async function compare(relative) {
  for (const item of await readdir(join(root, relative), { withFileTypes: true })) {
    const rel = relative + '/' + item.name;
    if (item.isDirectory()) { await compare(rel); continue; }
    if (!item.isFile()) throw Error('NON_REGULAR_INPUT');
    const input = await readFile(join(root, rel));
    let expected = input;
    if (rel.endsWith('.ts')) {
      const source = input.toString('utf8').replace(/(from\s+['"][^'"]+)\.ts(['"])/g, '$1.js$2').replace(/(import\(['"][^'"]+)\.ts(['"]\))/g, '$1.js$2');
      const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2024, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true }, reportDiagnostics: true });
      if (compiled.diagnostics?.some(x => x.category === ts.DiagnosticCategory.Error)) throw Error('COMPILE_DIAGNOSTIC');
      expected = Buffer.from(compiled.outputText);
    }
    const destination = 'dist/' + rel.replace(/\.ts$/, '.js');
    let actual;
    try { actual = await readFile(join(root, destination)); } catch { actual = null; }
    results.push({ source: rel, destination, expected_sha256: digest(expected), actual_sha256: actual ? digest(actual) : null, result: actual?.equals(expected) ? 'PASS' : 'FAIL' });
  }
}
await compare('src'); await compare('config');
console.log(JSON.stringify({ schema: 'agentnexus.q1.readonly-build-comparison.v1', compiler_version: ts.version, checked_at_utc: new Date().toISOString(), source_modified: false, compiled_files_written: 0, application_executed: false, network_used: false, results, decision: results.every(x => x.result === 'PASS') ? 'PASS' : 'FAIL' }, null, 2));
if (results.some(x => x.result !== 'PASS')) process.exitCode = 1;
