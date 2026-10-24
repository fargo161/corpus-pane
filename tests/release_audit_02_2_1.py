from pathlib import Path
import hashlib,json,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
PREV=Path('/mnt/data/cp022_work/Corpus_Pane_Checkpoint_02_2')
checks=[]
def add(name,ok,detail=None): checks.append({'name':name,'pass':bool(ok),'detail':detail})
def sha(p):
 h=hashlib.sha256();
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1<<20),b''): h.update(b)
 return h.hexdigest()

def tree(rel):
 base=ROOT/rel; return {str(p.relative_to(base)):sha(p) for p in sorted(base.rglob('*')) if p.is_file()}
def tree_prev(rel):
 base=PREV/rel; return {str(p.relative_to(base)):sha(p) for p in sorted(base.rglob('*')) if p.is_file()}
rel=json.load(open(ROOT/'RELEASE.json'))
add('release_version',rel.get('version')=='0.2.2.2',rel.get('version'))
add('release_checkpoint',str(rel.get('checkpoint'))=='02.2.2',rel.get('checkpoint'))
add('knowledge_version',rel.get('knowledgePackage',{}).get('version')=='1.0.3',rel.get('knowledgePackage',{}).get('version'))
add('skeleton_version',rel.get('sharedSkeleton',{}).get('version')=='1.2.0')
add('engine_unchanged_from_02_2',tree('engine')==tree_prev('engine'))
add('starter_unchanged_from_02_2',tree('starter')==tree_prev('starter'))
add('universal_skeleton_unchanged',sha(ROOT/'docs/universal-skeleton-v1.2.0.json')==sha(PREV/'docs/universal-skeleton-v1.2.0.json'))
for f in ['index.html','app/corpus.js','app/workspace.js','app/knowledge.js','START_HERE.md','docs/SEARCH_SEMANTICS_APPROVAL_CLEANUP_REPORT.md','docs/TEST_REPORT.md','tests/search_semantics_cleanup.test.cjs','tests/search_semantics_browser.py']:
 add('required:'+f,(ROOT/f).is_file())
for f in ['app/corpus.js','app/workspace.js','app/knowledge.js','app/storage.js']:
 r=subprocess.run(['node','--check',str(ROOT/f)],capture_output=True,text=True)
 add('syntax:'+f,r.returncode==0,(r.stderr or '').strip()[:300])
# JSON parse every project json except huge model payloads don't exist as json anyway
bad=[]; count=0
for p in ROOT.rglob('*.json'):
 try: json.load(open(p)); count+=1
 except Exception as e: bad.append((str(p.relative_to(ROOT)),str(e)))
add('all_json_parse',not bad,{'count':count,'bad':bad[:5]})
# current result files
expected={
 'tests/core-results.json':(41,41),
 'tests/repair-results.json':(14,14),
 'tests/library-search-approval-results.json':(7,7),
 'tests/search-semantics-cleanup-results.json':(8,8),
}
for f,(total,passed) in expected.items():
 d=json.load(open(ROOT/f)); add('results:'+f,d.get('total')==total and d.get('passed')==passed,d)
k=json.load(open(ROOT/'tests/knowledge-core-results.json'))
add('results:knowledge',k.get('passed')==8 and k.get('total')==8,k)
for f in ['tests/search-semantics-browser-results.json','tests/search-approval-browser-results.json','tests/repair-browser-results.json','tests/seed-backup-compat-results.json']:
 d=json.load(open(ROOT/f)); add('browser:'+f,d.get('pass') is True,d)
v=json.load(open(ROOT/'knowledge/tests/validation_results.json')); add('knowledge_validation',v.get('checks')==330 and v.get('passed')==330 and v.get('failed')==0)
s=json.load(open(ROOT/'knowledge/tests/schema_validation_results.json')); add('knowledge_schema_validation',s.get('checks')==54 and s.get('passed')==54 and s.get('failed')==0)
# strings/semantics checks
cor=(ROOT/'app/corpus.js').read_text(); ws=(ROOT/'app/workspace.js').read_text(); idx=(ROOT/'index.html').read_text()
add('code_regionEvidence','regionEvidence' in cor and 'regionCoverage' in cor)
add('code_exact_support','supportingScopeAcceptance' in cor)
add('ui_partial_match','Partial match' in ws)
add('ui_rough_query','Rough query' in ws)
add('ui_exact_acceptance','Accept reference + exact support' in ws)
add('index_current','Checkpoint 02.2.2' in idx and 'Knowledge v1.0.3' in idx)
report={'suite':'Corpus Pane 02.2.2 release audit','total':len(checks),'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'checks':checks}
json.dump(report,open(ROOT/'tests/release-audit-02_2_1.json','w'),indent=2)
print(json.dumps({k:report[k] for k in ('suite','total','passed','failed')},indent=2))
if report['failed']: sys.exit(1)
