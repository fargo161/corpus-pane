# Corpus Pane Checkpoint 02.2.4 tests

Run the direct suites from the release root:

```text
node tests/core.test.cjs
node tests/knowledge.test.cjs
node tests/repair.test.cjs
node tests/library_search_approval.test.cjs
node tests/search_semantics_cleanup.test.cjs
node tests/view_priority_composite_review.test.cjs
node tests/graded_view_visibility.test.cjs
node tests/surgical_repair_0224.test.cjs
```

Current direct results: **98/98**.

Focused browser checks are run individually:

```text
python tests/repair_browser.py
python tests/search_approval_browser.py
python tests/search_semantics_browser.py
python tests/view_priority_composite_browser.py
python tests/graded_view_visibility_browser.py
python tests/seed_backup_compat.py
```

`graded_view_visibility_browser.py` uses the packaged `starter/Arm_Shoulder_Torso_Surgical_Repair_02_2_4.corpus.zip` by a relative path. No builder-specific source path is required.

`tests/real_corpus_search_review.cjs` records the real 13-clip retrieval inspection. Historical prior-checkpoint results remain evidence only and are not represented as fresh reruns.
