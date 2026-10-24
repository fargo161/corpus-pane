import asyncio,json
from harness import *

async def main():
 async with async_playwright() as pw:
  if not BROWSER_EXECUTABLE: raise RuntimeError('Chromium/Chrome not found')
  browser=await pw.chromium.launch(executable_path=BROWSER_EXECUTABLE,headless=True,args=TEST_BROWSER_ARGS)
  ctx,p=await boot(browser,size=(1500,950))
  ids=await p.evaluate('''()=>{
    const src=(name,ch)=>({name,kind:'video',mime:'video/mp4',width:300,height:700,fps:24,duration:1/24,frameCount:1,timing:'test',sha256:ch.repeat(64)});
    const q=CorpusCore.entry(Universal.makeProject(src('rough-arm.mp4','c'),[{time:0,duration:1/24}]));
    const r=CorpusCore.entry(Universal.makeProject(src('checked-arm.mp4','d'),[{time:0,duration:1/24}]));
    for(const e of [q,r])e.calibration={frame:0,rootX:150,crownY:50,floorY:650,status:'reviewed',method:'test'};
    Universal.pin(q.project,0,'shoulder.left',120,190,'visible');Universal.pin(q.project,0,'elbow.left',100,270,'visible');
    q.project.frames[0].points['wrist.left']=Universal.point(90,350,.2,'detector','unknown');
    for(const [k,x,y] of [['shoulder.left',121,191],['elbow.left',101,269],['wrist.left',91,349],['hand.left',87,389]])Universal.pin(r.project,0,k,x,y,'visible');
    const keys=CorpusCore.scopeKeys('leftArm',null,r.project);Universal.setVisibility(r.project,0,0,keys,'visible');CorpusCore.verify(r,0,0,keys,'leftArm');
    CorpusCore.setView(r,0,0,'FRONT','toward');CorpusCore.setViewState(r,0,0,{body:{family:'FRONT',heading:'toward',status:'reviewed'},head:{family:'FRONT',heading:'toward',status:'reviewed'},regionOverrides:{}},'fixture');CorpusCore.setProjection(r,0,0,'leftArm','planar_like','same_plane_or_unknown');
    const ref=CorpusCore.addReference(CorpusLab.state.corpus,r,0,keys,'leftArm','checked full arm');
    const review=r.reviews[r.reviews.length-1]; review.reviewer='assistant_visual_review';review.userAcceptance='pending';ref.reviewer='assistant_visual_review';ref.reviewAuthority='assistant_visual_review';ref.userAcceptance='pending';
    CorpusLab.state.corpus.entries[q.id]=q;CorpusLab.state.corpus.entries[r.id]=r;CorpusLab.refresh();
    return {q:q.id,r:r.id,ref:ref.id};
  }''')
  await p.evaluate('''async ids=>{await CorpusLab.assign('A',ids.q);await CorpusLab.assign('B',ids.r);await CorpusLab.seek(CorpusLab.state.panes.A,0,false);await CorpusLab.seek(CorpusLab.state.panes.B,0,false);CorpusLab.state.active='A';CorpusLab.setGroup('leftArm');CorpusLab.setTab('compare');CorpusLab.refresh();}''',ids)
  await p.click('#matchLibrary'); await p.wait_for_timeout(80)
  mt=await p.locator('#matchResults').inner_text()
  assert 'Rough query — inspect before using' in mt
  assert 'Partial match — 2/3 region bones' in mt
  assert 'Complete-bone match' not in mt
  summary=await p.locator('#comparisonSummary').inner_text()
  assert 'Rough library search' in summary and 'will not rank' not in summary
  # Single face part gives useful advice rather than a misleading no-reference message.
  await p.evaluate("()=>CorpusLab.setGroup('leftBrow')")
  await p.click('#matchLibrary'); await p.wait_for_timeout(30)
  st=await p.locator('#status').inner_text()
  assert 'single Left brow point cannot define a pose match' in st and 'Face only' in st
  # Return to the checked source, accept the saved reference, and confirm exact-support authority is visible.
  await p.evaluate('''async ids=>{await CorpusLab.assign('A',ids.r);await CorpusLab.seek(CorpusLab.state.panes.A,0,false);CorpusLab.setGroup('leftArm');CorpusLab.setTab('records');}''',ids)
  btn=p.locator(f'[data-accept-ref="{ids["ref"]}"]'); assert await btn.count()==1
  await btn.click(); await p.click('#confirmYes'); await p.wait_for_timeout(60)
  ref=await p.evaluate("id=>CorpusLab.state.corpus.references.find(r=>r.id===id)",ids['ref'])
  assert ref['userAcceptance']=='accepted' and ref['supportingScopeAcceptance']['status']=='accepted'
  review_text=await p.locator('#reviewList').inner_text()
  assert 'Owner accepted this full scope through later saved references/reviews' in review_text
  # Re-checking the same owner scope and saving it again promotes/reuses rather than duplicates.
  counts=await p.evaluate('''ids=>{const e=CorpusLab.state.corpus.entries[ids.r],keys=CorpusCore.scopeKeys('leftArm',null,e.project),before=CorpusLab.state.corpus.references.length;CorpusCore.verify(e,0,0,keys,'leftArm','owner re-check');const ref=CorpusCore.addReference(CorpusLab.state.corpus,e,0,keys,'leftArm','checked full arm');return {before,after:CorpusLab.state.corpus.references.length,id:ref.id,accept:ref.userAcceptance};}''',ids)
  assert counts['before']==counts['after'] and counts['id']==ids['ref'] and counts['accept']=='accepted'
  # Knowledge article status was updated.
  ks=await p.evaluate("()=>({version:CorpusKnowledge.version,status:CorpusKnowledge.article('CP-K022').implementation.status,text:CorpusKnowledge.article('CP-K022').implementation.currentSupport})")
  assert ks['version']=='1.0.5' and ks['status']=='existing' and 'projection state' in ks['text']
  await p.screenshot(path=str(ROOT/'tests/runtime_output/cp0221_search_semantics.png'),full_page=True)
  report={'suite':'Corpus Pane 02.2.2 browser search semantics/approval cleanup','pass':True,'regionCoverageVisible':True,'roughSearchTextConsistent':True,'singlePointAdvice':True,'exactSupportAcceptance':True,'dedupeAfterRecheck':True,'knowledgeCurrent':True,'pageErrors':list(errors)}
  assert not errors
  ROOT.joinpath('tests/search-semantics-browser-results.json').write_text(json.dumps(report,indent=2))
  print('PASS 02.2.2 browser',report)
  await ctx.close();await browser.close()

asyncio.run(main())
