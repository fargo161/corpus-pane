# Mannequin Motion & Angle Corpus v0.1

This Stage-1 corpus contains **35 clean, independently reviewable figure tracks** extracted from **12 supplied mannequin composite videos**.

## Processing performed

- Tracked the left, center and right figure identities against the chroma background.
- Retained each selected mannequin’s source pixels while replacing other figures and source watermarks with sampled background color.
- Applied a second dominant-figure cleanup so detached neighboring hands, feet or logo fragments do not remain in a delivered panel track.
- Used one fixed horizontal motion-envelope crop per figure for the full clip; source vertical coordinates, frame order and frame rate are preserved.
- Produced source hashes, envelope coordinates, tentative view labels, root/floor estimates, quality notes, CSV/JSON metadata and visual verification.

## Scope boundary

No skeletal tracking, canonical pose solving, part extraction, module approval or v0.4.13 mannequin retargeting has been performed.

## Source catalog

| Source | Action | Panels | Technical source | Roles | Quality | Raw merge frames | Main caution |
|---|---|---:|---|---|---:|---:|---|
| `output (37).mp4` | Energetic dance with knee lifts and changing arm silhouettes | 3 | 800×512, 16.000 fps, 65 frames | MOTION_REFERENCE, MODULE_CANDIDATE | 3.4/5 | 0 | Treat panels as related pose variations, not synchronized camera views. |
| `output (36).mp4` | Crouch, recoil, side lean and compressed body poses | 3 | 800×512, 16.000 fps, 65 frames | MOTION_REFERENCE, STRESS_TEST | 2.8/5 | 0 | Use primarily to expose solver and occlusion failures, not to define proportions. |
| `output (35).mp4` | Action lunge, reach/strike and wide stance | 3 | 800×512, 16.000 fps, 65 frames | MODULE_CANDIDATE, STRESS_TEST | 3.1/5 | 0 | Useful for lunges and reaches, but panel view identity changes during the action. |
| `bendforward(1).mp4` | Progressive forward bend ending in a hanging fold | 3 | 734×480, 24.000 fps, 121 frames | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST | 4.2/5 | 0 | A one-way transition that ends folded; not a closed loop. |
| `bendbackwards(1).mp4` | Backward arch followed by a controlled return | 3 | 1188×776, 24.000 fps, 97 frames | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST | 4.3/5 | 0 | Extreme torso extension requires corrective art or a more flexible spine representation. |
| `walk-dance(1).mp4` | Rhythmic stepping, crossing and arm sway | 3 | 1188×776, 24.000 fps, 121 frames | MOTION_REFERENCE | 3.8/5 | 0 | Does not return cleanly to its starting state; root movement is not guaranteed to be gameplay locomotion. |
| `back kick(1).mp4` | High rear/side kick and return | 3 | 734×480, 24.000 fps, 97 frames | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST | 4.1/5 | 5 | Raised-leg anatomy and pelvis shape vary between panels; use pose evidence rather than literal proportion truth. |
| `knee(1).mp4` | Repeated high knee lift and return | 3 | 1102×720, 24.000 fps, 97 frames | MOTION_REFERENCE, MODULE_CANDIDATE | 4.1/5 | 0 | Lifted-foot orientation and support posture differ between panels; requires explicit contact states. |
| `turn-footstand(1).mp4` | Turn/weight shift into single-leg balance and footstand | 3 | 760×496, 16.000 fps, 81 frames | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST | 3.8/5 | 0 | Ends in a different pose; the panels are not calibrated stages of one exact turn. |
| `arms(1).mp4` | Upper-body arm-pose vocabulary with nearly fixed feet | 3 | 704×592, 16.000 fps, 49 frames | MOTION_REFERENCE, MODULE_CANDIDATE | 4.0/5 | 2 | Panels show parallel arm variations rather than temporally matched views. |
| `turn-hop-arms(1).mp4` | Light turn/hop with arm sway and return toward neutral | 3 | 704×592, 16.000 fps, 49 frames | MOTION_REFERENCE, STRESS_TEST | 3.7/5 | 0 | Use as transition evidence rather than exact view correspondence. |
| `turn-armstretch(1).mp4` | Two-view turn into horizontal arm extension | 2 | 704×592, 16.000 fps, 65 frames | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST | 3.4/5 | 0 | Only two panels; the end poses are related but not exact equivalents and the clip does not return. |

## Panel catalog

| Panel | Position | Action | Tentative view | Frames | Source envelope | Root/floor estimate | Quality | Uses |
|---|---|---|---|---:|---|---|---:|---|
| `MC01_output37_p01_left` | left | `dance_knee_lift_arms` | FRONT (0.82) | 65 | x 0…285 | root x 151.0, floor y 422.8; mostly_planted_or_in_place | 3.4/5 | MOTION_REFERENCE, MODULE_CANDIDATE |
| `MC01_output37_p02_center` | center | `dance_knee_lift_arms` | THREEQ (0.80) | 65 | x 250…509 | root x 135.0, floor y 423.0; mostly_planted_or_in_place | 3.4/5 | MOTION_REFERENCE, MODULE_CANDIDATE |
| `MC01_output37_p03_right` | right | `dance_knee_lift_arms` | BACK_THREEQ (0.68) | 65 | x 470…757 | root x 143.0, floor y 407.0; translating_or_large_weight_shift | 3.4/5 | MOTION_REFERENCE, MODULE_CANDIDATE |
| `MC02_output36_p01_left` | left | `crouch_recoil_lean` | MIXED (0.58) | 65 | x 8…269 | root x 143.0, floor y 423.0; mostly_planted_or_in_place | 2.7/5 | MOTION_REFERENCE, STRESS_TEST |
| `MC02_output36_p02_center` | center | `crouch_recoil_lean` | FRONT (0.75) | 65 | x 234…509 | root x 106.0, floor y 457.0; translating_with_airborne_phases | 2.8/5 | MOTION_REFERENCE, STRESS_TEST |
| `MC02_output36_p03_right` | right | `crouch_recoil_lean` | SIDE (0.78) | 65 | x 470…740 | root x 183.5, floor y 440.6; translating_with_airborne_phases | 2.7/5 | MOTION_REFERENCE, STRESS_TEST |
| `MC03_output35_p01_left` | left | `action_lunge_reach` | MIXED (0.60) | 65 | x 0…253 | root x 151.0, floor y 423.0; translating_with_airborne_phases | 3.0/5 | MODULE_CANDIDATE, STRESS_TEST |
| `MC03_output35_p02_center` | center | `action_lunge_reach` | THREEQ (0.64) | 65 | x 214…497 | root x 131.0, floor y 437.0; translating_or_large_weight_shift | 3.1/5 | MODULE_CANDIDATE, STRESS_TEST |
| `MC03_output35_p03_right` | right | `action_lunge_reach` | MIXED (0.62) | 65 | x 458…753 | root x 167.0, floor y 417.0; translating_or_large_weight_shift | 3.0/5 | MODULE_CANDIDATE, STRESS_TEST |
| `MC04_bendforward_p01_left` | left | `forward_bend` | FRONT (0.92) | 121 | x 73…223 | root x 61.0, floor y 393.0; mostly_planted_or_in_place | 4.2/5 | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST |
| `MC04_bendforward_p02_center` | center | `forward_bend` | THREEQ (0.88) | 121 | x 278…471 | root x 57.0, floor y 399.0; mostly_planted_or_in_place | 4.2/5 | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST |
| `MC04_bendforward_p03_right` | right | `forward_bend` | SIDE (0.86) | 121 | x 428…643 | root x 105.0, floor y 393.0; mostly_planted_or_in_place | 4.1/5 | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST |
| `MC05_bendbackwards_p01_left` | left | `backward_bend` | FRONT (0.92) | 97 | x 78…322 | root x 139.0, floor y 635.0; mostly_planted_or_in_place | 4.3/5 | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST |
| `MC05_bendbackwards_p02_center` | center | `backward_bend` | THREEQ (0.88) | 97 | x 418…701 | root x 125.0, floor y 643.0; mostly_planted_or_in_place | 4.3/5 | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST |
| `MC05_bendbackwards_p03_right` | right | `backward_bend` | SIDE (0.86) | 97 | x 662…959 | root x 220.0, floor y 633.0; mostly_planted_or_in_place | 4.2/5 | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST |
| `MC06_walk-dance_p01_left` | left | `walk_dance` | FRONT (0.88) | 121 | x 122…366 | root x 162.5, floor y 669.0; translating_with_airborne_phases | 3.8/5 | MOTION_REFERENCE |
| `MC06_walk-dance_p02_center` | center | `walk_dance` | THREEQ (0.86) | 121 | x 474…737 | root x 161.75, floor y 671.0; translating_with_airborne_phases | 3.8/5 | MOTION_REFERENCE |
| `MC06_walk-dance_p03_right` | right | `walk_dance` | SIDE (0.82) | 121 | x 682…1047 | root x 199.0, floor y 635.0; translating_or_large_weight_shift | 3.8/5 | MOTION_REFERENCE |
| `MC07_back-kick_p01_left` | left | `back_kick` | FRONT (0.90) | 97 | x 14…262 | root x 134.0, floor y 393.0; mostly_planted_or_in_place | 4.1/5 | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST |
| `MC07_back-kick_p02_center` | center | `back_kick` | THREEQ (0.86) | 97 | x 207…455 | root x 128.0, floor y 399.0; mostly_planted_or_in_place | 4.1/5 | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST |
| `MC07_back-kick_p03_right` | right | `back_kick` | SIDE (0.86) | 97 | x 400…613 | root x 139.0, floor y 393.0; mostly_planted_or_in_place | 4.0/5 | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST |
| `MC08_knee_p01_left` | left | `knee_lift` | FRONT (0.90) | 97 | x 93…319 | root x 139.0, floor y 589.0; translating_or_large_weight_shift | 4.1/5 | MOTION_REFERENCE, MODULE_CANDIDATE |
| `MC08_knee_p02_center` | center | `knee_lift` | THREEQ (0.86) | 97 | x 409…635 | root x 95.0, floor y 597.0; translating_or_large_weight_shift | 4.1/5 | MOTION_REFERENCE, MODULE_CANDIDATE |
| `MC08_knee_p03_right` | right | `knee_lift` | SIDE (0.86) | 97 | x 643…924 | root x 175.0, floor y 587.0; translating_or_large_weight_shift | 4.0/5 | MOTION_REFERENCE, MODULE_CANDIDATE |
| `MC09_turn-footstand_p01_left` | left | `turn_footstand_balance` | FRONT (0.82) | 81 | x 72…241 | root x 96.0, floor y 407.0; translating_or_large_weight_shift | 3.8/5 | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST |
| `MC09_turn-footstand_p02_center` | center | `turn_footstand_balance` | THREEQ (0.80) | 81 | x 286…449 | root x 90.0, floor y 411.0; translating_or_large_weight_shift | 3.8/5 | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST |
| `MC09_turn-footstand_p03_right` | right | `turn_footstand_balance` | BACK_THREEQ (0.72) | 81 | x 446…649 | root x 135.0, floor y 407.0; mostly_planted_or_in_place | 3.8/5 | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST |
| `MC10_arms_p01_left` | left | `arm_pose_sequence` | FRONT (0.94) | 49 | x 0…269 | root x 134.0, floor y 485.0; mostly_planted_or_in_place | 4.0/5 | MOTION_REFERENCE, MODULE_CANDIDATE |
| `MC10_arms_p02_center` | center | `arm_pose_sequence` | THREEQ (0.90) | 49 | x 230…495 | root x 118.0, floor y 483.0; mostly_planted_or_in_place | 4.0/5 | MOTION_REFERENCE, MODULE_CANDIDATE |
| `MC10_arms_p03_right` | right | `arm_pose_sequence` | BACK_THREEQ (0.82) | 49 | x 446…703 | root x 128.5, floor y 481.0; mostly_planted_or_in_place | 4.0/5 | MOTION_REFERENCE, MODULE_CANDIDATE |
| `MC11_turn-hop-arms_p01_left` | left | `turn_hop_arm_sway` | FRONT (0.86) | 49 | x 0…269 | root x 133.0, floor y 485.0; mostly_planted_or_in_place | 3.7/5 | MOTION_REFERENCE, STRESS_TEST |
| `MC11_turn-hop-arms_p02_center` | center | `turn_hop_arm_sway` | THREEQ (0.82) | 49 | x 234…489 | root x 113.5, floor y 484.0; mostly_planted_or_in_place | 3.7/5 | MOTION_REFERENCE, STRESS_TEST |
| `MC11_turn-hop-arms_p03_right` | right | `turn_hop_arm_sway` | SIDE (0.80) | 49 | x 462…703 | root x 114.0, floor y 485.0; mostly_planted_or_in_place | 3.7/5 | MOTION_REFERENCE, STRESS_TEST |
| `MC12_turn-armstretch_p01_left` | left | `turn_arm_stretch` | MIXED (0.68) | 65 | x 112…357 | root x 95.0, floor y 489.0; translating_or_large_weight_shift | 3.3/5 | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST |
| `MC12_turn-armstretch_p02_right` | right | `turn_arm_stretch` | MIXED (0.66) | 65 | x 359…687 | root x 162.0, floor y 487.0; mostly_planted_or_in_place | 3.3/5 | MOTION_REFERENCE, MODULE_CANDIDATE, STRESS_TEST |

## Package layout

```text
panels/<source>/                 35 cleaned independent MP4 tracks
metadata/<panel_id>.json         one sidecar per track
contact_sheets/                  sampled visual review sheets
crop_verification/               source versus isolated-track proof
overview/corpus_overview.png     representative frame from every track
manifest.json                    master machine-readable manifest
index.csv                        sortable panel index
source_inventory.csv             source hashes and technical inventory
exceptions.md                    explicit limits and uncertain cases
checksums.sha256                 hash list for generated files
```