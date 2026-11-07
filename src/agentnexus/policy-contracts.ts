// Reviewed runtime policy identities. Catalog prose never grants execution authority.
export const POLICY_CONTRACTS: Readonly<Record<string, readonly [string, boolean, string]>> = Object.freeze({
  "P.IDENTITY": [
    "L0",
    false,
    "\u53ef\u4fe1IPC\u8eab\u4efd\u4e0e\u80fd\u529bBroker"
  ],
  "P.FS_SCOPE": [
    "L0",
    false,
    "OS\u6267\u884c\u5668/\u53e5\u67c4\u6388\u6743"
  ],
  "P.REVIEW_RO": [
    "L0",
    false,
    "OS\u53ea\u8bfb\u8eab\u4efd/\u6302\u8f7d"
  ],
  "P.ARCHIVE_APPEND": [
    "L0",
    false,
    "Archive Writer/\u6587\u4ef6ACL"
  ],
  "P.SECRET_BOUNDARY": [
    "L0",
    false,
    "Credential Broker/\u6a21\u578b\u51fa\u53e3"
  ],
  "P.DB_ATOMIC": [
    "L0",
    false,
    "\u552f\u4e00\u7ea6\u675f/\u6761\u4ef6\u4e8b\u52a1"
  ],
  "P.EXPERIMENT_ONCE": [
    "L0",
    false,
    "\u72ec\u7acb\u5b9e\u9a8cCapability/\u6570\u636e\u5e93"
  ],
  "P.WORKSPACE_WRITER": [
    "L0",
    false,
    "Broker\u79df\u7ea6/OS\u8fdb\u7a0b\u6811"
  ],
  "P.BUDGET_HARD": [
    "L0",
    false,
    "Model Gateway\u539f\u5b50\u989d\u5ea6"
  ],
  "P.ADMIN_MODE": [
    "L0",
    false,
    "\u72ec\u7acb\u7ba1\u7406Broker/\u5ba1\u8ba1\u5e93"
  ],
  "P.APPROVAL_REPLAY": [
    "L0",
    false,
    "\u6267\u884c\u8bb8\u53ef\u5b58\u50a8/\u539f\u5b50consume"
  ],
  "P.TOOL_CONTRACT": [
    "L0",
    false,
    "Tool Gateway/\u6267\u884c\u5668"
  ],
  "P.GIT_PUBLISH": [
    "L1",
    true,
    "PDP/PEP/Approval Service"
  ],
  "P.DATA_DELETE": [
    "L1",
    true,
    "PDP/PEP/Approval Service"
  ],
  "P.INSTALL": [
    "L1",
    true,
    "PDP/PEP/Approval Service"
  ],
  "P.PROJECT_RULE_CHANGE": [
    "L1",
    true,
    "PDP/PEP/Approval Service"
  ],
  "P.EXPERIMENT_APPROVAL": [
    "L1",
    false,
    "\u72ec\u7acb\u79d1\u7814\u6267\u884c\u6388\u6743\u670d\u52a1"
  ],
  "P.BUDGET_INCREASE": [
    "L1",
    false,
    "Model Gateway\u7ba1\u7406\u5458\u914d\u7f6e"
  ],
  "P.REVIEW_BINDING": [
    "L2",
    true,
    "ReviewResult schema/\u96c6\u6210\u670d\u52a1"
  ],
  "P.WORKFLOW_GATES": [
    "L2",
    true,
    "Workflow Runtime"
  ],
  "P.SCIENTIFIC_CLAIM": [
    "L2",
    true,
    "\u8bc1\u636e/\u72ec\u7acb\u5ba1\u67e5"
  ],
  "P.STYLE": [
    "L3",
    true,
    "\u89c4\u5219\u63d0\u793a/\u53ef\u9009linter"
  ],
  "P.AUDIT_REQUIRED": [
    "L0",
    false,
    "Audit Writer / Tool Gateway"
  ],
  "P.ARTIFACT_INTEGRITY": [
    "L0",
    false,
    "Artifact Store"
  ],
  "P.EVIDENCE_DOMAINS": [
    "L0",
    false,
    "Archive / Audit / Decision owners"
  ],
  "P.REPLAY_READONLY": [
    "L0",
    false,
    "Task Reconstruction API"
  ],
  "P.DI_NOEXEC": [
    "L0",
    false,
    "Diagnostic Process Adapter"
  ],
  "P.DI_SYNTAX": [
    "L2",
    true,
    "Development Intelligence / PDP"
  ],
  "P.DI_ARGUMENTS": [
    "L2",
    true,
    "Versioned CLI Schema / PDP"
  ],
  "P.DI_ENVIRONMENT": [
    "L2",
    true,
    "Environment Checker / PDP"
  ],
  "P.COMMAND_RISK": [
    "L1",
    true,
    "PDP / Approval Service"
  ],
  "P.SANDBOX_CAPABILITY": [
    "L0",
    false,
    "Capability Broker / Sandbox"
  ],
  "P.PACKAGE_INTEGRITY": [
    "L0",
    false,
    "Native Package Verifier"
  ],
  "P.RESOURCE_BOUNDS": [
    "L0",
    false,
    "Stream / Queue / Process owners"
  ]
});
for (const contract of Object.values(POLICY_CONTRACTS)) Object.freeze(contract);
