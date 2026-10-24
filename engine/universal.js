/* Universal Prep 0.4 — character-independent skeleton and ONE immutable-index timeline.
 * Detectors propose observations. Scoped passes commit into this record; never separate limb tracks.
 * Original media, raw observations, accepted locks and manual corrections are distinct layers.
 * MIT; project-authored module, 2026-10-22. */
(function(root){'use strict';
const FORMAT='adventure-studio/unified-prep',VERSION=4;
const BODY=['nose','eye.left','eye.right','ear.left','ear.right','shoulder.left','shoulder.right','elbow.left','elbow.right','wrist.left','wrist.right','hip.left','hip.right','knee.left','knee.right','ankle.left','ankle.right'];
const DERIVED=['head','neck','chest','pelvis','hand.left','hand.right','toe.left','toe.right'];
const FACE=['face.brow.left','face.brow.right','face.eye.left','face.eye.right','face.lower'];
const DENSE=Array.from({length:68},(_,i)=>'face.landmark.'+String(i).padStart(2,'0'));
const ALL=[...BODY,...DERIVED,...FACE,...DENSE];
const BONES=[['head','neck'],['nose','head'],['neck','chest'],['chest','pelvis'],['shoulder.left','shoulder.right'],['hip.left','hip.right'],...['left','right'].flatMap(s=>[['neck','shoulder.'+s],['shoulder.'+s,'elbow.'+s],['elbow.'+s,'wrist.'+s],['wrist.'+s,'hand.'+s],['pelvis','hip.'+s],['hip.'+s,'knee.'+s],['knee.'+s,'ankle.'+s],['ankle.'+s,'toe.'+s]])];
const REGION={whole:[...BODY,...DERIVED,...FACE,...DENSE],body:[...BODY,...DERIVED],face:[...FACE,...DENSE],head:['nose','eye.left','eye.right','ear.left','ear.right','head','neck',...FACE,...DENSE],torso:['shoulder.left','shoulder.right','hip.left','hip.right','neck','chest','pelvis'],leftArm:['shoulder.left','elbow.left','wrist.left','hand.left'],rightArm:['shoulder.right','elbow.right','wrist.right','hand.right'],leftLeg:['hip.left','knee.left','ankle.left','toe.left'],rightLeg:['hip.right','knee.right','ankle.right','toe.right'],eyes:['face.eye.left','face.eye.right',...DENSE.slice(36,48)],brows:['face.brow.left','face.brow.right',...DENSE.slice(17,27)],mouth:['face.lower',...DENSE.slice(48)]};
const LABEL={whole:'Whole character',body:'Body only',face:'Face only',head:'Head + face',torso:'Torso + pelvis',leftArm:'Left arm',rightArm:'Right arm',leftLeg:'Left leg',rightLeg:'Right leg',eyes:'Eyes',brows:'Brows',mouth:'Lower face'};
// Named editing regions reference the SAME anatomical node IDs. Dense facial sides
// use the source mirror convention via targets(); they are never assigned by screen X.
Object.assign(REGION,{
 upperTorso:['neck','chest','shoulder.left','shoulder.right'],
 lowerTorso:['chest','pelvis','hip.left','hip.right'],pelvic:['pelvis','hip.left','hip.right'],
 neckRegion:['neck','head'],headOnly:['head','nose','eye.left','eye.right','ear.left','ear.right'],
 leftUpperArm:['shoulder.left','elbow.left'],leftForearm:['elbow.left','wrist.left'],leftHand:['wrist.left','hand.left'],
 rightUpperArm:['shoulder.right','elbow.right'],rightForearm:['elbow.right','wrist.right'],rightHand:['wrist.right','hand.right'],
 leftThigh:['hip.left','knee.left'],leftShin:['knee.left','ankle.left'],leftFoot:['ankle.left','toe.left'],
 rightThigh:['hip.right','knee.right'],rightShin:['knee.right','ankle.right'],rightFoot:['ankle.right','toe.right'],
 leftBrow:['face.brow.left',...DENSE.slice(22,27)],rightBrow:['face.brow.right',...DENSE.slice(17,22)],
 leftEye:['face.eye.left',...DENSE.slice(42,48)],rightEye:['face.eye.right',...DENSE.slice(36,42)],
 lowerFace:['face.lower',...DENSE.slice(0,17),...DENSE.slice(27,36),...DENSE.slice(48)],
 faceOutline:DENSE.slice(0,17),noseRegion:DENSE.slice(27,36)
});
Object.assign(LABEL,{upperTorso:'Upper torso / chest',lowerTorso:'Lower torso / abdomen',pelvic:'Pelvis',neckRegion:'Neck',headOnly:'Head anchors',
 leftUpperArm:'Left upper arm',leftForearm:'Left forearm',leftHand:'Left hand',rightUpperArm:'Right upper arm',rightForearm:'Right forearm',rightHand:'Right hand',
 leftThigh:'Left thigh',leftShin:'Left lower leg',leftFoot:'Left foot',rightThigh:'Right thigh',rightShin:'Right lower leg',rightFoot:'Right foot',
 leftBrow:'Left brow',rightBrow:'Right brow',leftEye:'Left eye',rightEye:'Right eye',lowerFace:'Lower face',faceOutline:'Jaw / outline',noseRegion:'Nose detail'});
const GROUP_TREE=[{id:'whole'},{id:'body',children:[{id:'torso',children:[{id:'upperTorso'},{id:'lowerTorso'},{id:'pelvic'}]},
 {id:'leftArm',children:[{id:'leftUpperArm'},{id:'leftForearm'},{id:'leftHand'}]},
 {id:'rightArm',children:[{id:'rightUpperArm'},{id:'rightForearm'},{id:'rightHand'}]},
 {id:'leftLeg',children:[{id:'leftThigh'},{id:'leftShin'},{id:'leftFoot'}]},
 {id:'rightLeg',children:[{id:'rightThigh'},{id:'rightShin'},{id:'rightFoot'}]},
 {id:'head',children:[{id:'neckRegion'},{id:'headOnly'}]}]},
 {id:'face',children:[{id:'leftBrow'},{id:'rightBrow'},{id:'leftEye'},{id:'rightEye'},{id:'lowerFace'}]}];
const FACE_GROUPS=['face','eyes','brows','mouth','leftBrow','rightBrow','leftEye','rightEye','lowerFace','faceOutline','noseRegion'];
const MIRROR_REGION={leftBrow:'rightBrow',rightBrow:'leftBrow',leftEye:'rightEye',rightEye:'leftEye'};
const LANDMARK_SEMANTICS={
 'shoulder.left':'Center of the anatomical shoulder rotation where the upper arm pivots against the torso; place inside the body contour, not on the outer skin edge.',
 'shoulder.right':'Center of the anatomical shoulder rotation where the upper arm pivots against the torso; place inside the body contour, not on the outer skin edge.',
 'elbow.left':'Center of the elbow hinge between upper arm and forearm; use the bend center, not the point of the elbow silhouette.',
 'elbow.right':'Center of the elbow hinge between upper arm and forearm; use the bend center, not the point of the elbow silhouette.',
 'wrist.left':'Center of the wrist joint at the narrow transition between forearm and hand; do not place it at the palm center, knuckles, fist tip, or fingertips.',
 'wrist.right':'Center of the wrist joint at the narrow transition between forearm and hand; do not place it at the palm center, knuckles, fist tip, or fingertips.',
 'hand.left':'Center of the palm / metacarpal mass immediately beyond the wrist; not the fingertip or outside tip of a fist.',
 'hand.right':'Center of the palm / metacarpal mass immediately beyond the wrist; not the fingertip or outside tip of a fist.'
};
const DETECTOR_MAP={nose:'nose',eyeL:'eye.left',eyeR:'eye.right',earL:'ear.left',earR:'ear.right',shoulderL:'shoulder.left',shoulderR:'shoulder.right',elbowL:'elbow.left',elbowR:'elbow.right',wristL:'wrist.left',wristR:'wrist.right',hipL:'hip.left',hipR:'hip.right',kneeL:'knee.left',kneeR:'knee.right',ankleL:'ankle.left',ankleR:'ankle.right'};
const SCHEMA={id:'adventure-studio/universal-skeleton',version:'1.2.0',profile:'humanoid-2d',coordinateSystem:{origin:'source top-left',x:'right',y:'down',units:'source pixels',normalized:'u=x/source.width; v=y/source.height',sideConvention:'subject anatomical left/right; NEVER screen-left/right',depth:'not inferred; 2D projection only'},root:'pelvis',faceParent:'head',joints:[...BODY,...DERIVED].map(id=>({id,measurement:DERIVED.includes(id)?'derived-or-manual':'detected-or-manual',optional:['eye.left','eye.right','ear.left','ear.right','hand.left','hand.right','toe.left','toe.right'].includes(id)})),bones: BONES,regions:REGION,regionHierarchy:GROUP_TREE,regionPolicy:'Groups share boundary nodes; region passes never duplicate joints. Dense facial sides honor the source mirror convention.',face:{slots:FACE,sharedNose:'nose',resolvedAliases:{'eye.left':'face.eye.left','eye.right':'face.eye.right'},authority:'Five editable facial slots; body-detector eye coordinates remain raw evidence, not competing controls.',landmarkExtension:{id:'ibug-68',points:DENSE,convention:'68-point detector ordering; anatomical anchors map explicitly, not by image x'}},proportions:'character-specific; no mannequin dimensions are canonical',visibility:['visible','occluded','out_of_frame','unknown'],extensions:{policy:'add namespaced profiles/points; retain unknown JSON fields; no silent dropping'},ground:'separate user guide or silhouette estimate, not skeletal root and not proven foot contact'};
const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const finite=x=>Number.isFinite(x);
const round=(v,n=4)=>+v.toFixed(n);
const pointOK=p=>p&&finite(p.x)&&finite(p.y);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const now=()=>new Date().toISOString();
const id=prefix=>prefix+'-'+(root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
function point(x,y,confidence,source='detector',visibility='visible',passId=null){if(!finite(x)||!finite(y))return null;return {x:round(x),y:round(y),confidence:confidence==null?null:round(clamp(confidence,0,1)),visibility,source,passId};}
function defaults(){return {key:{enabled:true,color:'#00D200',mode:'auto',tolerance:34,softness:12,matteShift:0,feather:0,despill:75,adaptive:false,alphaFloor:8,alphaCeiling:248},color:{brightness:0,contrast:0,saturation:0,replacements:[]},strokes:[],crop:null,subjectROI:null,faceGuides:{},faceContainers:{},faceOvals:{},faceReferences:[],faceOptions:{followOval:true,protectMatte:false},floorY:null,mirrored:false};}
function makeProject(source,times){
 if(!source||!finite(source.width)||!finite(source.height)||source.width<1||source.height<1)throw Error('Invalid source dimensions.');
 const subjectId=id('subject');const p={format:FORMAT,formatVersion:VERSION,id:id('prep'),createdAt:now(),application:{name:'Unified Prep',version:'0.4.0',checkpoint:4},schema:clone(SCHEMA),subject:{id:subjectId,name:source.corpusId?'Mannequin reference':'Character',profile:'humanoid-2d'},source:clone(source),timeline:{samplingFps:source.fps||24,timing:source.timing||'constant-rate samples; video decode seek at sample centers',in:0,out:times.length-1,loop:true,excluded:[]},frames:times.map((t,i)=>({id:'f'+String(i).padStart(6,'0'),index:i,subjectId,time:round(typeof t==='number'?t:t.time,7),duration:round(typeof t==='number'?1/(source.fps||24):t.duration,7),points:{},raw:{},state:'untracked',review:[],facing:source.view||'unknown',facingSource:'source hint; unverified',bounds:null,face:null})),edits:{},visibilityEdits:{},operations:[],locks:[],passes:[],processing:defaults(),propagation:{radius:12,direction:'both',enabled:true,method:'bounded-absolute-keyframes'},output:{scale:1,columns:8,padding:0,loop:true},bindings:[],notes:'',documentation:{authority:'One universal skeleton on one source-indexed timeline. Region passes never create independent tracks.',editing:'points are observations; edits and accepted locks override them. Propagation never overwrites pins or locks.',source:'Source bytes are not embedded in JSON. Save a portable project ZIP to include them.',confidence:'Detector scores are not calibrated probabilities of anatomical correctness; manual points use null confidence.',scope:'Single subject. Dedicated hair/skin/garment/accessory classification is deferred.'}};
 validate(p);return p;
}
function derived(points,passId=null){
 const p={...points},mid=(a,b,t=.5)=>pointOK(p[a])&&pointOK(p[b])?point(p[a].x+(p[b].x-p[a].x)*t,p[a].y+(p[b].y-p[a].y)*t,Math.min(p[a].confidence??.6,p[b].confidence??.6)*.85,'derived','unknown',passId):null;
 p.neck=mid('shoulder.left','shoulder.right');p.pelvis=mid('hip.left','hip.right');p.chest=mid('neck','pelvis',.4);
 p.head=pointOK(p.nose)&&pointOK(p.neck)?point(p.nose.x+(p.nose.x-p.neck.x)*.18,p.nose.y+(p.nose.y-p.neck.y)*.18,Math.min(p.nose.confidence??.5,p.neck.confidence??.5)*.65,'estimated','unknown',passId):null;
 for(const s of ['left','right']){const wr=p['wrist.'+s],el=p['elbow.'+s],an=p['ankle.'+s],kn=p['knee.'+s];p['hand.'+s]=pointOK(wr)&&pointOK(el)?point(wr.x+(wr.x-el.x)*.26,wr.y+(wr.y-el.y)*.26,Math.min(wr.confidence??.5,el.confidence??.5)*.55,'estimated','unknown',passId):null;p['toe.'+s]=pointOK(an)&&pointOK(kn)?point(an.x+(an.x-kn.x)*.16,an.y+(an.y-kn.y)*.16,Math.min(an.confidence??.5,kn.confidence??.5)*.4,'estimated','unknown',passId):null;}
 return p;
}
function bodyObservation(raw,w,h,passId,mirrored=false){const out={};for(const [key,name] of Object.entries(DETECTOR_MAP)){const q=raw?.joints?.[key],c=raw?.score?.[key]||0;let n=name;if(mirrored)n=name.endsWith('.left')?name.replace('.left','.right'):name.endsWith('.right')?name.replace('.right','.left'):name;out[n]=q&&finite(q[0])&&finite(q[1])&&q[0]>=-w*.1&&q[0]<=w*1.1&&q[1]>=-h*.1&&q[1]<=h*1.1&&c>=.13?point(q[0],q[1],c,'detector',c>=.3?'visible':'unknown',passId):null;}return derived(out,passId);}
function faceObservation(raw,passId,mirrored=false){const out={};for(const k of [...FACE,...DENSE])out[k]=null;if(!raw)return out;let map={browL:'face.brow.right',browR:'face.brow.left',eyeL:'face.eye.right',eyeR:'face.eye.left',mouth:'face.lower'};for(const [src,target]of Object.entries(map)){let name=target;if(mirrored)name=target.endsWith('.left')?target.replace('.left','.right'):target.endsWith('.right')?target.replace('.right','.left'):target;const a=raw.anchors?.[src];if(a)out[name]=point(a[0],a[1],raw.score,'face-detector','visible',passId);}if(raw.landmarks)raw.landmarks.forEach((a,i)=>{if(DENSE[i])out[DENSE[i]]=point(a[0],a[1],raw.score,'face-detector','visible',passId);});return out;}
function lockValue(p,i,k){for(let a=p.locks.length-1;a>=0;a--){const lock=p.locks[a];if(i<lock.start||i>lock.end||!lock.keys.includes(k))continue;const snap=lock.snapshot?.[i];if(snap&&Object.prototype.hasOwnProperty.call(snap,k))return {exists:true,value:snap[k]};}return {exists:false};}
function hiddenState(state){return state==='occluded'||state==='out_of_frame';}
function visibilityAt(p,i,k){return p.visibilityEdits?.[i]?.[k]?.state||p.edits[i]?.[k]?.point?.visibility||(lockValue(p,i,k).exists?lockValue(p,i,k).value?.visibility:null)||p.frames[i]?.visibilityEvidence?.[k]?.state||p.frames[i]?.points?.[k]?.visibility||'unknown';}
function protectedAt(p,i,k){return !!p.edits[i]?.[k]||lockValue(p,i,k).exists||hiddenState(p.visibilityEdits?.[i]?.[k]?.state);}
function positionProtected(p,i,k){return !!p.edits[i]?.[k]||lockValue(p,i,k).exists;}

function targets(region,selected,project=null){
 if(region==='selected')return selected?[selected]:[];
 const keys=(REGION[region]||REGION.whole).slice();
 if(project?.processing?.mirrored&&MIRROR_REGION[region])return [...keys.filter(k=>!k.startsWith('face.landmark.')),...REGION[MIRROR_REGION[region]].filter(k=>k.startsWith('face.landmark.'))];
 return keys;
}
// Corrections constrain absolute anatomy, never blend detector-error offsets.
// Between two pins, image-motion progress (when measured) replaces wall-clock
// progress. Repeated source images therefore cannot introduce artificial motion.
function motionFraction(p,a,b,i){
 const A=p.frames[a],B=p.frames[b],I=p.frames[i];
 const vals=p.frames.slice(a,b+1).map(f=>f.motion?.phase);
 if(vals.every(finite)&&vals.every((v,n)=>!n||v>=vals[n-1])){
  const span=B.motion.phase-A.motion.phase;
  if(span>1e-10)return clamp((I.motion.phase-A.motion.phase)/span,0,1);
  return 0; // No pixel motion; inconsistent endpoints are reviewable pins, not invented movement.
 }
 return clamp((I.time-A.time)/Math.max(1e-9,B.time-A.time),0,1);
}
function dependencyResolve(points,p,i){
 const out={...points};
 const isPinned=k=>positionProtected(p,i,k);
 const fresh=derived(out);
 // Resolve in topological order; an independently pinned neck/pelvis feeds chest/head.
 for(const k of ['neck','pelvis'])if(!isPinned(k))out[k]=fresh[k];
 const next=derived(out);
 if(!isPinned('chest')){const n=out.neck,h=out.pelvis;out.chest=pointOK(n)&&pointOK(h)?point(n.x+(h.x-n.x)*.4,n.y+(h.y-n.y)*.4,Math.min(n.confidence??.6,h.confidence??.6)*.85,'derived','unknown'):null;}
 if(!isPinned('head')){const n=out.nose,h=out.neck;out.head=pointOK(n)&&pointOK(h)?point(n.x+(n.x-h.x)*.18,n.y+(n.y-h.y)*.18,Math.min(n.confidence??.5,h.confidence??.5)*.65,'estimated','unknown'):null;}
 for(const k of ['hand.left','hand.right','toe.left','toe.right'])if(!isPinned(k)){
  const old=out[k];
  // An explicit manual bracket for a hand/foot has priority over a heuristic endpoint.
  if(old?.source==='keyframe-interpolation'||old?.source==='reference-follow')continue;
  out[k]=next[k];
 }
 for(const k of DERIVED)if(!isPinned(k)&&out[k]){
  const old=points[k];if(old&&hiddenState(old.visibility))out[k]={...out[k],visibility:old.visibility,visibilityReason:old.visibilityReason};
  const parent=k.startsWith('hand.')?'wrist.'+k.split('.')[1]:k.startsWith('toe.')?'ankle.'+k.split('.')[1]:null;
  if(parent&&hiddenState(out[parent]?.visibility))out[k]={...out[k],visibility:out[parent].visibility,visibilityReason:'Dependent endpoint: '+out[parent].visibility};
  out[k].dependencyResolved=true;
 }
 return out;
}
function resolve(p,i,{propagate=true}={}){
 const f=p.frames[i];if(!f)return null;const out=clone(f);out.points=out.points||{};
 const keys=new Set([...Object.keys(out.points),...DERIVED,...Object.keys(p.edits[i]||{}),...Object.keys(p.visibilityEdits?.[i]||{}),...p.locks.filter(l=>i>=l.start&&i<=l.end).flatMap(l=>l.keys)]);
 for(const k of keys){
  const direct=p.edits[i]?.[k],lock=lockValue(p,i,k);
  if(direct){out.points[k]={...clone(direct.point),source:'manual',confidence:null,locked:true};continue;}
  if(lock.exists){out.points[k]=clone(lock.value);if(out.points[k]){out.points[k].locked=true;out.points[k].accepted=true;}continue;}
  if(!propagate||!p.propagation.enabled||hiddenState(visibilityAt(p,i,k)))continue;
  const r=p.propagation.radius;if(r<=0)continue;
  // Never cross an accepted lock or explicit hidden/outside interval.
  const barrier=(a,b)=>{for(let n=a+1;n<b;n++)if(lockValue(p,n,k).exists||hiddenState(visibilityAt(p,n,k)))return true;return false;};
  const anchors=Object.keys(p.edits).map(Number).filter(n=>pointOK(p.edits[n]?.[k]?.point)&&!hiddenState(visibilityAt(p,n,k))&&Math.abs(n-i)<=r).sort((a,b)=>a-b);
  const before=anchors.filter(n=>n<i).pop(),after=anchors.find(n=>n>i);
  if(before!==undefined&&after!==undefined&&p.propagation.direction==='both'&&!barrier(before,after)){
   const a=p.edits[before][k].point,b=p.edits[after][k].point,t=motionFraction(p,before,after,i);
   out.points[k]={...point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,null,'keyframe-interpolation','unknown'),propagated:true,interpolation:{from:before,to:after,weight:round(t,7),basis:finite(f.motion?.phase)?'source-image-motion':'time (source motion not analyzed)'},positionEvidence:'estimated between manual references; not a visible detection'};
  }
  // One-sided fixes are learned by the visual follower during a refinement pass.
  // No blind, fading offsets are added to an independently detected neighboring frame.
 }
 // Facial slots are the editable eye authority. Retain legacy manual body-eye pins,
 // rather than silently moving a correction imported from an older checkpoint.
 for(const side of ['left','right']){const key='eye.'+side,face=out.points['face.eye.'+side];if(pointOK(face)&&!positionProtected(p,i,key))out.points[key]={...clone(face),source:'alias:face.eye.'+side,canonicalNode:'face.eye.'+side};}
 out.points=dependencyResolve(out.points,p,i);
 out.visibility=clone(f.visibilityEvidence||{});
 for(const k of keys){const v=p.visibilityEdits?.[i]?.[k];if(v){out.visibility[k]=clone(v);if(pointOK(out.points[k]))out.points[k]={...out.points[k],visibility:v.state,visibilitySource:'manual',...(hiddenState(v.state)?{positionEvidence:'retained / not visibly observed'}:{})};else out.points[k]=null;}}
 return out;
}
function pin(p,i,k,x,y,visibility='visible'){if(!p.frames[i]||!ALL.includes(k)||!finite(x)||!finite(y))throw Error('Invalid correction.');if(!SCHEMA.visibility.includes(visibility))throw Error('Invalid visibility.');if(k.startsWith('face.')&&root.PrepReliability&&!p.processing.faceOvals?.[i]){const o=root.PrepReliability.ovalAt(p,i);if(o)root.PrepReliability.setOval(p,i,o);}
 const old=p.edits[i]?.[k],base=old?.base||clone(p.frames[i].points[k])||null;p.edits[i]=p.edits[i]||{};p.edits[i][k]={point:point(x,y,null,'manual',visibility),base:pointOK(base)?{x:base.x,y:base.y}:null,createdAt:old?.createdAt||now()};}
function clearPin(p,i,k){if(p.edits[i]){delete p.edits[i][k];if(!Object.keys(p.edits[i]).length)delete p.edits[i];}}
function accept(p,start,end,keys){const snap={};for(let i=start;i<=end;i++){const pts=resolve(p,i).points;snap[i]={};for(const k of keys)snap[i][k]=clone(pts[k]||null);}p.locks.push({id:id('lock'),start,end,keys:keys.slice(),snapshot:snap,createdAt:now()});}
function unlock(p,start,end,keys){const set=new Set(keys);for(const l of p.locks)for(let i=Math.max(start,l.start);i<=Math.min(end,l.end);i++)for(const k of keys)if(l.snapshot[i])delete l.snapshot[i][k];p.locks=p.locks.filter(l=>Object.values(l.snapshot).some(q=>Object.keys(q).length));}
function statusOf(points){const present=BODY.filter(k=>pointOK(points[k])),good=present.filter(k=>(points[k].confidence??0)>=.32);if(!present.length)return FACE.some(k=>pointOK(points[k]))?'review':'untracked';return good.length>=11?'tracked':good.length>=5?'review':'unreliable';}
function commitPass(p,proposals,config){
 const allowed=new Set(config.keys),stats={updated:0,protected:0,frames:0};
 for(const prop of proposals){
  const f=p.frames[prop.index];if(!f)throw Error('Pass references unknown frame.');const written=new Set();
  for(const [k,v]of Object.entries(prop.points||{})){if(!allowed.has(k))continue;if(protectedAt(p,f.index,k)){stats.protected++;continue;}f.points[k]=clone(v);stats.updated++;written.add(k);}
  if(!written.size)continue;stats.frames++;
  if(prop.motion)f.motion=clone(prop.motion);if(prop.quality)f.quality=clone(prop.quality);
  // Visibility evidence is scoped with the actual accepted coordinates, never
  // wholesale-copied from contextual / rejected / protected proposal points.
  if(prop.visibilityEvidence){f.visibilityEvidence=f.visibilityEvidence||{};for(const k of written){if(prop.visibilityEvidence[k])f.visibilityEvidence[k]=clone(prop.visibilityEvidence[k]);else delete f.visibilityEvidence[k];}}
  const faceWritten=[...written].some(k=>k.startsWith('face.'));
  if(faceWritten&&prop.faceOval)f.faceOval=clone(prop.faceOval);
  if(prop.bounds)f.bounds=clone(prop.bounds);
  if(faceWritten&&config.keys.includes('face.lower')&&prop.face!==undefined)f.face=clone(prop.face);
  f.review=[...new Set([...(f.review||[]).filter(s=>!s.startsWith('Tracker:')||(/face/i.test(s)?!config.keys.some(k=>k.startsWith('face.')):!BODY.every(k=>allowed.has(k)))),...(prop.review||[])])];
  f.state=statusOf(f.points);if(f.review.length&&f.state==='tracked')f.state='review';f.raw=f.raw||{};if(prop.raw)f.raw[config.id]=clone(prop.raw);
 }
 p.passes.push({...clone(config),finishedAt:now(),statistics:stats});return stats;
}
function stabilize(proposals,keys,existing){const out=clone(proposals),byIndex=new Map(out.map(x=>[x.index,x]));for(const k of keys){if(DERIVED.includes(k)||k.startsWith('face.'))continue;for(let a=0;a<out.length;a++){const item=out[a];if(protectedAt(existing,item.index,k)){item.points[k]=clone(resolve(existing,item.index).points[k]);continue;}if(hiddenState(item.points[k]?.visibility)||(item.points[k]?.confidence||0)>=.3)continue;let left=a-1,right=a+1;while(left>=0&&!(out[left].points[k]?.confidence>=.4&&!hiddenState(out[left].points[k]?.visibility)))left--;while(right<out.length&&!(out[right].points[k]?.confidence>=.4&&!hiddenState(out[right].points[k]?.visibility)))right++;if(left<0||right>=out.length)continue;const l=out[left],r=out[right];if(r.index-l.index>4||existing.frames[r.index].time-existing.frames[l.index].time>.3)continue;const t=(existing.frames[item.index].time-existing.frames[l.index].time)/(existing.frames[r.index].time-existing.frames[l.index].time);item.points[k]=point(l.points[k].x+(r.points[k].x-l.points[k].x)*t,l.points[k].y+(r.points[k].y-l.points[k].y)*t,Math.min(l.points[k].confidence,r.points[k].confidence)*.5,'interpolated','unknown',l.points[k].passId);item.review.push('Tracker: short uncertain gap interpolated; inspect this frame.');}}
 return out;}
function continuity(points,previous,bounds){const p=clone(points),review=[];if(!previous)return {points:p,review};const scale=bounds?.h||200;
 for(const chain of [['elbow','wrist'],['knee','ankle']]){const ids=chain.flatMap(n=>[n+'.left',n+'.right']);if(!ids.every(k=>pointOK(p[k])&&pointOK(previous[k])&&!hiddenState(p[k].visibility)&&!hiddenState(previous[k].visibility)))continue;let normal=0,swapped=0;for(const n of chain){normal+=dist(p[n+'.left'],previous[n+'.left'])+dist(p[n+'.right'],previous[n+'.right']);swapped+=dist(p[n+'.left'],previous[n+'.right'])+dist(p[n+'.right'],previous[n+'.left']);}if(swapped<normal*.4&&normal>scale*.25){const uncertain=ids.some(k=>(p[k].confidence||0)<.45);if(uncertain){for(const n of chain){[p[n+'.left'],p[n+'.right']]=[p[n+'.right'],p[n+'.left']];for(const side of ['left','right']){p[n+'.'+side].source='continuity-reassociated';p[n+'.'+side].confidence*=.7;}}review.push('Tracker: probable left/right ambiguity reassociated; verify anatomical sides.');}else review.push('Tracker: crossing/turn may affect limb identity; inspect sides.');}}
 for(const k of BODY)if(pointOK(p[k])&&pointOK(previous[k])&&!hiddenState(p[k].visibility)&&!hiddenState(previous[k].visibility)&&dist(p[k],previous[k])>scale*.25)review.push('Tracker: large joint displacement; inspect motion or occlusion.');return {points:p,review:[...new Set(review)]};}
// Visibility is an annotation, not an invented coordinate. Hiding a missing joint
// protects the missing value from detector passes, while preserving its identity.
function recordOperation(p,kind,data){p.operations=p.operations||[];p.operations.push({id:id('edit'),kind,at:now(),...clone(data)});}
function checkedScope(p,start,end,keys){
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>=p.frames.length||!Array.isArray(keys)||keys.some(k=>!ALL.includes(k)))throw Error('Invalid frame range or anatomical selection.');
}
function setVisibility(p,start,end,keys,state){
 checkedScope(p,start,end,keys);if(!SCHEMA.visibility.includes(state))throw Error('Invalid visibility state.');
 p.visibilityEdits=p.visibilityEdits||{};const stamp=now();
 for(let i=start;i<=end;i++){p.visibilityEdits[i]=p.visibilityEdits[i]||{};for(const k of keys)p.visibilityEdits[i][k]={state,source:'manual',at:stamp};}
 recordOperation(p,'visibility',{start,end,keys,state});
}
function clearVisibility(p,start,end,keys){
 checkedScope(p,start,end,keys);for(let i=start;i<=end;i++)if(p.visibilityEdits?.[i]){for(const k of keys)delete p.visibilityEdits[i][k];if(!Object.keys(p.visibilityEdits[i]).length)delete p.visibilityEdits[i];}
 recordOperation(p,'clear-visibility',{start,end,keys});
}
function migrateProject(input){
 validate(input);if(input.formatVersion===VERSION)return input;
 const p=clone(input),priorSchema=clone(p.schema),priorApplication=clone(p.application),from=input.formatVersion;
 p.formatVersion=VERSION;p.schema={...p.schema,...clone(SCHEMA),regions:{...p.schema.regions,...clone(REGION)}};
 p.application={...p.application,name:'Unified Prep',version:'0.4.0',checkpoint:4};p.visibilityEdits=p.visibilityEdits||{};p.operations=p.operations||[];
 p.processing.faceContainers=p.processing.faceContainers||{};p.processing.faceOvals=p.processing.faceOvals||{};
 p.processing.faceReferences=p.processing.faceReferences||[];p.processing.faceOptions=p.processing.faceOptions||{followOval:true,protectMatte:false};
 p.propagation.method='bounded-absolute-keyframes';
 p.migrations=p.migrations||[];p.migrations.push({fromFormat:from,toFormat:VERSION,at:now(),previousSchema:priorSchema,previousApplication:priorApplication,note:'Original observations, corrections, locks and processing retained. Resolution now uses absolute pin brackets and refreshed dependencies. Previous rendered results remain in the original file. Source-motion analysis recommended.'});
 validate(p);return p;
}
function headReference(p,i){const pts=resolve(p,i).points;return clone([pts.head,pts.nose,pts.neck].find(q=>pointOK(q)&&!hiddenState(q.visibility))||null);}
function boxContainer(box,head,source='auto'){return {cx:box.x+box.w/2,cy:box.y+box.h/2,w:box.w,h:box.h,angle:0,headRef:head,source};}
function containerCorners(box){const a=box.angle||0,c=Math.cos(a),s=Math.sin(a);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:box.cx+x*box.w/2*c-y*box.h/2*s,y:box.cy+x*box.w/2*s+y*box.h/2*c}));}
function containerBounds(box){const q=containerCorners(box),xs=q.map(a=>a.x),ys=q.map(a=>a.y);return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};}
function faceContainerAt(p,i,region='face'){
 const pts=resolve(p,i).points,head=headReference(p,i),keys=targets(region,null,p).filter(k=>k.startsWith('face.'));
 if(region==='face'){
  const own=p.processing.faceContainers?.[i];if(own)return {...clone(own),frame:i,inherited:false};
  const near=Object.entries(p.processing.faceContainers||{}).map(([n,c])=>({n:+n,c})).filter(q=>Math.abs(q.n-i)<=Math.max(12,p.propagation.radius)).sort((a,b)=>Math.abs(a.n-i)-Math.abs(b.n-i)||a.n-b.n)[0];
  if(near){const c=clone(near.c);if(pointOK(head)&&pointOK(c.headRef)){c.cx+=head.x-c.headRef.x;c.cy+=head.y-c.headRef.y;}return {...c,headRef:head,frame:i,fromFrame:near.n,inherited:true};}
 }
 const points=keys.map(k=>pts[k]).filter(q=>pointOK(q)&&!hiddenState(q.visibility));
 if(points.length){const xs=points.map(q=>q.x),ys=points.map(q=>q.y),pad=region==='face'?Math.max(4,(Math.max(...xs)-Math.min(...xs))*.12):3;
  return {...boxContainer({x:Math.min(...xs)-pad,y:Math.min(...ys)-pad,w:Math.max(6,Math.max(...xs)-Math.min(...xs)+pad*2),h:Math.max(6,Math.max(...ys)-Math.min(...ys)+pad*2)},head),frame:i,inherited:false};}
 const guide=p.processing.faceGuides?.[i];if(guide?.box)return {...boxContainer(guide.box,head,'guide'),frame:i};
 const b=p.frames[i].face?.box;if(b&&finite(b.x)&&finite(b.y)&&finite(b.w)&&finite(b.h)&&b.w>0&&b.h>0)return {...boxContainer(b,head,'face-observation'),frame:i};
 if(!pointOK(head))return null;const nose=pts.nose||head,neck=pts.neck;const size=clamp(pointOK(neck)?dist(nose,neck)*1.65:p.source.height*.12,18,Math.max(p.source.width,p.source.height)*.4);
 return {...boxContainer({x:nose.x-size*.65,y:nose.y-size*.7,w:size*1.3,h:size*1.5},head,'head-estimate'),frame:i};
}
// A direct group edit only moves unprotected facial points. Re-editing points owned
// by this container is intentional; independent individual pins and locks stay put.
function transformFace(p,i,keys,from,to,options={}){
 checkedScope(p,i,i,keys);if(keys.some(k=>!k.startsWith('face.')))throw Error('A face container cannot transform body nodes.');
 for(const c of [from,to])if(!c||!['cx','cy','w','h','angle'].every(k=>finite(c[k]))||c.w<2||c.h<2)throw Error('Invalid face container geometry.');
 const source=options.points||resolve(p,i).points,stats={moved:0,protected:0,missing:0};
 const a=-from.angle,ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(to.angle),sb=Math.sin(to.angle);
 for(const k of keys){const q=source[k],edit=p.edits[i]?.[k];
  if(lockValue(p,i,k).exists||hiddenState(visibilityAt(p,i,k))||edit&&edit.origin!=='face-container'){stats.protected++;continue;}
  if(!pointOK(q)){stats.missing++;continue;}
  const dx=q.x-from.cx,dy=q.y-from.cy,lx=(dx*ca-dy*sa)*to.w/from.w,ly=(dx*sa+dy*ca)*to.h/from.h,x=to.cx+lx*cb-ly*sb,y=to.cy+lx*sb+ly*cb;
  pin(p,i,k,x,y,q.visibility);p.edits[i][k].origin='face-container';stats.moved++;
 }
 if(options.storeContainer!==false){p.processing.faceContainers=p.processing.faceContainers||{};p.processing.faceContainers[i]={cx:to.cx,cy:to.cy,w:to.w,h:to.h,angle:to.angle,headRef:headReference(p,i),source:'manual',updatedAt:now()};}
 if(options.log)recordOperation(p,'face-transform',{start:i,end:i,keys,from,to,statistics:stats});
 return stats;
}
function validateInteraction(p,fail){
 if(p.formatVersion===VERSION&&(!p.visibilityEdits||typeof p.visibilityEdits!=='object'||Array.isArray(p.visibilityEdits)||!Array.isArray(p.operations)||!p.processing.faceContainers))fail('missing interaction editing data');
 if(p.visibilityEdits){if(typeof p.visibilityEdits!=='object'||Array.isArray(p.visibilityEdits))fail('invalid visibility annotations');for(const [i,entries]of Object.entries(p.visibilityEdits)){
  if(!p.frames[+i]||String(+i)!==i||!entries||typeof entries!=='object')fail('invalid visibility frame');
  for(const [k,v]of Object.entries(entries))if(!ALL.includes(k)||!v||!SCHEMA.visibility.includes(v.state)||v.source!=='manual')fail('invalid visibility target/state');
 }}
 if(p.processing.faceContainers){if(typeof p.processing.faceContainers!=='object'||Array.isArray(p.processing.faceContainers))fail('invalid face containers');for(const [i,c]of Object.entries(p.processing.faceContainers)){
  if(!p.frames[+i]||String(+i)!==i||!c||!['cx','cy','w','h','angle'].every(k=>finite(c[k]))||c.w<2||c.h<2||c.w>p.source.width*20||c.h>p.source.height*20||Math.abs(c.cx)>p.source.width*20||Math.abs(c.cy)>p.source.height*20||Math.abs(c.angle)>Math.PI*100||c.headRef&&!pointOK(c.headRef))fail('invalid face container geometry');
 }}
}

function resolvedDocument(p,transform=null){return {format:'adventure-studio/resolved-track',formatVersion:1,schema:clone(p.schema),projectId:p.id,subject:clone(p.subject),source:clone(p.source),coordinateTransform:transform||{x:0,y:0,scale:1},frames:p.frames.map((_,i)=>{const f=resolve(p,i),pts={};for(const [k,q]of Object.entries(f.points))if(q)pts[k]={...q,u:q.x/p.source.width,v:q.y/p.source.height,...(transform?{outputX:(q.x-transform.x)*(transform.scaleX??transform.scale),outputY:(q.y-transform.y)*(transform.scaleY??transform.scale)}:{})};return {...f,raw:undefined,points:pts};}),bindings:clone(p.bindings),note:'Resolved coordinates for consumers. Edit/round-trip with project.json, not this derived document.'};}
function validate(p){const fail=s=>{throw Error('Project rejected: '+s);};if(!p||p.format!==FORMAT||![2,3,VERSION].includes(p.formatVersion))fail('unsupported project format/version');if(p.schema?.id!==SCHEMA.id||!(p.formatVersion<4?['1.0.0','1.1.0']:[SCHEMA.version]).includes(p.schema?.version))fail('unsupported universal schema version');const s=p.source;if(!s||![s.width,s.height].every(n=>Number.isInteger(n)&&n>0&&n<=8192)||s.width*s.height>16777216)fail('invalid dimensions');if(!Array.isArray(p.frames)||!p.frames.length||p.frames.length>3000)fail('frame count must be 1–3000');if(!p.edits||!p.processing||!Array.isArray(p.locks)||!Array.isArray(p.passes)||!p.propagation)fail('missing editable project data');if(!finite(p.propagation.radius)||p.propagation.radius<0||p.propagation.radius>300)fail('invalid propagation range');if(!['both','forward','backward'].includes(p.propagation.direction))fail('invalid propagation direction');if(!Number.isInteger(p.timeline?.in)||!Number.isInteger(p.timeline?.out)||p.timeline.in<0||p.timeline.out>=p.frames.length||p.timeline.in>p.timeline.out)fail('invalid trim');
 const checkPoint=q=>{if(q===null)return;if(!pointOK(q)||Math.abs(q.x)>s.width*20||Math.abs(q.y)>s.height*20||!SCHEMA.visibility.includes(q.visibility)||q.confidence!==null&&(!finite(q.confidence)||q.confidence<0||q.confidence>1))fail('invalid point');};let last=-1;for(let i=0;i<p.frames.length;i++){const f=p.frames[i];if(f.index!==i||!finite(f.time)||f.time<last||!finite(f.duration)||f.duration<=0||!f.points)fail('invalid frame index/timing');last=f.time;for(const q of Object.values(f.points))checkPoint(q);}for(const [i,pts]of Object.entries(p.edits)){if(!p.frames[+i]||String(+i)!==i)fail('invalid correction frame');for(const [k,v]of Object.entries(pts)){if(!ALL.includes(k))fail('unknown correction target');checkPoint(v.point);if(v.base&&!pointOK(v.base))fail('invalid propagation baseline');}}
 for(const l of p.locks){if(!Number.isInteger(l.start)||!Number.isInteger(l.end)||l.start<0||l.end<l.start||l.end>=p.frames.length||!Array.isArray(l.keys)||!l.snapshot)fail('invalid lock');for(const [i,pts]of Object.entries(l.snapshot)){if(+i<l.start||+i>l.end)fail('lock snapshot out of range');for(const q of Object.values(pts))checkPoint(q);}}
 const k=p.processing.key;if(!k||!/^#[a-f0-9]{6}$/i.test(k.color)||!finite(k.tolerance)||k.tolerance<0||k.tolerance>255||!finite(k.softness)||k.softness<0||k.softness>100||!finite(k.feather)||k.feather<0||k.feather>8)fail('invalid background settings');const bounded=(n,a,b)=>finite(n)&&n>=a&&n<=b,hex=v=>typeof v==='string'&&/^#[a-f0-9]{6}$/i.test(v);
 if(!['auto','rgb','chroma'].includes(k.mode)||!bounded(k.matteShift,-100,100)||!bounded(k.despill,0,100)||!bounded(k.alphaFloor,0,255)||!bounded(k.alphaCeiling,0,255))fail('invalid keyer controls');
 const color=p.processing.color;if(!color||!['brightness','contrast','saturation'].every(v=>bounded(color[v],-100,100))||!Array.isArray(color.replacements)||color.replacements.length>1000)fail('invalid color settings');for(const q of color.replacements)if(!hex(q.from)||!hex(q.to)||!bounded(q.tolerance,0,442))fail('invalid color replacement');
 const rect=q=>q&&['x','y','w','h'].every(v=>finite(q[v]))&&q.x>=0&&q.y>=0&&q.w>0&&q.h>0&&q.x+q.w<=s.width+1&&q.y+q.h<=s.height+1;
 for(const key of ['crop','subjectROI'])if(p.processing[key]&&!rect(p.processing[key]))fail('invalid '+key);if(!p.processing.faceGuides||typeof p.processing.faceGuides!=='object')fail('missing face guides');for(const [i,q]of Object.entries(p.processing.faceGuides))if(!p.frames[+i]||!rect(q.box)||q.head&&!pointOK(q.head))fail('invalid face guide');
 if(!p.output||!bounded(p.output.scale,.05,8)||!Number.isInteger(p.output.columns)||p.output.columns<1||p.output.columns>32)fail('invalid output configuration');if(!p.subject||typeof p.subject.id!=='string'||!Array.isArray(p.bindings))fail('invalid subject/bindings');
 if(!Array.isArray(p.processing.strokes)||p.processing.strokes.length>20000)fail('invalid strokes');for(const stroke of p.processing.strokes){if(!['keep','remove','paint'].includes(stroke.tool)||!Array.isArray(stroke.points)||stroke.points.length>100000||!bounded(stroke.size,.01,1000)||!bounded(stroke.hardness,0,1)||!bounded(stroke.opacity,0,1)||!hex(stroke.color)||!Array.isArray(stroke.range)||stroke.range.length!==2||!stroke.range.every(Number.isInteger)||stroke.range[0]<0||stroke.range[1]<stroke.range[0]||stroke.range[1]>=p.frames.length)fail('invalid brush stroke');for(const a of stroke.points)if(!Array.isArray(a)||a.length!==2||!a.every(finite)||Math.abs(a[0])>s.width*20||Math.abs(a[1])>s.height*20)fail('invalid stroke coordinates');}

 validateInteraction(p,fail);if(p.formatVersion===VERSION&&root.PrepReliability)root.PrepReliability.validateExtras(p);
 return true;}
function roundTrip(p){validate(p);const s=JSON.stringify(p),q=JSON.parse(s);validate(q);return {pass:s===JSON.stringify(q),frames:q.frames.length,manualPins:Object.values(q.edits).reduce((n,v)=>n+Object.keys(v).length,0),bytes:new TextEncoder().encode(s).length};}
const api={FORMAT,VERSION,GROUP_TREE,FACE_GROUPS,LANDMARK_SEMANTICS,hiddenState,visibilityAt,positionProtected,setVisibility,clearVisibility,migrateProject,faceContainerAt,containerCorners,containerBounds,transformFace,recordOperation,BODY,DERIVED,FACE,DENSE,ALL,BONES,REGION,LABEL,DETECTOR_MAP,SCHEMA,motionFraction,dependencyResolve,clone,clamp,finite,round,pointOK,dist,id,point,defaults,makeProject,derived,bodyObservation,faceObservation,resolve,pin,clearPin,accept,unlock,targets,protectedAt,lockValue,statusOf,commitPass,stabilize,continuity,resolvedDocument,validate,roundTrip};root.Universal=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
