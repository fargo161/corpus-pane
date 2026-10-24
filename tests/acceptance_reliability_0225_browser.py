from pathlib import Path
import asyncio,base64,re,shutil,json
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
BACK=ROOT/'starter/Arm_Shoulder_Torso_Acceptance_Reliability_02_2_5.corpus.zip'
OUT=ROOT/'tests/acceptance-reliability-0225-browser-results.json'
async def boot(browser):
 ctx=await browser.new_context(viewport={'width':1600,'height':1000});p=await ctx.new_page();p.set_default_timeout(20000);errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
 html=(ROOT/'index.html').read_text();scripts=re.findall(r'<script src="([^"]+)"></script>',html);html=re.sub(r'<script src="[^"]+"></script>','',html);html=re.sub(r'<link rel="stylesheet"[^>]+>','',html)
 await p.set_content(html);await p.add_style_tag(content=(ROOT/'app/style.css').read_text())
 for s in scripts:
  if s=='app/workspace.js':
   await p.add_script_tag(content="""window.__testSources=new Map();window.__testWorkspace=null;Object.assign(CorpusStorage,{load:async()=>structuredClone(__testWorkspace),save:async c=>{__testWorkspace=structuredClone(c);},putSource:async(h,b)=>__testSources.set(h,b),getSource:async h=>__testSources.get(h)});""")
  await p.add_script_tag(content=(ROOT/s).read_text())
 await p.wait_for_function('CorpusLab.ready()');return ctx,p,errs
async def main():
 checks=[]
 async with async_playwright() as pw:
  b=await pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);ctx,p,errs=await boot(b)
  x=base64.b64encode(BACK.read_bytes()).decode();await p.evaluate('''async x=>{const b=Uint8Array.from(atob(x),c=>c.charCodeAt(0));return CorpusLab.importFile(new File([b],'acceptance-reliability.corpus.zip',{type:'application/zip'}));}''',x)
  labs=await p.evaluate('''()=>Object.fromEntries(Object.values(CorpusLab.state.corpus.entries).map(e=>[e.label,e.id]))''')
  # Corrected #12 reference and semantics shown in UI.
  await p.evaluate('''async labs=>{await CorpusLab.assign('A',labs['MC10_arms_p02_center']);CorpusLab.state.active='A';CorpusLab.setGroup('leftArm');CorpusLab.setTab('anatomy');await CorpusLab.seek(CorpusLab.state.panes.A,36,false);CorpusLab.refresh();}''',labs)
  pts=await p.evaluate('''()=>{const e=CorpusLab.state.corpus.entries[CorpusLab.state.panes.A.entryId],p=Universal.resolve(e.project,36).points;return {w:p['wrist.left'],h:p['hand.left'],bitmapIndex:CorpusLab.state.panes.A.bitmapIndex,index:CorpusLab.state.panes.A.index,rawIndex:CorpusLab.state.panes.A.rawIndex};}''')
  checks.append({'name':'corrected_overhead_reference_live','pass':pts['w']['x']==188 and pts['h']['x']==194 and pts['bitmapIndex']==36 and pts['rawIndex']==36,'detail':pts})
  await p.select_option('#point','wrist.left');await p.dispatch_event('#point','change'); await p.wait_for_timeout(20)
  rule=(await p.locator('#landmarkRule').inner_text()).lower();checks.append({'name':'wrist_semantics_visible_in_ui','pass':'narrow transition' in rule and 'palm' in rule,'detail':rule})
  # Race test: delay requested frame, start seek without awaiting, and ensure stale bitmap/raw are cleared.
  state=await p.evaluate('''async()=>{const pane=CorpusLab.state.panes.A,e=CorpusLab.state.corpus.entries[pane.entryId],m=await CorpusLab.ensureMedia(e),orig=m.read.bind(m);m.read=async i=>{if(i===22)await new Promise(r=>setTimeout(r,120));return orig(i)};const prom=CorpusLab.seek(pane,22,false);await new Promise(r=>setTimeout(r,20));const mid={index:pane.index,bitmapIndex:pane.bitmapIndex,rawIndex:pane.rawIndex,bitmapNull:pane.bitmap===null,rawNull:pane.raw===null};await prom;return {mid,after:{index:pane.index,bitmapIndex:pane.bitmapIndex,rawIndex:pane.rawIndex,bitmapNull:pane.bitmap===null,rawNull:pane.raw===null}};}''')
  checks.append({'name':'stale_frame_is_cleared_while_new_frame_decodes','pass':state['mid']['index']==22 and state['mid']['bitmapNull'] and state['mid']['rawNull'] and state['mid']['bitmapIndex'] is None and state['mid']['rawIndex'] is None,'detail':state})
  checks.append({'name':'bitmap_raw_and_overlay_frame_are_synchronized_after_seek','pass':state['after']['index']==22 and state['after']['bitmapIndex']==22 and state['after']['rawIndex']==22 and not state['after']['bitmapNull'] and not state['after']['rawNull'],'detail':state['after']})
  # #15: out-of-frame distal arm, no invented coordinates.
  await p.evaluate('''async labs=>{await CorpusLab.assign('A',labs['MC10_arms_p03_right']);CorpusLab.state.active='A';CorpusLab.setGroup('leftArm');CorpusLab.setTab('anatomy');await CorpusLab.seek(CorpusLab.state.panes.A,15,false);CorpusLab.refresh();}''',labs)
  distal=await p.evaluate('''()=>{const e=CorpusLab.state.corpus.entries[CorpusLab.state.panes.A.entryId],q=Universal.resolve(e.project,15).points;return {w:q['wrist.left'],h:q['hand.left'],wv:Universal.visibilityAt(e.project,15,'wrist.left'),hv:Universal.visibilityAt(e.project,15,'hand.left')};}''')
  checks.append({'name':'rear3q_cropped_distal_arm_is_out_of_frame','pass':distal['w'] is None and distal['h'] is None and distal['wv']=='out_of_frame' and distal['hv']=='out_of_frame','detail':distal})
  await p.screenshot(path=str(ROOT/'tests/runtime_output/cp0225_acceptance_reliability.png'),full_page=True)
  checks.append({'name':'no_page_errors','pass':not errs,'detail':errs})
  report={'suite':'Corpus Pane 02.2.5 acceptance reliability browser','total':len(checks),'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'pass':all(x['pass'] for x in checks),'checks':checks};OUT.write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));await ctx.close();await b.close()
  if not report['pass']: raise SystemExit(1)
asyncio.run(main())
