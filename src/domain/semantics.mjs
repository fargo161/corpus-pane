import { ContractError, LIMITS } from './safety.mjs';
import { validateRecord } from './schema-validator.mjs';
import { assertInterval, compareFrames } from './frames.mjs';

export function assertAcyclic(edges, label = 'graph') {
  const adjacency = new Map();
  for (const [from, to] of edges) { if (!adjacency.has(from)) adjacency.set(from, []); adjacency.get(from).push(to); }
  const active = new Set(), done = new Set();
  for (const root of adjacency.keys()) {
    if (done.has(root)) continue;
    const stack = [{ id: root, exit: false }];
    while (stack.length) {
      const { id, exit } = stack.pop();
      if (exit) { active.delete(id); done.add(id); continue; }
      if (active.has(id)) throw new ContractError('GRAPH_CYCLE', `${label} contains a cycle`);
      if (done.has(id)) continue;
      active.add(id); stack.push({ id, exit: true });
      for (const next of adjacency.get(id) ?? []) stack.push({ id: next, exit: false });
    }
  }
}
export function determinant3(m) { return m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]); }
export function assertInvertible(m) {
  if (m.length !== 9 || !m.every(Number.isFinite) || Math.abs(determinant3(m)) <= 1e-8) throw new ContractError('SINGULAR_TRANSFORM', 'Transform is singular or ill-conditioned');
}
export function assertPlane(plane, { width, height, channels, dtype, rawOnly = false } = {}) {
  const pixels = plane.width * plane.height;
  if (!Number.isSafeInteger(pixels) || pixels > LIMITS.planePixels) throw new ContractError('PLANE_LIMIT', 'Plane exceeds bounded pixel allocation');
  for (const [k, expected] of Object.entries({ width, height, channels, dtype })) if (expected !== undefined && plane[k] !== expected) throw new ContractError('PLANE_SHAPE', `Plane ${k} mismatch`);
  if (plane.dtype === 'u8' && plane.endian !== 'NA') throw new ContractError('PLANE_ENDIAN', 'u8 planes have no endianness');
  if (plane.dtype !== 'u8' && plane.endian !== 'LITTLE') throw new ContractError('PLANE_ENDIAN', 'Multi-byte planes must be little-endian');
  if (rawOnly && plane.encoding !== 'RAW') throw new ContractError('PLANE_ENCODING', 'Evidence/index/mesh planes require raw lossless bytes');
  if (plane.encoding === 'RAW' && plane.byteLength !== pixels * plane.channels * (plane.dtype === 'u8' ? 1 : 4)) throw new ContractError('PLANE_LENGTH', 'Raw plane byte length differs from shape');
}

// Validate references against the exact revision graph, never against provider-local IDs.
// Entity references are explicitly identified below; all *Ref/*Refs otherwise bind revisions.
export function validateGraph(records, { heads = new Map(), isApplicableAcceptance = () => false, historicalRevisionIds = new Set() } = {}) {
  const byRevision = new Map(records.map(record => [record.revisionId, record]));
  if (byRevision.size !== records.length) throw new ContractError('REVISION_COLLISION', 'Duplicate revision ID');
  const byEntity = new Map();
  for (const record of records) { validateRecord(record); if (!byEntity.has(record.entityId)) byEntity.set(record.entityId, []); byEntity.get(record.entityId).push(record); }
  const need = (id, types, at) => {
    const record = byRevision.get(id);
    if (!record || (types && !types.includes(record.type))) throw new ContractError('REFERENCE_TYPE', `Missing or wrong reference ${at}: ${id}; expected ${types?.join('|') ?? 'record'}`);
    return record;
  };
  const many = (ids, types, at) => ids.forEach(id => need(id, types, at));
  const entity = (id, types, at) => {
    const candidates = byEntity.get(id) ?? [];
    const selected = heads.has(id) ? byRevision.get(heads.get(id)) : candidates.at(-1);
    if (!selected || !types.includes(selected.type)) throw new ContractError('ENTITY_REFERENCE', `Missing or wrong entity ${at}: ${id}`);
    return selected;
  };
  const frameCheck = f => {
    const source = records.find(record => record.type === 'SourceAsset' && record.payload.containerSha256 === f.sourceSha256);
    if (!source) throw new ContractError('FRAME_SOURCE', 'Native frame has no source asset');
    const stream = source.payload.streams.find(s => s.index === f.streamIndex);
    if (!stream || stream.mediaType === 'AUDIO' || stream.width !== f.width || stream.height !== f.height || stream.timeBaseNum !== f.timeBaseNum || stream.timeBaseDen !== f.timeBaseDen || ['name', 'version', 'codeSha256', 'configSha256'].some(k => source.payload.decoderIdentity[k] !== f.decoderIdentity[k])) throw new ContractError('FRAME_STREAM', 'Frame/source stream or decoder identity mismatch');
  };
  const graphEdges = [], componentEdges = [], socketEdges = [];
  for (const r of records) {
    const p = r.payload;
    for (const parent of r.parentRevisionIds) { const prior = need(parent, [r.type], 'parentRevisionIds'); if (prior.entityId !== r.entityId) throw new ContractError('REVISION_ENTITY', 'A revision cannot change logical entity'); graphEdges.push([r.revisionId, parent]); }
    for (const source of r.derivedFrom) { need(source, null, 'derivedFrom'); graphEdges.push([r.revisionId, source]); }
    const layerOrders = graphs => { for (const graph of graphs) { if (graph.interval) assertInterval(graph.interval); assertAcyclic(graph.edges.map(e => [e.behind, e.inFront]), 'draw order'); } };
    const envelopes = items => { for (const item of items) { for (const c of item.constraints) if (c.minimum > c.maximum) throw new ContractError('ENVELOPE_RANGE', 'Envelope minimum exceeds maximum'); many(item.testRefs, ['CompatibilityTestRun'], 'envelope tests'); } };
    switch (r.type) {
      case 'SourceAsset': if (need(p.sourceRightsRef, ['RightsRecord'], 'source rights').payload.artifactHash !== p.containerSha256) throw new ContractError('SOURCE_RIGHTS', 'Source rights describe a different artifact'); if (new Set(p.streams.map(s => s.index)).size !== p.streams.length) throw new ContractError('STREAM_ID', 'Duplicate stream index'); break;
      case 'FrameObservation': frameCheck(p.frameRef); p.transforms.forEach(t => assertInvertible(t.matrix)); assertInvertible(p.sourceViewMetadata.originalToDisplay); break;
      case 'PersonIdentity': many(p.associationRevisionRefs, ['ReviewEvent'], 'person associations'); break;
      case 'ComponentIdentity': entity(p.personEntityId, ['PersonIdentity'], 'component person'); many(p.associationRefs, ['ReviewEvent'], 'component associations'); if (p.parentComponentId) { const parent = entity(p.parentComponentId, ['ComponentIdentity'], 'component parent'); if (parent.payload.personEntityId !== p.personEntityId) throw new ContractError('COMPONENT_OWNER', 'Component parent has different owner'); componentEdges.push([r.entityId, parent.entityId]); } break;
      case 'RawProviderObservation': need(p.providerRunRef, ['JobRecord'], 'provider job'); p.frameRefs.forEach(frameCheck); if (p.confidenceDefinition.minimum >= p.confidenceDefinition.maximum) throw new ContractError('CONFIDENCE_RANGE', 'Confidence scale requires a positive span'); break;
      case 'EvidenceMapping': many(p.rawObservationRefs, ['RawProviderObservation'], 'raw mappings'); if (new Set(p.landmarkMap.map(m => m.canonicalJointId)).size !== p.landmarkMap.length) throw new ContractError('LANDMARK_MAP', 'Duplicate mapped canonical joint'); break;
      case 'ComponentTrack': {
        const component = entity(p.componentEntityId, ['ComponentIdentity'], 'track component'); entity(p.personEntityId, ['PersonIdentity'], 'track person');
        if (component.payload.personEntityId !== p.personEntityId) throw new ContractError('COMPONENT_OWNER', 'Track/component person mismatch');
        const observations = p.observationRefs.map(id => need(id, ['FrameObservation'], 'track observation'));
        for (let i = 1; i < observations.length; i++) if (compareFrames(observations[i - 1].payload.frameRef, observations[i].payload.frameRef) >= 0) throw new ContractError('TRACK_ORDER', 'Track is not strictly native-time/decode-index ordered');
        p.visibilityIntervals.forEach(v => { assertInterval(v.interval); many(v.evidenceRefs, null, 'visibility evidence'); });
        many(p.providerAssociationRefs, ['RawProviderObservation', 'ReviewEvent'], 'provider associations');
        for (const c of p.corrections) { need(c.observationRef, ['FrameObservation'], 'correction observation'); if (c.previousRevisionRef) need(c.previousRevisionRef, null, 'previous correction'); need(c.correctedRevisionRef, null, 'corrected revision'); }
        for (const h of p.ownershipHypotheses) { entity(h.personEntityId, ['PersonIdentity'], 'ownership person'); many(h.evidenceRefs, null, 'ownership evidence'); }
        break;
      }
      case 'SpatialEvidence': {
        need(p.referenceObservationRef, ['FrameObservation'], 'spatial reference');
        const table = need(p.contributorTableRef, ['ContributorTable'], 'contributor table');
        if (table.payload.referenceObservationRef !== p.referenceObservationRef || table.payload.coordinateDomain.width !== p.width || table.payload.coordinateDomain.height !== p.height) throw new ContractError('SPATIAL_DOMAIN', 'Contributor table/reference/domain mismatch');
        for (const plane of [p.coverageBlob, p.originBlob]) assertPlane(plane, { width: p.width, height: p.height, channels: 1, dtype: 'u8', rawOnly: true });
        assertPlane(p.contributorIndexBlob, { width: p.width, height: p.height, channels: 1, dtype: 'u32', rawOnly: true });
        if (p.uncertaintyBlob) assertPlane(p.uncertaintyBlob, { width: p.width, height: p.height, channels: 1, dtype: 'u8', rawOnly: true });
        break;
      }
      case 'ContributorTable': {
        need(p.referenceObservationRef, ['FrameObservation'], 'table reference');
        if (p.sets[0].length) throw new ContractError('CONTRIBUTOR_ZERO', 'Contributor set zero must be empty');
        for (const set of p.sets.slice(1)) {
          if (!set.length || Math.abs(set.reduce((n, c) => n + c.weight, 0) - 1) > 1e-6) throw new ContractError('CONTRIBUTOR_WEIGHT', 'Nonzero contributor sets require normalized positive weights');
          for (const c of set) {
            if (c.state === 'INFERRED') {
              if (!c.processRef) throw new ContractError('INFERRED_PROCESS', 'Inferred material needs a named process');
              need(c.processRef, ['DerivationProcess'], 'inference process');
              if (c.observationRef) need(c.observationRef, ['FrameObservation'], 'inference input');
            } else {
              if (!c.visible || !c.observationRef || !c.visibilityEvidenceRef || !c.sourceXY || c.processRef) throw new ContractError('VISIBLE_SOURCE', 'Observed/recovered texture requires explicit visible source, XY and evidence');
              const observation = need(c.observationRef, ['FrameObservation'], 'texture source'); need(c.visibilityEvidenceRef, ['FrameObservation', 'ReviewEvent'], 'visibility proof');
              const f = observation.payload.frameRef;
              if (c.sourceXY[0] < 0 || c.sourceXY[1] < 0 || c.sourceXY[0] >= f.width || c.sourceXY[1] >= f.height) throw new ContractError('SOURCE_COORDINATE', 'Contributor is outside source pixels');
              if ((c.state === 'OBSERVED') !== (c.observationRef === p.referenceObservationRef)) throw new ContractError('ORIGIN_REFERENCE', 'Observed/recovered state disagrees with designated reference observation');
              if (c.state === 'RECOVERED' && !c.registrationRef) throw new ContractError('RECOVERED_REGISTRATION', 'Recovered texture needs registration from its linked frame');
            }
            if (c.registrationRef) need(c.registrationRef, ['Registration'], 'contributor registration');
          }
        }
        break;
      }
      case 'DerivationProcess': many(p.inputRefs, null, 'process inputs'); many(p.outputRefs, null, 'process outputs'); if (p.kind === 'MANUAL_INVENTION' && p.modelIdentity !== null) throw new ContractError('MANUAL_MODEL', 'Manual invention has no model'); break;
      case 'CanonicalSurface': {
        entity(p.componentId, ['ComponentIdentity'], 'surface component'); need(p.viewProfileRef, ['CalibrationRecord', 'FamilyProfile', 'BodyPackage'], 'view profile'); const calibration = need(p.calibrationRef, ['CalibrationRecord'], 'surface calibration');
        if (!calibration.payload.viewProfiles.some(v => v.id === p.coordinateDomain.viewId)) throw new ContractError('SURFACE_VIEW', 'Canonical surface view is not declared in its calibration');
        const spatial = need(p.spatialEvidenceRef, ['SpatialEvidence'], 'surface evidence'); const width = p.coordinateDomain.width, height = p.coordinateDomain.height;
        if (spatial.payload.width !== width || spatial.payload.height !== height) throw new ContractError('SURFACE_DOMAIN', 'Texture/evidence dimensions differ');
        assertPlane(p.rgbaBlob, { width, height, channels: 4, dtype: 'u8' }); if (p.conflictMaskRef) assertPlane(p.conflictMaskRef, { width, height, channels: 1, dtype: 'u8', rawOnly: true });
        many(p.registrationRefs, ['Registration'], 'surface registrations'); break;
      }
      case 'Registration':
        if (p.anchors.length !== p.weights.length) throw new ContractError('REGISTRATION_WEIGHTS', 'Anchor/weight lengths differ');
        if (p.transformType === 'WARP_2D') { if (!p.warpBlob || p.matrix) throw new ContractError('REGISTRATION_MODE', 'Warp requires only a warp plane'); assertPlane(p.warpBlob, { channels: 2, dtype: 'f32', rawOnly: true }); }
        else { if (!p.matrix || p.warpBlob) throw new ContractError('REGISTRATION_MODE', 'Matrix registration requires only a matrix'); assertInvertible(p.matrix); if (p.transformType === 'AFFINE_2D' && (p.matrix[6] !== 0 || p.matrix[7] !== 0 || p.matrix[8] !== 1)) throw new ContractError('AFFINE_MATRIX', 'Affine last row must be 0,0,1'); }
        break;
      case 'AnatomicalBinding': p.localBindTransforms.forEach(t => { if (!p.jointBoneIds.includes(t.canonicalId)) throw new ContractError('BINDING_ID', 'Bind transform names undeclared anatomy'); assertInvertible(t.transform); }); break;
      case 'ArtworkPivot': need(p.surfaceOrPartRef, ['CanonicalSurface', 'LayeredAssetPackage', 'BodyPackage'], 'pivot host'); many(p.sourceRefs, null, 'pivot sources'); break;
      case 'AttachmentSocket': need(p.hostPartRef, ['CanonicalSurface', 'LayeredAssetPackage', 'BodyPackage', 'HeadIdentity'], 'socket host'); assertInvertible(p.local3x3); if (p.parentSocketRef) { need(p.parentSocketRef, ['AttachmentSocket'], 'socket parent'); socketEdges.push([r.revisionId, p.parentSocketRef]); } break;
      case 'Mesh': {
        assertPlane(p.restXYBlob, { channels: 2, dtype: 'f32', rawOnly: true }); assertPlane(p.uvBlob, { width: p.restXYBlob.width, height: p.restXYBlob.height, channels: 2, dtype: 'f32', rawOnly: true }); assertPlane(p.triangleIndexBlob, { channels: 3, dtype: 'u32', rawOnly: true });
        const count = p.restXYBlob.width * p.restXYBlob.height;
        if (p.islandIds.length !== count || p.skinWeights.length !== count) throw new ContractError('MESH_VERTEX_COUNT', 'Mesh vertex/island/weight counts differ');
        for (const ring of p.constrainedRings) for (const index of ring.indices) if (index >= count || p.islandIds[index] !== ring.islandId) throw new ContractError('MESH_RING', 'Ring references wrong island/vertex');
        for (const edge of p.seamEdges) if (edge.some(i => i >= count) || edge[0] === edge[1]) throw new ContractError('MESH_SEAM', 'Invalid seam edge');
        for (const weights of p.skinWeights) { if (Math.abs(weights.reduce((n, w) => n + w.weight, 0) - 1) > 1e-6 || new Set(weights.map(w => `${w.bindingRef}:${w.controlId}`)).size !== weights.length) throw new ContractError('SKIN_WEIGHTS', 'Weights must be unique and normalized'); for (const w of weights) need(w.bindingRef, ['AnatomicalBinding'], 'skin binding'); }
        break;
      }
      case 'LayeredAssetPackage': {
        need(p.hostFamilyProfileRef, ['FamilyProfile'], 'asset family'); need(p.poserProfileRef, ['PoserProfile'], 'asset poser'); const partIds = new Set(p.subparts.map(s => s.id));
        if (partIds.size !== p.subparts.length) throw new ContractError('PART_ID', 'Duplicate subpart ID');
        for (const part of p.subparts) { need(part.surfaceRef, ['CanonicalSurface'], 'part surface'); need(part.anatomyBindingRef, ['AnatomicalBinding'], 'part anatomy'); need(part.artworkPivotRef, ['ArtworkPivot'], 'part pivot'); many(part.attachmentSocketRefs, ['AttachmentSocket'], 'part sockets'); if (part.meshRef) need(part.meshRef, ['Mesh'], 'part mesh'); if (part.behavior === 'LBS' && !part.meshRef) throw new ContractError('MISSING_MESH', 'LBS part needs mesh'); many(part.sourceRefs, null, 'part sources'); }
        for (const graph of p.orderGraphs) for (const edge of graph.edges) if (!partIds.has(edge.behind) || !partIds.has(edge.inFront)) throw new ContractError('ORDER_PART', 'Order references unknown part');
        for (const zone of p.overlapZones) for (const id of zone.parts) if (!partIds.has(id)) throw new ContractError('OVERLAP_PART', 'Overlap references unknown part');
        for (const seam of p.seamConstraints) if (!partIds.has(seam.partA) || !partIds.has(seam.partB) || seam.maximumGap > 2) throw new ContractError('SEAM_CONTRACT', 'Invalid seam parts or weakened 1024-normalized target');
        layerOrders(p.orderGraphs); envelopes(p.envelopes); many(p.sourceRefs, null, 'asset sources'); many(p.testRefs, ['CompatibilityTestRun'], 'asset tests'); break;
      }
      case 'HeadIdentity': need(p.headSurfaceRef, ['CanonicalSurface'], 'head surface'); p.structuralLayers.forEach(l => need(l.surfaceRef, ['CanonicalSurface'], 'head layer')); need(p.neckSocketRef, ['AttachmentSocket'], 'neck socket'); break;
      case 'FaceKit': need(p.registrationProfileRef, ['Registration'], 'face registration'); many(p.compatibleHeadProfiles, ['HeadIdentity'], 'head compatibility'); need(p.sourceInventoryRef, ['SourceAsset'], 'native inventory'); for (const [slot, value] of Object.entries(p.slots)) for (const variant of value.variants) { need(variant.surfaceRef, ['CanonicalSurface'], 'face variant surface'); need(variant.sourceRef, ['SourceAsset', 'FrameObservation'], 'face source'); assertInvertible(variant.local3x3); if (slot.startsWith('LEFT') && variant.anatomicalSide === 'RIGHT') throw new ContractError('FACE_SIDE', 'Left slot cannot contain right anatomical side'); if (slot.startsWith('RIGHT') && variant.anatomicalSide === 'LEFT') throw new ContractError('FACE_SIDE', 'Right slot cannot contain left anatomical side'); if (variant.sourceRect[2] <= 0 || variant.sourceRect[3] <= 0) throw new ContractError('FACE_CROP', 'Face source rectangle must have positive dimensions'); } break;
      case 'FamilyProfile': for (const t of p.tolerances) { if (t.minimum !== null && t.maximum !== null && t.minimum > t.maximum) throw new ContractError('FAMILY_TOLERANCE', 'Invalid family tolerance range'); many(t.ownerReviewRefs, ['ReviewEvent'], 'tolerance owner reviews'); } many(p.calibrationProcedure.ownerReviewRefs, ['ReviewEvent'], 'calibration owner reviews'); many(p.bindPose.ownerReviewRefs, ['ReviewEvent'], 'bind pose owner reviews'); if (p.bindPose.poseRef) need(p.bindPose.poseRef, null, 'bind pose'); break;
      case 'CharacterPackage': need(p.familyProfileRef, ['FamilyProfile'], 'character family'); need(p.bodyRef, ['BodyPackage'], 'character body'); need(p.headRef, ['HeadIdentity'], 'character head'); need(p.faceKitRef, ['FaceKit'], 'character face'); for (const [field, kind] of [['hairRefs', 'HAIR'], ['garmentRefs', 'GARMENT'], ['accessoryRefs', 'ACCESSORY']]) for (const id of p[field]) { const a = need(id, ['LayeredAssetPackage'], field); if (a.payload.kind !== kind || a.payload.hostFamilyProfileRef !== p.familyProfileRef) throw new ContractError('MODULE_COMPATIBILITY', 'Module kind/family mismatch'); } layerOrders(p.compositionOrder); envelopes(p.envelopes); many(p.rightsRefs, ['RightsRecord'], 'character rights'); many(p.testRefs, ['CompatibilityTestRun'], 'character tests'); break;
      case 'AnchorBinding': {
        const character = need(p.characterPackageRef, ['CharacterPackage'], 'anchor character'); need(p.sourcePersonRef, ['PersonIdentity'], 'anchor person'); many(p.sourceFrameRefs, ['FrameObservation'], 'anchor source frames'); many(p.projectionRefs, ['Registration'], 'anchor projection');
        if (!p.acceptanceRefs.length || !p.acceptanceRefs.some(id => { const event = need(id, ['ReviewEvent'], 'anchor acceptance'); return event.payload.decision === 'ACCEPTED' && event.payload.scope === 'ASSET' && event.payload.targetRevisionRefs.includes(character.revisionId) && (historicalRevisionIds.has(r.revisionId) || isApplicableAcceptance(event)); })) throw new ContractError('ANCHOR_ACCEPTANCE', 'Production anchor requires applicable trusted owner acceptance of this exact female package');
        if (!historicalRevisionIds.has(r.revisionId)) {
          const family = need(character.payload.familyProfileRef, ['FamilyProfile'], 'anchor family');
          const familyAccepted = records.some(event => event.type === 'ReviewEvent' && event.payload.scope === 'FAMILY' && event.payload.targetRevisionRefs.includes(family.revisionId) && isApplicableAcceptance(event));
          const body = need(character.payload.bodyRef, ['BodyPackage'], 'anchor body'), face = need(character.payload.faceKitRef, ['FaceKit'], 'anchor face');
          if (!familyAccepted || !body.payload.bodySurfaceRefs.length || !face.payload.compatibleHeadProfiles.includes(character.payload.headRef) || !Object.values(face.payload.slots).every(slot => slot.variants.length > 0) || face.payload.maskSemantics.mode === 'UNSUPPORTED' || (family.payload.moduleRequirements.hair && !character.payload.hairRefs.length) || (family.payload.moduleRequirements.garments && !character.payload.garmentRefs.length) || (family.payload.moduleRequirements.accessories && !character.payload.accessoryRefs.length)) throw new ContractError('ANCHOR_INCOMPLETE', 'Known Character Anchor requires accepted family and complete compatible female modules');
        }
        break;
      }
      case 'RolePerformance': need(p.poseTrackRef, ['MotionTrack'], 'role motion'); if (p.facePerformanceRef) need(p.facePerformanceRef, ['MotionTrack'], 'face performance'); for (const component of p.componentStateTracks) { entity(component.componentEntityId, ['ComponentIdentity'], 'role component'); for (const sample of component.samples) { if (sample.variantRef) need(sample.variantRef, null, 'role variant'); many(sample.evidenceRefs, null, 'role evidence'); } } break;
      case 'MotionTrack': {
        need(p.sourcePersonRef, ['PersonIdentity'], 'motion person'); if (p.calibrationRef) need(p.calibrationRef, ['CalibrationRecord'], 'motion calibration');
        let previous = null;
        for (const sample of p.samples) {
          const frame = need(sample.frameObservationRef, ['FrameObservation'], 'motion native sample').payload.frameRef;
          if (previous && compareFrames(previous, frame) >= 0) throw new ContractError('MOTION_ORDER', 'Motion samples require strictly ordered native frames'); previous = frame;
          for (const point of Object.values(sample.joints)) { many(point.rawEvidenceRefs, ['RawProviderObservation', 'FrameObservation', 'EvidenceMapping'], 'motion point evidence'); if (point.source === 'MANUAL' && point.confidence !== null) throw new ContractError('MANUAL_CONFIDENCE', 'Manual edits have no model confidence'); if (point.visibility === 'VISIBLE' && !point.xy) throw new ContractError('VISIBLE_POINT', 'Visible joint needs coordinates'); }
          many(sample.facing.evidenceRefs, null, 'motion facing evidence'); // Face channels are symbolic performance, never head/kit/surface identity.
        }
        break;
      }
      case 'PairedActionTemplate': if (p.roleARef === p.roleBRef || need(p.roleARef, ['RolePerformance'], 'role A').payload.role !== 'A' || need(p.roleBRef, ['RolePerformance'], 'role B').payload.role !== 'B') throw new ContractError('PAIRED_ROLES', 'Pair needs distinct independent A/B performances'); many(p.relationshipChannels, ['RelationshipChannel'], 'pair relationships'); many(p.familyRequirements, ['FamilyProfile'], 'pair family'); many(p.propRefs, ['LayeredAssetPackage'], 'shared props'); many(p.envelopeRefs, ['LayeredAssetPackage', 'CharacterPackage'], 'pair envelopes'); many(p.testRefs, ['CompatibilityTestRun'], 'pair tests'); break;
      case 'RelationshipChannel': p.intervals.forEach(assertInterval); for (const a of p.localAnchors) { need(a.partRef, ['LayeredAssetPackage', 'BodyPackage', 'HeadIdentity', 'CanonicalSurface'], 'relationship part'); if (a.socketRef) need(a.socketRef, ['AttachmentSocket'], 'relationship socket'); if (a.anatomicalJointId && a.socketRef) throw new ContractError('ANCHOR_KIND', 'Anatomical anchor and attachment socket are separate alternatives'); } for (const v of p.values) if (v.transform) assertInvertible(v.transform); many(p.evidenceRefs, null, 'relationship evidence'); break;
      case 'ReviewEvent': many(p.targetRevisionRefs, null, 'review targets'); many(p.evidenceRefs, null, 'review evidence'); many(p.testRefs, ['CompatibilityTestRun'], 'review tests'); if (p.previousEventRef) { need(p.previousEventRef, ['ReviewEvent'], 'previous review'); graphEdges.push([r.revisionId, p.previousEventRef]); } if (p.actor.actorId !== r.actorId) throw new ContractError('REVIEW_ACTOR', 'Review actor/envelope disagree'); break;
      case 'CompatibilityTestRun': many(p.inputRevisionRefs, null, 'test inputs'); need(p.testSpecRevision, ['SourceAsset', 'ReviewEvent', 'CompatibilityTestRun'], 'test specification'); break;
      case 'JobRecord': many(p.baseRevisionRefs, null, 'job base'); if (p.state !== 'SUCCEEDED' && p.resultManifestRef !== null) throw new ContractError('JOB_RESULT', 'Only succeeded job may cite final result manifest'); break;
      case 'MigrationRecord': for (const m of p.mapping) { const target = need(m.targetRevisionId, null, 'migration output'); if (target.entityId !== m.targetEntityId) throw new ContractError('MIGRATION_MAPPING', 'Migration target entity/revision mismatch'); } break;
      case 'CalibrationRecord': need(p.personOrBodyRef, ['PersonIdentity', 'BodyPackage'], 'calibration subject'); need(p.familyProfileRef, ['FamilyProfile'], 'calibration family'); if (p.bindPoseRef) need(p.bindPoseRef, null, 'calibration bind pose'); many(p.sourceRefs, null, 'calibration sources'); many(p.reviewerRefs, ['ReviewEvent'], 'calibration reviews'); break;
      case 'BodyPackage': need(p.calibrationRef, ['CalibrationRecord'], 'body calibration'); many(p.bodySurfaceRefs, ['CanonicalSurface'], 'body surfaces'); many(p.anatomyBindingRefs, ['AnatomicalBinding'], 'body anatomy'); need(p.poserProfileRef, ['PoserProfile'], 'body poser'); many(p.artworkRigMappingRefs, ['ArtworkRigMapping'], 'artwork mappings'); many(p.rightsRefs, ['RightsRecord'], 'body rights'); many(p.testRefs, ['CompatibilityTestRun'], 'body tests'); if (p.bindPoseRef) need(p.bindPoseRef, null, 'body bind pose'); for (const c of p.jointConstraints) if (c.minimumDegrees > c.maximumDegrees) throw new ContractError('JOINT_RANGE', 'Joint constraint range invalid'); break;
      case 'PoserProfile': assertAcyclic(p.partHierarchy.filter(h => h.parentPartId).map(h => [h.partId, h.parentPartId]), 'internal part hierarchy'); if (new Set(p.partHierarchy.map(h => h.partId)).size !== p.partHierarchy.length || new Set(p.internalControlSchema.map(c => c.id)).size !== p.internalControlSchema.length) throw new ContractError('POSER_ID', 'Duplicate poser part/control'); for (const h of p.partHierarchy) if (h.parentPartId && !p.partHierarchy.some(n => n.partId === h.parentPartId)) throw new ContractError('POSER_PARENT', 'Missing internal parent'); many(p.comparisonTestRefs, ['CompatibilityTestRun'], 'poser comparison'); if (p.selectionDecisionRef) { const decision = need(p.selectionDecisionRef, ['ReviewEvent'], 'poser decision'); if (decision.payload.scope !== 'ARCHITECTURE') throw new ContractError('POSER_DECISION', 'Poser selection must be architecture-scoped, not asset acceptance'); } break;
      case 'ArtworkRigMapping': for (const m of p.sourceRegionMappings) { if (!p.sourceArtworkHashes.includes(m.sourceArtworkHash)) throw new ContractError('ART_SOURCE', 'Mapping uses undeclared source art'); need(m.registrationRef, ['Registration'], 'art registration'); } many(p.derivedPartRefs, ['CanonicalSurface', 'LayeredAssetPackage'], 'derived art'); many(p.transformRefs, ['Registration'], 'art transforms'); many(p.anatomicalBindingRefs, ['AnatomicalBinding'], 'art anatomy'); many(p.artworkPivotRefs, ['ArtworkPivot'], 'art pivots'); many(p.attachmentSocketRefs, ['AttachmentSocket'], 'art sockets'); if (p.coverageLossReportRef) need(p.coverageLossReportRef, ['CompatibilityTestRun'], 'art coverage report'); break;
      case 'RightsRecord': if (p.allowedUses.includes('NO_GRANT') && p.allowedUses.length > 1) throw new ContractError('RIGHTS_CONTRADICTION', 'No-grant cannot imply permission'); break; // Recorded grants are evidence; trusted licensing activation is separate.
      default: throw new ContractError('SEMANTIC_TYPE', 'Unimplemented record semantics');
    }
  }
  for (const [entityId, revisionId] of heads) if (need(revisionId, null, 'head').entityId !== entityId) throw new ContractError('HEAD_ENTITY', 'Head points to another entity');
  assertAcyclic(graphEdges, 'revision derivation'); assertAcyclic(componentEdges, 'component parents'); assertAcyclic(socketEdges, 'socket parents');
  return true;
}
