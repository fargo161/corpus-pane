import json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
errors=[]; checks=[]
def ok(name, cond, detail=''):
    checks.append({'name':name,'pass':bool(cond),'detail':detail})
    if not cond: errors.append(name+(': '+detail if detail else ''))
# all json parses
json_files=list(ROOT.rglob('*.json'))
parsed={}
for p in json_files:
    try: parsed[str(p.relative_to(ROOT))]=json.load(open(p,encoding='utf-8')); ok('json:'+str(p.relative_to(ROOT)),True)
    except Exception as e: ok('json:'+str(p.relative_to(ROOT)),False,str(e))
master=parsed.get('MASTER_INDEX.json',{})
article_entries=master.get('articles',[])
ids=[x.get('id') for x in article_entries]
ok('article_ids_unique',len(ids)==len(set(ids)),str(ids))
source_reg=parsed.get(master.get('sourceRegister',''),{})
source_ids={x.get('id') for x in source_reg.get('sources',[])}
article_objs={}
for ent in article_entries:
    f=ent.get('file'); obj=parsed.get(f)
    ok('master_article_path:'+str(f),obj is not None)
    if obj: article_objs[obj.get('id')]=obj; ok('master_article_id:'+ent.get('id','?'),obj.get('id')==ent.get('id'))
for aid,obj in article_objs.items():
    for s in obj.get('sourceRefs',[]): ok(f'{aid}:source:{s}',s in source_ids)
    for r in obj.get('rules',[]):
        for s in r.get('sourceRefs',[]): ok(f'{aid}:{r.get("id")}:source:{s}',s in source_ids)
    for rel in obj.get('relationships',[]): ok(f'{aid}:article_link:{rel.get("article")}',rel.get('article') in article_objs)
for k in ['schemas','models','examples']:
    for f in master.get(k,[]): ok(f'master_path:{f}',(ROOT/f).exists())
# core invariants
skel=parsed.get('models/universal_skeleton_v1_2_0.json',{})
ok('skeleton_version',skel.get('version')=='1.2.0',str(skel.get('version')))
ok('skeleton_side_convention','subject anatomical' in skel.get('coordinateSystem',{}).get('sideConvention',''))
ok('five_face_slots',len(skel.get('face',{}).get('slots',[]))==5)
bridge=parsed.get('models/proposed_corpus_to_doll_bridge.json',{})
ok('bridge_is_proposed',bridge.get('status')=='proposed_mapping_for_future_testing')
result={'format':'sprite-foundry/corpus-pane-knowledge-validation','version':1,'checks':len(checks),'passed':sum(1 for c in checks if c['pass']),'failed':len(errors),'errors':errors,'details':checks}
json.dump(result,open(ROOT/'tests/validation_results.json','w',encoding='utf-8'),indent=2); print(json.dumps({'checks':result['checks'],'passed':result['passed'],'failed':result['failed'],'errors':errors},indent=2))
sys.exit(1 if errors else 0)
