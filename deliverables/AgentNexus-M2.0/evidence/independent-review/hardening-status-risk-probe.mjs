import { mkdtemp, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const runtime = dirname(fileURLToPath(import.meta.url));
const source = new URL('../../../../deliverables/AgentNexus-M2.0/source/', import.meta.url);
const { defaultProfile, resolveFeatures } = await import(new URL('src/agentnexus/security/profile.ts', source));
const { SecurityController } = await import(new URL('src/agentnexus/security/controller.ts', source));
const environment = () => ({ osStorage: true, storageAssurance: 'REAL', service: false, qualified: [] });
const root = await mkdtemp(join(runtime, 'hardening-status-risk-'));
const controller = SecurityController.open(root, environment);
let result;
try {
  const hardened = defaultProfile('HARDENED_DEPLOYMENT_MODE');
  hardened.features['budget.global'] = false;
  const plan = controller.preview(hardened, 0);
  const feature = plan.target.find(f => f.id === 'budget.global');
  const risk = plan.risks.find(r => r.startsWith('budget.global:'));
  assert.equal(feature.desired, false); assert.equal(feature.status, 'BLOCKED');
  assert.match(risk, /requested disable is BLOCKED/); assert.match(risk, /not acknowledged as disabled/);
  assert.doesNotMatch(risk, /will stop/);
  const local = defaultProfile(); local.features['budget.global'] = false;
  assert.equal(resolveFeatures(local, environment()).find(f => f.id === 'budget.global').status, 'DISABLED');
  result = { status: 'PASS', scope: 'SYNTHETIC_PROFILE_RESOLUTION_AND_PLAN_TEXT_ONLY', root, realProviderRequests: 0, osQualification: 'NOT_RUN', hardenedDesired: feature.desired, hardenedStatus: feature.status, risk, localDisabledStatus: 'DISABLED' };
} finally { controller.close(); }
await writeFile(join(runtime, 'hardening-status-risk-probe.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
