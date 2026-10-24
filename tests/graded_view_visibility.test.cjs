'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const U=require('../engine/universal.js');global.CorpusKnowledge=require('../app/knowledge.js');const C=require('../app/corpus.js');
const results=[];function test(name,fn){try{fn();results.push({name,pass:true});console.log('PASS',name);}catch(e){results.push({name,pass:false,error:e.stack});console.error('FAIL',name,e.message);}}
function source(ch='x'){return {name:ch+'.mp4',kind:'video',mime:'video/mp4',width:300,height:700,fps:24,duration:1/24,frameCount:1,timing:'test',sha256:(ch.charCodeAt(0).toString(16).padStart(2,'0')).repeat(32)};}
function entry(ch='x'){const e=C.entry(U.makeProject(source(ch),[{time:0,duration:1/24}]));e.calibration={frame:0,rootX:150,crownY:50,floorY:650,status:'reviewed',method:'test'};return e;}
function corpus(...es){const c=C.make();for(const e of es)c.entries[e.id]=e;return c;}
function pinArm(e,off=0){for(const [k,x,y] of [['shoulder.left',120+off,190],['elbow.left',100+off,270],['wrist.left',90+off,350],['hand.left',86+off,390]])U.pin(e.project,0,k,x,y,'visible');}
function setPerspective(e,fam,heading=fam==='BACK'||fam==='BACK_THREE_QUARTER'?'away':fam==='PROFILE'?'image_right':'toward'){const legacy={FRONT:'FRONT',FRONT_THREE_QUARTER:'THREEQ',PROFILE:'PROFILE_RIGHT',BACK_THREE_QUARTER:'BACK_THREEQ',BACK:'BACK'}[fam];C.setView(e,0,0,legacy,heading==='image_right'?'right':heading);C.setViewState(e,0,0,{body:{family:fam,heading,status:'reviewed'},head:{family:'FRONT',heading:'toward',status:'reviewed'},regionOverrides:{}},'graded-view-test');}
function addRef(c,e,label){const keys=C.scopeKeys('leftArm',null,e.project);C.verify(e,0,0,keys,'leftArm');const r=e.reviews.at(-1);r.reviewer='assistant_visual_review';r.reviewAuthority='assistant_visual_review';r.userAcceptance='pending';C.setProjection(e,0,0,'leftArm','planar_like','same_plane_or_unknown');const ref=C.addReference(c,e,0,keys,'leftArm',label);ref.reviewer='assistant_visual_review';ref.reviewAuthority='assistant_visual_review';ref.userAcceptance='pending';return ref;}

test('view distance follows front to back ladder',()=>{
 const vals=['FRONT','FRONT_THREE_QUARTER','PROFILE','BACK_THREE_QUARTER','BACK'];
 for(let i=0;i<vals.length;i++)for(let j=0;j<vals.length;j++)assert.equal(C.viewDistance({family:vals[i],status:'reviewed'},{family:vals[j],status:'reviewed'}),Math.abs(i-j));
 assert.equal(C.viewDistance({family:'UNKNOWN',status:'unknown'},{family:'FRONT',status:'reviewed'}),null);
});

test('graded view ranking prefers same then neighbor then farther view',()=>{
 const q=entry('a'),same=entry('b'),neighbor=entry('c'),far=entry('d'),c=corpus(q,same,neighbor,far);pinArm(q);setPerspective(q,'FRONT_THREE_QUARTER');
 pinArm(same,1);setPerspective(same,'FRONT_THREE_QUARTER');addRef(c,same,'same');
 pinArm(neighbor,0);setPerspective(neighbor,'FRONT');addRef(c,neighbor,'neighbor');
 pinArm(far,0);setPerspective(far,'BACK');addRef(c,far,'far');
 const hits=C.search(c,q,0,'leftArm',null,{verifiedOnly:true,allowRoughQuery:false,limit:5});assert.deepEqual(hits.map(x=>x.label),['same','neighbor','far']);assert.deepEqual(hits.map(x=>x.viewDistance),[0,1,3]);
});

test('hidden versus visible is a visibility disagreement, not a perfect match',()=>{
 const a=entry('e'),b=entry('f');pinArm(a);pinArm(b);U.setVisibility(b.project,0,0,['wrist.left','hand.left'],'occluded');
 const d=C.signatureDistance(C.poseSignature(a,0,'leftArm',null),C.poseSignature(b,0,'leftArm',null));assert.equal(d.regionCoverage.kind,'complete_region');assert.deepEqual(d.visibilityMismatchIds.sort(),['hand.left','wrist.left']);assert.equal(d.visibilityMismatchCount,2);assert(d.visibilityMismatchRatio>0);
});

test('hidden versus hidden remains compatible known coverage',()=>{
 const a=entry('g'),b=entry('h');pinArm(a);pinArm(b);U.setVisibility(a.project,0,0,['wrist.left','hand.left'],'occluded');U.setVisibility(b.project,0,0,['wrist.left','hand.left'],'occluded');
 const d=C.signatureDistance(C.poseSignature(a,0,'leftArm',null),C.poseSignature(b,0,'leftArm',null));assert.equal(d.regionCoverage.kind,'complete_region');assert.equal(d.visibilityMismatchCount,0);assert.equal(d.regionCoverage.hiddenKnownPoints,2);
});

test('same-view visible reference outranks same-view hidden mismatch',()=>{
 const q=entry('i'),vis=entry('j'),hid=entry('k'),c=corpus(q,vis,hid);pinArm(q);setPerspective(q,'FRONT_THREE_QUARTER');pinArm(vis,2);setPerspective(vis,'FRONT_THREE_QUARTER');addRef(c,vis,'visible arm');pinArm(hid,0);U.setVisibility(hid.project,0,0,['wrist.left','hand.left'],'occluded');setPerspective(hid,'FRONT_THREE_QUARTER');addRef(c,hid,'hidden forearm arm');
 const hits=C.search(c,q,0,'leftArm',null,{verifiedOnly:true,allowRoughQuery:false,limit:5});assert.equal(hits[0].label,'visible arm');const hh=hits.find(x=>x.label==='hidden forearm arm');assert.equal(hh.visibilityMismatchCount,2);assert(hh.rankingScore>hits[0].rankingScore);
});

test('application and knowledge versions are upgraded without schema change',()=>{const c=C.make();assert.equal(c.application.version,'0.2.2.5');assert.equal(c.application.checkpoint,'02.2.5');assert.equal(global.CorpusKnowledge.version,'1.0.5');assert.equal(c.schema.version,'1.2.0');});

const report={suite:'Corpus Pane 02.2.3 graded view and visibility semantics',total:results.length,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};fs.writeFileSync(path.join(__dirname,'graded-view-visibility-results.json'),JSON.stringify(report,null,2));console.log(`02.2.3 graded view/visibility: ${report.passed}/${report.total} passed`);if(report.failed)process.exitCode=1;
