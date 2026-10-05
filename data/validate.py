"""Validate src/lib/foods.ts (or a legacy foods_part*.json file).

  python3 data/validate.py                 # checks src/lib/foods.ts
  python3 data/validate.py data/foods_part1.json

Checks: no duplicate names (case-insensitive), every row has 7-9 fields with the
right types, category index in range, kcal roughly matches 4*P + 4*C + 9*F
(flag > 20 % mismatch), sane ranges, source code in the allowed set, no em dash.
Exit code 1 if any problem is found.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
TS = os.path.join(HERE, '..', 'src', 'lib', 'foods.ts')
ALLOWED_SRC = {'INDB', 'IFCT', 'USDA', 'label', 'recipe', ''}   # '' = not yet verified (keywords only)


def load_ts(path):
    src = open(path, encoding='utf-8').read()
    cats = json.loads(re.search(r'FOOD_CATS: string\[\] = (\[.*?\]);', src).group(1))
    body = re.search(r'const ROWS[^=]*= \[\n(.*?)\n\];', src, re.S).group(1)
    rows = [json.loads(l.rstrip(',')) for l in body.split('\n') if l.strip()]
    return src, cats, rows


def check_rows(rows, ncats):
    bad, names = [], {}
    for i, r in enumerate(rows):
        if not (7 <= len(r) <= 9):
            bad.append(('fields', i, r[:1], len(r))); continue
        name, cat, serving, k, p, c, f = r[:7]
        if not (isinstance(name, str) and isinstance(serving, str) and isinstance(cat, int)):
            bad.append(('types', name)); continue
        if not all(isinstance(x, (int, float)) for x in (k, p, c, f)):
            bad.append(('types', name)); continue
        if not (0 <= cat < ncats): bad.append(('category', name, cat))
        key = name.strip().lower()
        if key in names: bad.append(('duplicate', name, 'rows %d and %d' % (names[key], i)))
        names[key] = i
        est = 4 * p + 4 * c + 9 * f
        if k > 40 and abs(est - k) / k > 0.20: bad.append(('macro', name, k, round(est)))
        if not (0 <= p <= 120 and 0 <= c <= 400 and 0 <= f <= 150 and 0 <= k <= 2500): bad.append(('range', name))
        if len(r) >= 8:
            if not isinstance(r[7], str) or r[7] not in ALLOWED_SRC: bad.append(('source', name, r[7]))
        if len(r) == 9 and not isinstance(r[8], str): bad.append(('keywords', name))
        if len(r) >= 8 and r[7] and not re.search(r'\d+\s*(g|ml)\b', serving):
            bad.append(('serving-grams', name, serving))
    return bad


def main():
    if len(sys.argv) > 1 and sys.argv[1].endswith('.json'):
        d = json.load(open(sys.argv[1]))
        rows = [[x['n'], 0, x['s'], x['k'], x['p'], x['cb'], x['f']] for x in d]
        bad = check_rows(rows, 1)
        print(len(rows), 'items', len(bad), 'problems'); [print(b) for b in bad[:60]]
        sys.exit(1 if bad else 0)
    src, cats, rows = load_ts(TS)
    bad = check_rows(rows, len(cats))
    if '—' in src: bad.append(('em-dash', 'foods.ts contains U+2014'))
    nsrc = {}
    for r in rows:
        s = r[7] if len(r) >= 8 else ''
        nsrc[s or '(unverified)'] = nsrc.get(s or '(unverified)', 0) + 1
    print(len(rows), 'rows,', len(cats), 'categories,', len(bad), 'problems')
    print('by source:', dict(sorted(nsrc.items())))
    for b in bad[:80]: print(b)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
