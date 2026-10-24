import asyncio,base64,json,re,time,hashlib,os,shutil,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
WORK=Path(os.environ.get('CORPUS_LAB_TEST_OUTPUT',str(ROOT/'tests'/'runtime_output')))
WORK.mkdir(parents=True,exist_ok=True)
FIXTURES=Path(os.environ.get('CORPUS_LAB_FIXTURES',str(ROOT/'tests'/'fixtures')))
CORPUS=Path(os.environ.get('CORPUS_LAB_CORPUS_DIR',str(FIXTURES/'Mannequin_Motion_Angle_Corpus_v0_1')))
CORPUS_ZIP=Path(os.environ.get('CORPUS_LAB_CORPUS_ZIP',str(FIXTURES/'Mannequin_Motion_Angle_Corpus_v0_1(1).zip')))
CHARACTER_VIDEO=Path(os.environ.get('CORPUS_LAB_CHARACTER_VIDEO',str(FIXTURES/'Video Project 78 (1)(1).mp4')))
BROWSER_EXECUTABLE=os.environ.get('CORPUS_LAB_BROWSER') or shutil.which('chromium') or shutil.which('google-chrome')
TEST_BROWSER_ARGS=['--disable-dev-shm-usage'] if sys.platform.startswith('linux') else []
if hasattr(os,'geteuid') and os.geteuid()==0: TEST_BROWSER_ARGS.append('--no-sandbox')
# Only storage is substituted in the primary workflow. Media, detectors, canvas,
# editing, verification, source hashing and the ZIP pipeline run actual app code.
# This harness is intentionally NOT evidence of successful native IndexedDB.

results=[];errors=[];requests=[];warnings=[]
def check(name,value,detail=None):
 ok=bool(value);results.append({'name':name,'pass':ok,**({'detail':detail} if detail is not None else {})});print('PASS' if ok else 'FAIL',name,detail or '',flush=True)
 if not ok: raise AssertionError(name)
async def boot(browser,memory=True,size=(1600,1000)):
 context=await browser.new_context(viewport={'width':size[0],'height':size[1]},accept_downloads=True)
 page=await context.new_page();page.set_default_timeout(15000)
 page.on('crash',lambda:print('BROWSER PAGE CRASH',flush=True));page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 page.on('console',lambda m:warnings.append({'type':m.type,'text':m.text[:250]}) if m.type in ['error','warning'] else None)
 html=ROOT.joinpath('index.html').read_text();scripts=re.findall(r'<script src="([^"]+)"></script>',html)
 html=re.sub(r'<script src="[^"]+"></script>','',html);html=re.sub(r'<link rel="stylesheet"[^>]+>','',html)
 await page.set_content(html);await page.add_style_tag(content=ROOT.joinpath('app/style.css').read_text())
 for src in scripts:
  if src=='app/workspace.js':
   if memory:
    await page.add_script_tag(content="""window.__testSources=new Map();window.__testWorkspace=null;Object.assign(CorpusStorage,{load:async()=>structuredClone(__testWorkspace),save:async c=>{__testWorkspace=structuredClone(c);},putSource:async(h,b)=>__testSources.set(h,b),getSource:async h=>__testSources.get(h)});""")
   await page.add_script_tag(content=ROOT.joinpath('starter/pair.js').read_text())
  await page.add_script_tag(content=ROOT.joinpath(src).read_text())
 await page.wait_for_function('CorpusLab.ready()');return context,page
async def source_file(page,path,mode='add',fps=24):
 b64=base64.b64encode(path.read_bytes()).decode()
 return await page.evaluate('''async({name,b64,mode,fps})=>{const b=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const f=new File([b],name,{type:name.endsWith('.mp4')?'video/mp4':'application/zip'});return mode==='import'?CorpusLab.importFile(f):CorpusLab.addMedia([f],{fps});}''',{'name':path.name,'b64':b64,'mode':mode,'fps':fps})
async def active(page,side='A',index=0):
 await page.evaluate('''async({side,index})=>{await CorpusLab.assign(side,CorpusLab.state.panes[side].entryId);await CorpusLab.seek(CorpusLab.state.panes[side],index,false);}''',{'side':side,'index':index})
