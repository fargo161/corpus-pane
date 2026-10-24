# Included dependencies and source materials

This checkpoint reuses the offline detector assets and browser utility modules supplied in the user's Adventure Studio checkpoint31 / prior Unified Prep package.

- `face-api.js` and its bundled TensorFlow runtime: original license retained as `engine/FACE-API-LICENSE.txt`.
- MoveNet / Human model package assets: original model-package notice retained as `engine/HUMAN-MODELS-LICENSE.txt`.
- `fa-models.js` and `movenet-model.js`: offline model weight packaging from the supplied application.
- `bodykit.js`, `facekit.js`, `keyer.js`, `sfcore.js`, `universal.js`, `reliability.js`, `pixels.js`, `sha256.js`, `media.js`, and `tracking.js`: reused unchanged from the supplied Unified Prep Checkpoint 04. The inherited `facekit.js` exposes 68 original landmark positions as well as five mapped anchors.
- Mannequin videos and provenance: supplied Mannequin Motion Angle Corpus / prior Unified Prep sample library. Base64 JavaScript transport changes their packaging, not the original video bytes. Payload hashes are verified before use.

The license notices do not establish ownership or redistribution rights for user-supplied artwork/video. Preserve the original source rights when distributing a game or public tool.
