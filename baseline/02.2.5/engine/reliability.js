/* Unified Prep 04 — pure evidence, correction, oval and review helpers.
 * These operate on the Universal record; they do not own a second skeleton. */
(function(root){'use strict';
const U=root.Universal||(typeof require==='function'?require('./universal.js'):null),{clone,pointOK,dist,point,clamp}=U;
const FACE_MAP={browL:'face.brow.right',browR:'face.brow.left',eyeL:'face.eye.right',eyeR:'face.eye.left',mouth:'face.lower'};
function faceMap(p){return Object.fromEntries(Object.entries(FACE_MAP).map(([k,v])=>[k,p.processing.mirrored?(v.endsWith('.left')?v.replace('.left','.right'):v.endsWith('.right')?v.replace('.right','.left'):v):v]));}
function anchors(p,points,{includeHidden=false}={}){const A={};for(const [k,v]of Object.entries(faceMap(p))){const q=points[v];if(pointOK(q)&&(includeHidden||!U.hiddenState(q.visibility)))A[k]=[q.x,q.y];}return A;}
function legacyBody(p,points){const joints={},score={};for(const [old,key0]of Object.entries(U.DETECTOR_MAP)){const key=p.processing.mirrored?(key0.endsWith('.left')?key0.replace('.left','.right'):key0.endsWith('.right')?key0.replace('.right','.left'):key0):key0;const q=points[key];if(pointOK(q)){joints[old]=[q.x,q.y];score[old]=U.hiddenState(q.visibility)?0:q.source==='manual'||q.accepted?1:q.confidence??.3;}else{joints[old]=[0,0];score[old]=0;}}return {joints,score};}
function pinPoints(p,i,points){const out={...points},existing=U.resolve(p,i).points;for(const k of U.ALL){if(U.protectedAt(p,i,k))out[k]=clone(existing[k]||null);const v=p.visibilityEdits?.[i]?.[k];if(v&&out[k])out[k]={...out[k],visibility:v.state,visibilitySource:'manual'};}return out;}
function poseVisibility(p,i){const map=faceMap(p),hidden={};for(const [k,v]of Object.entries(map))hidden[k]=U.hiddenState(U.visibilityAt(p,i,v));return hidden;}
function geometryFromAnchors(A){if(!A.eyeL||!A.eyeR)return null;const ed=Math.hypot(A.eyeR[0]-A.eyeL[0],A.eyeR[1]-A.eyeL[1]);if(ed<2)return null;const ex=(A.eyeL[0]+A.eyeR[0])/2,ey=(A.eyeL[1]+A.eyeR[1])/2,mo=A.mouth||[ex,ey+ed];return {cx:(ex+mo[0])/2,cy:(ey+mo[1])/2,w:ed*1.9,h:2*Math.max(Math.hypot(mo[0]-ex,mo[1]-ey)*1.05,ed*.9),angle:Math.atan2(A.eyeR[1]-A.eyeL[1],A.eyeR[0]-A.eyeL[0]),source:'anchors-estimate',shape:'oval'};}
function ovalAt(p,i){
 const own=p.processing.faceOvals?.[i];if(own)return {...clone(own),frame:i,inherited:false};
 const f=p.frames[i];if(f.faceOval)return {...clone(f.faceOval),frame:i,inherited:true};
 const points=U.resolve(p,i).points,head=points.head||points.nose;
 const near=Object.entries(p.processing.faceOvals||{}).map(([n,o])=>({n:+n,o})).filter(q=>Math.abs(q.n-i)<=Math.max(12,p.propagation.radius)).sort((a,b)=>Math.abs(a.n-i)-Math.abs(b.n-i))[0];
 if(near){const o=clone(near.o);if(pointOK(head)&&pointOK(o.headRef)){o.cx+=head.x-o.headRef.x;o.cy+=head.y-o.headRef.y;}return {...o,fromFrame:near.n,frame:i,inherited:true};}
 const old=p.processing.faceContainers?.[i];if(old)return {...clone(old),shape:'oval',source:'legacy-container',frame:i};
 const auto=geometryFromAnchors(anchors(p,points));if(auto)return {...auto,frame:i,headRef:clone(head)};
 return null;
}
function setOval(p,i,o){if(!o||!['cx','cy','w','h','angle'].every(k=>Number.isFinite(o[k]))||o.w<2||o.h<2)throw Error('Invalid oval.');p.processing.faceOvals=p.processing.faceOvals||{};p.processing.faceOvals[i]={cx:o.cx,cy:o.cy,w:o.w,h:o.h,angle:o.angle,shape:'oval',source:'manual',headRef:clone(U.resolve(p,i).points.head||null)};}
function transformOval(p,i,from,to,{follow=true,points=null}={}){
 let stats={moved:0,protected:0,missing:0};if(follow)stats=U.transformFace(p,i,U.REGION.face,from,to,{points:points||U.resolve(p,i).points,storeContainer:false});
 setOval(p,i,to);return stats;
}
function fitOval(p,i){const g=geometryFromAnchors(anchors(p,U.resolve(p,i).points));if(!g)throw Error('Place both eye anchors before fitting an oval.');setOval(p,i,g);return g;}
function seedFace(p,i,o){const c=Math.cos(o.angle),s=Math.sin(o.angle),layout={browL:[-.27,-.3],browR:[.27,-.3],eyeL:[-.27,-.13],eyeR:[.27,-.13],mouth:[0,.29]},map=faceMap(p);let count=0;for(const [key,[x,y]]of Object.entries(layout)){const k=map[key];if(U.protectedAt(p,i,k))continue;const dx=x*o.w,dy=y*o.h;U.pin(p,i,k,o.cx+dx*c-dy*s,o.cy+dx*s+dy*c,'unknown');p.edits[i][k].origin='face-layout';count++;}setOval(p,i,o);return count;}
function visibilityUntilNext(p,start,keys){let end=p.frames.length-1;for(let i=start+1;i<p.frames.length;i++)if(keys.some(k=>p.visibilityEdits?.[i]?.[k])){end=i-1;break;}return end;}
function pointInPolygon(q,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>q.y)!==(b.y>q.y)&&q.x<(b.x-a.x)*(q.y-a.y)/(b.y-a.y)+a.x)c=!c;}return c;}
function onSilhouette(q,image,r=2){if(!pointOK(q)||!image)return false;const {width:w,height:h,data}=image;let n=0,total=0;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const x=Math.round(q.x)+dx,y=Math.round(q.y)+dy;if(x<0||y<0||x>=w||y>=h)continue;total++;if(data[(y*w+x)*4+3]>96)n++;}return total>0&&n/total>=.28;}
function inferVisibility(p,i,points,{previous=null,clean=null,faceDetected=false,faceTrack=null,lostFace=0,patchEvidence={},counts={}}={}){
 const out=clone(points),evidence={},w=p.source.width,h=p.source.height,facing=p.frames[i].facing;
 const tor=['shoulder.left','shoulder.right','hip.right','hip.left'].map(k=>out[k]);const torsoOK=tor.every(pointOK);
 const mark=(k,state,reasons)=>{const q=out[k];if(!q)return;out[k]={...q,visibility:state,visibilitySource:'automatic-evidence',visibilityReason:reasons.join('; '),positionEvidence:U.hiddenState(state)?'retained estimate; not visibly observed':q.positionEvidence};evidence[k]={state,reasons,heuristic:true};};
 for(const [k,q]of Object.entries(out)){
  if(!pointOK(q)){if(k.startsWith('face.')&&facing==='BACK'&&!p.visibilityEdits?.[i]?.[k])evidence[k]={state:'occluded',reasons:['manually designated back-facing frame'],heuristic:true,position:null};continue;}if(U.protectedAt(p,i,k)||p.visibilityEdits?.[i]?.[k])continue;
  if(q.x<0||q.y<0||q.x>=w||q.y>=h){mark(k,'out_of_frame',['coordinate outside source bounds']);continue;}
  const confidence=q.confidence??0,weak=confidence<.38,prev=previous?.[k];
  if(k.startsWith('face.')){
   if(facing==='BACK'||facing==='BACK_THREEQ'&&!faceDetected){mark(k,'occluded',['frame orientation is back-facing','no corroborating frontal face evidence']);continue;}
   const legacy=Object.keys(faceMap(p)).find(x=>faceMap(p)[x]===k),poseHidden=legacy&&faceTrack?.hidden?.[legacy];
   if(poseHidden){mark(k,'occluded',['learned reference pose hides this facial anchor','structured face fit']);continue;}
   // Bounded model support: do not keep a brow alive forever on the scalp.
   if(!faceDetected&&lostFace>8){out[k]={...q,visibility:'unknown',suppressOverlay:true,visibilityReason:'Face evidence expired; reacquire a visible face or add a reference.',confidence:Math.min(confidence,.15)};continue;}
  }
  if(/^(elbow|wrist|knee|ankle)\./.test(k)){
   const covered=torsoOK&&pointInPolygon(q,tor),mate=out[k.endsWith('left')?k.replace('.left','.right'):k.replace('.right','.left')];
   const merged=pointOK(mate)&&dist(q,mate)<Math.max(4,h*.018);
   const patchLost=!patchEvidence[k]||patchEvidence[k].score<.65;
   const votes=weak&&patchLost&&(covered||merged)?(counts[k]||0)+1:0;counts[k]=votes;
   if(votes>=2||prev?.visibility==='occluded'&&weak&&patchLost&&(covered||merged))mark(k,'occluded',[covered?'projected limb lies inside torso':'left/right projected nodes merge','weak joint evidence','no confirming reference patch','temporal persistence']);
   else if(prev?.visibility==='occluded'&&!(confidence>=.65&&(!covered&&!merged||patchEvidence[k]?.score>=.8)))mark(k,'unknown',['previously occluded; visible identity not yet reacquired']);
  }
  if(!k.startsWith('face.')&&weak&&clean&&!onSilhouette(q,clean))mark(k,'unknown',['weak observation outside cleaned silhouette']);
 }
 for(const side of ['left','right'])for(const [child,parent]of [['hand.','wrist.'],['toe.','ankle.']])if(out[child+side]&&!U.protectedAt(p,i,child+side)&&U.hiddenState(out[parent+side]?.visibility))mark(child+side,out[parent+side].visibility,['inherits hidden parent '+parent+side]);
 return {points:pinPoints(p,i,out),evidence,counts};
}
function assessment(p,i,points,clean=null,previous=null){
 const channel=keys=>{let visible=0,uncertain=0,hidden=0,missing=0,off=0,jumps=0;for(const k of keys){const q=points[k];if(!pointOK(q)){if(U.hiddenState(U.visibilityAt(p,i,k)))hidden++;else missing++;continue;}if(U.hiddenState(q.visibility)){hidden++;continue;}if(q.visibility==='visible'&&(q.confidence===null||q.confidence>=.3))visible++;else uncertain++;if(clean&&!onSilhouette(q,clean))off++;if(pointOK(previous?.[k])&&dist(q,previous[k])>p.source.height*.18)jumps++;}return {visible,uncertain,hidden,missing,offSilhouette:off,largeJumps:jumps};};
 const body=channel(U.BODY.filter(k=>!k.startsWith('eye.')&&!k.startsWith('ear.'))),face=channel(U.FACE);
 body.state=body.visible>=8&&body.offSilhouette<3&&body.largeJumps===0?'observed':body.visible?'review':'unavailable';
 face.state=face.hidden>=3?'occluded':face.visible>=3?'observed':face.missing===5?'unavailable':'review';
 return {body,face,requiresReview:body.state!=='observed'||face.state==='review',note:'Heuristic evidence checks, not a calibrated accuracy score.'};
}
function evidenceScore(q){if(!pointOK(q))return -1;if(q.source==='manual'||q.accepted)return 2;if(U.hiddenState(q.visibility))return .2;if(q.suppressOverlay)return -.3;return (q.confidence??.1)+(q.visibility==='visible'?.1:0)-(q.source==='estimated'?.15:0);}
function compare(p,proposals,keys){
 const rows=[],total={new:0,improved:0,worse:0,uncertain:0,unchanged:0,protected:0};
 for(const prop of proposals){const before=U.resolve(p,prop.index).points;const counts={new:0,improved:0,worse:0,uncertain:0,unchanged:0,protected:0};let maxDisplacement=0;const details=[];
  for(const k of keys){if(U.protectedAt(p,prop.index,k)){counts.protected++;continue;}const a=before[k],b=prop.points[k];let category='unchanged',delta=pointOK(a)&&pointOK(b)?dist(a,b):null;
   if(delta!==null)maxDisplacement=Math.max(maxDisplacement,delta);
   if(!pointOK(a)&&pointOK(b))category='new';else if(pointOK(a)&&!pointOK(b))category='worse';else if(pointOK(a)&&pointOK(b)){
    const scoreDelta=evidenceScore(b)-evidenceScore(a);
    if(b.support?.onSilhouette===false&&!U.hiddenState(b.visibility)||b.support?.largeJump)category='worse';
    else if(delta<.01&&a.visibility===b.visibility)category='unchanged';
    else if(b.visibility!==a.visibility||delta>p.source.height*.12)category='uncertain';
    else if(scoreDelta>.08&&!b.suppressOverlay)category='improved';else if(scoreDelta<-.08)category='worse';else category='uncertain';
   }
   counts[category]++;details.push({key:k,category,displacement:delta===null?null:U.round(delta),beforeEvidence:evidenceScore(a),candidateEvidence:evidenceScore(b)});
  }
  for(const k of Object.keys(total))total[k]+=counts[k];rows.push({index:prop.index,counts,maxDisplacement:U.round(maxDisplacement),quality:prop.quality,details});
 }
 return {total,rows,warning:'Evidence improved does not prove anatomical accuracy. Inspect changes before applying.'};
}
function applyReview(p,pending,policy='supported'){
 if(!['supported','all'].includes(policy))throw Error('Unknown review policy.');
 const comparison=compare(p,pending.proposals,pending.config.keys),rows=new Map(comparison.rows.map(r=>[r.index,r]));let kept=0;
 const proposals=pending.proposals.map(prop=>{const q=clone(prop),details=rows.get(q.index).details;
  for(const d of details)if(policy==='supported'&&['worse','uncertain'].includes(d.category)){delete q.points[d.key];kept++;}
  // Keep face metadata aligned with retained face coordinates under conservative acceptance.
  if(policy==='supported'&&details.some(d=>d.key.startsWith('face.')&&['worse','uncertain'].includes(d.category))){delete q.face;delete q.faceOval;}
  return q;
 });
 if(pending.motion)for(const [i,m]of Object.entries(pending.motion))p.frames[+i].motion=clone(m);
 const stats=U.commitPass(p,proposals,{...pending.config,reviewDecision:{policy,keptPrior:kept,comparison:comparison.total},comparison:comparison.rows.map(({index,counts,maxDisplacement,quality})=>({index,counts,maxDisplacement,quality}))});
 // Derived values are authoritative only after all corrected parents have been resolved.
 for(const prop of proposals){const f=p.frames[prop.index],r=U.resolve(p,prop.index);f.quality=assessment(p,prop.index,r.points);f.state=f.quality.body.state==='observed'?'tracked':f.quality.body.state==='unavailable'?'unreliable':'review';}
 U.recordOperation(p,'review-pass',{passId:pending.config.id,policy,keptPrior:kept,comparison:comparison.total});delete p.pendingReview;return {...stats,keptPrior:kept};
}
function outwardOrder(start,end,reference,stride=1){const r=clamp(Math.round(reference),start,end),all=new Set([r,start,end]);for(let i=start;i<=end;i+=stride)all.add(i);return [...all].filter(i=>i>=r).sort((a,b)=>a-b).concat([...all].filter(i=>i<r).sort((a,b)=>b-a));}
function validateExtras(p){
 const fail=s=>{throw Error('Project rejected: '+s);};
 for(const [i,o]of Object.entries(p.processing.faceOvals||{}))if(!p.frames[+i]||!['cx','cy','w','h','angle'].every(k=>Number.isFinite(o[k]))||o.w<2||o.h<2||o.w>p.source.width*20||o.h>p.source.height*20)fail('invalid oval');
 const refs=p.processing.faceReferences||[];if(!Array.isArray(refs)||refs.some(r=>!Number.isInteger(r.index)||!p.frames[r.index]))fail('invalid face references');
 if(p.referenceFrame!=null&&(!Number.isInteger(p.referenceFrame)||!p.frames[p.referenceFrame]))fail('invalid reference frame');
 if(p.pendingReview){const r=p.pendingReview;if(!Array.isArray(r.proposals)||r.proposals.length>3000||!r.config||!Array.isArray(r.config.keys)||r.config.keys.some(k=>!U.ALL.includes(k)))fail('invalid pending review');for(const prop of r.proposals){if(!p.frames[prop.index]||!prop.points)fail('invalid pending frame');for(const [k,q]of Object.entries(prop.points))if(!U.ALL.includes(k)||q!==null&&(!pointOK(q)||!U.SCHEMA.visibility.includes(q.visibility)))fail('invalid pending point');}}
 return true;
}
const api={faceMap,anchors,legacyBody,pinPoints,poseVisibility,geometryFromAnchors,ovalAt,setOval,transformOval,fitOval,seedFace,visibilityUntilNext,onSilhouette,inferVisibility,assessment,evidenceScore,compare,applyReview,outwardOrder,validateExtras};
root.PrepReliability=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
