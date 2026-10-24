import asyncio,json
from harness import *

async def main():
 async with async_playwright() as pw:
  if not BROWSER_EXECUTABLE: raise RuntimeError('Chromium/Chrome not found')
  browser=await pw.chromium.launch(executable_path=BROWSER_EXECUTABLE,headless=True,args=TEST_BROWSER_ARGS)
  ctx,p=await boot(browser,size=(1500,950))
  ids=await p.evaluate('''()=>{
    const src=(name,ch)=>({name,kind:'video',mime:'video/mp4',width:300,height:700,fps:24,duration:1/24,frameCount:1,timing:'test',sha256:ch.repeat(64)});
    const mk=(name,ch)=>{const e=CorpusCore.entry(Universal.makeProject(src(name,ch),[{time:0,duration:1/24}]));e.calibration={frame:0,rootX:150,crownY:50,floorY:650,status:'reviewed',method:'test'};return e};
    const pin=(e,k,x,y)=>Universal.pin(e.project,0,k,x,y,'visible');
    const persp=(e,fam)=>{CorpusCore.setView(e,0,0,fam==='BACK'?'BACK':'FRONT','toward');CorpusCore.setViewState(e,0,0,{body:{family:fam,heading:'toward',status:'reviewed'},head:{family:'FRONT',heading:'toward',status:'reviewed'},regionOverrides:{}},'fixture');};
    const c=CorpusLab.state.corpus,q=mk('query.mp4','a'),front=mk('front-hidden.mp4','b'),back=mk('back-full.mp4','c'),comp=mk('composite.mp4','d');
    for(const [k,x,y] of [['shoulder.left',120,190],['elbow.left',100,270],['wrist.left',90,350],['hand.left',86,390]])pin(q,k,x,y);persp(q,'FRONT');
    pin(front,'shoulder.left',121,191);pin(front,'elbow.left',101,269);Universal.setVisibility(front.project,0,0,['wrist.left','hand.left'],'occluded');persp(front,'FRONT');let keys=CorpusCore.scopeKeys('leftArm',null,front.project);CorpusCore.verify(front,0,0,keys,'leftArm');front.reviews.at(-1).reviewer='assistant_visual_review';front.reviews.at(-1).reviewAuthority='assistant_visual_review';front.reviews.at(-1).userAcceptance='pending';CorpusCore.setProjection(front,0,0,'leftArm','planar_like','same_plane_or_unknown');
    for(const [k,x,y] of [['shoulder.left',120,190],['elbow.left',100,270],['wrist.left',90,350],['hand.left',86,390]])pin(back,k,x,y);persp(back,'BACK');keys=CorpusCore.scopeKeys('leftArm',null,back.project);CorpusCore.verify(back,0,0,keys,'leftArm');back.reviews.at(-1).reviewer='assistant_visual_review';back.reviews.at(-1).reviewAuthority='assistant_visual_review';back.reviews.at(-1).userAcceptance='pending';CorpusCore.setProjection(back,0,0,'leftArm','planar_like','same_plane_or_unknown');
    for(const [k,x,y] of [['shoulder.left',120,190],['elbow.left',100,270],['wrist.left',90,350],['hand.left',86,390]])pin(comp,k,x,y);persp(comp,'FRONT');for(const rg of ['leftUpperArm','leftForearm','leftHand']){const kk=CorpusCore.scopeKeys(rg,null,comp.project);CorpusCore.verify(comp,0,0,kk,rg);const rr=comp.reviews.at(-1);rr.reviewer='assistant_visual_review';rr.reviewAuthority='assistant_visual_review';rr.userAcceptance='pending';}CorpusCore.setProjection(comp,0,0,'leftArm','planar_like','same_plane_or_unknown');
    for(const e of [q,front,back,comp])c.entries[e.id]=e;
    const rf=CorpusCore.addReference(c,front,0,CorpusCore.scopeKeys('leftArm',null,front.project),'leftArm','front hidden arm');rf.reviewer='assistant_visual_review';rf.reviewAuthority='assistant_visual_review';rf.userAcceptance='pending';
    const rb=CorpusCore.addReference(c,back,0,CorpusCore.scopeKeys('leftArm',null,back.project),'leftArm','back full arm');rb.reviewer='assistant_visual_review';rb.reviewAuthority='assistant_visual_review';rb.userAcceptance='pending';
    CorpusLab.refresh();return {q:q.id,front:front.id,back:back.id,comp:comp.id,rf:rf.id,rb:rb.id};
  }''')
  await p.evaluate('''async ids=>{await CorpusLab.assign('A',ids.q);await CorpusLab.assign('B',ids.front);CorpusLab.state.active='A';CorpusLab.setGroup('leftArm');CorpusLab.setTab('compare');CorpusLab.refresh();}''',ids)
  await p.click('#matchLibrary');await p.wait_for_timeout(80)
  cards=await p.locator('#matchResults .small-card').all_inner_texts();assert len(cards)>=2
  front_card=next(x for x in cards if 'front hidden arm' in x);back_card=next(x for x in cards if 'back full arm' in x)
  assert 'same reviewed view' in front_card and 'visibility differs' in front_card
  assert 'reviewed view distance 4' in back_card
  # Hidden anatomy is still known coverage, but visible-vs-hidden is now explicitly a mismatch.
  assert 'Full region match' in front_card
  # Composite review provenance is visible in Records.
  await p.evaluate('''async ids=>{const e=CorpusLab.state.corpus.entries[ids.comp];CorpusCore.addReference(CorpusLab.state.corpus,e,0,CorpusCore.scopeKeys('leftArm',null,e.project),'leftArm','composite support arm');await CorpusLab.assign('A',ids.comp);CorpusLab.state.active='A';CorpusLab.setGroup('leftArm');CorpusLab.setTab('records');CorpusLab.refresh();}''',ids)
  refs=await p.locator('#referenceList').inner_text();assert 'composite support arm' in refs and 'Composite support · 3 current reviews' in refs
  await p.screenshot(path=str(ROOT/'tests/runtime_output/cp0222_view_priority_composite.png'),full_page=True)
  assert not errors
  report={'suite':'Corpus Pane 02.2.2 browser view priority/composite authority','pass':True,'gradedViewVisible':True,'hiddenCountsAsKnownCoverage':True,'hiddenVisibleMismatchVisible':True,'compositeSupportVisible':True,'pageErrors':list(errors)}
  ROOT.joinpath('tests/view-priority-composite-browser-results.json').write_text(json.dumps(report,indent=2))
  print('PASS 02.2.2 browser',report)
  await ctx.close();await browser.close()

asyncio.run(main())
