# Q3 native Daily candidate

This is an offline implementation candidate. Compilation and pure fixtures do
not qualify a deployed Windows boundary. No install, service start, UAC, account,
persistent ACL/system change, real Key or provider request was performed here.

The existing fixed `AgentNexusCredential.exe` also contains the fixed
`--daily-runtime` entry. The service creates that entry suspended with its own
independent virtual-service identity, a service-owned protected process/thread
descriptor and only three explicitly inherited private stdio handles. It retains
the process handle and a one-process kill-on-close Job. No caller supplies an
executable, command, environment, loader, plugin, Subject authority or work path.
The existing Deployment checks pin the service/client/Node/engine and complete
application manifest, and retain read locks. There is no additional runtime
executable whose digest could be omitted from that closure.

Management remains on `AgentNexus.Credential.v1` with its High mandatory label.
Daily is a separate local message pipe `AgentNexus.Daily.v1`, with Medium MIC and
the configured operator's exact rights mask `0x00120183`. That mask excludes
`FILE_CREATE_PIPE_INSTANCE`; no GENERIC_WRITE operator ACE is used. All four
initial server handles are retained and reused. Every complete Daily request is
followed by actual pipe-writer impersonation; the configured SID, exact Medium
integrity, non-elevated/non-AppContainer token, Windows session and token logon
AuthenticationId are read directly from that message token. Its Windows session
must match the kernel pipe connection session; SID/session/logon and the kernel
connection PID remain bound for the connection. The service does not assume it
can query an ordinary operator process or its primary token. PID, image path and
digest do not grant the caller authority. Runtime identity/liveness comes from
the service-created child and its retained process handle, not the public client.

The public allowlist is `snapshot`, `daily.prepare`, `daily.execute`,
`request.cancel`, `stream.ack`. Public JSON cannot provide peer facts or native
lifecycle methods. Native generates a fresh channel and Runtime GUID; its
private relay emits `{channel,peer,request}` with a trusted `DAILY_RUNTIME` peer.
The TypeScript gateway validates the existing exact signed consent before
binding Subject scope and uses the existing Egress, once-only grant and shared
ledger code. A same-user Medium caller may reach this restricted surface; the
native relay does not claim to distinguish an injected UI from another process
with the same SID. It gives neither a new consent-signing API nor arbitrary
Subject/egress authority to such a caller.

Only the service process/token receives narrowly scoped operator query rights
so the Medium adapter can verify the SCM-registered server token. The service
and token owner are explicitly the service SID; query grants provide no memory,
duplicate-handle, injection, token-duplication or write rights. The native Runtime
process/thread remain service-only (plus trusted SYSTEM/Administrators).

The adapter entry is fixed:

```powershell
& 'C:\Program Files\AgentNexus\pipe-client.exe' --daily --stdio
```

It uses strict bounded NDJSON over stdio and requests granular pipe rights with
Identification SQOS. It verifies the SCM process/token and process creation
before every send and after every receive. Medium does not read the protected
Key/config tree. Runtime/pipe expiry, crash or disconnect retires the old channel,
kills the fixed relay, and sends the private `session.disconnect` lifecycle to
the engine. Submissions, responses and retirement share a session barrier, so
late messages cannot reach a recycled connection. Runtime lifetime is at most
five minutes, with a thirty-second idle bound. A later new client connection
gets a new Runtime; old grants and provider requests are never replayed. The UI
may reconnect for a new operation, not resume a previously sent request.

The native session admits at most sixty ordinary outstanding RPC IDs, with four
additional slots reserved for cancellation and a four-MiB aggregate pending
request-byte cap. Duplicate active IDs close the channel. Only terminal engine
responses release a slot; stream deltas do not. ACKs require the active execute
ID and exactly one matching delivered sequence, rather than creating unbounded
unanswered requests. Retirement clears the window. These pure resource limits
complement the engine's separate output-queue byte cap.
Up to sixty-four completed execute tombstones allow one matching late final ACK
from a callback that raced cancellation to be consumed locally; they do not
forward or revive the completed request. Duplicate or forged ACKs are rejected.

Offline compilation and pure fixtures only:

```powershell
& .\build.ps1
```

Outputs and `build-report.json` are under the workspace
`.workflow-kit/runtime/AgentNexus-M1.8.3-Q3/native/`. This command does not invoke
the following installed-target mode.

After a separate exact deployment/test approval, on an already installed benign
`QUALIFICATION_ONLY` target, this compiled collector is runnable as Medium:

```powershell
& 'C:\Program Files\AgentNexus\pipe-client.exe' --approved-os-probe APPROVED-<external-test-reference>
```

The reference records the separate approval; supplying a string is not itself
approval. The collector verifies the real server and its qualification-only
snapshot before exercising it. It records service process/token and owned fixed
Runtime process access attempts, Medium snapshot, pipe-instance denial, denied
management method, forged peer and self-registration disconnects. It never
reads/writes process memory, injects code, generates a dump, starts arbitrary
programs, changes a service/account/system setting or submits a model request.
No request/response payload or Key is printed to evidence. Its case references
reuse the historical 70-case Windows attack matrix; they are partial observations,
not blanket PASS results. Thread/token-handoff attacks, real helper canary/UI
tests, runtime kill/restart races, remote/cross-session tokens, actual pipe ACL
readback, ledger crash points and the remaining cases still require separate
targeted execution and evidence. That collector was not run in this task.

Actual virtual-account startup, object ownership/ACL application, identification
token behavior, process creation, message-pipe behavior, MIC enforcement,
cross-session rejection and crash/expiry cancellation remain NOT_RUN on the
deployed target. If any native setup/proof fails the service/client closes or
blocks; pure fixtures cannot convert these items into Windows qualification.

The signed qualification gate now requires nineteen evidence categories. The
four new categories are `daily_native_runtime_origin`,
`daily_medium_pipe_boundary`, `daily_runtime_process_token_isolation`, and
`daily_runtime_lifecycle_revocation`. Their template maps to the original
70-case IDs and defaults to NOT_RUN; this is not four additional OS test passes.
Old Q2 evidence that lacks these categories is rejected, even before its pinned
binary identities are considered. Qualified mode still requires every exact
category to have separately signed, host/binary-bound PASS evidence.
