# Research and license ledger — Gate 2C update

Checked October 24, 2026. This ledger evaluates named resources for the proposed future stack. It does not authorize production integration, public redistribution or promotion of any owner-pending material. Every resource receives a disposition in [RESOURCE_REUSE_MATRIX.csv](RESOURCE_REUSE_MATRIX.csv); its separate fields are part of this ledger. Original Gate 2B findings are preserved at the end and in the frozen inherited package.

## Material refinements from new evidence

- SAM 2.1 tiny is now pinned and executed. Code revision 2b90b9f5ceec907a1c18123530e92e794ad901a4; checkpoint 156,008,466 bytes, SHA-256 7402e0d864fa82708a20fbd15bc84245c2f26dff0eb43a4b5b93452deb34be69. Upstream explicitly licenses checkpoints and code Apache 2.0. Optional connected-component code is BSD-3-Clause. Demo fonts have separate OFL terms and are not selected. [Pinned declaration](https://github.com/facebookresearch/sam2/blob/2b90b9f5ceec907a1c18123530e92e794ad901a4/README.md#license)
- SAM's SA-V README declares the dataset CC-BY4.0. The `sav_dataset/LICENSE` file instead covers evaluation software under BSD; it is not the dataset image license. Record training/pretraining provenance separately, including SA-1B/other sources; no training images, annotations or demo assets were downloaded or bundled. A checkpoint license is not a dataset redistribution grant. [Dataset declaration](https://github.com/facebookresearch/sam2/blob/2b90b9f5ceec907a1c18123530e92e794ad901a4/sav_dataset/README.md)
- Cutie core revision ec5cdd4cf16f75c73ad785a2f96fb97dbad4125a is MIT. Selected checkpoint 140,443,788 bytes, SHA-256 9c05402ee36d3a356fb72715d263ba7e1ea06ad3bada48c1306491792da43023; release MD5 matches a6071de6136982e396851903ab4c083a. The reviewed release/downloader provides no explicit weight-specific grant. The checkpoint remains UNRESOLVED; no contrary rights conclusion is implied. [Core license](https://github.com/hkchengrex/Cutie/blob/ec5cdd4cf16f75c73ad785a2f96fb97dbad4125a/LICENSE), [release](https://github.com/hkchengrex/Cutie/releases/tag/v1.0)
- Cutie's mega config identifies static segmentation datasets and DAVIS/YouTubeVOS/MOSE/BURST/OVIS training; ResNet pretraining is a separate chain. Dataset images, annotations and learned weights need separate review. Bypassing two redundant pretraining downloads after strict full-checkpoint loading saves downloads, not training-provenance obligations. GUI/RITM weights were not downloaded. [Mega config](https://github.com/hkchengrex/Cutie/blob/ec5cdd4cf16f75c73ad785a2f96fb97dbad4125a/cutie/config/data/mega.yaml)
- See-through's separate `24yearsold/l2d_sam_iter2` body parser now has affirmative Apache-2.0 weight terms and a NOTICE naming SAM-HQ/SAM and fine-tuning changes. This closes that narrow declaration gap, not training-artwork rights or product fit. LayerDiff3D and the redirected Marigold model repositories separately declare OpenRAIL++; root Apache code does not cover them. All remain research-only in this stack. [Parser card](https://huggingface.co/24yearsold/l2d_sam_iter2), [NOTICE](https://huggingface.co/24yearsold/l2d_sam_iter2/blob/main/NOTICE), [LayerDiff](https://huggingface.co/layerdifforg/seethroughv0.0.2_layerdiff3d), [Marigold](https://huggingface.co/layerdifforg/seethroughv0.0.1_marigold)
- Stretchy source is MIT, but its Delaunator wrapper comment saying MIT is not the selected dependency license. Downloaded Delaunator 5.1.0 is ISC; robust-predicates 3.0.3 is Unlicense. Their actual texts and npm integrity lock are included. [Delaunator license](https://github.com/mapbox/delaunator/blob/main/LICENSE)
- Animated Drawings code and its offered drawing models have an upstream MIT declaration, with Amateur Drawings also declared MIT and ChildlikeSHAPES CC-BY4.0. No such model or dataset was adopted. Standalone ARAP source reuse has the MIT notice path; external CMU/BVH motion libraries are separate and not selected. [Declaration](https://github.com/facebookresearch/AnimatedDrawings/blob/b859684857519c7424da51a0b0862fbd1fd258f4/README.md#license)
- Spine's runtime agreement dated April 5, 2025 is a specific editor-license/recipient-license path, not a permissive open-source grant. Concepts only are selected. Sapiens v1 is CC-BY-NC4.0; Sapiens2 uses different custom terms and is not automatically classified noncommercial. Neither is a production dependency. [Spine terms](https://esotericsoftware.com/spine-runtimes-license), [Sapiens1](https://github.com/facebookresearch/sapiens/blob/main/LICENSE), [Sapiens2](https://github.com/facebookresearch/sapiens2/blob/main/LICENSE.md)

## Code reuse conditions

MIT: retain copyright and permission notices in copies/substantial portions. Apache2: include license, retain applicable notices, mark modified files and preserve NOTICE content when supplied. ISC: retain copyright/permission notice. BSD-style dependencies: retain the exact applicable conditions/notices. Retaining paper citations does not create a license to copy an author's unlicensed code. Use the separately MIT-licensed Animated Drawings solver if adapting that implementation. Do not import datasets/sample art simply because code permits commercial reuse.

For selected small source modules, retain their license and attribution next to the imported code and record exact commit/file hashes and modifications. Pure concepts will be implemented against Corpus Pane's own data and acceptance model. This package contains research source-review copies under the corresponding notices, not a production dependency integration.

## Runtime and distribution boundary

The research environment is isolated under work/gate2c. Python 3.12, torch2.7.1+cu128, torchvision0.22.1+cu128, Hydra1.3.2, OmegaConf2.3.1, iopath0.1.10, einops0.8.2 and SciPy1.17.0 were recorded. Existing NumPy/Pillow and Gate2B OpenCV/psutil were reused. The artifact CSV exporter uses the bundled document runtime separately from the provider runtime.

PyTorch/torchvision code licenses and CUDA/cuDNN binary redistribution terms are different. ONNX Runtime MIT and OpenCV core Apache2 are not blanket clearance for every provider, wheel or codec. NumPy/SciPy/psutil have permissive BSD terms; Pillow uses its own historical HPND-style terms. Complete exact-wheel/transitive notices and production locks remain next-gate work. No wheel, checkpoint, full runtime, training dataset or FFmpeg binary is included in this handoff.

The installed Gyan FFmpeg full build was a local research tool. A production decoder redistribution decision must audit its exact configuration and codecs; do not bundle it as an unresolved mandatory dependency. The first-path fallback is user-supplied prepared frames or an approved decoder, with source-frame identity maintained. [FFmpeg legal information](https://ffmpeg.org/legal.html)

## Mandatory-dependency rule

No UNRESOLVED, RESEARCH_ONLY or REJECT artifact is mandatory in the proposed production path. SAM and DWPose are optional accelerators subject to their recorded conditions; manual reviewed masks/pose and authored source-preserving components remain available. Cutie weights, SCHP weights, generative completion, Sapiens, Spine runtime and unreviewed decoder binaries are excluded from required deployment.

Source/public artwork rights are independent of technical compatibility. The owner supplied these files for private research; public/production redistribution terms remain unresolved. All status words here are analyst resource dispositions and do not change project acceptance authority.

## Gate 2B ledger retained verbatim

# Updated research and license ledger

Gate 2B v0.2, checked October 24, 2026. Research use was authorized; this ledger does not approve production integration or publication.

## Executed paths

| Item | Exact identity | Code terms | Model/data terms | Production disposition |
|---|---|---|---|---|
| Bundled MoveNet/BodyKit/keyer | Hashes in prior baseline manifest; no canonical edits | Inherited project modules/notices retained | Baseline identifies MoveNet Lightning conversion; complete upstream weight provenance remains to finalize | Retain baseline; no new blanket distribution clearance |
| DWPose ONNX model | dw-ll_ucoco_384.onnx, 134,399,116 bytes; SHA-256 724f4ff2439ed61afb86fb8a1951ec39c6220682803b4a8bd4f598cd913b1843 | Official DWPose root Apache 2.0, MMPose attribution | Official author model repo declares Apache 2.0; COCO/UBody/pretraining provenance and relevant dataset terms still require separate review | RESEARCH_ONLY pending final production dependency/data ledger |
| ONNX preprocessing/decode | DWPose commit 3dca5db79d9f9ffdd378753ddf6ec66535aace88, ControlNet-v1-1-nightly/annotator/dwpose/onnxpose.py | DWPose/MMPose Apache 2.0 notices | No detector/YOLOX model adopted | Selected file used in isolated trial only |
| ONNX Runtime | 1.28.0, CPUExecutionProvider | MIT | No new model/data rights granted | APPROVED_WITH_CONDITIONS for future dependency selection |
| OpenCV headless | Package 5.0.0.93, core 5.0.0 | Core Apache 2.0; wheel and bundled dependencies have their own notices | No learned weights for Farneback/connected components | APPROVED_WITH_CONDITIONS after exact wheel/codec notices |
| NumPy / Pillow / psutil | 2.5.1 / 12.3.0 / 7.2.2 | Retain exact distribution notices | No model/data | Research environment dependencies; production locks/notices pending |
| FFmpeg/ffprobe | Installed Gyan full-build 9.0.1 | Build-specific FFmpeg/codec license review before redistribution | Source-video rights separate | Local tool use only; binary not redistributed |
| Prepared source pack/PXZ/rig/renders | Exact hashes in INPUT_MANIFEST.json | User-supplied project material | Public redistribution rights not specified | Authorized private research; no public-art/data license inferred |

The v0.1 weight finding is refined: the official DWPose model repository does publish an Apache-2.0 declaration. This is affirmative model-license evidence, not a substitute for exact dataset/training-chain and notice review. [Official model repository](https://huggingface.co/yzd-v/DWPose), [code license](https://github.com/IDEA-Research/DWPose/blob/onnx/LICENSE)

The benchmark used official affine crop and SimCC decoding, bypassing detector installation because the inputs were controlled/prepared. [Pinned source](https://github.com/IDEA-Research/DWPose/blob/3dca5db79d9f9ffdd378753ddf6ec66535aace88/ControlNet-v1-1-nightly/annotator/dwpose/onnxpose.py)

ONNX Runtime's source license is MIT. OpenCV states that versions 4.5 and newer use Apache 2.0; that does not settle every binary dependency in a wheel or FFmpeg build. [ONNX Runtime license](https://github.com/microsoft/onnxruntime/blob/main/LICENSE), [OpenCV license](https://opencv.org/license/)

OpenCV Farneback is a dense-flow method; brightness/motion assumptions can fail at occlusion or changing texture. The measured drift is consistent with keeping correspondence reviewable. [Primary documentation](https://docs.opencv.org/4.x/d4/dee/tutorial_optical_flow.html)

## Deferred candidates

| Candidate | Gate 2B disposition |
|---|---|
| SAM 2.1 | Not run. Optional hair/garment/temporal/overlap comparator; not mandatory foreground removal. Prior Apache code/checkpoint finding retained; exact pins and measured fit still needed if selected |
| SAM 3/3.1 | Not run. Custom-license path and resource fit remain research questions |
| Cutie | Not run. Candidate temporal comparator; exact selected artifact rights/dependencies still need review |
| SCHP / other human parsers | Not run. Candidate semantic labels; weight/data terms and taxonomy mapping remain separate |
| RVM | Not run; no mandatory matting dependency selected; prior copyleft review requirement retained |
| See-through | Not run. Generative hidden layers would remain INFERRED; no default integration selected |
| Stretchy/Animated Drawings | Concept/source references from v0.1; no editor/runtime imported |
| Spine runtime | Not selected; separate licensing path still required if later proposed |

## Environment and download boundaries

OpenCV and psutil were installed into work/gate2b/pythonlibs. Existing Python supplied ONNX Runtime, NumPy and Pillow. No global package installation or application dependency integration was performed. The single model download stays in the research folder and is omitted from this handoff archive.

Keep code, model/checkpoint, dataset annotations/images, pretraining chain, redistribution, commercial restrictions, attribution, network behavior and runtime dependencies as separate ledger fields. A root code license does not automatically cover all of them. The next production manifest must resolve every required artifact and exclude any RESEARCH_ONLY, REJECT or UNRESOLVED requirement from the production path.
