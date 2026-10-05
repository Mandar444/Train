"""Nutrition calculator used to build src/lib/foods.ts.

Ingredient values (per 100 g edible portion):
  IFCT2017  - Indian Food Composition Tables 2017, ICMR-NIN (via the @ifct2017/compositions dataset)
  CoFID2021 - UK McCance & Widdowson CoFID 2021 (as bundled in the INDB repository, UK_fct.xlsx)
  USDA      - USDA FoodData Central (as bundled in the INDB repository, US_fct.xlsx)
INDB recipes: Indian Nutrient Databank 2024 (Vijayakumar, Jaacks et al.),
  https://github.com/lindsayjaacks/Indian-Nutrient-Databank-INDB-  (recipes.xlsx, INDB.xlsx)

INDB's own per-100 g figures divide recipe nutrients by the RAW weight of all
ingredients (including water that later evaporates) and include the entire
deep-frying oil pot. So we re-total each INDB recipe from its ingredient list,
drop the frying-oil pot, add a stated oil uptake, and divide by a realistic
cooked weight. Everything here is deterministic and re-runnable.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ING = json.load(open(os.path.join(HERE, 'ingredients.json')))
RECIPES = json.load(open(os.path.join(HERE, 'indb_recipes.json')))
INDB = json.load(open(os.path.join(HERE, 'indb_2024.json')))

# grams per ml for volume units, by ingredient code prefix / code
def density(code, name):
    n = name.lower()
    if code.startswith('T'): return 0.92                      # oils, ghee
    if code in ('I502', 'I503', 'I504'): return 0.85         # sugar
    if code in ('K505',) or 'water' in n: return 1.0
    if code.startswith('L') or 'milk' in n: return 1.03
    if code in ('A011', 'A012'): return 0.3                  # poha, murmura
    if code.startswith('A') and 'flour' in n or code in ('A018', 'A019', 'A503', 'A504', 'A505', 'B503'): return 0.55
    if code.startswith('A'): return 0.8                      # grains
    if code.startswith('B'): return 0.8                      # pulses
    if code.startswith('G'): return 0.5                      # spices, herbs
    if code.startswith('H'): return 0.6                      # nuts, seeds
    if code.startswith(('X', 'V', 'W', 'I')): return 1.1     # sauces, drinks, jams, syrups
    return 0.6

UNIT_ML = {'tsp': 5, 'tbsp': 15, 'C': 240, 'ml': 1}

def grams(item):
    u, a = item['unit'], item['amount'] or 0
    if u == 'g': return a
    if u in UNIT_ML: return a * UNIT_ML[u] * density(item['code'], item['name'])
    if u == 'sprig': return a * 1.0
    if u == 'pinch': return a * 0.3
    if u == 'drops': return 0
    if u == 'nos': return a * 50
    return 0

def is_fry_pot(item):
    a = item['amt_org'].lower()
    return ('fry' in a or 'frying' in a) and item['code'].startswith('T')

def indb_total(code):
    """Return totals for the whole INDB recipe without the frying-oil pot:
    dict(k,p,c,f, raw_g (excl. water and frying pot), water_g)."""
    t = dict(k=0.0, p=0.0, c=0.0, f=0.0, raw_g=0.0, water_g=0.0)
    for it in RECIPES[code]:
        if is_fry_pot(it): continue
        g = grams(it)
        v = ING.get(it['code'])
        if it['code'] == 'K505' or 'water' in it['name'].lower():
            t['water_g'] += g; continue
        if not v: continue
        for k in ('k', 'p', 'c', 'f'): t[k] += v[k] * g / 100
        t['raw_g'] += g
    return t

def per100(t, cooked_g, oil_g=0.0):
    """Per 100 g of cooked food for a total `t`, cooked weight excluding added
    oil uptake, plus `oil_g` frying oil absorbed."""
    w = cooked_g + oil_g
    return dict(k=(t['k'] + 9 * oil_g) * 100 / w, p=t['p'] * 100 / w,
                c=t['c'] * 100 / w, f=(t['f'] + oil_g) * 100 / w)

def recipe(items):
    """items: list of (ingredient code, grams). Returns totals like indb_total."""
    t = dict(k=0.0, p=0.0, c=0.0, f=0.0, raw_g=0.0, water_g=0.0)
    for code, g in items:
        if code == 'water': t['water_g'] += g; continue
        v = ING[code]
        for k in ('k', 'p', 'c', 'f'): t[k] += v[k] * g / 100
        t['raw_g'] += g
    return t

def add(*ts):
    o = dict(k=0.0, p=0.0, c=0.0, f=0.0, raw_g=0.0, water_g=0.0)
    for t in ts:
        for k in o: o[k] += t[k]
    return o

def scale(t, x):
    return {k: v * x for k, v in t.items()}
