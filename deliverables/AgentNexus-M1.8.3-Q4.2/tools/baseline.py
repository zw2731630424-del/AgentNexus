"""Utilities for Q4.2. Historical bundles are read-only references, never build outputs."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parents[1]
Q3 = ROOT / 'deliverables/AgentNexus-M1.8.3-Q3'
Q4 = ROOT / 'deliverables/AgentNexus-M1.8.3-Q4'
Q41 = ROOT / 'deliverables/AgentNexus-M1.8.3-Q4.1'

def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
