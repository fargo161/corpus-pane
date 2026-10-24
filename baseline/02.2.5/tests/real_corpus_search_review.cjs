'use strict';
const fs=require('fs'),path=require('path');
const U=require('../engine/universal.js');global.CorpusKnowledge=require('../app/knowledge.js');const C=require('../app/corpus.js');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/corrected_13_clip.records.json'),'utf8'));C.upgradeKnowledge(fixture);C.validate(fixture);
const byLabel=Object.fromEntries(Object.values(fixture.entries).map(e=>[e.label,e]));
const qs=[
 ['MC12_turn-armstretch_p01_left',58,'leftArm','3Q straight horizontal reach'],
 ['MC10_arms_p02_center',22,'leftArm','3Q forward bent reach'],
 ['MC03_output35_p02_center',23,'rightArm','corrected fist-forward foreshortening'],
 ['MC01_output37_p03_right',29,'leftArm','rear-3Q hidden upper arm / visible distal forearm']
];
const report=[];
for(const [label,frame,region,note] of qs){const e=byLabel[label];const hits=C.search(fixture,e,frame,region,null,{verifiedOnly:true,allowRoughQuery:true,limit:8});report.push({query:{label,frame:frame+1,region,note},hits:hits.map((h,i)=>({rank:i+1,label:h.label,entry:fixture.entries[h.entryId]?.label,frame:h.frame+1,rankingScore:h.rankingScore,knowledgeScore:h.knowledgeScore,viewDistance:h.viewDistance,coverage:h.regionCoverage?.ratio,queryEvidence:h.queryEvidence,visibilityMismatchCount:h.visibilityMismatchCount,projection:h.projection}))});}
fs.writeFileSync(path.join(__dirname,'real-corpus-search-review.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
