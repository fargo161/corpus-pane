import asyncio,json,base64
from pathlib import Path
from harness import *
async def extras():
 async with async_playwright() as pw:
  b=await pw.chromium.launch(executable_path=BROWSER_EXECUTABLE,headless=True,args=TEST_BROWSER_ARGS)
  ctx,p=await boot(b);await p.evaluate('CorpusLab.loadStarter()')
  # Human editor playback controls, not synchronized-multicamera claims.
  await p.click('#playBoth');await p.wait_for_timeout(260);await p.click('#playBoth')
  check('Both playback advances and pauses',await p.evaluate('Object.values(CorpusLab.state.panes).every(p=>p.index>0&&!p.playing)'))
  await p.select_option('#linkMode','progress');await p.evaluate('CorpusLab.seek(CorpusLab.state.panes.A,12)')
  check('Linked progress maps to corresponding relative sample index',await p.evaluate('CorpusLab.state.panes.B.index===12'))
  await p.select_option('#linkMode','independent');await active(p,'A',0);await p.evaluate("CorpusLab.setGroup('leftForearm');CorpusLab.setTab('anatomy')")
  before=await p.evaluate('JSON.stringify(CorpusLab.state.corpus.entries[CorpusLab.state.panes.A.entryId].project)')
  await p.evaluate('''()=>{const e=CorpusLab.state.corpus.entries[CorpusLab.state.panes.A.entryId];window.__cancelResult=null;CorpusLab.runTracking(e,Universal.REGION.leftArm,0,48).then(()=>__cancelResult='finished').catch(e=>__cancelResult=e.message);}''')
  await p.wait_for_function('!!CorpusLab.state.job');print('CANCEL_STATE',await p.evaluate('({job:CorpusLab.state.job,hidden:document.getElementById("busy").hidden,result:__cancelResult,progress:document.getElementById("progressText").textContent})'),flush=True)
  try:await p.click('#cancelJob',timeout=45000)
  except Exception:
   print('CANCEL_FAILURE_STATE',await p.evaluate('({job:CorpusLab.state.job,hidden:document.getElementById("busy").hidden,result:__cancelResult,progress:document.getElementById("progressText").textContent})'),flush=True);raise
  await p.wait_for_function('window.__cancelResult!==null',timeout=45000)
  check('Tracking cancel is acknowledged',await p.evaluate('/cancel/i.test(__cancelResult)'),await p.evaluate('__cancelResult'))
  check('Canceled refinement does not alter existing tracking, pins or pending state',await p.evaluate('JSON.stringify(CorpusLab.state.corpus.entries[CorpusLab.state.panes.A.entryId].project)')==before)
  # Set one synthetic review finding solely to exercise the UI pause, not evidence quality.
  await p.evaluate('''()=>{const s=CorpusLab.state,e=s.corpus.entries[s.panes.A.entryId];e.findings.push({id:'test-finding',frame:1,region:'leftForearm',status:'open',reasons:['Test-only warning']});document.getElementById('pauseWarning').checked=true;}''')
  await p.click('#playA');await p.wait_for_function("!CorpusLab.state.panes.A.playing && CorpusLab.state.panes.A.index===1")
  check('Playback pauses at a flagged frame in the selected group',await p.evaluate('document.getElementById("status").textContent.includes("Paused for review")'))
  await p.evaluate("document.getElementById('pauseWarning').checked=false;CorpusLab.setTab('compare')")
  # Difference pause explicit opt-in. Source snapshot remains a draft.
  await p.evaluate('''async()=>{const s=CorpusLab.state,a=s.corpus.entries[s.panes.A.entryId],b=s.corpus.entries[s.panes.B.entryId];for(let i=0;i<a.project.frames.length;i++){Universal.pin(a.project,i,'elbow.left',50,200);Universal.pin(a.project,i,'wrist.left',50,450);Universal.pin(b.project,i,'elbow.left',150,200);Universal.pin(b.project,i,'wrist.left',150,220);Universal.setVisibility(a.project,i,i,['elbow.left','wrist.left'],'visible');Universal.setVisibility(b.project,i,i,['elbow.left','wrist.left'],'visible');}await CorpusLab.seek(s.panes.A,0,false);document.getElementById('pauseDifference').checked=true;document.getElementById('differenceThreshold').value=1;}''')
  await p.click('#playBoth');await p.wait_for_function('!Object.values(CorpusLab.state.panes).some(p=>p.playing)')
  check('Optional large-difference review pauses without declaring incompatibility',await p.evaluate('document.getElementById("status").textContent.includes("Paused for comparison")'))
  await p.evaluate("document.getElementById('pauseDifference').checked=false;CorpusLab.setTab('cleanup')")
  async with p.expect_download() as d:
   await p.click('#exportFrame')
  download=await d.value;path=WORK/'export_test.png';await download.save_as(path)
  from PIL import Image
  im=Image.open(path);check('Actual PNG download retains transparent pixels and source dimensions',im.mode=='RGBA' and im.size==(270,592) and im.getextrema()[3][0]==0)
  await p.select_option('#rangeMode','range');await p.fill('#rangeStart','1');await p.fill('#rangeEnd','2')
  async with p.expect_download() as d:
   await p.click('#exportFrames')
  download=await d.value;zpath=WORK/'export_sequence.zip';await download.save_as(zpath)
  import zipfile
  with zipfile.ZipFile(zpath) as z:
   mapping=json.loads(z.read('frame-map.json'));check('Cleaned sequence export has original sample identities and editable track',len(mapping['frames'])==2 and mapping['frames'][1]['sourceIndex']==1 and 'project.json' in z.namelist())
  await p.evaluate('''async()=>{const c=CorpusLab.state.corpus,z=await CorpusStorage.pack(c,CorpusLab.blobFor),restored=await CorpusStorage.unpack(await SFCore.unzip(await z.arrayBuffer()));window.__duplicateMerge=CorpusCore.merge(c,restored.corpus);}''')
  check('Reimporting unchanged portable backup does not fork clips because of JSON key order',await p.evaluate('__duplicateMerge.stats.same===2&&__duplicateMerge.stats.forked===0&&Object.keys(__duplicateMerge.corpus.entries).length===2'))
  # A records-only export can acquire exact original source bytes again.
  records=await p.evaluate('JSON.stringify(CorpusLab.state.corpus)');recordsfile=WORK/'records_only_test.json';recordsfile.write_text(records)
  ctx2,q=await boot(b);await q.evaluate('(text)=>CorpusLab.mergeCorpus(CorpusCore.safeJSON(text))',records)
  check('Records-only import explicitly identifies missing source rather than discarding track',await q.evaluate("document.getElementById('emptyA').textContent.includes('not attached')"))
  await source_file(q,CORPUS/'panels/arms/MC10_arms_p01_left.mp4')
  check('Matching original video reconnects a records-only track',await q.evaluate('CorpusLab.state.panes.A.raw!==null&&Object.keys(CorpusLab.state.corpus.entries).length===2'))
  # Schema plus source index round-trip assertions.
  import jsonschema
  js=json.loads((ROOT/'docs/corpus.schema.json').read_text());jsonschema.Draft202012Validator.check_schema(js);jsonschema.validate(json.loads(records),js)
  check('Machine-readable corpus schema validates real workflow records',True)
  check('Extra UI tests produce no uncaught exceptions',not errors,errors)
  ROOT.joinpath('tests/extra-results.json').write_text(json.dumps({'suite':'additional browser controls / portable media exports','environment':'same isolated-document Chromium harness as browser-results.json; no browser-policy changes','total':len(results),'passed':sum(x['pass'] for x in results),'results':results,'pageErrors':errors,'consoleWarnings':warnings},indent=2))
  await b.close()
try:asyncio.run(extras())
except Exception as e:
 ROOT.joinpath('tests/extra-failure.json').write_text(json.dumps({'error':str(e),'results':results,'pageErrors':errors},indent=2));raise
