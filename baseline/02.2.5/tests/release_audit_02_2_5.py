from pathlib import Path
import hashlib,json,subprocess,sys,zipfile,re
ROOT=Path(__file__).resolve().parents[1]
PREV_ZIP=Path('/mnt/data/Corpus_Pane_Checkpoint_02_2_4.zip')
CORPUS=ROOT/'starter/Arm_Shoulder_Torso_Acceptance_Reliability_02_2_5.corpus.zip'
checks=[]
def add(name,ok,detail=None): checks.append({'name':name,'pass':bool(ok),**({'detail':detail} if detail is not None else {})})
def sha_bytes(b): return hashlib.sha256(b).hexdigest()
def sha_file(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1<<20),b''):h.update(b)
 return h.hexdigest()
def ziproot(z):
 names=z.namelist(); roots=[n.split('/')[0] for n in names if '/' in n]
 return (roots[0]+'/') if roots else ''
def prev_bytes(rel):
 with zipfile.ZipFile(PREV_ZIP) as z:
  r=ziproot(z); return z.read(r+rel)

rel=json.load(open(ROOT/'RELEASE.json',encoding='utf-8'))
add('release_version',rel.get('version')=='0.2.2.5',rel.get('version'))
add('checkpoint',rel.get('checkpoint')=='02.2.5',rel.get('checkpoint'))
add('knowledge_version',rel.get('knowledgePackage',{}).get('version')=='1.0.5',rel.get('knowledgePackage',{}).get('version'))
add('skeleton_version',rel.get('sharedSkeleton',{}).get('version')=='1.2.0')
add('continuation_backup',rel.get('includedContinuationBackup')=='starter/'+CORPUS.name)
# detector/runtime assets that should not change in this semantic/UI pass
for f in ['engine/bodykit.js','engine/facekit.js','engine/face-api.js','engine/fa-models.js','engine/movenet-model.js','engine/keyer.js','engine/media.js','engine/pixels.js','engine/reliability.js','engine/sfcore.js','engine/sha256.js','engine/tracking.js']:
 add('unchanged_vs_02_2_4:'+f,sha_file(ROOT/f)==sha_bytes(prev_bytes(f)))
add('skeleton_file_unchanged',sha_file(ROOT/'docs/universal-skeleton-v1.2.0.json')==sha_bytes(prev_bytes('docs/universal-skeleton-v1.2.0.json')))
# required files and syntax
required=['index.html','app/corpus.js','app/workspace.js','app/knowledge.js','engine/universal.js','docs/ACCEPTANCE_RELIABILITY_02_2_5_REPORT.md','docs/LANDMARK_SEMANTICS.json','docs/TEST_REPORT.md','tests/acceptance_reliability_0225.test.cjs','tests/acceptance_reliability_0225_browser.py','tests/fixtures/acceptance_reliability_13_clip.records.json',str(Path('starter')/CORPUS.name)]
for f in required:add('required:'+f,(ROOT/f).is_file())
for f in ['app/corpus.js','app/workspace.js','app/knowledge.js','app/storage.js','engine/universal.js']:
 r=subprocess.run(['node','--check',str(ROOT/f)],capture_output=True,text=True); add('syntax:'+f,r.returncode==0,(r.stderr or '')[:200])
# all JSON parses
bad=[];count=0
for p in ROOT.rglob('*.json'):
 try: json.load(open(p,encoding='utf-8')); count+=1
 except Exception as e: bad.append((str(p.relative_to(ROOT)),str(e)))
add('all_json_parse',not bad,{'count':count,'bad':bad[:3]})
# direct regression summaries
expected={
 'tests/core-results.json':(41,41),
 'tests/knowledge-core-results.json':(8,8),
 'tests/repair-results.json':(14,14),
 'tests/library-search-approval-results.json':(7,7),
 'tests/search-semantics-cleanup-results.json':(8,8),
 'tests/view-priority-composite-review-results.json':(7,7),
 'tests/graded-view-visibility-results.json':(6,6),
 'tests/surgical-repair-0224-results.json':(7,7),
 'tests/acceptance-reliability-0225-results.json':(5,5),
}
for f,(tot,pas) in expected.items():
 d=json.load(open(ROOT/f,encoding='utf-8')); add('results:'+f,d.get('total')==tot and d.get('passed')==pas,{'total':d.get('total'),'passed':d.get('passed')})
add('direct_total_103',sum(t for t,_ in expected.values())==103 and sum(p for _,p in expected.values())==103)
# browser result summaries used as focused regressions
for f in ['tests/repair-browser-results.json','tests/search-approval-browser-results.json','tests/search-semantics-browser-results.json','tests/seed-backup-compat-results.json','tests/view-priority-composite-browser-results.json','tests/graded-view-visibility-browser-results.json','tests/acceptance-reliability-0225-browser-results.json']:
 d=json.load(open(ROOT/f,encoding='utf-8')); add('browser:'+f,d.get('pass') is True,d if d.get('pass') is not True else None)
# knowledge validation
v=json.load(open(ROOT/'knowledge/tests/validation_results.json',encoding='utf-8')); add('knowledge_validation',v.get('checks')==330 and v.get('passed')==330 and v.get('failed')==0)
s=json.load(open(ROOT/'knowledge/tests/schema_validation_results.json',encoding='utf-8')); add('schema_validation',s.get('checks')==54 and s.get('passed')==54 and s.get('failed')==0)
# implementation markers
ws=(ROOT/'app/workspace.js').read_text(encoding='utf-8'); uni=(ROOT/'engine/universal.js').read_text(encoding='utf-8'); idx=(ROOT/'index.html').read_text(encoding='utf-8')
add('display_sync_indices',all(x in ws for x in ['bitmapIndex','rawIndex','requestedIndex']))
add('stale_decode_guard','requestedIndex !== p.index' in ws or 'requestedIndex!==p.index' in ws)
add('landmark_semantics_runtime','LANDMARK_SEMANTICS' in uni and 'narrow transition between forearm and hand' in uni and 'palm / metacarpal mass' in uni)
add('landmark_semantics_ui','id="landmarkRule"' in idx and 'Checkpoint 02.2.5' in idx)
# corpus package integrity and counts
try:
 with zipfile.ZipFile(CORPUS) as z:
  m=json.loads(z.read('manifest.json')); ok=True; errors=[]
  for it in m.get('contents',[]):
   if it['path'] not in z.namelist() or sha_bytes(z.read(it['path']))!=it['sha256']:
    ok=False; errors.append(it['path'])
  for med in m.get('media',[]):
   if med.get('available') and (med.get('file') not in z.namelist() or sha_bytes(z.read(med['file']))!=med['sha256']):
    ok=False; errors.append(med.get('file'))
  add('corpus_integrity',ok,errors[:5])
  refs=json.loads(z.read('references/index.json')); comps=json.loads(z.read('comparisons/index.json'))
  refarr=refs if isinstance(refs,list) else refs.get('references',[]); comparr=comps if isinstance(comps,list) else comps.get('comparisons',[])
  review_count=0
  labels={}
  for clip in m.get('clips',[]):
   rid=clip.get('record') or ('records/'+clip.get('id','')+'.json')
   if rid in z.namelist():
    rec=json.loads(z.read(rid)); review_count+=len(rec.get('reviews',[])); labels[rec.get('label')]=rec
  add('corpus_counts',len(m.get('clips',[]))==13 and len(refarr)==39 and len(comparr)==13 and review_count==43,{'clips':len(m.get('clips',[])),'refs':len(refarr),'comparisons':len(comparr),'reviews':review_count})
  # exact repaired refs exist and retain pending authority
  p02=[r for r in refarr if r.get('frame')==36 and 'overhead' in r.get('label','').lower() and 'landmark corrected' in r.get('label','').lower()]
  p03=[r for r in refarr if r.get('frame')==15 and 'wrist exits frame' in r.get('label','').lower()]
  add('corrected_reference_records',len(p02)==1 and len(p03)==1,{'overhead':len(p02),'cropped':len(p03)})
  add('corrected_refs_pending',all(r.get('userAcceptance')=='pending' and r.get('reviewAuthority')=='assistant_visual_review' for r in p02+p03))
except Exception as e: add('corpus_integrity',False,str(e))
# no cache / no builder-specific hard path in the new test
cache=[str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if '__pycache__' in p.parts or p.suffix=='.pyc']; add('no_python_cache',not cache,cache)
b=(ROOT/'tests/acceptance_reliability_0225_browser.py').read_text(encoding='utf-8')
add('new_browser_fixture_relative','/mnt/data/cp0225_work' not in b and 'starter/Arm_Shoulder_Torso_Acceptance_Reliability_02_2_5.corpus.zip' in b.replace('\\','/'))
report={'suite':'Corpus Pane 02.2.5 acceptance reliability release audit','total':len(checks),'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks),'checks':checks}
json.dump(report,open(ROOT/'tests/release-audit-02_2_5.json','w',encoding='utf-8'),indent=2)
print(json.dumps({k:report[k] for k in ('suite','total','passed','failed')},indent=2))
if report['failed']: print(json.dumps([x for x in checks if not x['pass']],indent=2))
sys.exit(1 if report['failed'] else 0)
