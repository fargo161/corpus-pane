# Browser ↔ local worker protocol 1.0.0

Design contract only. Node 24.18.0 built-ins serve browser assets and a same-origin controller bound to 127.0.0.1; optional loopback IPv6 is separately configured. Providers run in separate pinned environments. Missing/disabled workers leave manual work available. Startup/project opening/job submission cannot download models, install dependencies, upload sources or promote canonical data.

## Session and endpoints

Launch generates a random 256-bit session token, passed in an initial URL fragment and removed after exchange. Exchange requires exact loopback Host and same-origin Origin. Use HttpOnly SameSite=Strict session cookie plus CSRF token for mutations. No wildcard CORS, remote binding or URL-provided file paths. SSE origins are checked. Logs redact secrets/media names; installed browsers are not downloaded.

| Endpoint | Contract |
|---|---|
| GET `/api/v1/capabilities` | Protocol, enabled code/checkpoint hashes, tasks, resource/device caps and lock/notice identity; disabled artifacts include reason |
| POST `/api/v1/blobs` | Explicit chunk upload with expected hash/length/MIME; verify before CAS publication; quotas and traversal checks |
| POST `/api/v1/jobs` | Immutable JobRequest/idempotency key; 201 receipt; 409 on same ID/different hash; identical resubmission idempotent |
| GET `/api/v1/jobs/{id}` | State, latest seq, stage counts, timing, warnings, result/error hashes |
| GET `/api/v1/jobs/{id}/events?after=N` | SSE monotonic events; reconnect/poll replay or explicit snapshot/reset marker |
| POST `/api/v1/jobs/{id}/cancel` | Idempotent cancellation with reason and recorded race outcome |
| GET `/api/v1/jobs/{id}/result` | Sealed final manifest only; 409 while active; partial checkpoints explicitly separate |
| GET `/api/v1/blobs/{sha256}` | Session-checked exact bytes with length/hash/ETag; no arbitrary local reads |
| POST `/api/v1/jobs/{id}/release` | Release cache references; never delete referenced source/canonical blobs |

Only known task/provider IDs and typed formats are accepted. Fixed argv arrays launch providers; no shell interpolation or arbitrary entrypoints. Limits cover compressed/uncompressed ZIPs and dimensions. Separate explicit provisioning verifies allowlisted source URL, hash and notices. Provider jobs have network denied. Trusted checkpoint allowlists and safe-load policy precede deserialization. No self-update.

## Immutable request

Required: protocolVersion, jobId(UUIDv4), submittedAt, task, sourceRefs, exact frame inventory/range, inputBlobRefs, person/component IDs, baseRevisionRefs, prompt/correction revisions, provider identity, preprocessing identity, output schema, resourceCaps, requestHash; optional retryOfJobId. Hash uses prescribed sorted-key compact UTF-8 request serialization excluding requestHash; M02 tests its finite-number/Unicode behavior. Retain original bytes and computed digest. Other record manifests use exact-byte hashing rather than this request serialization.

Provider identity includes adapterCodeCommit/hash, upstreamCommit, configurationHash, checkpointSha256 (null for manual/geometry), dependencyLockHash and capabilitiesRevision. Preprocessing records color order, normalization, crop/resize and transforms. Sources include container hashes, stream, exact FrameRefs/native PTS, pixel hashes and decoder. Prompts preserve person/component ownership; SAM object IDs stay local. UI selection cannot alter an existing request.

Illustrative shortened packet (placeholders are not valid production input):

```json
{
  "protocolVersion":"1.0.0", "jobId":"<uuid-v4>",
  "task":"TEMPORAL_COMPONENT_MASKS", "sourceManifestSha256":"<64hex>",
  "frameInventorySha256":"<64hex>", "displayFrameRange":{"start":0,"endInclusive":216},
  "baseRevisionRefs":["<component-revision>","<prompt-revision>"],
  "provider":{"id":"sam2.1-tiny","upstreamCommit":"2b90b9f5ceec907a1c18123530e92e794ad901a4","checkpointSha256":"7402e0d864fa82708a20fbd15bc84245c2f26dff0eb43a4b5b93452deb34be69","configurationHash":"<64hex>","adapterCodeHash":"<64hex>","dependencyLockHash":"<64hex>"},
  "resourceCaps":{"threads":4,"gpuJobs":1,"hostRssMiB":4096,"cudaAllocatorMiB":4096,"wallSeconds":300,"maxFrames":256},
  "outputSchemaVersion":"1.0.0", "requestHash":"<computed>"
}
```

Actual schema also requires submittedAt, sourceRefs/inputBlobRefs/prompts and preprocessing. [PROTOCOL_TEST_CASES.json](proposals/PROTOCOL_TEST_CASES.json) specifies conformance cases. M02 creates complete valid fixtures and a mock worker before model integration.

## State, progress, cancellation

QUEUED → VALIDATING → RUNNING → SUCCEEDED or FAILED/RESOURCE_EXCEEDED. Any nonterminal state may enter CANCEL_REQUESTED → CANCELLED. Validation errors fail before launch. Cancellation before atomic success sealing wins; partial output cannot return success. If sealing wins first, cancel returns already_completed and retains the proposal. Retry uses a new ID/retryOfJobId; payload cannot change under an ID.

Events have jobId, monotonic seq, UTC timestamp, monotonic elapsedMs, state, stage, completed/total units where known, unit, resource samples, warnings and optional checkpoint hash. Unknown stage totals are indeterminate; no invented overall percentage. Result manifest lists output hashes/shapes/frame refs, timing methodology, allocator/reserved/RSS/device samples, raw provider IDs, dependency identity and warnings. Torch allocation is not total-device peak VRAM.

Cooperative cancellation occurs between frames. After 5 seconds without acknowledgement terminate the process tree; after another 5 seconds report termination failure and quarantine. Partial files stay staged. Restart retains sealed results; active jobs become FAILED with INTERRUPTED reason and require explicit retry. Browser disconnect cannot trigger duplicate work or discard sealed hashes.

## Resource profile

Reference: Windows 11 AMD64, Chrome 155; RTX 4050 Laptop 6 GiB optional worker, AMD 740M interactive reference. One GPU job, 4 CPU threads, process-tree RSS ≤4096 MiB, torch allocator cap4096 MiB, ≥1536 MiB reported free-device headroom before launch. Reduce an explicitly submitted chunk or refuse if unavailable. Sample whole-device memory separately where possible; otherwise mark unmeasured. Allocator cap cannot limit driver/context memory.

Chunk ≤256 frames, CPU frame/state offload, output cache ≤2 GiB/job, initial source upload ≤1 GiB, decoded frames ≤4096×4096; larger profiles require explicit user selection. Browser/decoder memory is separate. SAM uses tiny/1024/no compilation/no CUDA hole-fill extension and approved PNG/native-PTS loader. Deadline300 seconds/chunk is a proposed operability budget, not a quality threshold. Warm SAM p95 reference251.93 ms/frame; >1.5× on equivalent hardware/config triggers investigation without weakening quality criteria. Other machines need qualification.

ARAP uses bounded CPU topology/iterations and bakes only validated output. DWPose uses 4 CPU threads and explicit crops; detector weights are not added. License-disabled weights mean disabled capabilities. OOM/timeout yields typed errors and diagnostic logs, offering smaller explicit jobs or manual work. Never auto-select/download another model.

For longer clips, each chunk records parent request, chunk index, exact frame inventory, overlap/keyframe policy and state-checkpoint hash. Do not join provider-local object IDs across chunks without the persistent association mapping. A fresh seed/review is required when state cannot be reproduced or continuity is uncertain. Checkpoint reuse is conditional on identical code/model/config/source/prompt hashes; hidden in-memory state is not reproducible evidence.

Geometry/ARAP jobs also bind exact PoserProfile, ArtworkRigMapping, topology and canonical-to-control mapping revisions. A profile or rig mapping change makes their results stale even when source texture is unchanged. No worker may assume v0.4.13 hierarchy/pivots/sockets as the production target.

## Staleness and import

Manifest includes source/frame/prompt/association/base revision hashes. Import atomically compares these with current heads. A mismatch marks STALE and displays differences; historical viewing is allowed but applying requires a new explicit rebase/review command. Source hash mismatch is a hard rejection. Changed ownership makes a result stale even with identical pixels.

Successful jobs create raw evidence and candidate proposals only. Human review associates ownership and accepts/rejects edits within a named revision. Completion cannot verify frames, accept garments/families, establish anchors or change owner-pending records. Controller has no acceptance endpoint or canonical-head write credentials. Manual fallback records actor/tool and exact evidence through the same revision rules.
