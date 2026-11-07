"""Read-only M0.1 source-evidence probe; never executes Workflow Kit code.

Outputs are factual hashes/metadata, not copied source expression. This is an
audit script, not the proposed M1 verifier or a security boundary.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import stat
import subprocess
import sys
import unicodedata
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(r"I:\AI_AgentNexus")
OUT = ROOT / ".workflow-kit/runtime/AgentNexus-v0.4-M0.1/integrity"
KIT = ROOT / "ai-workflow-kit-v4"
ARCHIVE = ROOT / "ai-workflow-kit-v4.0.0.zip"
HANDOFF = ROOT / "inputs/AgentNexus-v0.4/AgentNexus_v0.4_Codex_Handoff.zip"
EXPECTED_ARCHIVE = "4cad510cf666d37e0adb81f39ca3f1f29aa9f3b3ae7313726946e572e51736ec"
REPARSE = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
PATTERNS = {
    "license_copyright_spdx": re.compile(r"licen[sc]e|copyright|spdx|许可证|版权|著作权", re.I),
    "grant_declaration": re.compile(r"permission\s+is\s+hereby\s+granted|all\s+rights\s+reserved|redistribution\s+and\s+use|版权持有|开源许可|再分发", re.I),
    "named_license": re.compile(r"\b(?:MIT|Apache[- ]2\.0|BSD-[123]-Clause|GPL-[123]\.0|CC0-1\.0|Unlicense)\b|public\s+domain|creative\s+commons", re.I),
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_digest(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_json(name: str, data: object) -> None:
    if name not in {"recheck_evidence.json", "preservation_before.json", "preservation_after.json"}:
        raise ValueError("unapproved output")
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def walk_files(directory: Path):
    """Do not follow reparse points, including directory junctions."""
    with os.scandir(directory) as entries:
        for entry in sorted(entries, key=lambda item: item.name):
            path = Path(entry.path)
            # On Windows, DirEntry.stat() caches dummy dev/ino/nlink values.
            # Direct lstat is required for factual link-count/identity evidence.
            info = os.lstat(path)
            if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & REPARSE:
                raise RuntimeError("source tree contains a linked/reparse entry: " + str(path))
            if stat.S_ISDIR(info.st_mode):
                yield from walk_files(path)
            elif stat.S_ISREG(info.st_mode):
                yield path, info
            else:
                raise RuntimeError("source tree contains a nonregular entry: " + str(path))


def snapshot() -> dict:
    trees = [
        ROOT / ".workflow-kit/tasks/AgentNexus-v0.4-M0",
        ROOT / ".workflow-kit/runtime/AgentNexus-v0.4-M0",
        KIT,
    ]
    files = {}
    for tree in trees:
        for path, info in walk_files(tree):
            files[path.relative_to(ROOT).as_posix()] = {"bytes": info.st_size, "sha256": file_digest(path)}
    for path in [ARCHIVE, HANDOFF, ROOT / "AGENTS.md", ROOT / ".workflow-kit/governance/policy.json"]:
        files[path.relative_to(ROOT).as_posix()] = {"bytes": path.stat().st_size, "sha256": file_digest(path)}
    return {"captured_utc": now(), "scope": "complete M0 task/runtime trees, original installed Kit and input ZIPs, active AGENTS/policy", "file_count": len(files), "total_bytes": sum(item["bytes"] for item in files.values()), "files": dict(sorted(files.items()))}


def all_keys(value):
    result = set()
    if isinstance(value, dict):
        result.update(value)
        for child in value.values():
            result.update(all_keys(child))
    elif isinstance(value, list):
        for child in value:
            result.update(all_keys(child))
    return result


def collect_evidence() -> dict:
    baseline = json.loads((ROOT / ".workflow-kit/runtime/AgentNexus-v0.4-M0/workflow-inventory.json").read_bytes())
    expected = {item["path"]: item for item in baseline["files"]}
    paths = list(walk_files(KIT))
    current = {}
    hits = []
    for path, info in paths:
        relative = path.relative_to(KIT).as_posix()
        raw = path.read_bytes()
        text = raw.decode("utf-8", errors="strict")
        file_hits = []
        for number, line in enumerate(text.splitlines(), 1):
            for category, pattern in PATTERNS.items():
                terms = sorted(set(match.group(0) for match in pattern.finditer(line)))
                if terms:
                    hit = {"path": relative, "line": number, "category": category, "matched_tokens_only": terms}
                    hits.append(hit)
                    file_hits.append({"line": number, "category": category})
        current[relative] = {"path": relative, "bytes": len(raw), "sha256": digest(raw), "utf8_decoded": True, "nlink": info.st_nlink, "file_attributes": getattr(info, "st_file_attributes", None), "reparse_tag": getattr(info, "st_reparse_tag", None), "keyword_hits": file_hits, "license_expression": "NOASSERTION", "authorization_evidence": "NOT_FOUND_IN_PROVIDED_PACKAGE", "copy_distribution_status": "BLOCKED"}
    with zipfile.ZipFile(ARCHIVE) as z:
        entries = z.infolist()
        zip_files = {item.filename.removeprefix("ai-workflow-kit-v4/"): {"sha256": digest(z.read(item)), "bytes": item.file_size} for item in entries if not item.is_dir()}
        zip_metadata = {"entry_count": len(entries), "directory_entries": sum(item.is_dir() for item in entries), "duplicate_exact_names": [name for name, count in Counter(item.filename for item in entries).items() if count > 1], "unsafe_unix_file_types": [item.filename for item in entries if stat.S_IFMT(item.external_attr >> 16) not in {0, stat.S_IFREG, stat.S_IFDIR}]}
    handoff = HANDOFF.read_bytes()
    with zipfile.ZipFile(io.BytesIO(handoff)) as z:
        embedded = z.read("AgentNexus_v0.4_reference/ai-workflow-kit-v4.0.0.zip")
    source = json.loads((KIT / "SOURCES.json").read_bytes())
    historical = [{"archive": item["archive"], "version": item["version"], "sha256": item["sha256"], "entry_count": len(item["entries"]), "entry_keys": sorted(set().union(*(item.keys() for item in item["entries"]))), "archive_available_at_workspace_root": (ROOT / item["archive"]).is_file(), "authorization": "NOT_ASSERTED_BY_HASHES"} for item in source["sources"]]
    folded = Counter(unicodedata.normalize("NFC", path).casefold() for path in current)
    node_code = 'const fs=require("node:fs");const s=fs.lstatSync("ai-workflow-kit-v4/SOURCES.json",{bigint:true});console.log(JSON.stringify({node:process.version,platform:process.platform,arch:process.arch,noFollowSupported:typeof fs.constants.O_NOFOLLOW!=="undefined",nlink:s.nlink.toString(),statsKeys:Object.keys(s),versions:process.versions,release:process.release}));'
    env = dict(os.environ)
    env.pop("NODE_OPTIONS", None)
    env.pop("NODE_PATH", None)
    node_result = subprocess.run([r"D:\Nodejs\node.exe", "-e", node_code], cwd=ROOT, env=env, capture_output=True, text=True, timeout=10, check=True)
    direct_info = os.lstat(KIT / "SOURCES.json")
    with os.scandir(KIT) as entries:
        cached_info = next(item for item in entries if item.name == "SOURCES.json").stat(follow_symlinks=False)
    identity = lambda item: {"nlink": item.st_nlink, "dev": item.st_dev, "ino": item.st_ino, "file_attributes": getattr(item, "st_file_attributes", None)}
    return {
        "schema": "agentnexus.m01.workflow-license-evidence.v1",
        "captured_utc": now(),
        "method": "complete local byte/UTF-8/keyword recheck and SOURCES structure inspection; no Kit tools/tests/installers executed",
        "scope": {"installed_path": str(KIT), "file_count": len(current), "bytes": sum(item["bytes"] for item in current.values()), "all_105_files_scanned": len(current) == 105, "third_party_repositories_reaudited": False},
        "archives": {"standalone_sha256": file_digest(ARCHIVE), "standalone_expected_m0_sha256": EXPECTED_ARCHIVE, "handoff_sha256": digest(handoff), "embedded_sha256": digest(embedded), "embedded_identical_to_standalone": embedded == ARCHIVE.read_bytes(), **zip_metadata},
        "m0_inventory_comparison": {"added": sorted(set(current) - set(expected)), "missing": sorted(set(expected) - set(current)), "changed": [path for path in sorted(set(current) & set(expected)) if current[path]["sha256"] != expected[path]["sha256"] or current[path]["bytes"] != expected[path]["bytes"]]},
        "archive_comparison": {"added": sorted(set(current) - set(zip_files)), "missing": sorted(set(zip_files) - set(current)), "changed": [path for path in sorted(set(current) & set(zip_files)) if current[path]["sha256"] != zip_files[path]["sha256"] or current[path]["bytes"] != zip_files[path]["bytes"]]},
        "path_observations": {"all_ascii": all(path.isascii() for path in current), "casefold_nfc_collisions": [key for key, count in folded.items() if count > 1], "hardlinked_files": [path for path, item in current.items() if item["nlink"] > 1], "unknown_or_invalid_link_count_files": [path for path, item in current.items() if item["nlink"] < 1], "reparse_files": [path for path, item in current.items() if item["file_attributes"] is not None and item["file_attributes"] & REPARSE]},
        "search_patterns": {key: pattern.pattern for key, pattern in PATTERNS.items()},
        "keyword_hits": hits,
        "license_notice_spdx_named_files": [path for path in current if re.search(r"(?:^|/)(?:licen[sc]e|notice|copying|copyright|third[-_ ]party[-_ ]notices|reuse|\.reuse)(?:[./_-]|$)", path, re.I)],
        "sources": {"path": "SOURCES.json", "sha256": current["SOURCES.json"]["sha256"], "top_level_keys": list(source), "all_recursive_keys": sorted(all_keys(source)), "license_or_copyright_fields": [key for key in all_keys(source) if re.search(r"licen[sc]e|copyright|author|notice|grant|permission", key, re.I)], "historical_sources": historical, "base_release": {**source["base_release"], "archive_available_at_workspace_root": (ROOT / source["base_release"]["archive"]).is_file()}, "current_version": source["current_version"], "source_date_is_inherited_claim": source["source_date"], "rights_holder_identity": "UNKNOWN", "copy_or_distribution_authorization": "NOT_FOUND"},
        "node_local_capability_probe": {"exe": r"D:\Nodejs\node.exe", "exit_code": node_result.returncode, "result": json.loads(node_result.stdout), "scope": "API metadata only; Node binary/distribution license closure NOT_PERFORMED; no runtime or package copied"},
        "python_local_capability_probe": {"version": sys.version.split()[0], "path": "SOURCES.json", "direct_lstat": identity(direct_info), "direntry_cached_stat": identity(cached_info), "meaning": "Windows DirEntry cached dev/ino/nlink can be dummy values; direct lstat was used for all 105 source metadata records; neither API closes TOCTOU"},
        "files": [current[path] for path in sorted(current)],
        "limits": ["keyword absence does not adjudicate ownership or all possible external grants", "no new user rights inferred", "hash agreement is content identity, not publisher authentication", "this probe is read-only evidence, not an M1 security implementation"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["before", "after"])
    args = parser.parse_args()
    if args.mode == "before":
        write_json("preservation_before.json", snapshot())
        evidence = collect_evidence()
        write_json("recheck_evidence.json", evidence)
        print(json.dumps({"evidence_file_count": evidence["scope"]["file_count"], "keyword_hit_count": len(evidence["keyword_hits"]), "m0_inventory_comparison": evidence["m0_inventory_comparison"], "archive_comparison": evidence["archive_comparison"]}))
    else:
        before = json.loads((OUT / "preservation_before.json").read_bytes())
        after = snapshot()
        old, new = before["files"], after["files"]
        difference = {"added": sorted(set(new) - set(old)), "removed": sorted(set(old) - set(new)), "changed": [path for path in sorted(set(old) & set(new)) if old[path] != new[path]]}
        after["comparison_to_before"] = difference
        after["all_preserved"] = not any(difference.values())
        write_json("preservation_after.json", after)
        print(json.dumps({"file_count": after["file_count"], "total_bytes": after["total_bytes"], "all_preserved": after["all_preserved"], "difference": difference}))
        if not after["all_preserved"]:
            sys.exit(1)


if __name__ == "__main__":
    main()
