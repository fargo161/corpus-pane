import asyncio,base64,json,time
from pathlib import Path
# Import only the helper definitions; do not run the workflow suite.
from harness import *
async def probe():
 async with async_playwright() as pw:
  b=await pw.chromium.launch(executable_path=BROWSER_EXECUTABLE,headless=True,args=TEST_BROWSER_ARGS)
  ctx,p=await boot(b)
  p.on('framenavigated',lambda f:print('NAV',f.url,flush=True))
  p.on('console',lambda m:print('CONSOLE',m.type,m.text[:150],flush=True) if m.type in ('warning','error') else None)
  await source_file(p,CHARACTER_VIDEO,fps=2)
  await p.evaluate('window.__progress=[]')
  print('START',await p.evaluate('Object.values(CorpusLab.state.corpus.entries).map(e=>({size:[e.project.source.width,e.project.source.height],n:e.project.frames.length}))'),flush=True)
  started=time.time()
  async def heartbeat():
   while True:
    await asyncio.sleep(10)
    try:print('PROGRESS',await p.evaluate('document.getElementById("progressText").textContent'),flush=True)
    except Exception as e:print('PROGRESS_ERROR',str(e)[:120],flush=True);return
  h=asyncio.create_task(heartbeat())
  try:
   result=await p.evaluate('''async()=>{const e=Object.values(CorpusLab.state.corpus.entries)[0];const r=await CorpusLab.runTracking(e,Universal.ALL,0,0,{careful:false});return {proposalCount:r.proposals.length,nose:r.proposals[0].points.nose,face:r.proposals[0].quality?.face,body:r.proposals[0].quality?.body};}''')
   report={'pass':bool(result['proposalCount']),'source':'Video Project 78 (1)(1).mp4','frameIndex':0,'samplingFps':2,'samplingCount':30,'tested':'single-frame full body+face proposal after full-source motion analysis','result':result,'seconds':time.time()-started,'pageErrors':errors,'requests':requests}
   print('RESULT',report,flush=True)
   ROOT.joinpath('tests/generic-probe-results.json').write_text(json.dumps(report,indent=2))
  except Exception as e:
   ROOT.joinpath('tests/generic-probe-results.json').write_text(json.dumps({'pass':False,'error':str(e),'seconds':time.time()-started,'pageErrors':errors},indent=2));raise
  finally:h.cancel();await b.close()
asyncio.run(probe())
