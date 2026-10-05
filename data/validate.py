import json,sys
f=sys.argv[1]; d=json.load(open(f)); names=set(); bad=[]
for i,x in enumerate(d):
    assert set(x)=={'n','c','s','k','p','cb','f'}, (i,x)
    if x['n'].lower() in names: bad.append(('dup',x['n']))
    names.add(x['n'].lower())
    est=4*x['p']+4*x['cb']+9*x['f']
    if x['k']>40 and abs(est-x['k'])/x['k']>0.2: bad.append(('macro',x['n'],x['k'],round(est)))
    if not (0<=x['p']<=120 and 0<=x['k']<=2000): bad.append(('range',x['n']))
print(len(d),'items',len(bad),'problems'); [print(b) for b in bad[:40]]
