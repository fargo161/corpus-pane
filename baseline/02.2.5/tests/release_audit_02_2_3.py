from pathlib import Path
import hashlib,json,subprocess,sys,zipfile
ROOT=Path(__file__).resolve().parents[1]
PREV_ZIP=Path('/mnt/data/Corpus_Pane_Checkpoint_02_2_2.zip')
checks=[]
def add(name,ok,detail=None): checks.append({'name':name,'pass':bool(ok),**({'detail':detail} if detail is not None else {})})
def sha_bytes(b): return hashlib.sha256(b).hexdigest()
def sha_file(p):
 h=hashlib.sha256();
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1<<20),b''):h.update(b)
 return h.hexdigest()
def current_tree(prefix):
 base=ROOT/prefix;return {str(p.relative_to(ROOT)).replace('\\','/'):sha_file(p) for p in sorted(base.rglob('*')) if p.is_file()}
def previous_tree(prefix):
 out={}
 with zipfile.ZipFile(PREV_ZIP) as z:
  names=z.namelist();r=names[0].split('/')[0]+'/' if names and '/' in names[0] else '';target=r+prefix.rstrip('/')+'/'
  for n in names:
   if n.startswith(target) and not n.endswith('/'):out[n[len(r):]]=sha_bytes(z.read(n))
 return out
rel=json.load(open(ROOT/'RELEASE.json'))
add('release_version',rel.get('version')=='0.2.2.3',rel.get('version'));add('checkpoint',rel.get('checkpoint')=='02.2.3');add('knowledge',rel.get('knowledgePackage',{}).get('version')=='1.0.4');add('skeleton',rel.get('sharedSkeleton',{}).get('version')=='1.2.0')
add('engine_unchanged',current_tree('engine')==previous_tree('engine'));add('starter_unchanged',current_tree('starter')==previous_tree('starter'))
with zipfile.ZipFile(PREV_ZIP) as z:
 names=z.namelist();r=names[0].split('/')[0]+'/' if names and '/' in names[0] else '';prev=sha_bytes(z.read(r+'docs/universal-skeleton-v1.2.0.json'))
add('skeleton_file_unchanged',sha_file(ROOT/'docs/universal-skeleton-v1.2.0.json')==prev)
required=['index.html','app/corpus.js','app/workspace.js','app/knowledge.js','docs/ARM_TORSO_CORRECTION_GAP_FILL_REPORT.md','docs/TEST_REPORT.md','tests/graded_view_visibility.test.cjs','tests/graded_view_visibility_browser.py']
for f in required:add('required:'+f,(ROOT/f).is_file())
for f in ['app/corpus.js','app/workspace.js','app/knowledge.js','app/storage.js']:
 r=subprocess.run(['node','--check',str(ROOT/f)],capture_output=True,text=True);add('syntax:'+f,r.returncode==0,(r.stderr or '')[:200])
bad=[];count=0
for p in ROOT.rglob('*.json'):
 try:json.load(open(p));count+=1
 except Exception as e:bad.append((str(p.relative_to(ROOT)),str(e)))
add('all_json_parse',not bad,{'count':count,'bad':bad[:3]})
expected={'tests/core-results.json':(41,41),'tests/knowledge-core-results.json':(8,8),'tests/repair-results.json':(14,14),'tests/library-search-approval-results.json':(7,7),'tests/search-semantics-cleanup-results.json':(8,8),'tests/view-priority-composite-review-results.json':(7,7),'tests/graded-view-visibility-results.json':(6,6)}
for f,(tot,pas) in expected.items():
 d=json.load(open(ROOT/f));add('results:'+f,d.get('total')==tot and d.get('passed')==pas,{'total':d.get('total'),'passed':d.get('passed')})
for f in ['tests/repair-browser-results.json','tests/search-approval-browser-results.json','tests/search-semantics-browser-results.json','tests/seed-backup-compat-results.json','tests/view-priority-composite-browser-results.json','tests/graded-view-visibility-browser-results.json']:
 d=json.load(open(ROOT/f));add('browser:'+f,d.get('pass') is True,d)
v=json.load(open(ROOT/'knowledge/tests/validation_results.json'));add('knowledge_validation',v.get('checks')==330 and v.get('passed')==330 and v.get('failed')==0)
s=json.load(open(ROOT/'knowledge/tests/schema_validation_results.json'));add('schema_validation',s.get('checks')==54 and s.get('passed')==54 and s.get('failed')==0)
cor=(ROOT/'app/corpus.js').read_text();ws=(ROOT/'app/workspace.js').read_text();idx=(ROOT/'index.html').read_text()
add('graded_view_code','VIEW_ORDINAL' in cor and 'viewDistance' in cor and 'viewPenalty' in cor)
add('visibility_mismatch_code','visibilityMismatchIds' in cor and 'visibilityMismatchCount' in ws)
add('ui_graded_view','neighboring reviewed view' in ws and 'reviewed view distance' in ws)
add('index_current','Checkpoint 02.2.3' in idx and 'Knowledge v1.0.4' in idx)
cache=[str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if '__pycache__' in p.parts or p.suffix=='.pyc'];add('no_python_cache',not cache,cache)
report={'suite':'Corpus Pane 02.2.3 release audit','total':len(checks),'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'checks':checks}
json.dump(report,open(ROOT/'tests/release-audit-02_2_3.json','w'),indent=2);print(json.dumps({k:report[k] for k in ('suite','total','passed','failed')},indent=2));sys.exit(1 if report['failed'] else 0)
