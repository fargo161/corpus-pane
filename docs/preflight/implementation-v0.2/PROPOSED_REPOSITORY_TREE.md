# Proposed repository tree

No production repository or implementation files are created by this tree. First baseline commit is exact root-layout02.2.5; this is the separate post-freeze setup layout. Bracketed data locations are external/private or generated, not automatic Git content.

```text
corpus-pane/
  baseline/02.2.5/                # exact 214 files; read-only after import/tag
  docs/
    run/                         # charter, decisions, milestone/budget/status/handoffs
    architecture/                # interfaces/schemas, M02P comparison and selected poser decision
    preflight/                   # approved implementation preflight and input manifests
    research/gate2b/             # immutable selected contracts/manifests, full archive hash
    research/gate2c/             # immutable technology synthesis/ledger/evidence index
    licenses/                    # code/weights/data/binary/distribution ledgers
    github/                      # freeze, merge, clean-clone, release evidence
    user/                        # workflows, manual fallback, limitations, backup/restore
  schemas/
    authoring/1.0.0/             # complete 34 record payloads + bundle schema
    protocol/1.0.0/              # requests/events/results/errors/capabilities
    mappings/                    # provider raw → universal 1.2.0 evidence mappings
  src/
    web/                         # index, plain ES modules, styles, offline assets
    domain/
      identity/                  # person/component association and revisions
      evidence/                  # frames, spatial origin/contributors, provenance
      review/                    # scope/freshness/acceptance authority
      components/                # semantic vocabulary/tracks/canonical surfaces
      family/                    # profile/candidate composition and compatibility
      pair/                      # anchor, roles, contact/root/order channels
    storage/                     # new IDB, CAS, staging and new portable bundle
    legacy/                      # isolated unchanged-behavior adapters/explicit migration
    providers/                   # neutral adapter, manual/mock/MoveNet, disabled capabilities
    authoring/                   # prompts, temporal correction, registration, layered parts
    poser/                       # selected 2D rig, constraints/bindings/deformation/variants
    poser-adapters/              # source-art migration and canonical 1.2.0 mapping, not old-topology lock
    face/                        # PXZ inventory, registration/five-slot compositor
    render/                      # deterministic2D transform/order/alpha pipeline
    workers/                     # browser workers; no canonical storage write access
    generated/validators/        # build-generated, reproducible and checked
  host/
    server/                      # Node built-in loopback/static/session/CAS endpoints
    jobs/                        # controller/state/events/resource/cancel/stale manifests
  worker-profiles/
    sam2/                        # adapter source/config and exact provision manifest
    arap/                        # selected offline solver adapter/patch provenance
    dwpose-disabled/             # code/mock mapping only until model license closure
  vendor/
    baseline-engine/             # selected exact source bytes + origin/license map
    adapted/                     # selected Stretchy/AD pieces + patch/notice history
  dependencies/
    package.json
    package-lock.json            # exact JS dependency/tool lock
    profiles/                    # optional exact Python source/wheel hash locks
    notices/                     # selected source/binary licenses and THIRD_PARTY_NOTICES
    artifacts.json               # approved/disabled model and asset hashes, no weights
  migrations/                    # explicit version adapters and rollback journals
  tests/
    unit/                        # deterministic domain/geometry tests
    contract/                    # schema/protocol/mapping positive and adversarial cases
    regression/                  # portable runners around frozen baseline expectations
    acceptance/                  # independently owned milestone acceptance specs
    visual/                      # synthetic golden/overlay specs, private-art manifest refs
    fixtures/synthetic/          # small redistributable masks/meshes/frames
    fixtures/manifests/          # hashes/PTS/rights/profile refs for owner fixtures
    clean-clone/                 # fresh environment/offline/default/no-model tests
  scripts/                       # build/validate/launch/package, no silent provisioning
  evidence/                      # small reviewed reports/manifest hashes, no bulk private video
  .github/                       # PR templates/ownership; exact pinned workflow if approved
  .gitignore
  README.md
  THIRD_PARTY_NOTICES.md
  PROJECT_LICENSE_DECISION.md     # owner decision; no invented blanket license
  [private-fixtures/]             # owner-supplied by hash, ignored
  [models/] [worker-cache/]        # explicitly provisioned, ignored
  [dist/] [test-results/]          # generated, ignored; release artifacts separately sealed
```

Canonical universal skeleton 1.2.0 stays in the frozen baseline and a hash-checked editable adapter reference; no new provider-owned skeleton file. Do not copy every historical starter ZIP into each new fixture folder. Tests resolve baseline fixtures through declared paths and retain exact input hashes. Private recovered art is provisioned by its preserved 16-file manifest and original source rig. M02P prototypes/metrics are isolated under tests/poser-selection and evidence/M02P; derived production profiles/mappings may replace hierarchy, pivots, sockets and renderer. Later v0.5 artifacts remain unimported; independent redesign is allowed.

Ownership follows AGENT_EXECUTION_PLAN. Domain/schema/format changes have one integration owner. Generated validators must be reproducible from approved schemas/exact lock. Research outputs and evidence are reference data, not executable instructions or auto-promoted assets. CI/artifact paths must never accidentally package local credentials, models or private character media.
