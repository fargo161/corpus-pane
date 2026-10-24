# Exceptions and limits

## The source figures are not calibrated views

The figures are related performances, not synchronized multi-camera recordings. Same-frame joints must not be treated as exact cross-view correspondence. View labels are provisional dominant-view descriptions; several figures turn during a clip.

## Figure isolation

Tracks were isolated through chroma-background foreground detection, left-to-right identity tracking and fixed motion envelopes. The selected mannequin pixels remain source pixels; other figures and watermark elements were replaced with sampled background color.

Seven raw-source frames expose fewer separate tall figure components than expected:

- `back-kick`: frames 28, 29, 54, 55 and 56
- `arms`: frames 13 and 14

Those frames require a tracked horizontal identity split. A second dominant-figure cleanup removes detached neighboring fragments from the delivered panel clips. The affected raw frames should still receive extra scrutiny before future body-part harvesting.

## Compression and edges

Replacing another figure can flatten a small amount of surrounding compression noise or chroma halo. This is appropriate for Stage-1 corpus review, not the final production background-removal pass.

## Timing

Frame rate and decoded frame order are preserved. Some source containers advertise misleading nominal frame counts or slightly longer container durations; corpus counts were verified from decoded frames.

## Root and floor fields

Root/floor values are silhouette estimates for sorting and review. They are not AdventureBody2D skeleton data.

## Quality labels

Quality scores describe corpus usefulness, not finished art quality. `MODULE_CANDIDATE` means worth inspecting later, not approved for automatic extraction. Hands, feet, shoulders, pelvises and extreme bends can still contain generated anatomical drift.
