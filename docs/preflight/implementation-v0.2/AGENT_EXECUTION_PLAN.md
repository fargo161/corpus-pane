# Agent execution and authority plan

This converts the approved run-contract role separation into future implementation ownership. No implementation agents were dispatched and no independent implementation PASS is claimed by this preflight. The director's package QA is not a substitute for the independent audit/test roles below. The full historical contract is preserved in reference/RUN_CONTRACT_DRAFT_0_1.md; current owner instructions and revised controlled-source scope take precedence over its old research requirements.

## Six independent responsibilities

| Role / stable agent identity | Owns | May not do | Required artifacts / gate |
|---|---|---|---|
| Run Director / Lead Architect | Scope, architecture decisions, dependency graph, milestone entry/exit coordination, budget/context and owner escalation | Merge to main, bypass gates, alter skeleton 1.2.0 without owner, self-declare final PASS or accept assets | RUN_CHARTER, DECISION_LEDGER, architecture/schema decisions, MILESTONE_STATUS, FINAL_RUN_REPORT; approve contract consistency before feature starts |
| Integration Builder | Sole integration writer; core schemas/domain/storage/host orchestration and integration fixes; commits reviewed implementation | Merge own work to protected main, certify own acceptance, delete historical evidence, promote owner-pending data | Implementation PR, changed-contract/lock inventory, reproduction commands, tests, screenshots and known limits |
| Architecture Auditor | Independent adversarial review of replaceability, canonical ownership, identity/evidence semantics, 2D design, pivot/joint/socket, migrations and licenses | Author substantive fixes for code it signs off, declare tester PASS, merge main or accept family/assets | ARCHITECTURE_AUDIT with BLOCKER/MAJOR/MINOR/NOTE, exact commit and requirement IDs, independent remediation verification |
| Independent Tester | Baseline/fresh-environment/feature/failure/visual/roundtrip/clean-clone execution using independently derived expectations | Weaken tests, substitute Builder logs for execution, author substantive feature fixes, accept owner assets | TEST_PLAN, test manifests/logs/screenshots/worst cases, PASS/PASS_WITH_LIMITATIONS/FAIL with exact environment/commit |
| Licensing/Dependency Steward | Exact code/weights/data/transitive artifact locks, notices, approved capability manifest, distribution rights | Assume repo grant covers weights/data, approve unresolved required artifacts, activate restricted weights, change architecture unilaterally | DEPENDENCY_AUDIT, THIRD_PARTY_NOTICES, artifact/checkpoint ledger, reproducible wheel/cache manifest, per-distribution inclusion decision |
| GitHub Steward | Repository/bootstrap/branch protection/history, qualifying merges, clean-clone delivery, push/tag/release mechanics | Create repo before owner approval, change semantics, merge failing code, erase provenance, declare final product acceptance | REPOSITORY_SETUP, BASELINE_IMPORT_PROOF, PR/merge evidence, CLEAN_CLONE_REPORT, final commit/push/tag manifest |

Auditor and Tester are separate identities from each other and from Builder/Director. Licensing and GitHub Steward remain separate responsibilities/identities as requested; a specialist cannot replace them. The owner retains scope changes, acceptance of family/assets/templates, deferral of unresolved MAJOR findings and final release authority. No delegated waiver/merge authority has been granted to Director.

## Concrete file ownership

| Area | Single implementation owner | Specialist use |
|---|---|---|
| schemas/, src/domain/, migrations/, bundle format, protocol definitions | Integration Builder under frozen Director contract | No simultaneous architecture editors; specialists propose changes through a contract issue |
| src/providers/, worker adapters and process plumbing | Builder initially | One bounded provider specialist after M01/M02 interfaces freeze; owns adapter files only, no schema/acceptance changes |
| src/authoring/, src/poser/ and render primitives | Builder integration | One geometry/poser specialist useful for bounded M02P A/B/C prototypes, then selected M05/M06; owns isolated rig/mapping/mesh modules. May redesign or replace the art rig under measured selection; cannot change canonical skeleton1.2.0 or acceptance authority |
| src/face/ and PXZ adapters | Bounded face specialist during M07a if needed | Can run alongside poser only on disjoint modules; schema changes return to Builder/Director |
| src/pair/ | Builder until M10 contracts stabilize | Optional contact/retarget specialist for M11/M12, only if real inputs and budget warrant |
| tests/acceptance/ and audit probes | Tester / Auditor respectively | Builder may add unit tests; independent acceptance expectations remain independent |
| dependency locks/notices/artifact profiles | Licensing Steward | Builder proposes additions; Steward reviews actual artifacts, not only package names |
| .github/, protected branch settings, release scripts/history | GitHub Steward | Workflow action updates require exact pin/notice review; no third-party action mandatory initially |

Use separate feature branches/worktrees after authorization; attach them to the task. Never have multiple agents edit schemas or integration files concurrently. Specialists submit patch/PR handoffs; Builder integrates and owns the resulting combined behavior. Do not create side chats/threads or message external collaborators without separate authorization.

## Four-slot execution schedule

Maximum 4 active agents, one GPU job. Roles persist across waves but need not all be active at once.

1. Foundation wave: Director + Builder + Licensing Steward + GitHub Steward for approved freeze/setup. Auditor reviews contract in the next bounded wave before M01 merge; Tester independently reproduces baseline. Stewards idle when no artifact/history task exists.
2. Feature wave: Builder + one useful specialist + Tester + Director **or** Auditor. Director hands off a written contract before idling; Auditor joins at boundary. Licensing reviews any dependency diff before merge. No unreviewed dependency enters during an idle Steward interval.
3. Gate wave: Builder stops new features; Auditor + Tester + Licensing Steward inspect exact candidate, with Director coordinating within available slots. Remediation returns to Builder; independent reviewers rerun affected checks.
4. Closure wave: Director + Auditor + Tester + GitHub Steward, with Licensing report sealed before handoff. Builder returns only for fixes; closure reserve cannot be consumed by optional features.

Gate 2C research is the technology decision record; no new broad model-survey agents. Use a provider/poser/face specialist only when a concrete bounded implementation task benefits. Four simultaneous general architecture agents would create conflicts rather than throughput.

## Assignment packet and handoff

Each assignment contains milestone/requirement IDs, exact base commit, owned file paths, interface/schema/lock revisions, allowed actions, entry inputs, acceptance/failure cases, budget and stop conditions. Keep the working brief≤8000 tokens with links/hashes to authoritative files; load relevant excerpts rather than whole checkpoints/media/model payloads. At context pressure, write a checkpoint before handing off: commit/worktree, changed files, decisions, test command/results, open findings and next action. Agent memory is not a source of truth.

M02P ownership: Director freezes comparison criteria, Builder/specialist builds bounded alternatives, independent Tester measures, Auditor checks contracts/maintenance, Licensing Steward clears reused artifacts. Director records evidence-based selection within authorized scope; no agent must preserve historical topology. M09 can reopen the choice when actual canonicalized assets refute it. Owner still controls project protections, asset/family acceptance and release.

PR gate: Builder packet → Auditor architecture review → Tester fresh execution → Licensing approval for dependency/distribution diffs → Director confirms scope → GitHub Steward verifies exact reviewed head and merges. Parallel reviews may share the same fixed commit; any code/lock/input change invalidates affected signoffs. Auditor labels finding closure independently; Tester owns testing status. PASS_WITH_LIMITATIONS cannot satisfy a blocked mandatory acceptance cell without explicit owner-approved scope change.

Artifacts are stored under docs/run, docs/architecture, evidence/<milestone>/<commit>, docs/licenses and docs/github. Source hashes/lineage and old failures remain. Final handoff includes reproducible commands, versioned test/visual evidence, remaining blockers, clean clone and owner decision list. End the implementation run at the approved gate; do not infer release/publication approval from permission to build.
