# Migration, roundtrip and rollback plan

No migration occurs in this preflight. The canonical02.2.5 application, data and database remain immutable. Implementation starts in a new repository/tree/database only after owner approval. Existing owner-pending material stays pending.

## Import contract

1. Inventory and SHA256 original source archives, baseline files and exported legacy workspace. Preserve exact bytes and a source manifest before opening in a new application. Legacy source hashes/IDs are not regenerated from filenames.
2. Parse the legacy portable format `sprite-foundry/corpus-package` version1 safely: manifest, corpus.header.json, media/index.json, references/index.json, comparisons/index.json, records/<entry>.json, tracks/<entry>.uprep.json and media/<hash>.bin. Enforce original version/required paths/uniqueness and media length/hash checks. Decompression/path/size bounds precede interpretation.
3. Validate workspace format1, track format4 and skeleton 1.2.0 against canonical definitions. Preserve all 26 primary controls, five existing facial controls, manual aliases and visibility semantics. No extra provider landmarks enter the skeleton.
4. Stage an exact `legacy/original.corpus.zip` snapshot plus new authoring records. Map legacy project/clip/subject/panel/reference/review/comparison/frame IDs through an explicit mapping table; never collapse panel/person/component identity. Preserve review scope/status/history, source links and comparison/reference snapshots. Do not turn imported verified/owner-pending terms into a new acceptance state through default values.
5. New fields use named authoring records, not ad hoc additions to old joints/tracks. Unknown optional fields are preserved as opaque bytes or extension objects with origin/type. Reused IDs/different content are quarantined or explicitly forked with mapping, not overwritten.
6. Validate all hashes/references/units/origins, write a MigrationRecord with source/output manifest hashes, adapter version, exact mappings/warnings/loss inventory, then atomically commit the new bundle head. Old files/database remain untouched.

The existing app's storage/export code clones headers and transforms track records; that is not proof it preserves every new field. The new format ID therefore differs. Legacy-only export projects supported legacy records with a visible loss inventory and retains the full authoring backup. Never label a lossy export a full roundtrip.

## Test fixtures and required roundtrips

| Fixture | Exact assertion |
|---|---|
| Original13-clip/901-frame backup | Clip/source/panel/subject/reference/review/comparison IDs, records and owner-pending states preserved; original ZIP bytes exactly recoverable |
| Embedded/external media | Identical SHA256/length, missing source policy explicit, no URI/path relocation changing identity |
| Raw provider extras |133 raw landmarks can survive without skeleton mutation; mapping revision retained |
| Mixed spatial provenance | OBSERVED/RECOVERED/INFERRED/UNKNOWN planes and all contributor sets survive trim, warp, blend, save/reopen/export/import |
| Layered garment | Overlap polygons, seams, subpart order, distinct joint/pivot/socket and topology/weights/shape-key revision links survive |
| Face | Native PXZ bytes, trim/masks, side/gaze/availability, five slots and identity/kit separation survive |
| Pair | Independent roles, root/time units, local contacts, order intervals, anchor/acceptance references and rejected substitutions survive |
| Unknown extensions/version | Unknown optional fields retained; unknown required major rejects before commit; no remote code/schema execution |
| Duplicate/collision/corruption | Same revision/same bytes idempotent; different bytes conflict; altered source/hash/ZIP/array length aborts without partial head |
| Interrupted storage | Crash before/after staged writes/head commit recovers one complete head; no half-updated asset or lost original |

Compare both exact-byte provenance and normalized semantic roundtrip where ZIP timestamps/order make whole-export bytes nondeterministic. Export manifests can be deterministic with prescribed entry order/timestamps; do not claim byte-identical newly generated ZIPs until tested. Original legacy snapshot must always remain byte-identical regardless of new packaging details.

## Poser source preservation and non-destructive redesign

Preserve exact v0.4.13 source rig and16 PNG hashes as historical inputs, including original names, hierarchy, pivots and sockets as source metadata. They do not constrain the new production hierarchy. M02P may choose adapted, native or hybrid 2D architecture; migration may split/merge/reparent art, remesh, replace weights/pivots/sockets/deformation and change renderer.

Each ArtworkRigMapping links source hashes/regions to derived part/surface IDs, coordinate transforms, control/anatomy semantics, distinct pivots/sockets, seams/order and coverage origin. Record unsupported source fields, intentional corrections and any unrepresented artwork in a loss/coverage report; preserve the source even when not all parts are used. Hidden seam extensions keep OBSERVED/RECOVERED/INFERRED/UNKNOWN lineage. M09 tests source recovery plus usable bindings/animation on the selected poser; neither old-topology identity nor pixel equality to its renderer is mandatory.

Do not mutate accepted records to fit a new rig: create new profile/mapping/package revisions and revalidate affected animation/module/envelope tests. Old rig previews remain available as reference where feasible; a legacy-only export may declare unsupported new features rather than silently drop them. Preserving/reopening original source bytes is mandatory even if bidirectional conversion to the old rig cannot be lossless. No backward export claim is made without its own tests.

Rollback selects the previous application/bundle/profile/mapping revision or original legacy snapshot. It does not require converting a native rig back to old 20-layer topology, deleting derivatives or resetting canonical evidence. Full source restoration and new-data backup are both tested. No such migration runs in this preflight.

## Reversibility and rollback

New authoring DB and legacy DB have different names. Back up the original before any authorized use. Rollback to02.2.5 means open the preserved original app/tag with its original/exported legacy data; new authoring records remain in their independent backup. It does not require rewriting the old workspace or stripping new schemas into it. A one-click “restore legacy” action must make the data source selection clear and cannot delete the new bundle.

Each schema migration runs copy-on-write with a before-head snapshot and migration journal. If validation fails, abandon staged data and retain previous head. Revert a bad application deployment by selecting a previous build/release and compatible bundle head; incompatible data revisions are not silently downgraded. Export before major schema changes; require explicit owner approval for any future canonical migration.

Bad provider imports are reversed by selecting the previous revision head and recording a superseding event. Keep raw observations/corrections and acceptance history. A later edit invalidates affected acceptance applicability rather than rewriting historical approval. Dependent surfaces/bakes/anchors/pair tests become stale through dependency revision tracking.

Git rollback is a reviewed revert/corrective commit, never force-push or retagging. Freeze manifests and owner input remain immutable. Clean-clone tests use a fresh location/cache and explicit private-fixture provisioning. No implementation is complete until the Independent Tester proves portable reopen and rollback, and the Auditor verifies canonical semantics remained intact.
