import asyncio,json
from harness import *
BACKUP=ROOT/'starter'/'Corpus_Library_Starter_Pass_01.corpus.zip'
async def main():
 async with async_playwright() as pw:
  print('BOOT playwright',flush=True)
  if not BROWSER_EXECUTABLE: raise RuntimeError('Chromium/Chrome not found')
  browser=await pw.chromium.launch(executable_path=BROWSER_EXECUTABLE,headless=True,args=TEST_BROWSER_ARGS)
  print('BOOT browser',flush=True);ctx,p=await boot(browser);print('BOOT done',flush=True)
  print('IMPORT backup',flush=True);await source_file(p,BACKUP,'import');print('IMPORT done',flush=True)
  first=await p.evaluate('''()=>{const c=CorpusLab.state.corpus,knee=Object.values(c.entries).find(e=>e.legacyPanelId==='MC08_knee_p01_left'),bal=Object.values(c.entries).find(e=>e.legacyPanelId==='MC09_turn-footstand_p01_left');return {clips:Object.keys(c.entries).length,refs:c.references.length,comparisons:c.comparisons.length,reviews:Object.values(c.entries).reduce((n,e)=>n+e.reviews.length,0),allKnowledge:Object.values(c.entries).every(e=>e.knowledge&&Array.isArray(e.knowledge.viewStates)&&Array.isArray(e.knowledge.projections)),ext:c.extensions.knowledgePackage,kneeHead:CorpusCore.viewStateAt(knee,0).head,balanceHead:CorpusCore.viewStateAt(bal,15).head,assistantRefs:c.references.filter(r=>r.reviewAuthority==='assistant_visual_review'&&r.userAcceptance==='pending').length,importedRevisionLabels:Object.values(c.entries).filter(e=>e.label.includes('(imported revision)')).length};}''')
  assert first['clips']==5 and first['refs']==18 and first['comparisons']==6 and first['reviews']==20
  assert first['allKnowledge'] and first['ext']['version']=='1.0.5'
  assert first['kneeHead']['family']=='FRONT_THREE_QUARTER' and first['kneeHead']['heading']=='image_left'
  assert first['balanceHead']['family']=='FRONT' and first['balanceHead']['heading']=='toward'
  assert first['assistantRefs']==18 and first['importedRevisionLabels']==0
  report={'suite':'Starter Pass 01 compatibility and migration','pass':True,'backup':str(BACKUP.relative_to(ROOT)),'firstImport':first,'duplicateReimport':'covered by tests/repair.test.cjs using the exact unpacked backup records','pageErrors':list(errors)}
  ROOT.joinpath('tests/seed-backup-compat-results.json').write_text(json.dumps(report,indent=2))
  print('PASS starter backup compatibility',report)
  await ctx.close();await browser.close()
asyncio.run(main())
