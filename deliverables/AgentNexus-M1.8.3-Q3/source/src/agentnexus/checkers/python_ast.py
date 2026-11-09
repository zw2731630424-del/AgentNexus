"""AgentNexus trusted, parse-only stdin adapter. Never executes the supplied source."""

import ast
import json
import platform
import sys


MAX_SOURCE_BYTES = 256 * 1024
SCHEMA = "agentnexus/checker/0.1"


def bounded_message(value):
    return str(value).encode("utf-8")[:1024].decode("utf-8", "ignore")


def point(lines, line_number, offset):
    line_index = max(0, min((line_number or 1) - 1, len(lines) - 1))
    line = lines[line_index].rstrip("\r\n")
    # SyntaxError offsets are one-based Unicode-character offsets, not AST byte offsets.
    column = max(0, min((offset or 1) - 1, len(line)))
    return {"line": line_index, "character": len(line[:column].encode("utf-16-le")) // 2}


def main():
    result = {
        "schema": SCHEMA,
        "checker_id": "python-ast",
        "checker_version": platform.python_version(),
        "status": "PASS",
        "reason": "AST_PARSE_ONLY",
        "diagnostics": [],
    }
    try:
        raw = sys.stdin.buffer.read(MAX_SOURCE_BYTES + 1)
        if len(raw) > MAX_SOURCE_BYTES:
            result.update(status="INCONCLUSIVE", reason="SOURCE_LIMIT")
        elif sys.version_info < (3, 12) or sys.version_info.major != 3:
            result.update(status="INCONCLUSIVE", reason="UNSUPPORTED_PYTHON_VERSION")
        else:
            source = raw.decode("utf-8", "strict")
            try:
                # mode='exec' selects the module grammar; it does not execute anything.
                ast.parse(source, filename="<diagnostic>", mode="exec")
            except SyntaxError as error:
                lines = source.splitlines(keepends=True) or [""]
                location = None
                if error.lineno and error.offset and 1 <= error.lineno <= len(lines):
                    start = point(lines, error.lineno, error.offset)
                    end = point(lines, error.end_lineno or error.lineno, error.end_offset or error.offset)
                    if (end["line"], end["character"]) < (start["line"], start["character"]):
                        end = start.copy()
                    location = {"start": start, "end": end}
                result.update(status="FAIL", reason="SYNTAX_ERROR")
                result["diagnostics"] = [{
                    "code": "PYTHON_SYNTAX_ERROR", "severity": "error",
                    "message": bounded_message(error.msg),
                    "range": location,
                }]
    except UnicodeDecodeError:
        result.update(status="FAIL", reason="INVALID_UTF8")
    except (RecursionError, MemoryError):
        result.update(status="INCONCLUSIVE", reason="PARSER_RESOURCE_LIMIT")
    except Exception:
        # Do not return exception repr/tracebacks containing process configuration or source.
        result.update(status="INCONCLUSIVE", reason="CHECKER_FAILED")
    data = json.dumps(result, ensure_ascii=True, separators=(",", ":")).encode("ascii")
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


if __name__ == "__main__":
    main()
