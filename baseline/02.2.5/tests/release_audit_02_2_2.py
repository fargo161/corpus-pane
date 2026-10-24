from pathlib import Path
import hashlib,json,subprocess,sys,zipfile
ROOT=Path(__file__).resolve().parents[1]
PREV_ZIP=Path('/mnt/data/Corpus_Pane_Checkpoint_02_2_1.zip')
checks=[]
def add(name,ok,detail=None): checks.append({'name':name,'pass':bool(ok),**({'detail':detail} if detail is not None else {})})
def sha_bytes(b): return hashlib.sha256(b).hexdigest()
def sha_file(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1<<20),b''): h.update(b)
 return h.hexdigest()
def current_tree(prefix):
 base=ROOT/prefix
 return {str(p.relative_to(ROOT)).replace('\\','/'):sha_file(p) for p in sorted(base.rglob('*')) if p.is_file()}
def previous_tree(prefix):
 out={}
 with zipfile.ZipFile(PREV_ZIP) as z:
  names=z.namelist(); root=names[0].split('/')[0]+'/' if names and '/' in names[0] else ''
  target=root+prefix.rstrip('/')+'/'
  for n in names:
   if n.startswith(target) and not n.endswith('/'):
    out[n[len(root):]]=sha_bytes(z.read(n))
 return out
rel=json.load(open(ROOT/'RELEASE.json'))
add('release_version',rel.get('version')=='0.2.2.2',rel.get('version'))
add('release_checkpoint',str(rel.get('checkpoint'))=='02.2.2',rel.get('checkpoint'))
add('knowledge_version',rel.get('knowledgePackage',{}).get('version')=='1.0.3',rel.get('knowledgePackage',{}).get('version'))
add('skeleton_version',rel.get('sharedSkeleton',{}).get('version')=='1.2.0')
add('engine_unchanged_from_02_2_1',current_tree('engine')==previous_tree('engine'))
add('starter_unchanged_from_02_2_1',current_tree('starter')==previous_tree('starter'))
with zipfile.ZipFile(PREV_ZIP) as z:
 names=z.namelist(); rz=names[0].split('/')[0]+'/' if names and '/' in names[0] else ''
 prev_skel=sha_bytes(z.read(rz+'docs/universal-skeleton-v1.2.0.json'))
add('universal_skeleton_unchanged',sha_file(ROOT/'docs/universal-skeleton-v1.2.0.json')==prev_skel)
required=['index.html','app/corpus.js','app/workspace.js','app/knowledge.js','START_HERE.md','docs/VIEW_PRIORITY_COMPOSITE_REVIEW_REPORT.md','docs/TEST_REPORT.md','tests/view_priority_composite_review.test.cjs','tests/view_priority_composite_browser.py']
for f in required:add('required:'+f,(ROOT/f).is_file())
for f in ['app/corpus.js','app/workspace.js','app/knowledge.js','app/storage.js']:
 r=subprocess.run(['node','--check',str(ROOT/f)],capture_output=True,text=True);add('syntax:'+f,r.returncode==0,(r.stderr or '').strip()[:300])
bad=[];count=0
for p in ROOT.rglob('*.json'):
 try: json.load(open(p));count+=1
 except Exception as e:bad.append((str(p.relative_to(ROOT)),str(e)))
add('all_json_parse',not bad,{'count':count,'bad':bad[:5]})
expected={'tests/core-results.json':(41,41),'tests/knowledge-core-results.json':(8,8),'tests/repair-results.json':(14,14),'tests/library-search-approval-results.json':(7,7),'tests/search-semantics-cleanup-results.json':(8,8),'tests/view-priority-composite-review-results.json':(7,7)}
for f,(total,passed) in expected.items():
 d=json.load(open(ROOT/f));add('results:'+f,d.get('total')==total and d.get('passed')==passed,{'total':d.get('total'),'passed':d.get('passed'),'failed':d.get('failed')})
for f in ['tests/repair-browser-results.json','tests/search-approval-browser-results.json','tests/search-semantics-browser-results.json','tests/seed-backup-compat-results.json','tests/view-priority-composite-browser-results.json']:
 d=json.load(open(ROOT/f));add('browser:'+f,d.get('pass') is True,d)
v=json.load(open(ROOT/'knowledge/tests/validation_results.json'));add('knowledge_validation',v.get('checks')==330 and v.get('passed')==330 and v.get('failed')==0)
s=json.load(open(ROOT/'knowledge/tests/schema_validation_results.json'));add('knowledge_schema_validation',s.get('checks')==54 and s.get('passed')==54 and s.get('failed')==0)
cor=(ROOT/'app/corpus.js').read_text();ws=(ROOT/'app/workspace.js').read_text();idx=(ROOT/'index.html').read_text()
add('code_hidden_known','knownBoneIds' in cor and 'hiddenKnownPoints' in cor)
add('code_view_priority','Number(a.viewConflict)-Number(b.viewConflict)' in cor)
add('code_composite_authority','supportingReviewIds' in cor and 'supportByKey' in cor)
add('ui_composite_support','Composite support' in ws)
add('index_current','Checkpoint 02.2.2' in idx and 'Knowledge v1.0.3' in idx)
cache=[str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if '__pycache__' in p.parts or p.suffix=='.pyc']
add('no_python_cache_files',not cache,cache)
# Stable checksum format is checked if manifest already exists; packaging regenerates it after this audit.
manifest=ROOT/'FILE_CHECKSUMS.json'
if manifest.exists():
 try:
  m=json.load(open(manifest));ok=m.get('format')=='sha256-file-manifest' and m.get('version')==1 and isinstance(m.get('files'),dict)
 except Exception:ok=False
 add('checksum_manifest_format',ok)
report={'suite':'Corpus Pane 02.2.2 release audit','total':len(checks),'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'checks':checks}
json.dump(report,open(ROOT/'tests/release-audit-02_2_2.json','w'),indent=2)
print(json.dumps({k:report[k] for k in ('suite','total','passed','failed')},indent=2))
if report['failed']:sys.exit(1)
