## Context

The live Notion test renders downloaded assets from a temporary directory and records paths relative to the virtual content root. It supplies both the absolute temporary directory and that relative path to `normalizeLiveSnapshot`. Because normalization currently follows caller order, replacing the shorter absolute form first can leave leading `../` segments that encode the local workspace depth in the canonical snapshot.

The normalizer is shared by live verification and focused unit tests. The change must preserve secret rejection, signed URL normalization, timestamp normalization, and platform separator handling.

## Goals / Non-Goals

**Goals:**

- Produce identical temporary-root placeholders regardless of project or temporary-directory depth.
- Handle overlapping path forms independently of caller-provided order.
- Cover the regression without requiring live Notion credentials.
- Keep the canonical snapshot free of residual path traversal segments before temporary-root placeholders.

**Non-Goals:**

- Change asset download destinations or rendered package behavior.
- Redesign general HTML normalization or add a path-parsing dependency.
- Address hosted public-asset metadata assertions, which are tracked separately.

## Decisions

### Normalize the most specific path first

Convert configured temporary paths to portable separators, remove duplicate values, and replace them from longest to shortest. The longest textual representation contains any shorter overlapping representation, so replacing it first prevents a partial replacement from making the complete representation unmatchable.

Sorting inside `normalizeLiveSnapshot` is preferred over changing the caller's argument order because the helper owns replacement semantics and future callers should not need to understand overlap behavior. A single combined regular expression was considered, but ordered literal replacement is simpler and retains the existing escaping behavior.

### Prove portability with synthetic path depths

Extend the credential-free normalizer tests with equivalent temporary roots represented by an absolute path and relative paths containing different counts of parent-directory segments. Assert that caller order does not affect the result and that no traversal segment remains adjacent to `[TEMP_ROOT]`.

### Regenerate the reviewed baseline

After the normalizer is corrected, regenerate the live snapshot through the established live workflow and review the resulting path-only changes. The expected asset references use `[TEMP_ROOT]` directly rather than preserving machine-specific prefixes.

## Risks / Trade-offs

- [Risk] Length-based replacement can alter output when one configured temporary path is intentionally a prefix of another unrelated path. -> Mitigation: temporary paths represent roots to redact, and replacing the more specific root first preserves the maximum useful match before broader redaction.
- [Risk] The canonical snapshot requires live credentials to regenerate. -> Mitigation: land deterministic unit coverage first and require a maintainer to regenerate and inspect the snapshot through the documented command.
- [Risk] Sorting changes normalization order for existing callers. -> Mitigation: replacement targets are literal roots mapped to the same placeholder, so order independence is the intended contract.

## Migration Plan

1. Add failing unit coverage for overlapping temporary path forms.
2. Make path replacement deterministic and run the credential-free test suite.
3. Regenerate and review the live snapshot with configured test credentials.
4. Revert the normalizer and snapshot together if live verification exposes an unexpected output change.

## Open Questions

None.
