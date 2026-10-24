import asyncio,json
from harness import *
BACKUP=ROOT/'starter'/'Corpus_Library_Starter_Pass_01.corpus.zip'
async def main():
 async with async_playwright() as pw:
  if not BROWSER_EXECUTABLE: raise RuntimeError('Chromium/Chrome not found')
  browser=await pw.chromium.launch(executable_path=BROWSER_EXECUTABLE,headless=True,args=TEST_BROWSER_ARGS)
  ctx,p=await boot(browser,size=(1500,950))
  await source_file(p,BACKUP,'import')
  # Pending assistant-reviewed reusable references expose an explicit owner acceptance action.
  await p.click('[data-tab="records"]'); await p.wait_for_timeout(50)
  buttons=p.locator('#referenceList [data-accept-ref]')
  assert await buttons.count()>0
  rid=await buttons.first.get_attribute('data-accept-ref')
  await buttons.first.click(); await p.click('#confirmYes'); await p.wait_for_timeout(80)
  ref=await p.evaluate("id=>CorpusLab.state.corpus.references.find(r=>r.id===id)",rid)
  assert ref['userAcceptance']=='accepted' and ref['acceptedBy']=='owner'
  assert ref['preparedReviewAuthority']=='assistant_visual_review'
  txt=await p.locator('#referenceList').inner_text(); assert 'Owner accepted · prepared by assistant review' in txt
  # Comparison provenance is visible, including older assistant-reviewed decisions.
  ctxt=await p.locator('#comparisonList').inner_text(); assert 'Assistant-reviewed · owner acceptance pending' in ctxt
  # Build a tiny rough-query fixture inside the real page: uncertain detector upper arm versus a strict checked reference.
  ids=await p.evaluate('''()=>{
    const src=(name,ch)=>({name,kind:'video',mime:'video/mp4',width:300,height:700,fps:24,duration:1/24,frameCount:1,timing:'test',sha256:ch.repeat(64)});
    const q=CorpusCore.entry(Universal.makeProject(src('rough.mp4','a'),[{time:0,duration:1/24}]));
    const r=CorpusCore.entry(Universal.makeProject(src('ref.mp4','b'),[{time:0,duration:1/24}]));
    for(const e of [q,r])e.calibration={frame:0,rootX:150,crownY:50,floorY:650,status:'reviewed',method:'test'};
    q.project.frames[0].points['shoulder.left']=Universal.point(120,190,.2,'detector','unknown');
    q.project.frames[0].points['elbow.left']=Universal.point(100,270,.2,'detector','unknown');
    Universal.pin(r.project,0,'shoulder.left',121,191,'visible');Universal.pin(r.project,0,'elbow.left',101,269,'visible');
    const keys=CorpusCore.scopeKeys('leftUpperArm',null,r.project);Universal.setVisibility(r.project,0,0,keys,'visible');
    CorpusCore.verify(r,0,0,keys,'leftUpperArm');CorpusCore.setView(r,0,0,'FRONT','toward');
    CorpusCore.setViewState(r,0,0,{body:{family:'FRONT',heading:'toward',status:'reviewed'},head:{family:'FRONT',heading:'toward',status:'reviewed'},regionOverrides:{}},'fixture');
    CorpusCore.setProjection(r,0,0,'leftUpperArm','planar_like','same_plane_or_unknown');
    CorpusLab.state.corpus.entries[q.id]=q;CorpusLab.state.corpus.entries[r.id]=r;CorpusCore.addReference(CorpusLab.state.corpus,r,0,keys,'leftUpperArm','strict checked upper arm');
    CorpusLab.refresh();return {q:q.id,r:r.id};
  }''')
  await p.evaluate('''async id=>{await CorpusLab.assign('A',id);await CorpusLab.seek(CorpusLab.state.panes.A,0,false);CorpusLab.setGroup('leftUpperArm');CorpusLab.setTab('compare');}''',ids['q'])
  await p.click('#matchLibrary'); await p.wait_for_timeout(80)
  mt=await p.locator('#matchResults').inner_text(); assert 'Rough query — inspect before using' in mt and 'strict checked upper arm' in mt
  # The checked reference itself remains strict/current.
  result=await p.evaluate("()=>CorpusLab.state.searchResults.find(x=>x.label==='strict checked upper arm')")
  assert result and result['queryEvidence']=='rough_query' and result['verified'] is True
  # Knowledge wording reflects implemented split perspective/search behavior.
  await p.click('#knowledgeButton'); await p.fill('#knowledgeSearch','Split body'); await p.wait_for_timeout(30)
  await p.locator('[data-article="CP-K020"]').first.click(); await p.wait_for_timeout(30)
  article=await p.locator('#knowledgeArticle').inner_text(); assert 'existing' in article.lower() and '0.2.2.4' in article
  await p.screenshot(path=str(ROOT/'tests/runtime_output/cp022_search_approval.png'),full_page=True)
  report={'suite':'Corpus Pane 02.2 browser search/approval checks','pass':True,'ownerAcceptanceVisible':True,'comparisonProvenanceVisible':True,'roughQueryVisible':True,'knowledgeStatusCurrent':True,'pageErrors':list(errors)}
  assert not errors
  ROOT.joinpath('tests/search-approval-browser-results.json').write_text(json.dumps(report,indent=2))
  print('PASS 02.2 browser',report)
  await ctx.close(); await browser.close()
asyncio.run(main())
