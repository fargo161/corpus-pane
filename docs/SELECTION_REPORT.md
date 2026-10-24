# Starter pair and source review

## Existing material, not a replacement library

The supplied `Mannequin_Motion_Angle_Corpus_v0_1(1).zip` declares 12 source videos, 11 three-figure sources, one two-view source, and 35 isolated panel tracks. Its first-stage exclusions expressly include skeletal tracking, canonical pose solving, body-part extraction, mannequin retargeting and module promotion. The delivered panel clips keep their colored background; they are not already final transparent sprites.

That corpus does contain provisional view families, including back-oblique views. An earlier discussion about three later Prep examples must not be mistaken for an audit of the entire 35-panel corpus. Original view confidence, quality scores and a previous visual-review statement do not automatically verify the new skeletal tracks.

This pass inspected the manifest, catalog, exception notes, panel metadata and a representative-frame overview across all 35 panel clips; the selected pair's contact sheets were inspected in detail. This was selection and software-development review, not exhaustive human anatomical approval of all source frames.

## Selected clips

| | Pane A | Pane B |
|---|---|---|
| Original panel ID | `MC10_arms_p01_left` | `MC11_turn-hop-arms_p01_left` |
| Action description | Upper-body arm-pose vocabulary with nearly fixed feet | Light turn/hop with arm sway and return toward neutral |
| Encoded dimensions | 270 × 592 | 270 × 592 |
| Recorded rate/count | 16 fps; 49 frames | 16 fps; 49 frames |
| Recorded duration | 3.0625 seconds | 3.0625 seconds |
| Inherited view | FRONT, tentative | FRONT, tentative, with small turns |
| Encoded source SHA-256 | `3e6a070a7c281bce38e9b8e98259caa43907dcfc980104f0f559f648692c51dc` | `4252df06a31682a157bb36fc159863625bbddfab16e1f623232901f3c2ecf505` |

They provide a simple initial comparison: similar scale/framing, a readable head, a similar starting stance, and complementary rather than identical arm motion. Front-like means the body is substantially presented toward the viewer; the head and torso can still be oblique. These are not calibrated synchronized camera views. Same frame number does not establish the same action phase.

The starting pair is a practical choice for the first workflow, not a claim that these are the objectively highest-quality clips for every task. Extreme bends, high kicks and rear views remain valuable later tests. Selecting them now would add avoidable ambiguity to the first correction-and-verification experience.

## Cautions preserved

The arms metadata says the hands/fingers are not production-clean. It also flags raw source frame IDs 13 and 14 as requiring an identity split where figure silhouettes touched. The original interval is zero-based; the one-based UI positions corresponding to those indices are 14 and 15. Do not harvest pieces from those areas without checking the actual pixels.

The turn/hop clip is transition evidence with mixed performance timing, not exact view correspondence. The quality labels and floor/root estimates remain provisional source information. Anatomical drift in generated source imagery cannot be repaired merely by making the tracking graph look orderly.

## New automatic evidence supplied with this build

The bundled offline engine was run on every one of the 49 frames in both selected videos. Results are stored with the source fingerprints and the original format-4 tracking data, including detailed face evidence and tracker review notes.

- Pane A: face evidence on 49/49 frames; inherited body assessment called 49 frames “observed.”
- Pane B: face evidence on 49/49 frames; body assessment called 31 frames “observed” and 18 “review.”
- Both: zero shipped manual pins, zero human-verification records, zero reviewed reusable configurations.

**Those counts describe evidence availability and an engine heuristic, not accuracy.** In particular, wrist/hand placements and leg identity around turns still require inspection. A high detector score can be wrong. The supplied drafts are intended to make the correction workspace immediately usable, not to preapprove its library.

The software's background removal produces transparency from the actual source videos. It does not modify the encoded original bytes. Fixed display calibration begins as an estimate; no canonical mannequin normalization is claimed.

## What the first pair contributes

The first pair exercises the repeated workflow: original source → cleanup → draft shared anatomy → scoped correction → meaningful comparison → explicit approval → named configuration. A third source can then be compared to either earlier source and searched against any eligible saved configurations.

The original corpus index remains available even when only the two starting videos are attached. Importing the original corpus ZIP attaches the other panel videos without requiring a new program build. The canonical still mannequin is deliberately not rebuilt in this pass.
