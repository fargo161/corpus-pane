# GitHub execution plan — no repository created

Propose fresh repository **corpus-pane**, **private**, under the owner's chosen GitHub user/organization. Account/organization and name availability remain U11 decisions. Do not reuse an existing same-name repository or silently choose a new name. Owner must approve the resulting preflight and repository identity/visibility before creation. Public distribution additionally waits U09 and project-license decisions.

## Immutable baseline import

1. Steward verifies BASELINE_FREEZE.json against the214 original02.2.5 files (84,496,133 bytes). Stage in a fresh isolated checkout with `core.autocrlf=false` and no text conversion/filters. No app edits, .gitignore, attributes or workflow files enter the initial import commit unless already in baseline.
2. Initial root commit contains exactly those214 file paths/bytes. Verify every committed blob via `git cat-file` SHA256 against the external manifest; Git object SHA alone does not prove original byte identity. Verify RELEASE.json checkpoint02.2.5, skeleton 1.2.0 and owner-pending status.
3. Create immutable annotated tag `baseline/02.2.5` pointing to that exact commit. Record commit/tree/tag IDs, tag message, SHA256 baseline manifest, author/tool versions and source archive identity in BASELINE_IMPORT_PROOF. Sign if a preconfigured signing identity exists; do not claim signing or fabricate a key. No force/re-tagging.
4. Separate setup commit moves files verbatim to baseline/02.2.5/, retaining Git history, then adds modern source tree/docs/locks/tests. Baseline tag remains a root-layout runnable historical snapshot. Verify every moved file again. Editable implementation starts in src/web/ and adapters; baseline stays immutable. Copy only needed code into the editable tree with origin hashes and notices; do not duplicate large fixtures unnecessarily.
5. Push approved private main and baseline tag only after local import proof and independent verification. No production remote, tag or branch was created in this preflight.

Largest baseline blob21,867,964 bytes, below GitHub's100MiB per-file limit; full baseline has84.5MB uncompressed. Exact baseline binary/ZIP fixtures are a deliberate one-time historical exception to later generated-artifact exclusions. Do not rewrite them into LFS pointers, since that would break exact tree-byte proof.

## Branches and merge authority

Protected main: no force push/deletion, no direct Builder/Director commits after bootstrap, no bypass through admin convenience. Feature branches `feat/m01-evidence-schema`, `feat/m02-local-jobs`, `feat/m02p-poser-selection`, etc.; M02P candidate branches are isolated and only the evidence-selected implementation enters production-specific bindings, preserving all reference art and comparison history; independent `test/mNN-acceptance` and `audit/mNN-findings` branches as needed. Keep small ordered PRs, each tied to requirement IDs and exact test/lock/schema revisions. Preserve provenance commits; no blanket squash/history rewrite without explicit approval.

Steward alone executes qualifying merges after separate Architecture Auditor and Independent Tester signoffs, licensing approval on relevant diffs and Director scope confirmation. Builder cannot approve/merge its own work; Director cannot merge main or waive owner gates. With one human GitHub account, agent separation cannot be represented as two fake GitHub users: enforce required status artifacts/manual Steward checks plus protected branch settings where supported, and record any account/plan limitation. An API checkbox does not create independent review.

No unresolved BLOCKER merge. MAJOR deferral needs explicit owner decision; do not invent delegated authority. Rebase/merge conflict resolution changes a reviewed head and triggers affected reruns/reviews. PR descriptions state behavior, evidence and limits; include artifact hashes. When actual PRs are created in a later authorized run, attach each to the task using the app's PR attachment tool.

## CI, binaries, artifacts and notices

Initial CI is local/self-hosted exact Node/browser execution with committed reproduction scripts and required evidence statuses. No third-party GitHub Action tag is a mandatory dependency. A later hosted workflow must pin actions by full reviewed commit and record runner/tool versions and notices. Public hosted services must not receive private source media by default.

Commit source, schemas, small synthetic fixtures, exact npm lock, notices, source/model hash manifests, docs and test specs. Keep checkpoints, model caches, source videos, per-frame dumps, generated renders, private recovered character art and full research environments out of new Git history by default. The recovered PNG approval is canonical-use approval for this preflight, not blanket public redistribution permission. Private canonical-art test packs can be provisioned by hash from owner-supplied storage after approved implementation scope/rights; CI must clearly distinguish synthetic portable tests from private real-art tests.

Proposed .gitignore additions (do not apply to historical baseline blobs):

```gitignore
node_modules/
.venv*/
__pycache__/
*.py[cod]
.env
.env.*
!.env.example
.cache/
models/
worker-cache/
local-data/
private-fixtures/
artifacts/generated/
test-results/
playwright-report/
coverage/
dist/
work/
*.log
```

Do not use global `*.png`/`*.zip` ignores that hide intentional synthetic fixtures or baseline files. Use explicit manifests/allowlists. Initial plan needs no LFS: models/media remain external verified artifacts, while baseline files fit limits. If later large redistributable assets require LFS, owner approves storage/quota/rights, pin pointer and resolved-byte hashes, verify LFS clean clone and keep original baseline tag untouched. Never upload unresolved checkpoints as release assets.

Releases contain source archive/built static app, dependency/notice inventory, checksums, schema docs and synthetic examples. Private real-source/art evidence is separate and rights-gated. No bundled Python/CUDA/FFmpeg binary until exact redistribution/build notices clear. Optional models use explicit user provisioning plus exact hashes/grants; no startup downloads. Secrets and local machine paths are scanned before push.

## Clean clone and final procedure

Tester clones the approved remote/tag into a new empty path without developer caches, first tests default manual/browser path offline using verified dependency cache, then provisions only cleared optional profiles. Verify baseline Git blobs, `npm ci` integrity, validator regeneration, ordinary localhost/IndexedDB, legacy import, new bundle roundtrip and real-art tests when private manifest supplied. Missing private assets produce explicit BLOCKED_PRIVATE_INPUT, not a false all-tests-pass. Clone with no model/cache must remain useful.

Steward records remote URL, branch, exact reviewed head, clean status, lock/test/audit/notice manifest hashes, source/build archive hashes and all required owner decisions. Final commit includes documentation/evidence only after affected checks pass; fetch remote, verify no unexpected commits, push explicit branch, and verify remote head equals reviewed commit. Owner review precedes release tag/publication. Proposed first engineering release tag `v0.3.0-rc.1` is a proposal, not an already assigned application version; final name requires release decision.

After owner release authorization: annotated immutable release tag on approved main commit; push that tag explicitly; re-clone tag, rerun release verification, upload only approved assets with SHA256 manifest, verify downloads and tag/commit identity. No `--force`, broad `--tags` push or automatic latest release. Rollback uses a corrective commit/release and preserved old tag, never retags a published version. End with clean working tree and final commit/push/tag report.
