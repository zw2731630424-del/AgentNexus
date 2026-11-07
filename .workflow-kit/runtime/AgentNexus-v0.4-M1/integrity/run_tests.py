"""Run the actual Node test entry and preserve bounded, structured evidence."""
import hashlib
import json
import os
import platform
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(r"I:\AI_AgentNexus")
OUT = ROOT / ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity"
COMMAND = [r"D:\Nodejs\node.exe", "--test", "--test-reporter=tap", "tests/agentnexus/integrity.test.ts"]
env = dict(os.environ)
env.pop("NODE_OPTIONS", None)
env.pop("NODE_PATH", None)
started = datetime.now(timezone.utc).isoformat()
clock = time.monotonic()
run = subprocess.run(COMMAND, cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=60)
elapsed = time.monotonic() - clock
tap = run.stdout.decode("utf-8", errors="strict")
(OUT / "integrity.tap").write_text(tap, encoding="utf-8", newline="\n")
summary = {}
for key, value in re.findall(r"^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) ([0-9.]+)$", tap, re.M):
    summary[key] = float(value) if "." in value else int(value)
source_paths = [ROOT / "src/agentnexus/integrity.ts", ROOT / "tests/agentnexus/integrity.test.ts", ROOT / "src/agentnexus/types.ts"]
result = {
    "schema": "agentnexus/m1/integrity-test-run/1",
    "started_utc": started, "ended_utc": datetime.now(timezone.utc).isoformat(),
    "command_argv": COMMAND, "cwd": str(ROOT), "exit_code": run.returncode,
    "elapsed_seconds": elapsed, "platform": platform.platform(),
    "node_version": subprocess.check_output([COMMAND[0], "--version"], env=env, text=True).strip(),
    "tap": ".workflow-kit/runtime/AgentNexus-v0.4-M1/integrity/integrity.tap",
    "tap_sha256": hashlib.sha256(run.stdout).hexdigest(), "tap_bytes": len(run.stdout),
    "summary": summary,
    "not_run_real_os_tests": [line.strip() for line in tap.splitlines() if "# SKIP" in line and "NOT_RUN" in line],
    "source_sha256": {str(path.relative_to(ROOT)).replace("\\", "/"): hashlib.sha256(path.read_bytes()).hexdigest() for path in source_paths},
    "scope": "actual local Node/fs/hash behavior on new owned synthetic fixtures; no models, Kit code, OS identity boundary, adversarial TOCTOU or bundled runtime license admission",
    "status": "PASS" if run.returncode == 0 and summary.get("fail") == 0 else "FAIL",
}
(OUT / "test-run.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps({"status": result["status"], "exit_code": run.returncode, "summary": summary, "not_run": result["not_run_real_os_tests"]}, ensure_ascii=False))
if run.returncode:
    print(tap[-20000:])
sys.exit(run.returncode)
