import { invariant } from '../types.ts';
import type { ToolCapability } from '../gateway.ts';

export const EXECUTION_PROFILES: Readonly<Record<ToolCapability,string>> = Object.freeze({
  PURE:'TRUSTED_LOCAL_HANDLER_OR_ISOLATED_WORKER', READ_ONLY:'TRUSTED_LOCAL_HANDLER_OR_READ_ONLY_OS_PROFILE',
  LOCAL_WRITE:'M12_EXACT_APPROVAL_WRITER_OR_VERIFIED_FILE_BROKER', PROCESS:'VERIFIED_OS_PROCESS_TREE_PROFILE',
  EXTERNAL_EFFECT:'VERIFIED_OS_PROFILE_AND_EXTERNAL_OWNER',
});
/** Independent process dispatch owner. This build deliberately has no executable fallback. */
export class ExecutionBroker {
  dispatch(_request: unknown): never { invariant(false,'BROKER_OS_DEPLOYMENT_BLOCKED'); }
  status() { return Object.freeze({ status:'BLOCKED', identity:'PRIMITIVE_ONLY', filesystem:'NOT_VERIFIED', network:'NOT_VERIFIED', process_tree:'PRIMITIVE_ONLY', arbitrary_execution:false }); }
}
