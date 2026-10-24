from pathlib import Path
import asyncio,base64,re,shutil,json
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
BACK=ROOT/'starter/Arm_Shoulder_Torso_Acceptance_Reliability_02_2_5.corpus.zip'
OUT=ROOT/'tests/graded-view-visibility-browser-results.json'
async def boot(browser):
 ctx=await browser.new_context(viewport={'width':1600,'height':1000});p=await ctx.new_page();p.set_default_timeout(20000);errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
 html=(ROOT/'index.html').read_text();scripts=re.findall(r'<script src="([^"]+)"></script>',html);html=re.sub(r'<script src="[^"]+"></script>','',html);html=re.sub(r'<link rel="stylesheet"[^>]+>','',html)
 await p.set_content(html);await p.add_style_tag(content=(ROOT/'app/style.css').read_text())
 for s in scripts:
  if s=='app/workspace.js':
   await p.add_script_tag(content="""window.__testSources=new Map();window.__testWorkspace=null;Object.assign(CorpusStorage,{load:async()=>structuredClone(__testWorkspace),save:async c=>{__testWorkspace=structuredClone(c);},putSource:async(h,b)=>__testSources.set(h,b),getSource:async h=>__testSources.get(h)});""");await p.add_script_tag(content=(ROOT/'starter/pair.js').read_text())
  await p.add_script_tag(content=(ROOT/s).read_text())
 await p.wait_for_function('CorpusLab.ready()');return ctx,p,errs
async def main():
 checks=[]
 async with async_playwright() as pw:
  b=await pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage']);ctx,p,errs=await boot(b)
  x=base64.b64encode(BACK.read_bytes()).decode();await p.evaluate('''async x=>{const b=Uint8Array.from(atob(x),c=>c.charCodeAt(0));return CorpusLab.importFile(new File([b],'surgical-repair.corpus.zip',{type:'application/zip'}));}''',x)
  labs=await p.evaluate('''()=>Object.fromEntries(Object.values(CorpusLab.state.corpus.entries).map(e=>[e.label,e.id]))''')
  # Hidden-vs-visible comparison is explicit in live UI.
  await p.evaluate('''async labs=>{await CorpusLab.assign('A',labs['MC11_turn-hop-arms_p03_right']);await CorpusLab.assign('B',labs['MC11_turn-hop-arms_p03_right']);CorpusLab.state.active='A';CorpusLab.setGroup('leftArm');CorpusLab.setTab('compare');await CorpusLab.seek(CorpusLab.state.panes.A,15,false);await CorpusLab.seek(CorpusLab.state.panes.B,29,false);CorpusLab.refresh();}''',labs)
  txt=(await p.locator('#comparisonSummary').inner_text()).lower()
  checks.append({'name':'live_hidden_visible_disagreement_text','pass':'visibility differs' in txt or 'hidden' in txt,'detail':txt[:500]})
  # Graded view search: use checked front-3Q right arm and inspect result metadata.
  await p.evaluate('''async labs=>{await CorpusLab.assign('A',labs['MC03_output35_p02_center']);CorpusLab.state.active='A';CorpusLab.setGroup('rightArm');CorpusLab.setTab('compare');await CorpusLab.seek(CorpusLab.state.panes.A,23,false);CorpusLab.refresh();}''',labs)
  await p.click('#matchLibrary'); await p.wait_for_timeout(100)
  results=await p.evaluate('''()=>CorpusLab.state.searchResults.map(r=>({viewDistance:r.viewDistance,visibilityMismatchCount:r.visibilityMismatchCount||0,label:r.label,queryEvidence:r.queryEvidence}))''')
  cards=(await p.locator('#matchResults').inner_text()).lower()
  checks.append({'name':'search_results_have_graded_view_distance','pass':bool(results) and all((r['viewDistance'] is None or isinstance(r['viewDistance'],(int,float))) for r in results),'detail':results[:5]})
  checks.append({'name':'search_ui_explains_reviewed_view_distance','pass':('same reviewed view' in cards or 'neighboring reviewed view' in cards or 'reviewed view distance' in cards),'detail':cards[:800]})
  checks.append({'name':'new_depth_reference_available','pass':any('fist-forward foreshortened reach' in (r['label'] or '').lower() for r in results) or await p.evaluate("CorpusLab.state.corpus.references.some(r=>/fist-forward foreshortened reach/i.test(r.label))")})
  corrected=await p.evaluate('''labs=>{const c=CorpusLab.state.corpus;const a=c.entries[labs['MC03_output35_p02_center']],b=c.entries[labs['MC01_output37_p03_right']];const ap=Universal.resolve(a.project,23).points,bp=Universal.resolve(b.project,29).points;return {mc03:{elbow:ap['elbow.right'],wrist:ap['wrist.right'],hand:ap['hand.right'],ref:c.references.find(r=>r.entryId===a.id&&r.frame===23&&r.region==='rightArm')?.label},mc01:{elbow:bp['elbow.left'],wrist:bp['wrist.left'],hand:bp['hand.left'],ref:c.references.find(r=>r.entryId===b.id&&r.frame===29&&r.region==='leftArm')?.label}};}''',labs)
  checks.append({'name':'mc03_corrected_joint_order_live','pass':corrected['mc03']['elbow']['x']>corrected['mc03']['wrist']['x']>corrected['mc03']['hand']['x'] and 'fist-forward' in (corrected['mc03']['ref'] or '').lower(),'detail':corrected['mc03']})
  checks.append({'name':'mc01_hidden_elbow_visible_distal_live','pass':corrected['mc01']['elbow']['visibility']=='occluded' and corrected['mc01']['wrist']['visibility']=='visible' and corrected['mc01']['hand']['visibility']=='visible' and 'behind torso' in (corrected['mc01']['ref'] or '').lower(),'detail':corrected['mc01']})
  await p.evaluate('''async labs=>{await CorpusLab.assign('A',labs['MC12_turn-armstretch_p01_left']);CorpusLab.state.active='A';CorpusLab.setGroup('leftArm');CorpusLab.setTab('compare');await CorpusLab.seek(CorpusLab.state.panes.A,58,false);CorpusLab.refresh();}''',labs)
  await p.click('#matchLibrary'); await p.wait_for_timeout(100)
  ranked=await p.evaluate('''()=>CorpusLab.state.searchResults.slice(0,6).map(r=>({label:r.label,viewDistance:r.viewDistance,rankingScore:r.rankingScore}))''')
  checks.append({'name':'combined_shape_view_ranking_live','pass':bool(ranked) and ranked[0]['label']=='Front T-pose extension — left arm' and ranked[0]['viewDistance']==1 and any(r['viewDistance']==0 for r in ranked[1:]),'detail':ranked})
  await p.screenshot(path=str(ROOT/'tests/runtime_output/cp0224_surgical_repair.png'),full_page=True)
  checks.append({'name':'no_page_errors','pass':not errs,'detail':errs})
  report={'suite':'Corpus Pane 02.2.4 graded view / visibility browser','total':len(checks),'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'pass':all(x['pass'] for x in checks),'checks':checks}
  OUT.write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));await ctx.close();await b.close()
  if not report['pass']: raise SystemExit(1)
asyncio.run(main())
