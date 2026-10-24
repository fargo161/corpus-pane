/* Reference-based solvers contribute proposals to ONE universal skeleton.
 * Nothing is committed until the user reviews a batch. No remote requests. */
(function(root){'use strict';
const U=root.Universal,R=root.PrepReliability,FK=root.FaceKit,BK=root.BodyKit,PX=root.PrepPixels,M=root.PrepMedia;
const {clone,pointOK,dist,point}=U;
const tick=()=>new Promise(r=>setTimeout(r,0));
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
function cancelled(options){if(options.cancel?.())throw new Error('Tracking canceled. Existing observations and corrections were not replaced.');}
async function measureSource(p,media,{cancel=()=>false,progress=()=>{},force=false}={}){
 if(!force&&p.frames.every(f=>f.motion?.sourceSHA256===p.source.sha256&&Number.isFinite(f.motion.phase)))return Object.fromEntries(p.frames.map(f=>[f.index,clone(f.motion)]));
 const result={};let previous=null,phase=0,prevHash=null;
 for(let i=0;i<p.frames.length;i++){
  cancelled({cancel});const raw=await media.read(i),g=PX.gray(raw,96),hash=await M.sha(new Uint8Array(raw.data.buffer,raw.data.byteOffset,raw.data.byteLength));
  let delta=0;if(previous&&hash!==prevHash){for(let j=0;j<g.data.length;j++)delta+=Math.abs(g.data[j]-previous.data[j]);delta/=g.data.length;}
  phase+=delta;result[i]={sourceSHA256:p.source.sha256,pixelSHA256:hash,phase:U.round(phase,7),delta:U.round(delta,7),sameAsPrevious:i>0&&hash===prevHash,method:'cumulative low-resolution image difference; repeated decoded pixels share a phase'};
  previous=g;prevHash=hash;progress(i+1,p.frames.length);if(i%4===0)await tick();
 }
 return result;
}
function context(image,raw){const w=image.width,h=image.height,alpha=new Uint8Array(w*h),kind=new Uint8Array(w*h);for(let i=0;i<alpha.length;i++)alpha[i]=image.data[i*4+3];return {w,h,alpha,kind,grey:FK.grey(raw.data,w,h)};}
function rawBodyFromFollower(p,res,base,passId){
 const adjusted={joints:{...(base?.joints||{})},score:{...(base?.score||{})}};
 for(const [k,v]of Object.entries(res.joints||{})){adjusted.joints[k]=v;adjusted.score[k]=res.conf?.[k]??adjusted.score[k]??0;}
 const points=U.bodyObservation(adjusted,p.source.width,p.source.height,passId,p.processing.mirrored);
 for(const [old,key0]of Object.entries(U.DETECTOR_MAP)){let key=key0;if(p.processing.mirrored)key=key0.endsWith('.left')?key0.replace('.left','.right'):key0.endsWith('.right')?key0.replace('.right','.left'):key0;
  if(points[key]&&res.fixed?.includes(old)){points[key].source='anatomical-follower';points[key].visibility='unknown';}
  if(points[key]&&['kept','followed'].includes(res.used?.[old])){points[key].source='reference-follow';points[key].visibility='unknown';}
  if(points[key]&&base?.joints?.[old]&&(base.score?.[old]||0)>=.5&&Math.hypot(points[key].x-base.joints[old][0],points[key].y-base.joints[old][1])<Math.max(3,p.source.height*.008)){points[key].visibility='visible';points[key].source='detector+reference-agreement';points[key].confidence=Math.max(points[key].confidence||0,base.score[old]);}
 }
 return points;
}
function faceRegion(p,i,points,bounds){
 const oval=R.ovalAt(p,i);if(oval){const b=U.containerBounds(oval),pad=Math.max(b.w,b.h)*.35;return clampROI(p,{x:b.x-pad,y:b.y-pad,w:b.w+pad*2,h:b.h+pad*2});}
 const g=p.processing.faceGuides?.[i];if(g?.box)return clampROI(p,g.box);
 const n=points.nose||points.head,sh=pointOK(points['shoulder.left'])&&pointOK(points['shoulder.right'])?dist(points['shoulder.left'],points['shoulder.right']):0;
 const size=U.clamp(Math.max(sh*.9,(bounds?.h||p.source.height)*.14,30),30,p.source.height*.35),cx=n?.x??(bounds?bounds.x+bounds.w/2:p.source.width/2),cy=n?.y??(bounds?bounds.y+size*.5:p.source.height*.15);
 return clampROI(p,{x:cx-size*.7,y:cy-size*.75,w:size*1.4,h:size*1.6});
}
function clampROI(p,b){const x=U.clamp(b.x,0,p.source.width-1),y=U.clamp(b.y,0,p.source.height-1);return {x,y,w:Math.min(p.source.width-x,Math.max(24,b.w)),h:Math.min(p.source.height-y,Math.max(24,b.h))};}
async function detectFace(p,i,points,bounds,source,clean){
 if(p.frames[i].facing==='BACK')return null;
 const roi=faceRegion(p,i,points,bounds),attempts=[];let best=null;
 const attempt=async(c,b,name)=>{const f=await FK.detect(c,b);attempts.push({method:name,score:f?.score||0,region:b});if(f&&(!best||f.score>best.score)){best=f;best.inputMethod=name;}};
 await attempt(clean,roi,'clean foreground + oval/head search');
 if(!best||best.score<.55)await attempt(clean,clampROI(p,{x:roi.x-roi.w*.25,y:roi.y-roi.h*.25,w:roi.w*1.5,h:roi.h*1.5}),'expanded clean head search');
 if((!best||best.score<.3)&&p.processing.key.enabled)await attempt(source,roi,'original-pixel fallback');
 if(best)best.attempts=attempts;return best&&best.score>=.3?best:null;
}
function validFace(f,points,p){
 if(!f||!FK.shapeOK(f.anchors).ok)return false;
 const values=Object.values(f.anchors||{});if(values.some(a=>!a||!a.every(Number.isFinite)))return false;
 const nose=points.nose,center=f.nose||f.anchors.mouth;
 if(pointOK(nose)&&nose.confidence>.45&&center&&Math.hypot(nose.x-center[0],nose.y-center[1])>p.source.height*.15)return false;
 return values.length>=4;
}
async function referencePoses(p,media,indices,options){
 const poses=[];
 for(const i of indices){cancelled(options);const pts=U.resolve(p,i).points,A=R.anchors(p,pts,{includeHidden:true});if(!A.eyeL||!A.eyeR||!A.mouth)continue;
  const raw=await media.read(i);poses.push({id:'reference-'+i,index:i,anchors:A,hidden:R.poseVisibility(p,i),tag:p.frames[i].facing||'reference',label:'Frame '+(i+1),G:FK.grey(raw.data,raw.width,raw.height),w:raw.width,h:raw.height});
 }
 return poses;
}
function transformTrackedOval(reference,oldA,newA){
 const keys=FK.NAMES.filter(k=>oldA[k]&&newA[k]);if(keys.length<2)return null;
 const t=FK.fitSim(keys.map(k=>oldA[k]),keys.map(k=>newA[k]),keys.map(()=>1));if(!t||!Number.isFinite(t.scale)||t.scale<.3||t.scale>3)return null;
 const center=FK.apply(t,[reference.cx,reference.cy]);return {...clone(reference),cx:center[0],cy:center[1],w:reference.w*t.scale,h:reference.h*t.scale,angle:reference.angle+t.roll,source:'structured-face-follow',shape:'oval'};
}
async function collect(p,media,options){
 const {keys,start=0,end=p.frames.length-1,reference=p.referenceFrame??start,stride=1,careful=true,batchSize=12,stopOnUncertain=true}=options;
 const bodyWanted=keys.some(k=>!k.startsWith('face.')),faceWanted=keys.some(k=>k.startsWith('face.'));
 if((!options.detectBody&&bodyWanted||!options.detectFace&&faceWanted)&&!await BK.ready())throw Error('Bundled body model failed to initialize.');
 if(!options.detectFace&&faceWanted&&!await FK.ready())throw Error('Bundled face model failed to initialize.');
 const config={id:U.id('pass'),label:options.label||'Reference-based refinement',kind:options.targeted?'regional-refinement':'whole-character',keys:keys.slice(),start,end,reference,startedAt:new Date().toISOString(),schemaVersion:p.schema.version,method:{body:'MoveNet + reference follower + silhouette/limb checks (no skin classifier)',face:'original FaceKit Tracker/PoseModel + detector reacquisition; five controls + shared nose',visibility:'pose-reference and multi-cue temporal hypotheses, manually overrideable',corrections:'absolute brackets + learned image references',sourceSHA256:p.source.sha256,coverageStride:stride}};
 const motion=await measureSource(p,media,{cancel:options.cancel,progress:(i,n)=>options.progress?.(i,n,'Analyzing source motion')});
 const scratch=clone(p);delete scratch.pendingReview;for(const [i,m]of Object.entries(motion))scratch.frames[+i].motion=m;
 const initial=options.queue||R.outwardOrder(start,end,reference,stride);
 // Every manual reference must be visited, including when sampling.
 const order=options.queue?initial:[...new Set([...initial,...Object.keys(p.edits).map(Number).filter(i=>i>=start&&i<=end)])].sort((a,b)=>a>=reference&&b<reference?-1:a<reference&&b>=reference?1:a>=reference?a-b:b-a);
 const refs=[...new Set([reference,...(p.processing.faceReferences||[]).map(r=>r.index),...Object.keys(p.edits).map(Number).filter(i=>Object.keys(p.edits[i]).some(k=>k.startsWith('face.')))])].filter(i=>i>=0&&i<p.frames.length).slice(0,24);
 const poses=faceWanted?await referencePoses(p,media,refs,options):[];
 const w=p.source.width,h=p.source.height,dc=canvas(w,h),fc=canvas(w,h),dg=dc.getContext('2d',{willReadFrequently:true}),fg=fc.getContext('2d',{willReadFrequently:true});
 let follower=null,tracker=null,previous=null,prevGray=null,prevIndex=null,faceLost=0,referenceOval=null,referenceAnchors=null,counts={},uncertainStreak=0;
 const proposals=[],byIndex=new Map();
 function initializeFace(G,A,hidden={},index){
  if(!A.eyeL||!A.eyeR||!A.mouth)return;
  const vis=Object.fromEntries(FK.NAMES.map(k=>[k,!!A[k]&&!hidden[k]]));
  tracker=new FK.Tracker(G,w,h,A,vis,{poses:poses.filter(x=>x.index!==index),stiff:'normal'});tracker.accept(A);
  referenceAnchors=clone(A);referenceOval=R.ovalAt(scratch,index)||R.geometryFromAnchors(A);faceLost=0;
 }
 async function seedNeighbor(index){
  if(index<start||index>end)return;
  const proposal=byIndex.get(index),base=U.resolve(scratch,index).points,pts=R.pinPoints(scratch,index,proposal?{...base,...proposal.points}:base);
  if(Object.values(pts).filter(pointOK).length<5)return;
  const raw=await media.read(index),clean=PX.process(raw,scratch,index,{color:false}),ctx=context(clean.image,raw),j=R.legacyBody(p,pts);
  if(bodyWanted&&Object.values(j.score).filter(x=>x>=.25).length>=6){follower=new BK.Follower(j.joints);follower.accept(j.joints);follower.pin(j.joints,ctx,Object.fromEntries(Object.keys(j.score).map(k=>[k,j.score[k]<.25])));}
  const A=R.anchors(p,pts,{includeHidden:true});if(faceWanted&&A.eyeL&&A.eyeR&&A.mouth)initializeFace(ctx.grey,A,R.poseVisibility(p,index),index);
  previous=clone(pts);prevIndex=index;prevGray=PX.gray(raw);
 }
 if(options.queue?.length){const first=order[0],dir=order.length>1?Math.sign(order[1]-first):(first>=reference?1:-1);await seedNeighbor(first-dir);}
 for(let at=0;at<order.length;at++){
  cancelled(options);const i=order[at],raw=await media.read(i),clean=PX.process(raw,scratch,i,{color:false}),ctx=context(clean.image,raw),G=ctx.grey,gray=PX.gray(raw),existing=U.resolve(scratch,i).points;
  if(prevIndex!==null&&Math.abs(i-prevIndex)!==1){follower=null;tracker=null;previous=null;prevGray=null;counts={};faceLost=0;}
  if(i===reference-1&&byIndex.has(reference)&&!previous)await seedNeighbor(reference);
  const box=p.processing.subjectROI||clean.bounds||{x:0,y:0,w,h};dg.putImageData(raw,0,0);fg.putImageData(clean.image,0,0);
  let body=null,face=null,structured=null,points=clone(existing),review=[],patchEvidence={};
  const identical=prevIndex!==null&&motion[i].pixelSHA256===motion[prevIndex].pixelSHA256&&!Object.keys(p.edits[i]||{}).length;
  if(identical&&previous){points=clone(previous);for(const q of Object.values(points))if(q){q.passId=config.id;if(q.source==='manual'||q.accepted){q.source='same-image-reference';q.confidence=.55;q.visibility=U.hiddenState(q.visibility)?q.visibility:'unknown';delete q.locked;delete q.accepted;}q.positionEvidence='unchanged decoded source image';}face=byIndex.get(prevIndex)?.raw?.detectorFace||null;}
  else{
   if(bodyWanted){
    body=options.detectBody?await options.detectBody(i,dc,box):careful?await BK.detect(dc,box):await BK.detectFast(dc,box);
    let obs=U.bodyObservation(body,w,h,config.id,p.processing.mirrored);
    const seeded=R.pinPoints(scratch,i,{...obs});
    if(!follower){const J=R.legacyBody(p,seeded);if(Object.values(J.score).filter(c=>c>=.25).length>=6){follower=new BK.Follower(J.joints);follower.accept(J.joints);follower.pin(J.joints,ctx,Object.fromEntries(Object.keys(J.score).map(k=>[k,J.score[k]<.25])));}}
    if(follower&&body){
     let res=follower.step(body);res=follower.refine(res,ctx);res=follower.arms(res,ctx);res=follower.legs(res,ctx);
     points=rawBodyFromFollower(p,res,body,config.id);review.push(...(res.notes||[]).map(n=>'Tracker: '+n));
     // All raw detections remain recorded. Corrected reference positions win at the end.
     for(const [old,q]of Object.entries(follower.fol||{})){let k=U.DETECTOR_MAP[old];if(!k)continue;if(p.processing.mirrored)k=k.endsWith('.left')?k.replace('.left','.right'):k.endsWith('.right')?k.replace('.right','.left'):k;patchEvidence[k]={score:q.ncc};}
    }else points=obs;
   }
   // Targeted passes use the rest of the accepted skeleton as context, never fresh guesses.
   for(const k of U.ALL)if(!keys.includes(k))points[k]=clone(existing[k]||null);
   points=R.pinPoints(scratch,i,points);
   if(faceWanted){
    const corrected=A=>Object.values(A).filter(Boolean).length>=3;
    const local=R.anchors(p,existing,{includeHidden:true}),hasFacePin=Object.keys(p.edits[i]||{}).some(k=>k.startsWith('face.'));
    if(!tracker&&corrected(local)&&(hasFacePin||refs.includes(i)||U.FACE.filter(k=>(existing[k]?.confidence||0)>=.5).length>=3))initializeFace(G,local,R.poseVisibility(p,i),i);
    if(tracker&&previous&&p.frames[i].facing!=='BACK')structured=tracker.track(G,w,h);
    face=p.frames[i].facing==='BACK'?null:options.detectFace?await options.detectFace(i,fc,box):await detectFace(p,i,points,box,dc,fc);
    if(!validFace(face,points,p))face=null;
    const verifiedReference=hasFacePin&&corrected(local);
    if(face||verifiedReference)faceLost=0;else faceLost++;
    let facePoints=U.faceObservation(face,config.id,p.processing.mirrored),chosenA=face?.anchors||null;
    if(structured){
     const hidden=new Set(structured.hidden||[]),good=structured.confidence>=.48&&structured.identity>=.4&&!structured.shape&&faceLost<=8;
     if(good){
      const map=R.faceMap(p);
      for(const [old,k]of Object.entries(map)){
       const a=structured.anchors[old],c=structured.conf?.[old]??0,det=facePoints[k];
       if(!a)continue;
       if(hidden.has(old)){facePoints[k]=point(a[0],a[1],0,'structured-face','occluded',config.id);continue;}
       // Require agreement for visible claims. A short lost-face span stays explicitly uncertain.
       if(!det||face.score<.5&&c>.65){facePoints[k]=point(a[0],a[1],Math.min(.8,c),'structured-face',face&&c>.6?'visible':'unknown',config.id);}
      }
      chosenA=R.anchors(p,facePoints,{includeHidden:true});
     }
    }
    if(!face&&faceLost>8){for(const k of U.REGION.face){facePoints[k]=null;}tracker=null;review.push('Face: evidence expired; reacquire or place a reference. No scalp patches accepted as brows.');}
    Object.assign(points,facePoints);points=R.pinPoints(scratch,i,points);
    chosenA=R.anchors(p,points,{includeHidden:true});
    if(face&&!tracker)initializeFace(G,chosenA,{},i);
    if(tracker&&Object.keys(chosenA).length>=3){
     tracker.accept(chosenA,structured&&faceLost?structured:null);
     const visible=FK.NAMES.filter(k=>!R.poseVisibility(p,i)[k]&&chosenA[k]&&(!structured||!(structured.hidden||[]).includes(k)));
     if(hasFacePin){tracker.relearn(G,w,h,chosenA,visible,'manual-'+i);}
     else if(face?.score>=.7||structured?.confidence>=.75&&structured.identity>.6)tracker.relearn(G,w,h,chosenA,visible,false);
    }
    // Shared nose, not a second facial skeleton; a region pass may only update it when selected.
    if(keys.includes('nose')&&!U.protectedAt(p,i,'nose')&&(face?.score>=.55||verifiedReference)){
     const A=R.anchors(p,points),n=face?.nose||(A.eyeL&&A.eyeR&&A.mouth?[(A.eyeL[0]+A.eyeR[0])*.225+A.mouth[0]*.55,(A.eyeL[1]+A.eyeR[1])*.225+A.mouth[1]*.55]:null);
     if(n)points.nose=point(n[0],n[1],face?.score??.5,face?'face-supported-nose':'face-reference-nose',face?'visible':'unknown',config.id);
    }
   }
   // Bidirectionally checked local image evidence for body pins; never independent face patches.
   if(previous&&prevGray&&options.referenceAssist!==false){
    for(const k of keys){if(k.startsWith('face.')||U.DERIVED.includes(k)||U.protectedAt(p,i,k))continue;const from=previous[k],cur=points[k];if(!pointOK(from)||U.hiddenState(from.visibility)||from.suppressOverlay)continue;
     const manualSource=from.source==='manual'||from.source==='reference-follow'||U.positionProtected(p,prevIndex,k);if(!manualSource&&(cur?.confidence||0)>.65)continue;
     const match=PX.match(prevGray,gray,from,pointOK(cur)&&dist(from,cur)<h*.09?cur:from);
     if(match&&R.onSilhouette(match,clean.image)&&(!pointOK(cur)||dist(match,cur)<h*.14)){const agree=pointOK(cur)&&cur.visibility==='visible'&&(cur.confidence||0)>=.5&&dist(match,cur)<Math.max(3,h*.008);points[k]=point(match.x,match.y,Math.min(.85,match.score*.85),agree?'detector+reference-agreement':'reference-follow',agree?'visible':'unknown',config.id);patchEvidence[k]=match;}
    }
   }
  }
  points=R.pinPoints(scratch,i,points);
  const hiddenMap=structured&&structured.confidence>=.48&&structured.identity>=.4&&!structured.shape?Object.fromEntries((structured.hidden||[]).map(k=>[k,true])):{};
  const vis=R.inferVisibility(scratch,i,points,{previous,clean:clean.image,faceDetected:!!face,faceTrack:{hidden:hiddenMap},lostFace:faceLost,patchEvidence,counts});counts=vis.counts;points=vis.points;
  // Recompute dependencies after constraints, pins and visibility, then only propose requested keys.
  points=U.dependencyResolve(points,scratch,i);points=R.pinPoints(scratch,i,points);
  scratch.frames[i].visibilityEvidence=vis.evidence;const quality=R.assessment(scratch,i,points,clean.image,previous);for(const [k,q]of Object.entries(points)){if(!pointOK(q)||U.protectedAt(p,i,k))continue;q.support={onSilhouette:R.onSilhouette(q,clean.image),largeJump:pointOK(previous?.[k])&&dist(q,previous[k])>h*.18};}
  let oval=R.ovalAt(scratch,i);const A=R.anchors(p,points);if(referenceOval&&referenceAnchors&&Object.keys(A).length>=3)oval=transformTrackedOval(referenceOval,referenceAnchors,A)||oval;
  if(p.processing.faceOvals?.[i]){oval=clone(p.processing.faceOvals[i]);referenceOval=clone(oval);referenceAnchors=clone(A);}
  const metadata=face?{box:face.box,score:face.score,rollRadians:face.roll,yawProxy:face.yaw,pitchProxy:face.pitch,inputMethod:face.inputMethod,structured:structured?{confidence:structured.confidence,identity:structured.identity,hidden:structured.hidden,outliers:structured.outliers,pose:structured.pose}:null}:structured?{score:structured.confidence,structured:{identity:structured.identity,hidden:structured.hidden,pose:structured.pose},lostDetectorFrames:faceLost}:null;
  const prop={index:i,points:Object.fromEntries(keys.map(k=>[k,clone(points[k]||null)])),bounds:clean.bounds,face:metadata,faceOval:oval,quality,visibilityEvidence:vis.evidence,review:[...new Set(review)],motion:motion[i],raw:{body:body?{joints:body.joints,score:body.score,agree:body.agree}:null,detectorFace:face?{anchors:face.anchors,nose:face.nose,box:face.box,score:face.score,landmarks:face.landmarks,inputMethod:face.inputMethod}:null,faceSolver:structured?{confidence:structured.confidence,identity:structured.identity,hidden:structured.hidden,outliers:structured.outliers}:null}};
  proposals.push(prop);byIndex.set(i,prop);previous=clone(points);prevGray=gray;prevIndex=i;
  if(follower){const j=R.legacyBody(p,points);follower.accept(j.joints);if(Object.keys(p.edits[i]||{}).some(k=>!k.startsWith('face.')))follower.pin(j.joints,ctx,Object.fromEntries(Object.keys(j.score).map(k=>[k,j.score[k]===0])));else follower.learnPatches(j.joints,ctx);}
  options.preview?.(prop,raw);options.progress?.(at+1,order.length,'Frame '+(i+1)+' · body '+quality.body.state+' / face '+quality.face.state);await tick();
  const severe=(bodyWanted&&(quality.body.visible<5||quality.body.offSilhouette>=4||quality.body.largeJumps>=3))||(faceWanted&&faceLost>8&&quality.face.state!=='occluded');uncertainStreak=severe?uncertainStreak+1:0;
  if((batchSize>0&&proposals.length>=batchSize)||(stopOnUncertain&&uncertainStreak>=2)){
   return {config:{...config,stopReason:uncertainStreak>=2?'uncertain-evidence':'review-batch'},proposals,motion,remaining:order.slice(at+1),options:{...options,detectBody:undefined,detectFace:undefined,cancel:undefined,preview:undefined,progress:undefined,queue:undefined},comparison:R.compare(scratch,proposals,keys)};
  }
 }
 return {config:{...config,stopReason:'range-complete'},proposals,motion,remaining:[],options:{...options,detectBody:undefined,detectFace:undefined,cancel:undefined,preview:undefined,progress:undefined,queue:undefined},comparison:R.compare(scratch,proposals,keys)};
}
root.PrepTracking={measureSource,collect,context,faceRegion,validFace,transformTrackedOval};
})(window);
