from pathlib import Path
import hashlib,json,subprocess,sys,zipfile,os
ROOT=Path(__file__).resolve().parents[1]
PREV_ZIP=Path('/mnt/data/Corpus_Pane_Checkpoint_02_2_3.zip')
CORPUS=ROOT/'starter/Arm_Shoulder_Torso_Surgical_Repair_02_2_4.corpus.zip'
checks=[]
def add(name,ok,detail=None): checks.append({'name':name,'pass':bool(ok),**({'detail':detail} if detail is not None else {})})
def sha_bytes(b): return hashlib.sha256(b).hexdigest()
def sha_file(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1<<20),b''):h.update(b)
 return h.hexdigest()
def tree(prefix):
 base=ROOT/prefix; return {str(p.relative_to(ROOT)).replace('\\','/'):sha_file(p) for p in sorted(base.rglob('*')) if p.is_file()}
def previous_tree(prefix):
 out={}
 with zipfile.ZipFile(PREV_ZIP) as z:
  names=z.namelist(); roots=[n.split('/')[0] for n in names if '/' in n]; r=(roots[0]+'/') if roots else ''
  target=r+prefix.rstrip('/')+'/'
  for n in names:
   if n.startswith(target) and not n.endswith('/'): out[n[len(r):]]=sha_bytes(z.read(n))
 return out
def re_search(pattern,text):
 import re
 return bool(re.search(pattern,text))
rel=json.load(open(ROOT/'RELEASE.json',encoding='utf-8'))
add('release_version',rel.get('version')=='0.2.2.4',rel.get('version'))
add('checkpoint',rel.get('checkpoint')=='02.2.4',rel.get('checkpoint'))
add('knowledge',rel.get('knowledgePackage',{}).get('version')=='1.0.5',rel.get('knowledgePackage',{}).get('version'))
add('skeleton',rel.get('sharedSkeleton',{}).get('version')=='1.2.0')
add('engine_unchanged_vs_02_2_3',tree('engine')==previous_tree('engine'))
with zipfile.ZipFile(PREV_ZIP) as z:
 names=z.namelist(); roots=[n.split('/')[0] for n in names if '/' in n]; r=(roots[0]+'/') if roots else ''
 prev=sha_bytes(z.read(r+'docs/universal-skeleton-v1.2.0.json'))
add('skeleton_file_unchanged',sha_file(ROOT/'docs/universal-skeleton-v1.2.0.json')==prev)
required=['index.html','app/corpus.js','app/workspace.js','app/knowledge.js','docs/SURGICAL_REPAIR_02_2_4_REPORT.md','docs/TEST_REPORT.md','tests/surgical_repair_0224.test.cjs','tests/graded_view_visibility_browser.py','tests/real_corpus_search_review.cjs',str(Path('starter')/CORPUS.name)]
for f in required:add('required:'+f,(ROOT/f).is_file())
for f in ['app/corpus.js','app/workspace.js','app/knowledge.js','app/storage.js']:
 r=subprocess.run(['node','--check',str(ROOT/f)],capture_output=True,text=True); add('syntax:'+f,r.returncode==0,(r.stderr or '')[:200])
bad=[];count=0
for p in ROOT.rglob('*.json'):
 try: json.load(open(p,encoding='utf-8')); count+=1
 except Exception as e: bad.append((str(p.relative_to(ROOT)),str(e)))
add('all_json_parse',not bad,{'count':count,'bad':bad[:3]})
expected={'tests/core-results.json':(41,41),'tests/knowledge-core-results.json':(8,8),'tests/repair-results.json':(14,14),'tests/library-search-approval-results.json':(7,7),'tests/search-semantics-cleanup-results.json':(8,8),'tests/view-priority-composite-review-results.json':(7,7),'tests/graded-view-visibility-results.json':(6,6),'tests/surgical-repair-0224-results.json':(7,7)}
for f,(tot,pas) in expected.items():
 d=json.load(open(ROOT/f,encoding='utf-8')); add('results:'+f,d.get('total')==tot and d.get('passed')==pas,{'total':d.get('total'),'passed':d.get('passed')})
for f in ['tests/repair-browser-results.json','tests/search-approval-browser-results.json','tests/search-semantics-browser-results.json','tests/seed-backup-compat-results.json','tests/view-priority-composite-browser-results.json','tests/graded-view-visibility-browser-results.json']:
 d=json.load(open(ROOT/f,encoding='utf-8')); add('browser:'+f,d.get('pass') is True,d)
v=json.load(open(ROOT/'knowledge/tests/validation_results.json',encoding='utf-8')); add('knowledge_validation',v.get('checks')==330 and v.get('passed')==330 and v.get('failed')==0)
s=json.load(open(ROOT/'knowledge/tests/schema_validation_results.json',encoding='utf-8')); add('schema_validation',s.get('checks')==54 and s.get('passed')==54 and s.get('failed')==0)
cor=(ROOT/'app/corpus.js').read_text(encoding='utf-8'); idx=(ROOT/'index.html').read_text(encoding='utf-8'); kb=(ROOT/'app/knowledge.js').read_text(encoding='utf-8')
add('combined_ranking_sort','rankingScore' in cor and re_search(r"sort\([^\n]+rankingScore",cor))
add('strong_view_penalty','function viewPenalty' in cor and '.42' in cor)
add('current_ui','Checkpoint 02.2.4' in idx and 'Knowledge v1.0.5' in idx)
add('knowledge_runtime_current','Corpus Pane 0.2.2.4' in kb and 'combined pose-shape' in kb)
# Corrected corpus payload integrity
try:
 with zipfile.ZipFile(CORPUS) as z:
  m=json.loads(z.read('manifest.json'))
  ok=True; errors=[]
  for it in m.get('contents',[]):
   if it['path'] not in z.namelist() or sha_bytes(z.read(it['path']))!=it['sha256']:
    ok=False; errors.append(it['path'])
  for med in m.get('media',[]):
   if med.get('available'):
    if med.get('file') not in z.namelist() or sha_bytes(z.read(med['file']))!=med['sha256']:
     ok=False; errors.append(med.get('file'))
  add('surgical_corpus_integrity',ok,errors[:5])
  refs=json.loads(z.read('references/index.json')); comps=json.loads(z.read('comparisons/index.json'))
  refarr=refs if isinstance(refs,list) else refs.get('references',[]); comparr=comps if isinstance(comps,list) else comps.get('comparisons',[])
  add('surgical_corpus_counts',len(m.get('clips',[]))==13 and len(refarr)==39 and len(comparr)==13,{'clips':len(m.get('clips',[])),'refs':len(refarr),'comparisons':len(comparr)})
except Exception as e: add('surgical_corpus_integrity',False,str(e))
# No builder-specific absolute fixture path
b=(ROOT/'tests/graded_view_visibility_browser.py').read_text(encoding='utf-8')
add('browser_fixture_relative','/mnt/data/Arm_Shoulder_Torso' not in b and "starter/Arm_Shoulder_Torso_Surgical_Repair_02_2_4.corpus.zip" in b.replace('\\','/'))
cache=[str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if '__pycache__' in p.parts or p.suffix=='.pyc']; add('no_python_cache',not cache,cache)
review=json.load(open(ROOT/'tests/real-corpus-search-review.json',encoding='utf-8'))
try:
 first=review[0]['hits']; add('real_ranking_neighbor_can_win',first[0]['viewDistance']==1 and any(x['viewDistance']==0 for x in first[1:4]),first[:4])
except Exception as e: add('real_ranking_neighbor_can_win',False,str(e))
report={'suite':'Corpus Pane 02.2.4 surgical repair release audit','total':len(checks),'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'checks':checks}
json.dump(report,open(ROOT/'tests/release-audit-02_2_4.json','w',encoding='utf-8'),indent=2)
print(json.dumps({k:report[k] for k in ('suite','total','passed','failed')},indent=2))
if report['failed']:
 print(json.dumps([x for x in checks if not x['pass']],indent=2))
sys.exit(1 if report['failed'] else 0)

