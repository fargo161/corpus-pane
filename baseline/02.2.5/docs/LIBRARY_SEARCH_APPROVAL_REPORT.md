> **Historical Checkpoint 02.2 report.** Current search semantics and owner-acceptance behavior are superseded/clarified by `SEARCH_SEMANTICS_APPROVAL_CLEANUP_REPORT.md`.

# Corpus Pane 02.2 — Library Search & Approval Report

**Application:** 0.2.2 / checkpoint 2.2  
**Scope:** Library Search & Approval only.  
**Shared skeleton:** unchanged `adventure-studio/universal-skeleton` 1.2.0.

## Decisions implemented

### Complete-bone evidence

A regional signature is searchable when it has either:

1. two shared informative points beyond the normalization anchor, **or**
2. one complete shared bone with both projected endpoints available.

This lets two-joint groups such as upper arm and lower leg participate without weakening the one-point anti-false-match rule.

Region normalization roots are now local where appropriate: upper arm → shoulder, forearm → elbow, hand → wrist, thigh → hip, shin → knee, foot → ankle.

### Rough query fallback

Checked-reference admission remains unchanged and strict. `search(... verifiedOnly:true)` first tries strict query evidence. If that cannot produce a meaningful signature and rough queries are allowed, only the query side is re-evaluated with bounded uncertain detector evidence.

Rough evidence may include:

- visible detector evidence below the strict confidence threshold;
- unknown-visibility detector points with confidence at least 0.08;
- manual/accepted points.

Occluded/out-of-frame points remain excluded. The checked reference side always uses strict evidence.

A rough-query result carries `queryEvidence: "rough_query"` and receives a small ranking penalty so an equally good strict query is preferred. UI results are explicitly labeled **Rough query — inspect before using**.

### Owner acceptance

`acceptReference(corpus, referenceId)` records owner acceptance only when the reference is still current. It preserves the preparation authority and stores an explicit owner-acceptance record.

Older pending copies imported later do not fork the same reference or downgrade accepted owner state.

### Provenance display

Reference and comparison cards now show their review/acceptance authority. Starter Pass assistant reviews remain visibly pending until the owner accepts them.

## Non-goals

- Rough query evidence does not become a reusable reference.
- Search does not copy coordinates.
- Owner acceptance does not verify unrelated frames/groups.
- No detector model is retrained.
