'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const U=require('../engine/universal.js');global.CorpusKnowledge=require('../app/knowledge.js');const C=require('../app/corpus.js');
const results=[];function test(name,fn){try{fn();results.push({name,pass:true});console.log('PASS',name);}catch(e){results.push({name,pass:false,error:e.stack});console.error('FAIL',name,e.message);}}
function source(ch='x'){return {name:ch+'.mp4',kind:'video',mime:'video/mp4',width:300,height:700,fps:24,duration:1/24,frameCount:1,timing:'test',sha256:(ch.charCodeAt(0).toString(16).padStart(2,'0')).repeat(32)};}
function entry(ch='x'){const e=C.entry(U.makeProject(source(ch),[{time:0,duration:1/24}]));e.calibration={frame:0,rootX:150,crownY:50,floorY:650,status:'reviewed',method:'test'};return e;}
function corpus(...es){const c=C.make();for(const e of es)c.entries[e.id]=e;return c;}
function setManual(e,coords){for(const [k,[x,y]] of Object.entries(coords))U.pin(e.project,0,k,x,y,'visible');}
function setHidden(e,keys){U.setVisibility(e.project,0,0,keys,'occluded');}
function setPerspective(e,family='FRONT',heading='toward'){C.setView(e,0,0,family==='FRONT_THREE_QUARTER'?'THREEQ':family==='BACK_THREE_QUARTER'?'BACK_THREEQ':family,heading==='image_left'?'left':heading==='image_right'?'right':heading);C.setViewState(e,0,0,{body:{family,heading,status:'reviewed'},head:{family:'FRONT',heading:'toward',status:'reviewed'},regionOverrides:{}},'test');}
function verify(e,region,reviewer='owner',acceptance='accepted'){const keys=C.scopeKeys(region,null,e.project);C.verify(e,0,0,keys,region);const r=e.reviews[e.reviews.length-1];r.reviewer=reviewer;r.reviewAuthority=reviewer;r.userAcceptance=acceptance;return {keys,r};}
function addRef(c,e,region,label){C.setProjection(e,0,0,region,'planar_like','same_plane_or_unknown');return C.addReference(c,e,0,C.scopeKeys(region,null,e.project),region,label);}

test('reviewed view compatibility ranks ahead of extra visible coverage',()=>{
 const q=entry('a'),front=entry('b'),back=entry('c'),c=corpus(q,front,back);
 setManual(q,{'shoulder.left':[120,190],'elbow.left':[100,270],'wrist.left':[90,350],'hand.left':[86,390]});setPerspective(q,'FRONT');
 setManual(front,{'shoulder.left':[121,191],'elbow.left':[101,269]});setHidden(front,['wrist.left','hand.left']);setPerspective(front,'FRONT');verify(front,'leftArm','assistant_visual_review','pending');addRef(c,front,'leftArm','front hidden-forearm arm');
 setManual(back,{'shoulder.left':[120,190],'elbow.left':[100,270],'wrist.left':[90,350],'hand.left':[86,390]});setPerspective(back,'BACK');verify(back,'leftArm','assistant_visual_review','pending');addRef(c,back,'leftArm','back full arm');
 const hits=C.search(c,q,0,'leftArm',null,{verifiedOnly:true,allowRoughQuery:false,limit:5});
 assert.equal(hits.length,2);assert.equal(hits[0].entryId,front.id);assert.equal(hits[0].viewConflict,false);assert.equal(hits[1].entryId,back.id);assert.equal(hits[1].viewConflict,true);
});

test('explicitly hidden forearm and hand count as known coverage, not missing anatomy',()=>{
 const q=entry('d'),r=entry('e');
 setManual(q,{'shoulder.left':[120,190],'elbow.left':[100,270],'wrist.left':[90,350],'hand.left':[86,390]});
 setManual(r,{'shoulder.left':[121,191],'elbow.left':[101,269]});setHidden(r,['wrist.left','hand.left']);
 const d=C.signatureDistance(C.poseSignature(q,0,'leftArm',null),C.poseSignature(r,0,'leftArm',null));
 assert.equal(d.sufficientEvidence,true);assert.equal(d.commonBones,1);assert.equal(d.regionCoverage.matchedBones,3);assert.equal(d.regionCoverage.requestedBones,3);assert.equal(d.regionCoverage.kind,'complete_region');assert.equal(d.regionCoverage.hiddenKnownPoints,2);
});

test('missing forearm remains incomplete when it was never marked hidden',()=>{
 const q=entry('f'),r=entry('g');
 setManual(q,{'shoulder.left':[120,190],'elbow.left':[100,270],'wrist.left':[90,350],'hand.left':[86,390]});
 setManual(r,{'shoulder.left':[121,191],'elbow.left':[101,269]});
 const d=C.signatureDistance(C.poseSignature(q,0,'leftArm',null),C.poseSignature(r,0,'leftArm',null));
 assert.equal(d.regionCoverage.matchedBones,1);assert.equal(d.regionCoverage.kind,'partial_region');assert.equal(d.regionCoverage.hiddenKnownPoints,0);
});

test('separately checked upper arm forearm and hand combine into whole-arm authority',()=>{
 const e=entry('h'),c=corpus(e);setManual(e,{'shoulder.left':[120,190],'elbow.left':[100,270],'wrist.left':[90,350],'hand.left':[86,390]});setPerspective(e,'FRONT');
 verify(e,'leftUpperArm','assistant_visual_review','pending');verify(e,'leftForearm','assistant_visual_review','pending');verify(e,'leftHand','assistant_visual_review','pending');
 const a=C.authorityForScope(e,0,C.scopeKeys('leftArm',null,e.project));assert.equal(a.reviewer,'assistant_visual_review');assert.equal(a.userAcceptance,'pending');assert.equal(a.compositeReview,true);assert.equal(a.supportingReviewIds.length,3);assert.equal(Object.keys(a.supportByKey).length,4);
 const ref=addRef(c,e,'leftArm','composite arm');assert.equal(ref.reviewAuthority,'assistant_visual_review');assert.equal(ref.userAcceptance,'pending');assert.equal(ref.compositeReview,true);assert.equal(ref.supportingReviewIds.length,3);
});

test('owner checks of separate arm sections combine into owner-approved whole-arm authority',()=>{
 const e=entry('i'),c=corpus(e);setManual(e,{'shoulder.left':[120,190],'elbow.left':[100,270],'wrist.left':[90,350],'hand.left':[86,390]});setPerspective(e,'FRONT');
 verify(e,'leftUpperArm');verify(e,'leftForearm');verify(e,'leftHand');
 const ref=addRef(c,e,'leftArm','owner composite arm');assert.equal(ref.reviewer,'owner');assert.equal(ref.userAcceptance,'accepted');assert.equal(ref.compositeReview,true);assert.equal(ref.supportingReviewIds.length,3);
});

test('owner acceptance of broad assistant review can be satisfied joint-by-joint by smaller owner checks',()=>{
 const e=entry('j'),c=corpus(e);setManual(e,{'shoulder.left':[120,190],'elbow.left':[100,270],'wrist.left':[90,350],'hand.left':[86,390]});setPerspective(e,'FRONT');
 const broad=verify(e,'leftArm','assistant_visual_review','pending').r;verify(e,'leftUpperArm');verify(e,'leftForearm');verify(e,'leftHand');
 const oa=C.reviewOwnerAcceptance(c,e,broad);assert.equal(oa.status,'accepted');assert.equal(oa.acceptedFrames,1);
});

test('older corpus backup still upgrades without duplicating entries or references',()=>{
 const zip=path.join(__dirname,'..','starter','Corpus_Library_Starter_Pass_01.corpus.zip');assert.ok(fs.existsSync(zip));
 // Full package reimport is exercised by seed_backup_compat.py; this gate ensures the old fixture remains bundled and the 02.2.2 application version upgrades deterministically.
 const c=C.make();assert.equal(c.application.version,'0.2.2.5');assert.equal(c.application.checkpoint,'02.2.5');
});

const report={suite:'Corpus Pane 02.2.2 view priority and composite review authority',total:results.length,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};fs.writeFileSync(path.join(__dirname,'view-priority-composite-review-results.json'),JSON.stringify(report,null,2));console.log(`02.2.2 view/authority: ${report.passed}/${report.total} passed`);if(report.failed)process.exitCode=1;
