# AgentNexus-Pilot-Project

Offline task management with versioned tasks, weighted progress, JSON persistence and an explicit CLI data lock.

Requires Node 24.15.0. Run: node src/entry.ts --data ./tasks.json add task1 "Read requirements" 60
Then: node src/entry.ts --data ./tasks.json advance task1 1 doing
Use list, report, spend id version minutes, or remove id version. Commands return JSON. Exit 0 means success, 2 means validation/usage failure, and 3 means I/O or lock failure.

Task versions reject stale updates. Invalid data is preserved. Each CLI operation holds an exclusive .lock and replaces the JSON file from an fsynced temporary file. An abandoned lock needs explicit owner inspection; it is never silently removed. This is local process coordination, not a hostile-process security boundary or a power-loss durability guarantee.

Input JSON is capped at 16 MiB and 10,000 tasks. File reads and stdout use 64 KiB chunks; JSON decoding is bounded by that cap. Invalid UTF-8 is rejected without replacing the original file.

Tests: AGENTNEXUS_PILOT_SCRATCH must name an independent empty test directory; run node --test tests/model.test.ts tests/analytics.test.ts tests/cli.test.ts. The AgentNexus fixed Host checker supplies it and runs strict TypeScript checks with pinned local tools.

Provenance: the Native Harness published these files through Storage Owner using an explicitly simulated, Codex-authored fixture provider. Local orchestration and tests are real; general LLM autonomous development and real-provider integration remain unverified.
