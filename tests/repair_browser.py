import asyncio,json
from harness import *
BACKUP=ROOT/'starter'/'Corpus_Library_Starter_Pass_01.corpus.zip'
async def main():
 async with async_playwright() as pw:
  print('BOOT playwright',flush=True)
  if not BROWSER_EXECUTABLE: raise RuntimeError('Chromium/Chrome not found')
  browser=await pw.chromium.launch(executable_path=BROWSER_EXECUTABLE,headless=True,args=TEST_BROWSER_ARGS)
  print('BOOT browser',flush=True);ctx,p=await boot(browser,size=(1500,950));print('BOOT done',flush=True)
  print('IMPORT backup',flush=True);await source_file(p,BACKUP,'import');print('IMPORT done',flush=True)
  # Open knee clip and a saved arm reference frame.
  knee=await p.evaluate("Object.values(CorpusLab.state.corpus.entries).find(e=>e.legacyPanelId==='MC08_knee_p01_left').id")
  await p.evaluate('''async id=>{await CorpusLab.assign('A',id);await CorpusLab.seek(CorpusLab.state.panes.A,18,false);CorpusLab.setGroup('rightShin');}''',knee)
  # Capture an existing body reference, then record a head-only perspective change through the actual UI.
  refid=await p.evaluate("id=>CorpusLab.state.corpus.references.find(r=>r.entryId===id&&r.frame===18&&r.region==='rightShin').id",knee)
  before=await p.evaluate("id=>CorpusCore.referenceCurrent(CorpusLab.state.corpus,CorpusLab.state.corpus.references.find(r=>r.id===id))",refid)
  await p.select_option('#bodyViewFamily','FRONT');await p.select_option('#bodyHeading','toward');await p.select_option('#headViewFamily','FRONT_THREE_QUARTER');await p.select_option('#headHeading','image_left');await p.click('#setPerspective')
  after=await p.evaluate("id=>CorpusCore.referenceCurrent(CorpusLab.state.corpus,CorpusLab.state.corpus.references.find(r=>r.id===id))",refid)
  assert before and after
  # Records UI visibly distinguishes assistant review authority.
  await p.click('[data-tab="records"]');await p.wait_for_timeout(50)
  txt=await p.locator('#referenceList').inner_text(); assert 'Assistant-reviewed' in txt and 'owner acceptance pending' in txt
  # Knowledge context for a previously generic subgroup is now specific.
  await p.select_option('#group','leftForearm');await p.click('#knowledgeButton');await p.wait_for_timeout(50)
  rec=await p.locator('#knowledgeRecommended').inner_text(); assert 'CP-K022' in rec and 'CP-K030' in rec
  # Canonical comparison classification is exposed; legacy key is not duplicated in UI.
  opts=await p.locator('#classification option').evaluate_all("els=>els.map(e=>e.value)")
  assert 'needs_new_artwork' in opts and 'new_piece' not in opts
  # Imported head note appears in the perspective controls when returning to the known frame.
  await p.evaluate('''async id=>{await CorpusLab.assign('A',id);await CorpusLab.seek(CorpusLab.state.panes.A,0,false);CorpusLab.setGroup('face');}''',knee);await p.wait_for_timeout(50)
  assert await p.input_value('#headViewFamily')=='FRONT_THREE_QUARTER'
  assert await p.input_value('#headHeading')=='image_left'
  await p.screenshot(path=str(ROOT/'reviewer_ui.png'),full_page=True)
  report={'suite':'Corpus Pane 02.1 browser repair checks','pass':True,'referenceStayedCurrent':after,'authorityVisible':True,'specificKnowledge':True,'canonicalClassification':True,'headMigrationVisible':True,'pageErrors':list(errors)}
  assert not errors
  ROOT.joinpath('tests/repair-browser-results.json').write_text(json.dumps(report,indent=2))
  print('PASS repair browser',report)
  await ctx.close();await browser.close()
asyncio.run(main())
