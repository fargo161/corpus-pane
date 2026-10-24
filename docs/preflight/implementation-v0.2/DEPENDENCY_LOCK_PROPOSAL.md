# Dependency lock proposal

This is an exact selection/qualification proposal, not an installed production environment. [DEPENDENCY_LOCK_PROPOSAL.json](proposals/DEPENDENCY_LOCK_PROPOSAL.json) contains artifact URLs, SHA-256 or npm SHA-512 integrity, commits, file hashes and Windows dependency-profile closure. Registry evidence is retained in [NPM_REGISTRY_METADATA.json](evidence/NPM_REGISTRY_METADATA.json), [PYTHON_REGISTRY_METADATA.json](evidence/PYTHON_REGISTRY_METADATA.json) and [RUNTIME_UPSTREAM_METADATA.json](evidence/RUNTIME_UPSTREAM_METADATA.json). Only metadata was fetched; no new model/package was installed in this preflight.

Disposition and activation are separate. APPROVED_WITH_CONDITIONS means the named grants support the proposed use subject to fulfilled notices, exact-artifact checks and qualification. It does not authorize distribution of unrelated assets. No RESEARCH_ONLY, REJECT or UNRESOLVED artifact is mandatory for the default manual/browser path. A disabled optional provider cannot block that path. The complete Gate 2C resource ledger is preserved in [reference/gate2c/RESEARCH_AND_LICENSE_LEDGER.md](reference/gate2c/RESEARCH_AND_LICENSE_LEDGER.md); excluded resources are not reopened.

## Mandatory production and build set

| Resource | Exact identity | Status / obligations | Role and fallback |
|---|---|---|---|
| Owner baseline sources | All 214 file hashes in BASELINE_FREEZE.json; original skeleton file `engine/universal.js` SHA256 `65b0308baf7c0396c7f91f1aa38f875ca244dda2027f7428afa225ac04cf0f2d` | APPROVED_WITH_CONDITIONS: owner-authorized internal work; project/public redistribution license still owner decision | Retain keyer, ZIP/hash/media/domain behavior behind adapters. No blanket license assertion over source art |
| Node host/build | 24.18.0 Windows x64 ZIP SHA256 `0ae68406b42d7725661da979b1403ec9926da205c6770827f33aac9d8f26e821` | APPROVED_WITH_CONDITIONS: Node MIT plus bundled third-party notices; existing runtime or explicitly provisioned archive | Built-in HTTP/crypto/process/fs only. Browser authoring remains usable after host restart; no Express/service dependency |
| npm build tool |11.16.0; exact tarball SHA512 in machine lock and NPM_TOOL_METADATA.json | APPROVED_WITH_CONDITIONS, Artistic-2.0 plus bundled dependency notices; build-only | Explicit provisioning/cache; not a runtime service or floating npm update |
| Delaunator | 5.1.0; exact tarball integrity in JSON | APPROVED_WITH_CONDITIONS, ISC; retain copyright/license | Triangulation kernel only. Manual rigid pieces if mesh cannot satisfy constraints |
| robust-predicates | 3.0.3; exact tarball integrity | APPROVED_WITH_CONDITIONS, Unlicense; retain package notice/provenance | Delaunator dependency; never substitute a floating major |
| Ajv | 8.17.1; exact tarball integrity | APPROVED_WITH_CONDITIONS, MIT | Build-time Draft2020-12 validators; generate standalone JS, avoid runtime dynamic compilation |
| Ajv transitive set | fast-deep-equal3.1.3; fast-uri3.1.2; json-schema-traverse1.0.0; require-from-string2.0.2 | APPROVED_WITH_CONDITIONS, MIT each; all exact integrity/URLs in JSON | Frozen build/standalone-helper closure. No ajv-cli/formats/plugins required |

Use plain ES modules and checked-in generated validators with regeneration diff checks. Ajv's documented standalone compilation supports pre-generation rather than runtime schema compilation; this informs the CSP choice. [Ajv upstream](https://ajv.js.org/standalone.html). Version and MIT source license are verified against [Ajv8.17.1 source](https://github.com/ajv-validator/ajv/blob/v8.17.1/package.json).

Build writes a lockfile with exact versions, no caret/tilde resolution and frozen transitive entries; `npm ci --ignore-scripts --offline` against a verified cache must succeed. Add no bundler, framework, analytics or runtime CDN. Compile schema helpers deterministically and retain any emitted runtime helper license. The JSON proposal is not a substitute for the implementation's generated npm lock and notice archive at M00/M01.

## Inherited optional browser model artifacts

| Artifact | SHA256 | Status / boundary |
|---|---|---|
| `engine/movenet-model.js` | `95812a982842d9c85e227e7e1054991c548a61b786c6e3fdc7fc6d35db0427c0` | APPROVED_WITH_CONDITIONS; exact embedded Lightning v4 conversion, no invented package version. Local header identifies Google Apache2.0 / Mandic MIT conversion; retain grants and complete conversion provenance before release activation |
| `engine/face-api.js` | `0160f7af3a8c78cece45c7ecc765383bad74becfd438bb787cdd627b2d6f2cf6` | APPROVED_WITH_CONDITIONS; exact vendored runtime, MIT notice; review bundled TF/runtime notices rather than claiming guessed semver |
| `engine/fa-models.js` | `afd545bf1fe622a668aa35c430d93fe0ce1f191459f27dd9c8ba760bdfaccabd` | APPROVED_WITH_CONDITIONS for inherited artifact; separate model/data provenance and required feature usage before redistribution |

MoveNet remains the selected fast accelerator once its notice/conversion gate closes; manual pose is always present. The embedded inference runtime is not the new five-slot face architecture. A license-disabled browser model is not fetched from another source or treated as required merely because legacy code referenced it. M02 tests loading/disabled behavior explicitly and isolates legacy global side effects.

## Optional approved code/worker profiles

| Resource | Exact pin | Status and activation condition | Failure fallback |
|---|---|---|---|
| SAM2.1 tiny code | facebookresearch/sam2 `2b90b9f5ceec907a1c18123530e92e794ad901a4`; config hash `f932eac1c6241e910031b2f000a81cd9f8a8d4896e2277ab5ffb721f378b188d` | APPROVED_WITH_CONDITIONS, Apache2.0 code/checkpoint declarations from Gate 2C; preserve LICENSE and applicable third-party notices. No SA-V dataset redistribution implied | Manual masks/keyframes; warned short-flow proposals |
| SAM checkpoint | 156008466 bytes; SHA256 `7402e0d864fa82708a20fbd15bc84245c2f26dff0eb43a4b5b93452deb34be69` | Optional, disabled until explicit provisioning, notices, trusted hash, runtime/wheel qualification and safe load. No automatic download | Same |
| Stretchy selected source | `24a83a27ba43e43e9d2e3de5e33994594e6199c2`; file hashes in selectedUpstream | APPROVED_WITH_CONDITIONS, MIT; adapted files retain attribution and patch history; Delaunator ISC separately | Own rigid/variant authoring, not whole editor adoption |
| Animated Drawings ARAP | `b859684857519c7424da51a0b0862fbd1fd258f4`; arap.py SHA256 `b15151b913df8f50c23305253f08a687e4a780a3dc526df7552471c2bb8f02be` | APPROVED_WITH_CONDITIONS, MIT selected solver only; adaptation patch and numerical notices; optional offline bake | Rigid/LBS/shape keys/narrower envelope |
| DWPose adapter code | ControlNet annotator source `3dca5db79d9f9ffdd378753ddf6ec66535aace88`; onnxpose.py SHA256 `16fb69ab54f5e1ce8a5ad186e92f357da0162fc2ca2eeec4ccf1db72949291a2` | APPROVED_WITH_CONDITIONS, Apache2.0 selected code. Mapping stays Corpus Pane-owned | MoveNet/manual; mock raw 133-landmark tests now |
| DWPose checkpoint | dw-ll_ucoco_384.onnx, 134399116 bytes; SHA256 `724f4ff2439ed61afb86fb8a1951ec39c6220682803b4a8bd4f598cd913b1843` | RESEARCH_ONLY, excluded from enabled production set pending COCO/UBody/pretraining/notice closure despite author's affirmative checkpoint grant | No activation under this lock; code adapter can ship disabled |

SAM build disables CUDA extension (`SAM2_BUILD_CUDA=0`), sets fill_hole_area0, no compile, CPU frame/state offload. Adapt the Gate 2C PNG loader as reviewed code with exact resize/normalization/native-PTS mapping; do not promote its monkeypatch as production implementation. Do not install upstream notebook/demo extras, train models, use a GPU detector or import Cutie's GUI/RITM stack.

## Exact optional Python artifact closure

The machine lock enumerates 29 selected artifacts, with exact version and official wheel/sdist SHA256. Profiles select only their reachable requirements: SAM24 packages; ARAP3; disabled DWPose7. The union is not a request to install all29. Research reference was CPython3.12.0 with system-site exposure; production must use isolated environments.

| Packages / versions | License families to preserve in selected artifact notices |
|---|---|
| torch2.7.1+cu128; torchvision0.22.1+cu128 | BSD-style source grants plus bundled CUDA/cuDNN and other third-party binary terms; separately inventory redistribution, no assumed OS-driver bundling |
| hydra-core1.3.2; iopath0.1.10; omegaconf2.3.1; PyYAML6.0.3; filelock3.32.0 | MIT source grants; preserve copyrights |
| antlr4-python3-runtime4.9.3 | BSD source notice; pinned sdist rather than nonexistent claimed Windows wheel |
| numpy2.5.1; scipy1.17.0 | BSD plus vendored numerical components (including declared 0BSD/MIT/Zlib/CC0 and BLAS/runtime notices as applicable to exact wheel) |
| pillow12.3.0 | MIT-CMU plus included codec notices; no source-image rights conveyed |
| psutil7.2.2; portalocker2.7.0; fsspec2026.6.0; networkx3.6.1; sympy1.14.0; mpmath1.3.0 | BSD variants; preserve exact LICENSE files |
| typing_extensions4.16.0; pywin32 312 | PSF-family terms and included historical notices |
| tqdm4.70.0 | Declared MPL-2.0 AND MIT; file-level notice/modification obligations must be preserved |
| colorama0.4.6; Jinja2 3.1.6; MarkupSafe3.0.3 | BSD-family notices, not missing-license inference from sparse registry metadata |
| setuptools78.1.0 | MIT plus vendored notices; build support, not a user-facing feature |
| packaging26.2 | Apache2.0 OR BSD2 choice recorded in notice ledger |
| onnxruntime1.28.0; opencv-python-headless5.0.0.93; protobuf6.33.6; flatbuffers25.12.19 | MIT / Apache2 / BSD3 / Apache2 respectively, plus bundled binary third-party notices; DWPose-only profile disabled |

All optional package rows are APPROVED_WITH_CONDITIONS for the declared internal profile; condition fulfillment requires actual selected-artifact notice extraction, vulnerability/ABI smoke checks, transitive closure comparison and reproducible installation. Registry labels do not establish an entire binary bundle's rights. Missing or contradictory notices disable that optional profile rather than weakening the default path. No weight/data license follows from these library grants.

Worker target CPython3.12.15 source SHA256 `c2c4321961fab0fb999d66e0cecf521c2ab3994c7992873ea99e306c1094fd5a`. Official release is source-only, so **a trusted patched Windows cp312 binary/build hash has not been selected**. Do not deploy the old3.12.0 research interpreter as a silently approved runtime. M02 must lock and qualify a patched cp312 Windows build, or keep Python providers disabled. This is a later optional activation blocker, not a missing mandatory default dependency. [Official3.12.15 release](https://www.python.org/downloads/release/python-31215/).

iopath/ANTLR are exact pinned sdists. Their derived wheel hashes and controlled build-tool hashes are not yet produced; M02 must create a separate build lock and sealed wheelhouse before offline provisioning. `pip --require-hashes --no-index` must consume that qualified wheelhouse, never resolve floating build dependencies on startup. This distinction prevents claiming an unbuilt deployment lock is complete.

## Test tools, exclusions and notices

Playwright1.62.1 and playwright-core1.62.1 are exact Apache2.0 test-tool proposals with registry integrity. Windows excludes optional macOS fsevents. Use installed Chrome 155.0.8059.41 reference, record browser binary hash/version at execution, disable browser auto-download. Node built-in test runner suffices for pure domain tests. Operating-system/browser distribution is external to the app archive and must be recorded as an environment, not bundled without permission.

Cutie weights UNRESOLVED; trained parsers/generative completions and full Animated Drawings application are excluded; Spine runtime REJECT for direct unlicensed reuse; installed FFmpeg9.0.1 binary redistribution UNRESOLVED and not mandatory. Preserve individual Gate 2C dispositions, including distinctions between Sapiens versions. No new parser/model selection is proposed.

Licensing Steward creates THIRD_PARTY_NOTICES, code/model/data ledgers, SPDX-style inventory, exact lock hashes, source modification notices and per-distribution inclusion manifest. Audit separately source, weights, training/pretraining data, dataset annotations/images, binary transitives, commercial use, redistribution and attribution. Owner input U09 still controls source/art public release. Any default-path lock gap fails M00/M01 rather than becoming an unresolved mandatory production artifact.
