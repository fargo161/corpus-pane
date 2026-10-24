from harness import *
async def run():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path=BROWSER_EXECUTABLE,headless=True,args=TEST_BROWSER_ARGS)
  context,page=await boot(browser);await page.evaluate('CorpusLab.loadStarter()')
  out=[]
  for side in ['A','B']:
   started=time.time()
   result=await page.evaluate('''async side=>{const e=CorpusLab.state.corpus.entries[CorpusLab.state.panes[side].entryId];const r=await CorpusLab.runTracking(e,Universal.ALL,0,e.project.frames.length-1,{careful:true});return {panelId:e.legacyPanelId,frameCount:e.project.frames.length,proposals:r.proposals.length,faceEvidenceFrames:r.proposals.filter(p=>p.face).length,manualPins:Object.keys(e.project.edits).length,verifiedScopes:e.reviews.length};}''',side)
   out.append({**result,'seconds':time.time()-started});print(out[-1],flush=True)
  report={'method':'Real full-sequence model inference, not mock observations','clips':out,'pageErrors':errors,'warnings':warnings}
  (WORK/'live_tracking_rerun.json').write_text(json.dumps(report,indent=2));await browser.close()
asyncio.run(run())
