"""Recheck the frozen Q3 sources without modifying the Q3 tree or installing.

Only diagnostic binaries and isolated synthetic fixtures are written to Q4
runtime. No normal Helper/Launcher mode, Apply, service control or network
provider is invoked. These results never qualify a Windows service boundary.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[3]
Q3 = ROOT / "deliverables/AgentNexus-M1.8.3-Q3"
Q4 = ROOT / "deliverables/AgentNexus-M1.8.3-Q4"
RUN = ROOT / ".workflow-kit/runtime/AgentNexus-M1.8.3-Q4" / (
    "offline-" + dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ-") + uuid.uuid4().hex[:8]
)
RUN.mkdir(parents=True, exist_ok=False)
# Preserve the original five-level layout so historical tests with fixed
# relative runtime paths also stay inside this new Q4 sandbox.
SOURCE = RUN / "sandbox/deliverables/AgentNexus-M1.8.3-Q3/source"
SOURCE.mkdir(parents=True, exist_ok=False)
with zipfile.ZipFile(Q3 / "AgentNexus-M1.8.3-Q3-source.zip") as archive:
    for entry in archive.infolist():
        target = SOURCE / entry.filename
        if not target.resolve().is_relative_to(SOURCE.resolve()):
            raise RuntimeError("ZIP_PATH_REJECTED")
    archive.extractall(SOURCE)
CSC = Path("C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe")
NODE = Path(shutil.which("node") or "NODE_NOT_FOUND")
POWERSHELL = Path(shutil.which("pwsh") or shutil.which("powershell") or "POWERSHELL_NOT_FOUND")
manifest = json.loads((Q3 / "source-manifest.json").read_bytes())["files"]


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def snapshot():
    return {x["path"]: digest(SOURCE / x["path"]) for x in manifest}


before = snapshot()
expected = {x["path"]: x["sha256"] for x in manifest}
if before != expected:
    raise RuntimeError("FROZEN_Q3_SOURCE_MISMATCH")
stages = []
env = dict(os.environ)
env["AGENTNEXUS_TEST_DATA_ROOT"] = str(RUN / "fixtures")
env["AGENTNEXUS_TYPE_TOOLS"] = str(ROOT / ".workflow-kit/runtime/AgentNexus-M1.5/type-tools")
env.pop("Q3_RUN_SYNTHETIC_HELPER_UI", None)


def run(name, executable, arguments, timeout=180):
    started = dt.datetime.now(dt.timezone.utc).isoformat()
    command = [str(executable), *map(str, arguments)]
    try:
        child = subprocess.run(command, cwd=SOURCE, env=env, capture_output=True,
                               timeout=timeout, creationflags=subprocess.CREATE_NO_WINDOW)
        code, out, err = child.returncode, child.stdout, child.stderr
    except subprocess.TimeoutExpired as exc:
        code, out, err = -1, exc.stdout or b"", (exc.stderr or b"") + b"\nOFFLINE_TIMEOUT"
    except OSError as exc:
        code, out, err = -1, b"", str(exc).encode("utf-8")
    (RUN / (name + ".stdout.log")).write_bytes(out)
    (RUN / (name + ".stderr.log")).write_bytes(err)
    row = {"name": name, "command": command, "started_at_utc": started,
           "exit_code": code, "stdout_file": str(RUN / (name + ".stdout.log")),
           "stderr_file": str(RUN / (name + ".stderr.log")),
           "stdout_sha256": hashlib.sha256(out).hexdigest(),
           "stderr_sha256": hashlib.sha256(err).hexdigest(),
           "status": "PASS" if code == 0 else "FAIL"}
    stages.append(row)
    (RUN / "stages.json").write_text(json.dumps(stages, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"stage": name, "exit_code": code}), flush=True)
    return child if code != -1 else None


run("node-version", NODE, ["--version"])
run("strict-typecheck", NODE, ["tools/agentnexus/typecheck-m15.mjs"])
common = SOURCE / "native/credential-service/Common.cs"
references = ["/r:System.Core.dll", "/r:System.ServiceProcess.dll", "/r:System.Security.dll", "/r:System.Web.Extensions.dll"]
options = ["/nologo", "/target:exe", "/platform:x64", "/optimize+", "/warn:4", "/warnaserror+"]
builds = [
    ("service", "AgentNexus.CredentialBoundary.ServiceProgram", "AgentNexusCredential.exe",
     [common, SOURCE / "native/credential-service/CredentialService.cs", SOURCE / "native/credential-service/DailyRuntime.cs"], []),
    ("client", "AgentNexus.CredentialBoundary.ClientProgram", "pipe-client.exe",
     [common, SOURCE / "native/credential-service/PipeClient.cs"], []),
    ("helper", "AgentNexus.CredentialBoundary.TrustedHelperProgram", "trusted-credential-helper.exe",
     [common, *[SOURCE / ("native/credential-helper/" + n) for n in
                ["HelperIntent.cs", "HelperProtocol.cs", "HelperObjectSecurity.cs", "TrustedCredentialHelper.cs", "HelperTests.cs"]]],
     ["/target:winexe", "/langversion:5", "/r:System.Windows.Forms.dll", "/r:System.Drawing.dll",
      "/win32manifest:" + str(SOURCE / "native/credential-helper/helper.manifest")]),
    ("launcher", "AgentNexus.CredentialBoundary.LauncherProgram", "credential-launcher.exe",
     [common, SOURCE / "native/credential-launcher/CredentialLauncher.cs"],
     ["/win32manifest:" + str(SOURCE / "native/credential-launcher/launcher.manifest")]),
    ("observer", "AgentNexus.CredentialBoundary.ObserveProcesses", "observe-processes.exe",
     [common, SOURCE / "tools/agentnexus/ObserveProcesses.cs"], []),
]
binaries = []
for name, entry, filename, sources, extra in builds:
    binary = RUN / filename
    result = run("compile-" + name, CSC, [*options, *references, *extra, "/out:" + str(binary), "/main:" + entry, *sources], 90)
    if result is not None and result.returncode == 0:
        binaries.append({"name": name, "path": str(binary), "sha256": digest(binary),
                         "purpose": "DIAGNOSTIC_ONLY_NOT_DEPLOYMENT_PAYLOAD"})
        if name != "observer":
            run("pure-" + name, binary, ["--self-test"], 90)

tests = ["m18-vault", "m18-ledger", "m18-gateway", "m18-secret-boundary", "m18-authorization",
         "m18-protocol", "m18-review-fixes", "m181-control", "m181-adapter", "m182-egress",
         "m183-service", "q2-daily", "q3-stack"]
test_files = ["tests/agentnexus/" + name + ".test.ts" for name in tests]
test_files += ["tests/desktop/" + p.name for p in sorted((SOURCE / "tests/desktop").glob("*.test.ts"))]
run("affected-regression", NODE, ["--test", "--test-reporter=tap", "--test-concurrency=1", *test_files], 300)
run("installer-verify-only", POWERSHELL,
    ["-NoProfile", "-File", SOURCE / "tools/agentnexus/install-q3-qualification.ps1", "-BundleRoot", Q3], 90)
after = snapshot()
result = {"schema": "agentnexus.q4.offline-checks.v1", "run": str(RUN),
          "scope": "FROZEN_Q3_REBUILD_AND_SYNTHETIC_DIAGNOSTICS_ONLY",
          "status": "PASS" if all(s["exit_code"] == 0 for s in stages) and before == after else "FAIL",
          "source_unchanged": before == after, "q3_source_manifest_sha256": digest(Q3 / "source-manifest.json"),
          "stages": stages, "binaries": binaries, "system_deployment_executed": False,
          "uac_executed": False, "real_key_imported": False, "live_provider_requested": False,
          "windows_os_qualification": "NOT_RUN", "q3_source_files": len(before),
          "diagnostic_builds_replace_frozen_payload": False}
(RUN / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": result["status"], "result": str(RUN / "result.json")}), flush=True)
raise SystemExit(0 if result["status"] == "PASS" else 1)
