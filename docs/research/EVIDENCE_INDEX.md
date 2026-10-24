# Repository research and preflight evidence index

This is the current repository-local index for the intentionally selected historical research/preflight subset. Original copied research/preflight documents remain byte-identical historical sources. Their relative links describe their **full source archives**, not a promise that every linked file is in this Git checkout. In particular, gate2c/README.md links to reports, CSV, research_tools/ and inherited_gate2b/ that are supplied in the full external archive. Do not infer missing implementation or test PASS from a source-document link.

Current authority: [authorized run charter](../run/RUN_CHARTER.md), [decision ledger](../run/DECISION_LEDGER.md), [owner poser correction](../preflight/implementation-v0.2/OWNER_CORRECTION_AND_CHANGELOG.md) and [owner-authorized interim merge policy](../run/INTERIM_MERGE_POLICY.md). Historical HOLD and fixed-v0.4.13-host/topology language is superseded by these current owner decisions. Source history remains preserved. The production poser is selected through real M02P evidence; no winner is implied by an archived report.

## Included repository-local Gate2C entry points

- [Technology synthesis](gate2c/TECHNOLOGY_HARVEST_SYNTHESIS.md)
- [Proposed stack](gate2c/PROPOSED_PRODUCTION_STACK.md)
- [Reuse matrix](gate2c/RESOURCE_REUSE_MATRIX.md)
- [License/research ledger](gate2c/RESEARCH_AND_LICENSE_LEDGER.md)
- [Historical unresolved inputs](gate2c/UNRESOLVED_INPUTS.md)
- [Historical full-package README](gate2c/README.md), interpreted under this subset notice.

The approved implementation-preflight source documents/proposals/manifests are under ../preflight/implementation-v0.2. Its README references the full original reference/ tree, recovered artwork and package manifest. Those artifacts are in the matching external archive, not duplicated into Git merely to satisfy historical hyperlinks. The committed hash manifests describe complete original packages, not the smaller Git snapshot. Absolute original root paths inside manifests are provenance labels; reproducibility must use the supplied root/manifest file list, never assume another machine has that Windows path.

## Obtain and verify complete evidence

The owner supplies the following PRIVATE archives from their original handoff/workspace or approved private artifact store. They are not public GitHub downloads and no public release or redistribution is authorized here. A clean clone can run its portable/synthetic/baseline tests without the external package, while named real-art/source-video tests require explicit provisioning and otherwise report VALIDATION_BLOCKED. Do not silently download substitutes.

| Full original archive | Bytes | SHA256 |
|---|---:|---|
| `Corpus_Pane_Implementation_Preflight_v0_2.zip` | 7616638 | `c12b5adc65665cf88f0362fbfea3c4f7d5f65ba50fbf0639bff3d15be6cb0cfe` |
| `Corpus_Pane_Gate2C_v0_3.zip` | 4554317 | `d9aa05a4fefbb69ab8dd6e0baa6f1245142d3942fa1c9841c6957e7a5462094e` |
| `Corpus_Pane_Gate2B_v0_2.zip` | 3226600 | `3872e765e7056ea4bf257dfd29bc66f5d3ff53df1637f215a4aa9eedd0aaa38a` |

Verify the full archive SHA256 before extraction. Extract the full package outside tracked source (for example an owner-chosen private-fixtures directory ignored by Git), preserve its relative paths, and pass that location explicitly to the relevant test/inspection command. Full Gate2C provides inherited_gate2b/, source/module/measurement/license manifests, detailed reports and research_tools/REPRODUCE.md. The full implementation-preflight archive provides reference/gate2c/, reference/v0.4.13/ and its verified16-artwork source identities. Do not copy models, private source media or per-frame renders into Git by default.

The frozen02.2.5 source and its existing fixtures are already tracked under baseline/02.2.5 by deliberate exact-historical-import exception. Its root-layout original is retrievable from baseline/02.2.5 tag without rewriting that tag. Future clean-clone reports must separately state which default/baseline tests ran and which optional private-fixture tests were blocked. Source recovery and numeric/visual compatibility are different gates.
