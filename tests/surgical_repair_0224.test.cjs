'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const U=require('../engine/universal.js');global.CorpusKnowledge=require('../app/knowledge.js');const C=require('../app/corpus.js');
const results=[];function test(name,fn){try{fn();results.push({name,pass:true});console.log('PASS',name);}catch(e){results.push({name,pass:false,error:e.stack});console.error('FAIL',name,e.message);}}
function source(ch='x'){return {name:ch+'.mp4',kind:'video',mime:'video/mp4',width:300,height:700,fps:24,duration:1/24,frameCount:1,timing:'test',sha256:(ch.charCodeAt(0).toString(16).padStart(2,'0')).repeat(32)};}
function entry(ch='x'){const e=C.entry(U.makeProject(source(ch),[{time:0,duration:1/24}]));e.calibration={frame:0,rootX:150,crownY:50,floorY:650,status:'reviewed',method:'test'};return e;}
function corpus(...es){const c=C.make();for(const e of es)c.entries[e.id]=e;return c;}
function pinArm(e,pts){for(const [k,p] of Object.entries(pts))U.pin(e.project,0,k,p[0],p[1],'visible');}
const base={
 'shoulder.left':[120,190], 'elbow.left':[100,270], 'wrist.left':[90,350], 'hand.left':[86,390]
};
function perspective(e,fam){const leg={FRONT:'FRONT',FRONT_THREE_QUARTER:'THREEQ',PROFILE:'PROFILE_RIGHT',BACK_THREE_QUARTER:'BACK_THREEQ',BACK:'BACK'}[fam];const heading=['BACK','BACK_THREE_QUARTER'].includes(fam)?'away':fam==='PROFILE'?'right':'toward';C.setView(e,0,0,leg,heading);C.setViewState(e,0,0,{body:{family:fam,heading:heading==='right'?'image_right':heading,status:'reviewed'},head:{family:'UNKNOWN',heading:'unknown',status:'unknown'},regionOverrides:{}},'test');}
function addRef(c,e,label){const keys=C.scopeKeys('leftArm',null,e.project);C.verify(e,0,0,keys,'leftArm');const rr=e.reviews.at(-1);rr.reviewer='assistant_visual_review';rr.reviewAuthority='assistant_visual_review';rr.userAcceptance='pending';C.setProjection(e,0,0,'leftArm','planar_like','same_plane_or_unknown');const r=C.addReference(c,e,0,keys,'leftArm',label);r.reviewer='assistant_visual_review';r.reviewAuthority='assistant_visual_review';r.userAcceptance='pending';return r;}
function loadFixture(){const p=path.join(__dirname,'fixtures/corrected_13_clip.records.json');const c=JSON.parse(fs.readFileSync(p,'utf8'));C.upgradeKnowledge(c);C.validate(c);return c;}

test('neighboring-view strong shape may outrank poor exact-view shape',()=>{
 const q=entry('a'),exact=entry('b'),neighbor=entry('c'),c=corpus(q,exact,neighbor);pinArm(q,base);perspective(q,'FRONT_THREE_QUARTER');
 pinArm(exact,{'shoulder.left':[120,190],'elbow.left':[145,215],'wrist.left':[175,225],'hand.left':[195,230]});perspective(exact,'FRONT_THREE_QUARTER');addRef(c,exact,'poor exact view');
 pinArm(neighbor,{'shoulder.left':[120,190],'elbow.left':[101,270],'wrist.left':[91,350],'hand.left':[87,390]});perspective(neighbor,'FRONT');addRef(c,neighbor,'strong neighbor view');
 const hits=C.search(c,q,0,'leftArm',null,{verifiedOnly:true,allowRoughQuery:false,limit:5});assert.equal(hits[0].label,'strong neighbor view');assert.equal(hits[0].viewDistance,1);assert(hits[0].rankingScore<hits.find(x=>x.label==='poor exact view').rankingScore);
});

test('clearly opposite reviewed view retains strong penalty',()=>{
 const q=entry('d'),near=entry('e'),opp=entry('f'),c=corpus(q,near,opp);pinArm(q,base);perspective(q,'FRONT_THREE_QUARTER');
 pinArm(near,{'shoulder.left':[120,190],'elbow.left':[103,271],'wrist.left':[93,351],'hand.left':[89,391]});perspective(near,'FRONT');addRef(c,near,'neighbor');
 pinArm(opp,base);perspective(opp,'BACK');addRef(c,opp,'opposite perfect shape');
 const hits=C.search(c,q,0,'leftArm',null,{verifiedOnly:true,allowRoughQuery:false,limit:5});assert.equal(hits[0].label,'neighbor');const back=hits.find(x=>x.label==='opposite perfect shape');assert.equal(back.viewDistance,3);assert(back.rankingScore>hits[0].rankingScore);
});

test('real MC03 frame 24 uses corrected shoulder-elbow-wrist-fist order',()=>{
 const c=loadFixture(),e=Object.values(c.entries).find(x=>x.label==='MC03_output35_p02_center'),r=c.references.find(x=>x.entryId===e.id&&x.frame===23&&x.region==='rightArm');assert(r&&C.referenceCurrent(c,r));const p=U.resolve(e.project,23).points;assert.equal(p['shoulder.right'].x,137.4);assert.equal(p['elbow.right'].x,124);assert.equal(p['wrist.right'].x,110);assert.equal(p['hand.right'].x,103);assert(p['shoulder.right'].x>p['elbow.right'].x&&p['elbow.right'].x>p['wrist.right'].x&&p['wrist.right'].x>p['hand.right'].x);assert.match(r.label,/fist-forward/i);assert(!/elbow.*fist/i.test(r.label));
});

test('real MC01 frame 30 records hidden elbow and visible distal forearm/hand',()=>{
 const c=loadFixture(),e=Object.values(c.entries).find(x=>x.label==='MC01_output37_p03_right'),r=c.references.find(x=>x.entryId===e.id&&x.frame===29&&x.region==='leftArm');assert(r&&C.referenceCurrent(c,r));const p=U.resolve(e.project,29).points;assert.equal(p['shoulder.left'].visibility,'visible');assert.equal(p['elbow.left'].visibility,'occluded');assert.equal(p['wrist.left'].visibility,'visible');assert.equal(p['hand.left'].visibility,'visible');assert.equal(p['wrist.left'].x,178);assert.equal(p['hand.left'].x,193);assert.match(r.label,/behind torso/i);assert(!/reach away/i.test(r.label));
});

test('real corrected comparison reclassifies MC01 as visibility/occlusion difference',()=>{
 const c=loadFixture();const comp=c.comparisons.find(x=>x.id==='comparison-mvlr9x66-abxletbqym7');assert(comp);assert.equal(comp.classification,'hidden_part');assert.match(comp.note,/hidden upper arm\/elbow/i);assert(C.comparisonCurrent(c,comp));
});


test('real 13-clip search lets a better neighboring-view horizontal arm outrank worse exact-view arms',()=>{
 const c=loadFixture(),q=Object.values(c.entries).find(x=>x.label==='MC12_turn-armstretch_p01_left');const hits=C.search(c,q,58,'leftArm',null,{verifiedOnly:true,allowRoughQuery:true,limit:8});assert(hits.length>=3);assert.equal(hits[0].label,'Front T-pose extension — left arm');assert.equal(hits[0].viewDistance,1);assert(hits.slice(1).some(x=>x.viewDistance===0));assert(hits[0].rankingScore<hits.find(x=>x.viewDistance===0).rankingScore);
});
test('application version advances without changing shared skeleton',()=>{const c=C.make();assert.equal(c.application.version,'0.2.2.5');assert.equal(c.application.checkpoint,'02.2.5');assert.equal(c.schema.version,'1.2.0');assert.equal(global.CorpusKnowledge.version,'1.0.5');});
const report={suite:'Corpus Pane 02.2.4 surgical repair and combined ranking',total:results.length,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};fs.writeFileSync(path.join(__dirname,'surgical-repair-0224-results.json'),JSON.stringify(report,null,2));console.log(`02.2.4 surgical repair: ${report.passed}/${report.total} passed`);if(report.failed)process.exitCode=1;
