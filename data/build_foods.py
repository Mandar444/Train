"""Builds src/lib/foods.ts.

  python3 data/build_foods.py          # rewrites src/lib/foods.ts and data/foods_all.json
  python3 data/validate.py             # checks the result

Existing rows are kept in their original order (ids stay stable). Rows that
were spot-checked are replaced with sourced values, new rows are appended.
See data/sources.md for sources and method.
"""
import json, os, re
from nutri import ING, INDB, indb_total, recipe, add

HERE = os.path.dirname(os.path.abspath(__file__))
TS = os.path.join(HERE, '..', 'src', 'lib', 'foods.ts')

# ---------------------------------------------------------------- ingredients
RICE, PBRICE, ATTA, MAIDA, SUJI, VERMI, POHA, MURMURA = 'A015', 'A014', 'A019', 'A018', 'A022', 'A023', 'A011', 'A012'
JOWAR, BAJRA, RAGI, BESAN, SAGO, CORNFLOUR, RICEFLOUR, MAIZE = 'A005', 'A003', 'A010', 'A504', 'I508', 'A503', 'A505', 'A006'
TOOR, MOONGD, MASOOR, CHANAD, URADD, MOONGW, MATKI, KABULI = 'B021', 'B010', 'B013', 'B001', 'B003', 'B011', 'B016', 'B500'
KALACHANA, RAJMA, WPEAS, LOBIA, URADW, VAL = 'B002', 'B020', 'B017', 'B006', 'B004', 'B009'
POT, ONION, TOM, PEAS, CAULI, CABB, BRINJAL, OKRA = 'F006', 'G017', 'D075', 'D061', 'D036', 'C015', 'D031', 'D056'
SPIN, METHI, CARROT, CAPS, LAUKI, BEANS, COCO, DCOCO = 'C033', 'C020', 'F002', 'D033', 'D007', 'D050', 'H007', 'H006'
PNUT, CASHEW, ALMOND, PISTA, RAISIN, SESAME, GARLIC, GINGER = 'H012', 'H005', 'H001', 'H018', 'E057', 'H011', 'G011', 'G014'
GCHILLI, CORIANDER, MUSH, CORN, LEMON, TAMARIND, JAGGERY = 'G008', 'G009', 'J001', 'A008', 'E033', 'E064', 'I001'
MANGO, BANANA, CHIKOO, PINEAPPLE, POMEG, STRAW, ORANGE, MOSAMBI = 'E039', 'E012', 'E060', 'E053', 'E055', 'E063', 'E047', 'E034'
WATERMELON, PAPAYA, APPLE, GUAVA, GRAPES, SUGARCANE, LETTUCE = 'E065', 'E049', 'E001', 'E028', 'E026', 'I002', 'C025'
MILK, BMILK, PANEER, KHOA, BUTTER, GHEE, OIL, CREAM, WCREAM = 'L002', 'L001', 'L003', 'L004', 'T500', 'T506', 'T508', 'L519', 'L512'
CURD = 'L002'   # dahi: fermented whole cow milk, macros taken as IFCT whole cow milk
CHEDDAR, MOZZ, PCHEESE, SOURCREAM, CONDMILK, ICECREAM = 'L500', 'L503', 'L505', 'L514', 'L508', 'I501'
SUGAR, HONEY, COCOA, CHOC, CUSTARDP, BREAD, BBREAD, BUN = 'I502', 'I507', 'V501', 'I509', 'K503', 'U511', 'U501', 'U507'
PASTA, OLIVE, TPUREE, KETCHUP, SOY, MAYO, COFFEE, TOMSAUCE = 'A507', 'T502', 'X504', 'X503', 'X501', 'L507', 'V502', 'X505'
EGG, EGGB, CHKB, CHKT, MUTTON, ROHU, PRAWN, SPICE = 'M001', 'M004', 'N003', 'N002', 'O001', 'S006', 'S008', 'G523'
TEA = 'V510'
CUCUMBER, MINT, BEET, SWEETPOT, CORNFLAKE = 'D043', 'G016', 'F001', 'F013', 'A501'

# ---------------------------------------------------------------- bases (per 100 g)
def per100_from(t, cooked_g, oil_frac=0.0):
    """t = recipe totals, cooked_g = cooked weight of the batch before any frying
    oil uptake; oil_frac = absorbed frying oil as a fraction of the final weight."""
    oil_g = oil_frac * cooked_g / (1 - oil_frac) if oil_frac else 0.0
    w = cooked_g + oil_g
    return dict(k=(t['k'] + 9 * oil_g) * 100 / w, p=t['p'] * 100 / w, c=t['c'] * 100 / w,
                f=(t['f'] + oil_g) * 100 / w)

def I(code, cook=0.85, cooked=None, oil=0.0, extra=None):
    """INDB 2024 recipe, re-totalled from ingredients; frying-oil pot removed.
    cook = fraction of raw weight (solids + water) left after cooking, or give
    cooked = explicit cooked batch weight in g. extra = [(code, g)] additions."""
    t = indb_total(code)
    if extra: t = add(t, recipe(extra))
    w = cooked if cooked else (t['raw_g'] + t['water_g']) * cook
    return per100_from(t, w, oil)

def R(items, cooked=None, cook=None, oil=0.0):
    """Own standard recipe from IFCT 2017 / CoFID / USDA ingredient values.
    cooked = cooked batch weight in g (water added/evaporated included)."""
    t = recipe(items)
    w = cooked if cooked else (t['raw_g'] + t['water_g']) * (cook or 1.0)
    return per100_from(t, w, oil)

def G(code):
    v = ING[code]
    return dict(k=v['k'], p=v['p'], c=v['c'], f=v['f'])

def M(parts):
    """Mix of (per100 base, grams) components; returns per 100 g of the mix."""
    tot = dict(k=0, p=0, c=0, f=0); w = 0
    for b, g in parts:
        for k in tot: tot[k] += b[k] * g / 100
        w += g
    return {k: v * 100 / w for k, v in tot.items()}

def FIX(k, p, c, f, g):
    """Per-serving label values -> per 100 g."""
    return dict(k=k * 100 / g, p=p * 100 / g, c=c * 100 / g, f=f * 100 / g)

# commonly reused bases
B_RICE = R([(RICE, 100), ('water', 0)], cooked=280)                     # boiled rice, 1 : 2.8 yield
B_ROTI = I('ASC096', cook=0.8)                                            # INDB chapati
B_PAV = G(BREAD)                                                          # pav ~ white bread
B_SEV = R([(BESAN, 100), ('water', 40)], cooked=95, oil=0.35)            # sev / farsan, 35 % fat
B_CURD = G(CURD)
B_PASTA = R([(PASTA, 100)], cooked=235)                                   # boiled pasta
B_FRIES = R([(POT, 100)], cooked=60, oil=0.14)                            # French fries
B_GRILLCHK = R([(CHKB, 100), (OIL, 3)], cooked=75)                        # grilled/tandoori breast
B_CHIPS = R([(MAIZE, 100), ('water', 60)], cooked=100, oil=0.25)         # corn tortilla chips
B_TORTILLA = R([(MAIDA, 100), (OIL, 8), ('water', 55)], cooked=135)      # flour tortilla
B_SALSA = R([(TOM, 100), (ONION, 25), (CAPS, 10), (LEMON, 5), (CORIANDER, 3)], cooked=140)
B_BEANS = R([(RAJMA, 100), (ONION, 30), (TOM, 50), (OIL, 8)], cooked=330)
B_MEXRICE = R([(RICE, 70), (TOM, 80), (ONION, 25), (CAPS, 20), (CORN, 25), (TPUREE, 10), (OIL, 10)], cooked=330)
B_RABRI = R([(MILK, 1000), (SUGAR, 60), (ALMOND, 5), (PISTA, 5)], cooked=380)
B_MISAL_RASSA = R([(MATKI, 40), (ONION, 35), (TOM, 30), (DCOCO, 8), (OIL, 14), (GARLIC, 3), (GINGER, 3), ('water', 260)], cooked=320)
B_FRIEDRICE = I('ASC129', cook=0.85)
B_STIRVEG = I('BFP278', cook=0.85)
# chhena from whole cow milk: ~80 % of protein, 95 % of fat, 10 % of lactose retained, 160 g per litre
B_CHHENA = dict(k=0.0, p=1000 * 0.0326 * 0.8 / 1.6, c=1000 * 0.0494 * 0.1 / 1.6, f=1000 * 0.0448 * 0.95 / 1.6)
B_CHHENA['k'] = 4 * B_CHHENA['p'] + 4 * B_CHHENA['c'] + 9 * B_CHHENA['f']
B_SYRUP60 = R([(SUGAR, 60), ('water', 40)], cooked=100)                     # gulab jamun syrup after boiling
B_SYRUP35 = R([(SUGAR, 35), ('water', 65)], cooked=100)                     # light rasgulla syrup
B_JAMUN_BALL = R([(KHOA, 100), (MAIDA, 25), (MILK, 5)], cooked=120, oil=0.10)  # INDB ASC348 dough, fried
B_WHITESAUCE = R([(MILK, 200), (BUTTER, 12), (MAIDA, 12)], cooked=210)

B_PAROTTA = R([(MAIDA, 100), (OIL, 15), (SUGAR, 2), ('water', 55)], cooked=155)          # Kerala parotta
B_JALEBI = M([(R([(MAIDA, 100), (CURD, 15), ('water', 80)], cooked=170, oil=0.20), 55), (B_SYRUP60, 45)])
B_SPROUT_USAL = R([(MOONGW, 20), (MATKI, 20), (ONION, 25), (TOM, 30), (COCO, 8), (OIL, 7), ('water', 150)], cooked=210)
B_BAATI = M([(R([(ATTA, 100), (GHEE, 15), (SUJI, 10), ('water', 45)], cooked=135), 90), (G(GHEE), 10)])

# ---------------------------------------------------------------- category helpers
CATS_EXISTING = None  # filled from foods.ts

def tsrow_round(v, step):
    return round(round(v / step) * step, 1)

# ---------------------------------------------------------------- spot-check corrections
# name -> (serving label or None to keep, grams, base, src, kw)
CORR = {
 'Plain roti': ('1 medium (40 g)', 40, B_ROTI, 'INDB', 'chapati chapathi rotli poli fulka'),
 'Phulka': ('1 piece (30 g)', 30, B_ROTI, 'INDB', 'fulka chapati roti'),
 'Roti with ghee': ('1 medium (40 g) + 1/2 tsp ghee', 42.5, M([(B_ROTI, 40), (G(GHEE), 2.5)]), 'INDB', 'ghee chapati tup poli'),
 'Tandoori roti': ('1 piece (60 g)', 60, R([(ATTA, 50), (MAIDA, 0), ('water', 30)], cooked=62), 'recipe', 'tandoor roti'),
 'Plain naan': ('1 piece (90 g)', 90, I('ASC142', cook=0.9), 'INDB', 'nan'),
 'Butter naan': ('1 piece (95 g)', 95, M([(I('ASC142', cook=0.9), 90), (G(BUTTER), 5)]), 'INDB', 'butter nan'),
 'Plain paratha': ('1 medium (70 g)', 70, I('ASC097', cook=0.85), 'INDB', 'parantha parotha tawa paratha'),
 'Aloo paratha': ('1 medium (120 g)', 120, I('ASC098', cook=0.85), 'INDB', 'alu parantha aloo parantha'),
 'Gobi paratha': ('1 medium (120 g)', 120, I('ASC100', cook=0.85), 'INDB', 'gobhi parantha cauliflower'),
 'Mooli paratha': ('1 medium (120 g)', 120, I('ASC099', cook=0.85), 'INDB', 'muli parantha radish'),
 'Paneer paratha': ('1 medium (110 g)', 110, I('ASC105', cook=0.85), 'INDB', 'paneer parantha'),
 'Methi thepla': ('1 piece (35 g)', 35, I('OSR104', cook=0.9), 'INDB', 'thepla methi na thepla'),
 'Puri': ('1 piece (25 g)', 25, R([(ATTA, 100), (GHEE, 2), ('water', 45)], cooked=125, oil=0.15), 'recipe', 'poori puri'),
 'Bhatura': ('1 piece (80 g)', 80, R([(MAIDA, 100), (CURD, 25), (OIL, 3), ('water', 35)], cooked=140, oil=0.18), 'recipe', 'bhature batura'),
 'Plain rice (mess plate)': ('1 plate (250 g cooked)', 250, B_RICE, 'IFCT', 'chawal bhaat steamed rice white rice'),
 'Plain rice (small katori)': ('1 katori (100 g cooked)', 100, B_RICE, 'IFCT', 'chawal bhaat white rice'),
 'Jeera rice': ('1 katori (150 g)', 150, I('BFP134', cook=0.85), 'INDB', 'zeera rice cumin rice jeera pulao'),
 'Veg pulao': ('1 plate (200 g)', 200, I('ASC115', cook=0.8), 'INDB', 'vegetable pulav pulao'),
 'Matar pulao': (None, None, I('BFP136', cook=0.8), 'INDB', 'peas pulao mutter pulav'),
 'Veg biryani': ('1 plate (250 g)', 250, I('ASC123', cooked=607 * 0.65 + 100 * 1.8), 'INDB', 'vegetable biriyani'),
 'Curd rice': ('1 katori (200 g)', 200, I('ASC126', cooked=80 * 2.8 + 138), 'INDB', 'dahi bhaat thayir sadam daddojanam'),
 'Lemon rice': ('1 plate (200 g)', 200, I('ASC124', cooked=80 * 2.8 + 81), 'INDB', 'chitranna nimbu rice'),
 'Mess dal (thin)': ('1 katori (150 g)', 150, I('ASC151', cook=0.85), 'INDB', 'patla dal varan pani wali dal'),
 'Moong dal (yellow)': ('1 katori (150 g)', 150, R([(MOONGD, 40), (OIL, 5), (ONION, 10), (TOM, 15), ('water', 200)], cooked=230), 'recipe', 'moong ki dal dhuli moong'),
 'Dal tadka': ('1 katori (150 g)', 150, R([(TOOR, 40), (GHEE, 8), (ONION, 15), (TOM, 20), (GARLIC, 3), ('water', 180)], cooked=230), 'recipe', 'dal tarka tadka dal yellow dal'),
 'Dal fry': ('1 katori (150 g)', 150, R([(TOOR, 30), (MOONGD, 10), (OIL, 9), (ONION, 25), (TOM, 25), (GARLIC, 3), ('water', 170)], cooked=230), 'recipe', 'daal fry'),
 'Toor dal (arhar)': ('1 katori (150 g)', 150, R([(TOOR, 40), (OIL, 5), (TOM, 15), ('water', 200)], cooked=230), 'recipe', 'arhar dal tuvar tur dal'),
 'Masoor dal': ('1 katori (150 g)', 150, R([(MASOOR, 40), (OIL, 5), (ONION, 15), (TOM, 15), ('water', 200)], cooked=230), 'recipe', 'masur dal red lentil'),
 'Chana dal': ('1 katori (150 g)', 150, I('OSR142', cook=0.85), 'INDB', 'chane ki dal bengal gram'),
 'Dal makhani': ('1 katori (150 g)', 150, I('OSR139', cook=0.65, extra=[(BUTTER, 20), (CREAM, 40)]), 'INDB', 'daal makhni makhani'),
 'Rajma masala': ('1 katori (150 g)', 150, R([(RAJMA, 45), (ONION, 30), (TOM, 50), (OIL, 8), (GINGER, 3), (GARLIC, 2), ('water', 130)], cooked=220), 'recipe', 'rajmah kidney beans'),
 'Chole (chana masala)': ('1 katori (150 g)', 150, R([(KABULI, 50), (ONION, 30), (TOM, 45), (OIL, 9), (GINGER, 3), ('water', 130)], cooked=220), 'recipe', 'chhole chana masala chickpea curry'),
 'Kadhi pakoda': ('1 katori (150 g)', 150, M([(R([(CURD, 100), (BESAN, 12), (OIL, 4), ('water', 100)], cooked=200), 110), (R([(BESAN, 50), (ONION, 30), ('water', 30)], cooked=100, oil=0.18), 40)]), 'recipe', 'kadhi pakora punjabi kadhi'),
 'Sambar': ('1 katori (150 g)', 150, I('ASC167', cook=1.0), 'INDB', 'sambhar saambar'),
 'Rasam': ('1 katori (150 ml)', 150, I('BFP176', cook=0.85), 'INDB', 'saaru charu chaaru'),
 'Aloo gobi': ('1 katori (150 g)', 150, I('ASC171', cook=0.85), 'INDB', 'alu gobhi'),
 'Aloo matar': ('1 katori (150 g)', 150, I('ASC190', cook=0.85), 'INDB', 'alu mutter'),
 'Jeera aloo': ('1 katori (150 g)', 150, I('ASC178', cook=0.85), 'INDB', 'zeera alu sukhe aloo'),
 'Aloo sabzi (puri wali)': ('1 katori (150 g)', 150, I('BFP239', cook=0.85), 'INDB', 'aloo ki sabji batata bhaji'),
 'Bhindi masala': ('1 katori (150 g)', 150, I('BFP269', cook=0.85), 'INDB', 'okra bhendi lady finger'),
 'Baingan bharta': ('1 katori (150 g)', 150, I('ASC177', cook=0.8), 'INDB', 'bharit vangyache bharit baingan bhartha'),
 'Matar paneer': ('1 katori (150 g)', 150, I('ASC191', cook=0.85), 'INDB', 'mutter paneer'),
 'Palak paneer': ('1 katori (150 g)', 150, R([(PANEER, 60), (SPIN, 150), (ONION, 25), (TOM, 30), (OIL, 10), (CREAM, 10)], cooked=220), 'recipe', 'saag paneer'),
 'Kadai paneer': ('1 katori (150 g)', 150, R([(PANEER, 70), (CAPS, 40), (ONION, 50), (TOM, 80), (OIL, 12)], cooked=200), 'recipe', 'kadhai paneer karahi'),
 'Shahi paneer': ('1 katori (150 g)', 150, I('ASC221', cook=0.85), 'INDB', ''),
 'Paneer butter masala': ('1 katori (150 g)', 150, I('ASC222', cook=0.85, extra=[(BUTTER, 10), (CREAM, 30)]), 'INDB', 'paneer makhani pbm butter paneer'),
 'Paneer (raw, full fat)': ('100 g', 100, G(PANEER), 'IFCT', 'cottage cheese'),
 'Paneer (raw)': ('100 g', 100, G(PANEER), 'IFCT', 'cottage cheese'),
 'Chicken curry (mess, 2 pieces)': ('1 katori with 2 pieces (200 g)', 200, I('ASC240', cook=0.85), 'INDB', 'chicken rassa murgh curry'),
 'Butter chicken': ('1 bowl (250 g)', 250, I('ASC242', cook=0.85, extra=[(BUTTER, 15), (CREAM, 30)]), 'INDB', 'murgh makhani'),
 'Egg curry (2 eggs)': ('1 katori with 2 eggs (200 g)', 200, R([(EGG, 100), (ONION, 40), (TOM, 50), (OIL, 10), ('water', 60)], cooked=230), 'recipe', 'anda curry egg masala'),
 'Boiled egg': ('1 large egg (50 g)', 50, G(EGGB), 'IFCT', 'anda ubla anda'),
 'Boiled eggs (2)': ('2 large eggs (100 g)', 100, G(EGGB), 'IFCT', 'anda'),
 'Omelette (1 egg)': ('1 egg (50 g) with 1 tsp oil', 55, R([(EGG, 50), (OIL, 5), (ONION, 5)], cooked=55), 'recipe', 'omlet amlet'),
 'Omelette (2 egg)': ('2 eggs (100 g) with 1 tsp oil', 105, R([(EGG, 100), (OIL, 5), (ONION, 10)], cooked=105), 'recipe', 'omlet amlet'),
 'Egg bhurji (2 egg)': ('1 katori (2 eggs, 130 g)', 130, R([(EGG, 100), (OIL, 8), (ONION, 25), (TOM, 20)], cooked=130), 'recipe', 'anda bhurji scrambled'),
 'Cow milk': ('1 glass (250 ml)', 258, G(MILK), 'IFCT', 'doodh dudh gai'),
 'Buffalo milk': ('1 glass (250 ml)', 258, G(BMILK), 'IFCT', 'bhains doodh mhais'),
 'Curd (full cream)': ('1 katori (150 g)', 150, G(BMILK), 'IFCT', 'dahi yogurt dahi'),
 'Poha': ('1 plate (200 g)', 200, I('BFP044', cooked=40 * 2.2 + 69 + 35, extra=[(ONION, 35)]), 'INDB', 'pohe kanda pohe kande pohe batata pohe'),
 'Rava upma': ('1 katori (200 g)', 200, I('BFP039', cook=0.9), 'INDB', 'upma uppittu suji upma'),
 'Idli': ('1 piece (40 g)', 40, I('ASC144', cook=0.9), 'INDB', 'idly'),
 'Plain dosa': ('1 medium (80 g)', 80, I('BFP148', cooked=145 + 145 * 0.9), 'INDB', 'sada dosa dosai'),
 'Masala dosa': ('1 piece (180 g)', 180, I('ASC146', cook=0.75, extra=[(OIL, 10)]), 'INDB', 'masala dosai'),
 'Medu vada': ('1 piece (50 g)', 50, I('BFP436', cooked=61 + 15 + 60, oil=0.15), 'INDB', 'uddina vada ulundu vadai vada'),
 'Samosa': ('1 piece (70 g)', 70, I('ASC361', cook=0.85, oil=0.18), 'INDB', 'samosa aloo samosa singara'),
 'Vada pav': ('1 piece (150 g)', 150, M([(R([(POT, 100), (BESAN, 25), (GARLIC, 3), (GCHILLI, 3), ('water', 25)], cooked=140, oil=0.12), 75), (B_PAV, 60), (I('ASC387', cook=1.0), 10), (I('OSR080', cook=1.0), 5)]), 'recipe', 'wada pav vadapav batata vada pav'),
 'Pav bhaji': ('2 pav + bhaji (300 g)', 300, M([(I('OSR112', cook=0.8), 200), (B_PAV, 80), (G(BUTTER), 10)]), 'INDB', 'paav bhaji'),
 'Misal pav': ('1 plate (misal 250 g + farsan 30 g + 2 pav)', 360, M([(B_MISAL_RASSA, 250), (B_SEV, 30), (B_PAV, 80)]), 'recipe', 'missal pav misal paav'),
 'Gulab jamun': ('1 piece with syrup (40 g)', 40, M([(B_JAMUN_BALL, 22), (B_SYRUP60, 18)]), 'recipe', 'gulabjamun gulab jaman'),
 'Rasgulla': ('1 piece with syrup (50 g)', 50, M([(B_CHHENA, 12), (B_SYRUP35, 38)]), 'recipe', 'rasagola rosogolla roshogolla'),
 'Rasmalai': ('2 pieces (120 g)', 120, M([(B_CHHENA, 24), (B_SYRUP35, 16), (R([(MILK, 1000), (SUGAR, 70)], cooked=600), 80)]), 'recipe', 'ras malai rossomalai'),
 'Gajar halwa': ('1 katori (100 g)', 100, I('ASC295', cook=0.6), 'INDB', 'gajar ka halwa carrot halwa'),
 'Sooji halwa': ('1 bowl (150 g)', 150, I('ASC293', cook=0.85), 'INDB', 'suji halwa rava sheera'),
 'Moong dal halwa': ('1 bowl (100 g)', 100, I('ASC299', cook=0.75), 'INDB', 'mung dal halwa'),
 'Rice kheer': ('1 katori (150 g)', 150, I('ASC282', cook=0.6), 'INDB', 'chawal ki kheer payasam doodh pak'),
 'Sweet lassi': ('1 glass (250 ml)', 260, R([(CURD, 160), (SUGAR, 20), ('water', 80)], cooked=260), 'recipe', 'meethi lassi'),
 'Salted lassi': ('1 glass (250 ml)', 255, R([(CURD, 150), ('water', 105)], cooked=255), 'recipe', 'namkeen lassi'),
 'Chaas (buttermilk)': ('1 glass (250 ml)', 250, R([(CURD, 80), ('water', 170)], cooked=250), 'recipe', 'taak mattha chhaas majjige'),
 'Banana': ('1 medium (120 g edible)', 120, G(BANANA), 'IFCT', 'kela keli'),
 'Apple': ('1 medium (150 g edible)', 150, G(APPLE), 'IFCT', 'seb safarchand'),
 'Masala chai with sugar': ('1 cup (150 ml)', 150, R([(MILK, 60), (SUGAR, 10), (TEA, 1), ('water', 100)], cooked=150), 'recipe', 'chai tea chaha cha'),
 'Chai without sugar': ('1 cup (150 ml)', 150, R([(MILK, 60), ('water', 100)], cooked=150), 'recipe', 'tea no sugar'),
 'Coffee with milk': ('1 cup (150 ml, 1 tsp sugar)', 150, R([(MILK, 100), (SUGAR, 5), (COFFEE, 2), ('water', 50)], cooked=150), 'recipe', 'coffee kaapi'),
 'Coffee with milk, no sugar': ('1 cup (150 ml)', 150, R([(MILK, 100), (COFFEE, 2), ('water', 50)], cooked=150), 'recipe', 'coffee no sugar'),
 'Whey protein scoop (in water)': ('1 scoop (30 g) in water', 30, FIX(120, 24, 3, 1.5, 30), 'label', 'whey protein shake'),
 'Instant noodles (1 packet)': (None, None, None, None, 'maggi maggie noodles'),
 'Sabudana khichdi': ('1 plate (200 g)', 200, I('OSR099', cook=0.85), 'INDB', 'sabudana khichadi sago khichdi'),
 'Chicken biryani (mess)': ('1 plate (300 g)', 300, R([(RICE, 80), (CHKT, 80), (ONION, 40), (CURD, 15), (OIL, 10), (TOM, 20)], cooked=80 * 2.8 + 60 + 25 + 15 + 10 + 15), 'recipe', 'chicken biriyani'),
 'Mutton biryani': ('1 plate (400 g)', 400, R([(RICE, 100), (MUTTON, 100), (ONION, 50), (CURD, 20), (OIL, 12), (GHEE, 5)], cooked=100 * 2.8 + 75 + 35 + 20 + 17), 'recipe', 'mutton biriyani gosht biryani'),
 'Egg biryani': ('1 plate (350 g)', 350, R([(RICE, 90), (EGGB, 100), (ONION, 40), (OIL, 12), (TOM, 20), (CURD, 10)], cooked=90 * 2.8 + 100 + 30 + 12 + 15 + 10), 'recipe', 'anda biryani egg biriyani'),
 'Idli sambar': ('2 idli + 1 katori sambar (230 g)', 230, M([(I('ASC144', cook=0.9), 80), (I('ASC167', cook=1.0), 150)]), 'INDB', 'idly sambhar'),
 'White sauce pasta': ('1 plate (300 g)', 300, R([(PASTA, 80), (MILK, 150), (BUTTER, 10), (MAIDA, 10), (PCHEESE, 15), (CAPS, 15), (CORN, 20)], cooked=300), 'recipe', 'bechamel pasta penne white sause'),
 'Red sauce pasta': ('1 plate (300 g)', 300, R([(PASTA, 85), (TOM, 150), (ONION, 25), (CAPS, 15), (TPUREE, 15), (OIL, 10), (PCHEESE, 10)], cooked=300), 'recipe', 'tomato sauce pasta penne rossa marinara'),
 'Pink sauce pasta': ('1 plate (300 g)', 300, R([(PASTA, 80), (TOM, 100), (TPUREE, 10), (MILK, 80), (CREAM, 15), (BUTTER, 7), (MAIDA, 5), (PCHEESE, 10), (OIL, 5), (ONION, 20)], cooked=300), 'recipe', 'rose sauce pasta mix sauce pasta'),
 'Mac and cheese': ('1 bowl (250 g)', 250, I('ASC133', cook=0.95), 'INDB', 'macaroni cheese mac n cheese'),
 'Spaghetti aglio olio': ('1 plate (250 g)', 250, R([(PASTA, 90), (OLIVE, 15), (GARLIC, 10), (GCHILLI, 3)], cooked=235), 'recipe', 'aglio e olio garlic oil pasta'),
}

# keyword-only additions for existing rows
KW = {
 'Onion bhajji': 'kanda bhaji kanda bhajji pyaz pakoda onion pakora',
 'Jowar roti': 'jowar bhakri jwari bhakri jondhale',
 'Bajra roti': 'bajra bhakri bajri bhakri',
 'Ragi roti': 'nachni bhakri ragi bhakri',
 'Sooji sheera': 'rava sheera suji halwa shira',
 'Veg hakka noodles': 'chowmein chow mein veg noodles',
 'Chicken hakka noodles': 'chicken chowmein chow mein',
 'Misal (without pav)': 'missal usal rassa',
 'Matki usal': 'moth bean usal matki usal',
 'Zunka (Maharashtrian)': 'jhunka besan',
 'Pithla (Maharashtrian)': 'pitla pithle besan',
 'Thalipeeth': 'thalipith bhajani',
 'Sol kadhi': 'solkadhi kokum kadhi',
 'Modak steamed': 'ukadiche modak',
 'Batata vada': 'aloo vada potato vada',
 'Sabudana vada': 'sago vada',
 'Chole bhature': 'chhole bhature chole bhatura',
 'Pani puri': 'golgappa gol gappa puchka panipuri',
 'Bhel puri': 'bhelpuri bhel',
 'Dabeli': 'kutchi dabeli',
 'Kachori': 'kachauri',
 'Malpua': 'malpoa',
 'Basundi': 'basundi',
 'Shrikhand': 'shrikhand',
 'Kulfi': 'kulfi',
 'Rabri': 'rabdi rabadi',
 'Kaju katli': 'kaju barfi kaju katri',
 'Mysore pak': 'mysorepak',
 'Jalebi': 'jilebi jalebi',
 'Sugarcane juice': 'ganne ka ras usacha ras',
 'Nimbu pani (sweet)': 'lemonade shikanji limbu sarbat',
 'Nimbu pani (salted)': 'lemon water shikanji',
 'Masala chaas': 'masala taak mattha',
 'Papad roasted': 'papadum appalam',
 'Papad fried': 'papadum appalam',
 'Pickle (achar)': 'achaar loncha lonche mango pickle',
 'Green chutney': 'hari chutney pudina chutney mint coriander chutney',
 'Imli chutney': 'tamarind chutney saunth chutney',
 'Kachumber salad': 'koshimbir kachumbar',
 'Veg biryani': 'vegetable biriyani',
 'Medu vada': 'uddina vada ulundu vadai',
 'Puran poli': 'puranpoli',
}

# ---------------------------------------------------------------- new items
# (name, category, serving label, grams, base, src, kw)
NEW = [
 # ---- user-named
 ('Shahi tukda', 'Sweets & desserts', '1 piece (110 g)', 110,
  M([(R([(BREAD, 50)], cooked=45, oil=0.25), 45), (R([(SUGAR, 50), ('water', 30)], cooked=70), 25), (B_RABRI, 40)]), 'recipe', 'shahi tukra double ka meetha shahi tukde shahi tukre'),
 ('Mexican rice', 'Continental', '1 plate (250 g)', 250, B_MEXRICE, 'recipe', 'mexican rice spanish rice mexi rice'),
 ('Arrabbiata pasta', 'Continental', '1 plate (300 g)', 300,
  R([(PASTA, 90), (TOM, 150), (ONION, 20), (GARLIC, 6), (TPUREE, 15), (OIL, 10)], cooked=300), 'recipe', 'arabita arrabiata arabiata arrabbiata red sauce penne spicy tomato pasta'),
 # ---- continental
 ('Alfredo pasta (veg, cream)', 'Continental', '1 plate (300 g)', 300,
  R([(PASTA, 85), (CREAM, 60), (BUTTER, 12), (CHEDDAR, 15), (MILK, 60), (GARLIC, 4), (MUSH, 30)], cooked=300), 'recipe', 'alfredo fettuccine alfredo cream pasta white pasta'),
 ('Pesto pasta', 'Continental', '1 plate (280 g)', 280,
  R([(PASTA, 85), (OIL, 18), (CHEDDAR, 10), (CASHEW, 10), (SPIN, 15), (GARLIC, 4), (TOM, 30)], cooked=280), 'recipe', 'basil pesto pasta green pasta'),
 ('Baked pasta (veg, cheese)', 'Continental', '1 portion (300 g)', 300,
  R([(PASTA, 75), (MILK, 120), (BUTTER, 8), (MAIDA, 8), (MOZZ, 30), (CAPS, 20), (CORN, 30)], cooked=300), 'recipe', 'baked penne pasta bake au gratin pasta'),
 ('Masala macaroni (desi)', 'Continental', '1 plate (250 g)', 250,
  R([(PASTA, 70), (ONION, 30), (TOM, 50), (CAPS, 20), (PEAS, 20), (OIL, 10), (KETCHUP, 10)], cooked=250), 'recipe', 'macaroni masala pasta indian style macroni'),
 ('Chicken pasta (red sauce)', 'Continental', '1 plate (330 g)', 330,
  R([(PASTA, 85), (CHKB, 70), (TOM, 140), (ONION, 20), (GARLIC, 5), (TPUREE, 15), (OIL, 10)], cooked=330), 'recipe', 'chicken penne arrabbiata tomato'),
 ('Veg burrito bowl', 'Continental', '1 bowl (400 g)', 400,
  M([(B_MEXRICE, 200), (B_BEANS, 100), (B_SALSA, 50), (G(SOURCREAM), 20), (G(CHEDDAR), 15), (G(LETTUCE), 15)]), 'recipe', 'burrito bowl rice beans mexican bowl'),
 ('Chicken burrito bowl', 'Continental', '1 bowl (420 g)', 420,
  M([(B_MEXRICE, 200), (B_GRILLCHK, 90), (B_BEANS, 60), (B_SALSA, 40), (G(SOURCREAM), 15), (G(CHEDDAR), 15)]), 'recipe', 'chicken burrito bowl mexican bowl'),
 ('Loaded nachos (beans, cheese)', 'Continental', '1 plate (200 g)', 200,
  M([(B_CHIPS, 70), (I('ASC074', cook=1.0), 50), (B_BEANS, 50), (B_SALSA, 30)]), 'recipe', 'nachos cheese nachos loaded'),
 ('Veg cheese quesadilla', 'Continental', '1 quesadilla (180 g)', 180,
  M([(B_TORTILLA, 80), (G(MOZZ), 40), (R([(CAPS, 20), (ONION, 15), (CORN, 15), (OIL, 2)], cooked=48), 50), (G(BUTTER), 5), (B_SALSA, 5)]), 'recipe', 'quesadilla kesadia'),
 ('Veg sizzler', 'Continental', '1 sizzler plate (500 g)', 500,
  M([(I('ASC366', cook=0.9, oil=0.12), 100), (B_FRIEDRICE, 150), (B_STIRVEG, 120), (B_FRIES, 60), (G(TOMSAUCE), 60), (G(BUTTER), 10)]), 'recipe', 'sizzler veg sizzler'),
 ('Chicken sizzler', 'Continental', '1 sizzler plate (500 g)', 500,
  M([(B_GRILLCHK, 150), (B_FRIEDRICE, 150), (B_STIRVEG, 90), (B_FRIES, 50), (G(TOMSAUCE), 50), (G(BUTTER), 10)]), 'recipe', 'sizzler chicken steak sizzler'),
 ('Paneer shashlik sizzler', 'Continental', '1 sizzler plate (500 g)', 500,
  M([(R([(PANEER, 100), (OIL, 6), (CURD, 10)], cooked=105), 120), (B_FRIEDRICE, 150), (B_STIRVEG, 120), (B_FRIES, 50), (G(TOMSAUCE), 50), (G(BUTTER), 10)]), 'recipe', 'paneer sizzler shaslik shashlik'),
 ('Veg au gratin', 'Continental', '1 portion (250 g)', 250, I('BFP293', cook=0.85), 'INDB', 'baked vegetables au gratin cheese bake'),
 ('Mashed potatoes', 'Continental', '1 portion (180 g)', 180, R([(POT, 160), (BUTTER, 10), (MILK, 30)], cooked=180), 'recipe', 'mash potato'),
 ('Pasta salad', 'Continental', '1 bowl (150 g)', 150, I('ASC255', cook=1.0), 'INDB', 'macaroni salad'),
 ('Spaghetti bolognese (chicken mince)', 'Continental', '1 plate (330 g)', 330,
  R([(PASTA, 85), (CHKT, 80), (TOM, 120), (ONION, 30), (TPUREE, 15), (OIL, 10)], cooked=330), 'recipe', 'bolognaise spaghetti meat sauce'),
 ('Salsa (Mexican)', 'Continental', '2 tbsp (30 g)', 30, B_SALSA, 'recipe', 'pico de gallo tomato salsa'),
 ('Garlic bread (mess, 2 slices)', 'Continental', '2 slices (70 g)', 70, M([(G(BREAD), 55), (G(BUTTER), 12), (G(GARLIC), 3)]), 'recipe', 'garlic toast'),
 ('Veg mayo sandwich', 'Sandwiches & toast', '1 sandwich (2 slices, 140 g)', 140, I('ASC036', cook=1.0), 'INDB', 'mayonnaise sandwich veg mayo'),
 ('Paneer tikka pasta', 'Continental', '1 plate (320 g)', 320,
  R([(PASTA, 80), (PANEER, 60), (TOM, 120), (ONION, 25), (CREAM, 20), (OIL, 10)], cooked=320), 'recipe', 'paneer pasta makhani pasta'),
 # ---- Maharashtrian
 ('Mixed sprouts usal', 'Dals & legumes', '1 katori (150 g)', 150,
  R([(MOONGW, 20), (MATKI, 20), (ONION, 25), (TOM, 30), (COCO, 8), (OIL, 7), ('water', 150)], cooked=210), 'recipe', 'usal sprouts usal mod aalele kadhdhanya'),
 ('Kolhapuri misal pav', 'Street food & chaat', '1 plate (misal 250 g + farsan 40 g + 2 pav)', 370,
  M([(R([(MATKI, 40), (ONION, 35), (TOM, 25), (DCOCO, 12), (OIL, 20), (GARLIC, 4), ('water', 260)], cooked=320), 250), (B_SEV, 40), (B_PAV, 80)]), 'recipe', 'kolhapuri missal tari misal spicy misal'),
 ('Dahi misal', 'Street food & chaat', '1 plate (misal 200 g + curd 80 g + farsan 30 g + 2 pav)', 390,
  M([(B_MISAL_RASSA, 200), (B_CURD, 80), (B_SEV, 30), (B_PAV, 80)]), 'recipe', 'dahi missal curd misal'),
 ('Vegetable poha', 'Breakfast', '1 plate (200 g)', 200, I('BFP045', cooked=40 * 2.0 + 95 + 30, extra=[(ONION, 30)]), 'INDB', 'veg poha matar poha batata pohe'),
 ('Dadpe pohe', 'Breakfast', '1 plate (150 g)', 150, R([(POHA, 50), (COCO, 20), (ONION, 30), (TOM, 20), (OIL, 6), (LEMON, 3)], cooked=150), 'recipe', 'dadpe poha raw poha'),
 ('Samosa pav', 'Street food & chaat', '1 piece (samosa + pav, 120 g)', 120, M([(I('ASC361', cook=0.85, oil=0.18), 70), (B_PAV, 40), (I('ASC387', cook=1.0), 10)]), 'INDB', 'samosa pao'),
 ('Pithla bhakri', 'Meals & combos', '1 katori pithla + 2 jowar bhakri (270 g)', 270,
  M([(R([(BESAN, 40), (ONION, 30), (OIL, 10), (GARLIC, 3), ('water', 150)], cooked=200), 150), (R([(JOWAR, 100), ('water', 60)], cooked=135), 120)]), 'recipe', 'pitla bhakri pithla bhakar jowar bhakri'),
 ('Zunka bhakri', 'Meals & combos', '1 katori zunka + 2 jowar bhakri (220 g)', 220,
  M([(R([(BESAN, 50), (ONION, 50), (OIL, 12), ('water', 40)], cooked=130), 100), (R([(JOWAR, 100), ('water', 60)], cooked=135), 120)]), 'recipe', 'jhunka bhakri zunka bhakar'),
 ('Jowar bhakri (plain)', 'Breads', '1 bhakri (60 g)', 60, R([(JOWAR, 100), ('water', 60)], cooked=135), 'IFCT', 'jwari bhakri jowar roti jondhalyachi bhakri'),
 ('Bharli vangi', 'Veg curries & sabzi', '1 katori (150 g)', 150,
  R([(BRINJAL, 150), (PNUT, 15), (DCOCO, 12), (ONION, 30), (OIL, 12), (JAGGERY, 3), ('water', 40)], cooked=220), 'recipe', 'bharli vangi stuffed brinjal bharwa baingan masala vangi'),
 ('Puran poli', 'Sweets & desserts', '1 piece (70 g)', 70, I('ASC467', cooked=214 * 1.05), 'INDB', 'puranpoli holige obbattu poli'),
 ('Puran poli with ghee', 'Sweets & desserts', '1 piece (70 g) + 1 tsp ghee', 75, M([(I('ASC467', cooked=214 * 1.05), 70), (G(GHEE), 5)]), 'INDB', 'puranpoli tup'),
 ('Aamti (Maharashtrian dal)', 'Dals & legumes', '1 katori (150 g)', 150,
  R([(TOOR, 35), (OIL, 6), (JAGGERY, 5), (TAMARIND, 3), (COCO, 5), ('water', 200)], cooked=240), 'recipe', 'amti toor dal amti goda masala dal'),
 ('Katachi aamti', 'Dals & legumes', '1 katori (150 ml)', 150,
  R([(CHANAD, 20), (OIL, 6), (JAGGERY, 5), (TAMARIND, 3), (DCOCO, 5), ('water', 230)], cooked=240), 'recipe', 'katachi amti puran water dal'),
 ('Varan bhaat', 'Meals & combos', '1 plate (rice 200 g + varan 100 g + 1 tsp ghee)', 305,
  M([(B_RICE, 200), (R([(TOOR, 40), ('water', 180)], cooked=200), 100), (G(GHEE), 5)]), 'recipe', 'varan bhat dal rice tup'),
 ('Masale bhaat', 'Rice & grains', '1 plate (250 g)', 250,
  R([(RICE, 80), (BRINJAL, 40), (PEAS, 20), (DCOCO, 8), (OIL, 12), (CASHEW, 3), ('water', 0)], cooked=80 * 2.8 + 60 + 8 + 15), 'recipe', 'masala bhaat masale bhat goda masala rice'),
 ('Kolhapuri chicken (tambda rassa)', 'Chicken', '1 bowl with 3 pieces (250 g)', 250,
  R([(CHKT, 150), (ONION, 50), (DCOCO, 15), (OIL, 15), (TOM, 20), ('water', 120)], cooked=320), 'recipe', 'kolhapuri chicken tambda rassa tambada rassa'),
 ('Pandhra rassa', 'Soups', '1 bowl (200 ml)', 200,
  R([(CHKT, 30), (COCO, 25), (OIL, 5), ('water', 220)], cooked=250), 'recipe', 'pandhara rassa white rassa kolhapuri'),
 ('Alu wadi (patra)', 'Street food & chaat', '4 pieces (80 g)', 80,
  R([(BESAN, 50), ('C018', 40), (JAGGERY, 8), (TAMARIND, 4), (OIL, 6), ('water', 30)], cooked=125, oil=0.12), 'recipe', 'aluwadi patra patrode colocasia leaves'),
 ('Shev bhaji', 'Veg curries & sabzi', '1 katori (150 g)', 150,
  M([(R([(ONION, 40), (TOM, 40), (DCOCO, 8), (OIL, 10), ('water', 100)], cooked=170), 110), (B_SEV, 40)]), 'recipe', 'sev bhaji shev bhaji khandeshi'),
 ('Batata bhaji (dry)', 'Veg curries & sabzi', '1 katori (150 g)', 150,
  R([(POT, 180), (OIL, 10), (ONION, 15), (GCHILLI, 3), (COCO, 5)], cooked=190), 'recipe', 'batatyachi bhaji aloo bhaji potato bhaji'),
 ('Chakli', 'Packaged snacks', '2 pieces (30 g)', 30, R([(RICEFLOUR, 70), (BESAN, 20), (URADD, 10), (BUTTER, 4), ('water', 40)], cooked=105, oil=0.28), 'recipe', 'chakali murukku'),
 ('Bhakarwadi', 'Packaged snacks', '6 pieces (30 g)', 30, R([(BESAN, 50), (MAIDA, 30), (DCOCO, 10), (SESAME, 5), (SUGAR, 5), ('water', 30)], cooked=110, oil=0.30), 'recipe', 'bakarwadi bhakarvadi'),
 ('Poha chivda', 'Packaged snacks', '1 katori (30 g)', 30, R([(POHA, 70), (PNUT, 15), (DCOCO, 5), (SUGAR, 3), (OIL, 18)], cooked=110), 'recipe', 'chiwda chivda namkeen poha mixture'),
 ('Amrakhand', 'Sweets & desserts', '1 katori (100 g)', 100,
  R([(CURD, 250), (SUGAR, 40), ('E042', 50)], cooked=170), 'recipe', 'aamrakhand mango shrikhand'),
 ('Piyush', 'Beverages', '1 glass (200 ml)', 210, R([(CURD, 60), (MILK, 60), (SUGAR, 20), ('water', 60)], cooked=200), 'recipe', 'piyush shrikhand drink'),
 ('Malvani fish curry', 'Mutton & fish', '1 bowl (200 g)', 200,
  R([(ROHU, 100), (COCO, 30), (ONION, 30), (OIL, 10), (TAMARIND, 3), ('water', 100)], cooked=250), 'recipe', 'malvani fish curry konkani coastal fish curry'),
 # ---- North Indian dals & gravies
 ('Mixed dal (mess)', 'Dals & legumes', '1 katori (150 g)', 150, I('ASC155', cook=0.85), 'INDB', 'mix dal panchmel mixed daal'),
 ('Khatti dal', 'Dals & legumes', '1 katori (150 g)', 150, I('BFP170', cook=0.85, extra=[(OIL, 4)]), 'INDB', 'khatti daal sour dal hyderabadi'),
 ('Punjabi kadhi (without pakora)', 'Dals & legumes', '1 katori (150 g)', 150, R([(CURD, 100), (BESAN, 12), (OIL, 4), ('water', 100)], cooked=200), 'recipe', 'kadhi plain kadi'),
 ('Gatte ki kadhi', 'Dals & legumes', '1 katori (150 g)', 150, I('BFP187', cook=0.85), 'INDB', 'gatte curry besan gatte rajasthani'),
 ('Dahi aloo', 'Veg curries & sabzi', '1 katori (150 g)', 150, I('BFP242', cook=0.85), 'INDB', 'dahi wale aloo curd potato'),
 ('Soya matar', 'Paneer & soya', '1 katori (150 g)', 150, I('BFP206', cook=0.85), 'INDB', 'soya chunks matar nutrela matar nutrinugget'),
 ('Soya chunks korma', 'Paneer & soya', '1 katori (150 g)', 150, I('BFP204', cook=0.85), 'INDB', 'nutrela korma soya korma'),
 ('Methi malai paneer', 'Paneer & soya', '1 katori (150 g)', 150, I('ASC223', cook=0.85), 'INDB', 'methi paneer malai'),
 ('Paneer curry (mess)', 'Paneer & soya', '1 katori (150 g)', 150, I('ASC195', cook=0.85), 'INDB', 'paneer masala paneer gravy'),
 ('Bhindi do pyaza', 'Veg curries & sabzi', '1 katori (150 g)', 150, R([(OKRA, 150), (ONION, 60), (OIL, 12), (TOM, 20)], cooked=190), 'recipe', 'bhindi do pyaaza okra onion'),
 ('Cabbage matar', 'Veg curries & sabzi', '1 katori (150 g)', 150, I('ASC173', cook=0.85), 'INDB', 'patta gobhi matar band gobhi'),
 ('Chicken korma (mess)', 'Chicken', '1 bowl (200 g)', 200, I('BFP222', cook=0.85), 'INDB', 'murgh korma'),
 ('Afghani chicken', 'Chicken', '1 serving (200 g)', 200, I('OSR062', cook=0.75), 'INDB', 'afgani chicken white chicken'),
 ('Mutton do pyaza', 'Mutton & fish', '1 bowl (200 g)', 200, I('ASC234', cook=0.8), 'INDB', 'gosht do pyaza'),
 ('Keema matar (mutton)', 'Mutton & fish', '1 bowl (200 g)', 200, I('ASC229', cook=0.8), 'INDB', 'kheema matar mutton keema peas'),
 ('Kosha mangsho', 'Mutton & fish', '1 bowl (200 g)', 200, R([(MUTTON, 150), (ONION, 60), (CURD, 30), (OIL, 18), (POT, 30)], cooked=230), 'recipe', 'kosha mangsho bengali mutton'),
 ('Mutton Kolhapuri', 'Mutton & fish', '1 bowl (200 g)', 200, R([(MUTTON, 120), (ONION, 50), (DCOCO, 15), (OIL, 15), (TOM, 20), ('water', 100)], cooked=250), 'recipe', 'kolhapuri mutton tambda rassa'),
 # ---- South Indian
 ('Rasam rice', 'Rice & grains', '1 plate (250 g)', 250, M([(B_RICE, 170), (I('BFP176', cook=0.85), 80)]), 'INDB', 'rasam sadam rasam annam'),
 ('Sambar rice', 'Rice & grains', '1 plate (300 g)', 300, M([(B_RICE, 180), (I('ASC167', cook=0.85), 120)]), 'INDB', 'sambar sadam sambar annam'),
 ('Kesari bath', 'Sweets & desserts', '1 katori (120 g)', 120, I('OSR014', cook=0.85), 'INDB', 'rava kesari kesari bhath sheera'),
 ('Kerala parotta', 'Breads', '1 piece (90 g)', 90, R([(MAIDA, 100), (OIL, 15), (SUGAR, 2), (EGG, 0), ('water', 55)], cooked=155), 'recipe', 'malabar parotta porotta paratha layered'),
 ('Paper dosa', 'South Indian', '1 large (100 g)', 100, I('BFP148', cooked=145 + 145 * 0.75, extra=[(OIL, 6)]), 'INDB', 'paper roast dosa'),
 ('Paneer dosa', 'South Indian', '1 piece (200 g)', 200, I('BFP151', cook=0.8), 'INDB', 'paneer masala dosa'),
 ('Cheese dosa', 'South Indian', '1 piece (130 g)', 130, M([(I('BFP148', cooked=145 + 145 * 0.9), 100), (G(PCHEESE), 25), (G(BUTTER), 5)]), 'INDB', 'cheese dosai'),
 ('Egg dosa', 'South Indian', '1 piece (130 g)', 130, M([(I('BFP148', cooked=145 + 145 * 0.9), 80), (G(EGG), 50)]), 'INDB', 'mutta dosa anda dosa'),
 ('Onion rava dosa', 'South Indian', '1 piece (140 g)', 140, I('ASC147', cook=0.85, extra=[(ONION, 40), (OIL, 8)]), 'INDB', 'rava dosa onion'),
 ('Ghee podi idli', 'South Indian', '4 mini idli / 2 idli (100 g)', 100, M([(I('ASC144', cook=0.9), 85), (I('BFP448', cook=1.0), 8), (G(GHEE), 7)]), 'INDB', 'podi idly gunpowder idli'),
 # ---- Gujarati
 ('Methi muthia (steamed)', 'Breakfast', '6 pieces (100 g)', 100, R([(ATTA, 40), (BESAN, 25), (METHI, 30), (OIL, 6), (SUGAR, 3), ('water', 30)], cooked=125), 'recipe', 'muthia muthiya dudhi muthia'),
 ('Rava dhokla', 'Breakfast', '3 pieces (100 g)', 100, I('OSR115', cook=0.95), 'INDB', 'suji dhokla semolina dhokla'),
 ('Sev usal', 'Street food & chaat', '1 plate (usal 200 g + sev 30 g)', 230, M([(R([(WPEAS, 40), (ONION, 30), (TOM, 30), (OIL, 10), ('water', 180)], cooked=230), 200), (B_SEV, 30)]), 'recipe', 'sev usal vadodara'),
 # ---- Bengali / Odia
 ('Cholar dal', 'Dals & legumes', '1 katori (150 g)', 150, R([(CHANAD, 40), (COCO, 8), (GHEE, 5), (SUGAR, 4), (RAISIN, 2), ('water', 170)], cooked=220), 'recipe', 'cholar daal bengali chana dal'),
 ('Luchi', 'Breads', '1 piece (25 g)', 25, R([(MAIDA, 100), (GHEE, 5), ('water', 45)], cooked=130, oil=0.18), 'recipe', 'luchi bengali puri'),
 ('Begun bhaja', 'Veg curries & sabzi', '2 slices (80 g)', 80, R([(BRINJAL, 100)], cooked=80, oil=0.15), 'recipe', 'baingan fry brinjal fry'),
 ('Chhena poda', 'Sweets & desserts', '1 slice (75 g)', 75, I('OSR022', cook=0.75), 'INDB', 'chenna poda odia'),
 ('Dalma', 'Dals & legumes', '1 katori (150 g)', 150, I('OSR141', cook=0.85), 'INDB', 'odia dalma dal vegetables'),
 # ---- Indo-Chinese
 ('Veg chilli garlic noodles', 'Indo-Chinese', '1 plate (300 g)', 300, I('ASC134', cook=0.85, extra=[(GARLIC, 8), (OIL, 5)]), 'INDB', 'chilli garlic noodles chowmein'),
 ('Gobi 65', 'Indo-Chinese', '1 plate (150 g)', 150, R([(CAULI, 150), (MAIDA, 15), (CORNFLOUR, 15), (CURD, 10)], cooked=170, oil=0.16), 'recipe', 'gobi65 cauliflower 65'),
 ('Manchurian fried rice combo', 'Indo-Chinese', '1 plate (fried rice 250 g + manchurian gravy 150 g)', 400,
  M([(B_FRIEDRICE, 250), (R([(CABB, 80), (CARROT, 20), (MAIDA, 15), (CORNFLOUR, 12), (SOY, 6), (OIL, 4), ('water', 80)], cooked=200, oil=0.08), 150)]), 'recipe', 'manchurian rice combo'),
 ('Chicken schezwan fried rice', 'Indo-Chinese', '1 plate (300 g)', 300, I('ASC129', cook=0.85, extra=[(CHKB, 70), (OIL, 6), (TOM, 10)]), 'INDB', 'schezwan chicken rice szechuan'),
 # ---- Breads / parathas
 ('Plain kulcha', 'Breads', '1 piece (80 g)', 80, R([(MAIDA, 100), (CURD, 20), (OIL, 5), ('water', 35)], cooked=140), 'recipe', 'kulcha'),
 ('Dal paratha', 'Breads', '1 medium (90 g)', 90, I('ASC101', cook=0.85), 'INDB', 'dal parantha'),
 ('Matar paratha', 'Breads', '1 medium (110 g)', 110, I('ASC103', cook=0.85), 'INDB', 'mutter parantha peas paratha'),
 ('Keema paratha', 'Breads', '1 medium (120 g)', 120, I('ASC104', cook=0.85), 'INDB', 'kheema parantha'),
 # ---- Rice dishes
 ('Plain pulao', 'Rice & grains', '1 plate (200 g)', 200, I('ASC114', cook=0.85), 'INDB', 'pulav plain pulav'),
 ('Tamarind rice (mess)', 'Rice & grains', '1 plate (200 g)', 200, I('ASC127', cooked=80 * 2.8 + 54), 'INDB', 'pulihora puliyodharai chitrannam imli rice'),
 ('Plain khichdi', 'Rice & grains', '1 katori (200 g)', 200, R([(RICE, 40), (MOONGD, 25), (GHEE, 5), ('water', 230)], cooked=250), 'recipe', 'khichri dal khichdi'),
 ('Veg khichdi', 'Rice & grains', '1 katori (200 g)', 200, R([(RICE, 40), (MOONGD, 25), (POT, 30), (PEAS, 20), (CARROT, 20), (GHEE, 6), ('water', 260)], cooked=330), 'recipe', 'vegetable khichri masala khichdi'),
 # ---- Sweets & desserts
 ('Phirni', 'Sweets & desserts', '1 katori (120 g)', 120, I('ASC292', cook=0.8), 'INDB', 'firni phirnee'),
 ('Vanilla custard', 'Sweets & desserts', '1 katori (150 g)', 150, R([(MILK, 250), (CUSTARDP, 15), (SUGAR, 25)], cooked=270), 'recipe', 'custard custard pudding'),
 ('Fruit custard', 'Sweets & desserts', '1 katori (150 g)', 150, M([(R([(MILK, 250), (CUSTARDP, 15), (SUGAR, 25)], cooked=270), 100), (M([(G(BANANA), 20), (G(APPLE), 15), (G(GRAPES), 10), (G(POMEG), 5)]), 50)]), 'recipe', 'fruit custard fruit salad custard'),
 ('Caramel pudding', 'Sweets & desserts', '1 piece (120 g)', 120, I('ASC300', cook=0.9), 'INDB', 'caramel custard creme caramel'),
 ('Strawberry ice cream scoop', 'Sweets & desserts', '1 scoop (60 g)', 60, I('BFP348', cook=1.0), 'INDB', 'strawberry icecream'),
 ('Mango ice cream scoop', 'Sweets & desserts', '1 scoop (60 g)', 60, I('ASC305', cook=1.0), 'INDB', 'mango icecream'),
 ('Rava ladoo', 'Sweets & desserts', '1 ladoo (35 g)', 35, I('ASC342', cook=0.95), 'INDB', 'rava laddu suji ladoo sooji laddoo'),
 ('Til ladoo', 'Sweets & desserts', '1 ladoo (25 g)', 25, I('ASC344', cook=0.95), 'INDB', 'til laddu tilgul sesame ladoo'),
 ('Atta besan ladoo', 'Sweets & desserts', '1 ladoo (35 g)', 35, I('BFP406', cook=1.0), 'INDB', 'atta ladoo wheat ladoo'),
 ('Khoa ladoo', 'Sweets & desserts', '1 ladoo (35 g)', 35, I('BFP404', cook=0.95), 'INDB', 'mawa ladoo'),
 ('Besan barfi', 'Sweets & desserts', '1 piece (35 g)', 35, I('ASC340', cook=0.95), 'INDB', 'besan burfi'),
 ('Coconut barfi', 'Sweets & desserts', '1 piece (35 g)', 35, I('ASC336', cook=0.9), 'INDB', 'nariyal barfi coconut burfi khobra vadi'),
 ('Chocolate barfi', 'Sweets & desserts', '1 piece (30 g)', 30, I('ASC338', cook=0.95), 'INDB', 'chocolate burfi'),
 ('Lauki halwa', 'Sweets & desserts', '1 katori (120 g)', 120, R([(LAUKI, 300), (MILK, 150), (SUGAR, 45), (GHEE, 15), (KHOA, 20)], cooked=300), 'recipe', 'dudhi halwa ghiya halwa bottle gourd halwa'),
 ('Besan halwa', 'Sweets & desserts', '1 katori (100 g)', 100, I('OSR026', cook=0.75), 'INDB', 'besan sheera'),
 ('Sabudana kheer', 'Sweets & desserts', '1 katori (150 g)', 150, R([(MILK, 300), (SAGO, 25), (SUGAR, 25)], cooked=290), 'recipe', 'sago kheer sabudana payasam javvarisi'),
 ('Makhana kheer', 'Sweets & desserts', '1 katori (150 g)', 150, I('ASC283', cook=0.7), 'INDB', 'phool makhana kheer'),
 ('Kala jamun', 'Sweets & desserts', '1 piece with syrup (45 g)', 45, M([(R([(KHOA, 100), (MAIDA, 25), (MILK, 5)], cooked=118, oil=0.12), 27), (B_SYRUP60, 18)]), 'recipe', 'kala jam kalojam'),
 ('Bread pudding', 'Sweets & desserts', '1 portion (120 g)', 120, I('ASC326', cook=0.9), 'INDB', 'bread butter pudding'),
 ('Shakarpara', 'Packaged snacks', '1 katori (30 g)', 30, R([(MAIDA, 100), (SUGAR, 25), (GHEE, 10), (MILK, 30)], cooked=150, oil=0.18), 'recipe', 'shakkarpara shankarpali'),
 # ---- Beverages
 ('Cutting chai', 'Beverages', '1 cutting (80 ml)', 80, R([(MILK, 35), (SUGAR, 7), (TEA, 1), ('water', 45)], cooked=80), 'recipe', 'cutting chai half tea tapri chai'),
 ('Hot milk with sugar', 'Beverages', '1 glass (250 ml)', 260, R([(MILK, 250), (SUGAR, 10)], cooked=260), 'IFCT', 'garam doodh sweet milk'),
 ('Chikoo milkshake', 'Beverages', '1 glass (300 ml)', 310, R([(MILK, 200), (CHIKOO, 80), (SUGAR, 15), ('water', 15)], cooked=310), 'recipe', 'chiku milkshake sapota shake'),
 ('Cold coffee (mess, sweet)', 'Beverages', '1 glass (250 ml)', 255, R([(MILK, 220), (SUGAR, 20), (COFFEE, 3), ('water', 15)], cooked=255), 'recipe', 'cold coffee iced coffee'),
 ('Fresh mango juice', 'Beverages', '1 glass (250 ml)', 260, R([(MANGO, 150), (SUGAR, 10), ('water', 100)], cooked=260), 'recipe', 'mango juice aam ras'),
 ('Aamras', 'Sweets & desserts', '1 katori (150 g)', 150, R([('E042', 150), (SUGAR, 8)], cooked=158), 'IFCT', 'amras aam ras mango pulp'),
 ('Papaya juice', 'Beverages', '1 glass (250 ml)', 260, R([(PAPAYA, 180), (SUGAR, 8), ('water', 70)], cooked=260), 'recipe', 'papita juice'),
 ('Lemon soda (sweet)', 'Beverages', '1 glass (250 ml)', 260, R([(LEMON, 15), (SUGAR, 20), ('water', 225)], cooked=260), 'recipe', 'fresh lime soda sweet nimbu soda'),
 ('Kesar badam milk (mess)', 'Beverages', '1 glass (200 ml)', 210, R([(MILK, 200), (SUGAR, 15), (ALMOND, 5)], cooked=210), 'recipe', 'badam doodh kesar milk'),
 ('Masala milk', 'Beverages', '1 glass (200 ml)', 210, R([(MILK, 200), (SUGAR, 12), (ALMOND, 4), (PISTA, 2)], cooked=210), 'recipe', 'masala doodh'),
 # ---- Sides, raitas, chutneys
 ('Aloo raita', 'Sides & chutneys', '1 katori (100 g)', 100, I('ASC276', cook=1.0), 'INDB', 'potato raita'),
 ('Pineapple raita', 'Sides & chutneys', '1 katori (100 g)', 100, I('BFP325', cook=1.0), 'INDB', 'ananas raita'),
 ('Pomegranate raita', 'Sides & chutneys', '1 katori (100 g)', 100, I('OSR089', cook=1.0), 'INDB', 'anar raita anaar raita'),
 ('Pudina raita', 'Sides & chutneys', '1 katori (100 g)', 100, I('ASC275', cook=1.0), 'INDB', 'mint raita'),
 ('Lauki raita', 'Sides & chutneys', '1 katori (100 g)', 100, I('ASC272', cook=1.0), 'INDB', 'dudhi raita ghiya raita bottle gourd raita'),
 ('Carrot raita', 'Sides & chutneys', '1 katori (100 g)', 100, I('BFP316', cook=1.0), 'INDB', 'gajar raita'),
 ('Banana raita', 'Sides & chutneys', '1 katori (100 g)', 100, I('BFP326', cook=1.0), 'INDB', 'kela raita'),
 ('Onion raita', 'Sides & chutneys', '1 katori (100 g)', 100, I('OSR090', cook=1.0), 'INDB', 'pyaz raita kanda raita'),
 ('Masala papad', 'Sides & chutneys', '1 piece (40 g)', 40, M([(R([(URADD, 100)], cooked=100, oil=0.0), 12), (G(ONION), 12), (G(TOM), 12), (G(OIL), 2), (B_SEV, 2)]), 'recipe', 'masala papadum'),
 ('Fryums (fried)', 'Sides & chutneys', '1 handful (15 g)', 15, R([(SAGO, 50), (RICEFLOUR, 50)], cooked=90, oil=0.30), 'recipe', 'fryms papad fryums'),
 ('Coconut chutney (mess)', 'Sides & chutneys', '2 tbsp (40 g)', 40, R([(COCO, 60), (CHANAD, 10), (GCHILLI, 3), (OIL, 2), ('water', 40)], cooked=115), 'recipe', 'nariyal chutney'),
 ('Onion tomato chutney', 'Sides & chutneys', '2 tbsp (30 g)', 30, I('OSR083', cook=1.0), 'INDB', 'onion chutney vengaya chutney'),
 ('Garlic chutney (wet)', 'Sides & chutneys', '1 tbsp (15 g)', 15, I('OSR080', cook=1.0), 'INDB', 'lahsun chutney poondu chutney'),
 ('Mango pickle', 'Sides & chutneys', '1 tbsp (15 g)', 15, I('ASC507', cook=1.0), 'INDB', 'aam ka achar kairi loncha'),
 ('Lime pickle (sweet)', 'Sides & chutneys', '1 tbsp (15 g)', 15, I('ASC511', cook=1.0), 'INDB', 'nimbu achar limbu loncha'),
 ('Cucumber slices', 'Sides & chutneys', '1 katori (100 g)', 100, G(CUCUMBER), 'IFCT', 'kheera kakdi salad'),
 ('Fruit salad (sweetened)', 'Sides & chutneys', '1 bowl (150 g)', 150, I('ASC265', cook=1.0), 'INDB', 'fruit salad'),
 ('Boondi (plain, fried)', 'Packaged snacks', '2 tbsp (20 g)', 20, R([(BESAN, 100), ('water', 80)], cooked=110, oil=0.32), 'recipe', 'boondi raita boondi'),
 # ---- fruits (IFCT)
 ('Sapota (chikoo, 100 g)', 'Fruits', '100 g', 100, G(CHIKOO), 'IFCT', 'chikoo chiku sapota'),
 ('Guava (100 g)', 'Fruits', '100 g', 100, G(GUAVA), 'IFCT', 'peru amrud'),
 ('Papaya (1 bowl)', 'Fruits', '1 bowl (150 g)', 150, G(PAPAYA), 'IFCT', 'papita'),
 ('Watermelon (1 bowl)', 'Fruits', '1 bowl (200 g)', 200, G(WATERMELON), 'IFCT', 'tarbooj kalingad'),
 ('Pomegranate seeds (1 bowl)', 'Fruits', '1 bowl (100 g)', 100, G(POMEG), 'IFCT', 'anar dana'),
 ('Orange (1 medium)', 'Fruits', '1 medium (130 g edible)', 130, G(ORANGE), 'IFCT', 'santra narangi'),
 # ---- breakfast
 ('Besan chilla (mess)', 'Breakfast', '1 piece (70 g)', 70, I('OSR100', cook=0.85, extra=[(OIL, 6 * 4)]), 'INDB', 'besan cheela chila pudla'),
 ('Paneer chilla', 'Breakfast', '1 piece (110 g)', 110, I('BFP047', cook=0.85), 'INDB', 'paneer cheela'),
 ('Vermicelli upma', 'Breakfast', '1 katori (180 g)', 180, I('BFP040', cook=0.9), 'INDB', 'semiya upma shevai upma'),
 ('Bread upma', 'Breakfast', '1 katori (150 g)', 150, I('BFP042', cook=0.9), 'INDB', 'bread upma'),
 ('Vegetable upma', 'Breakfast', '1 katori (200 g)', 200, I('BFP043', cook=0.9), 'INDB', 'veg upma'),
 ('Bread omelette (2 egg, mess)', 'Eggs', '2 eggs + 2 slices (165 g)', 165, M([(R([(EGG, 100), (OIL, 6), (ONION, 10)], cooked=110), 110), (G(BREAD), 55)]), 'recipe', 'bread omlet'),
 ('Egg pulao', 'Eggs', '1 plate (250 g)', 250, M([(I('ASC114', cook=0.85), 150), (R([(EGGB, 100), (OIL, 6), (ONION, 20)], cooked=120), 100)]), 'recipe', 'anda pulao egg rice'),
 ('Spanish omelette', 'Eggs', '1 omelette (150 g)', 150, I('BFP058', cook=0.9), 'INDB', 'potato omelette'),
 # ---- snacks / street
 ('Bread pakora (mess)', 'Street food & chaat', '1 piece (80 g)', 80, I('ASC358', cook=0.9, oil=0.15), 'INDB', 'bread pakoda'),
 ('Kanda bhaji (plate)', 'Street food & chaat', '1 plate (100 g)', 100, I('ASC352', cook=0.85, oil=0.18), 'INDB', 'kanda bhajji onion pakoda pyaz pakora'),
 ('Aloo bonda (mess)', 'Street food & chaat', '1 piece (60 g)', 60, I('ASC360', cook=0.85, oil=0.14), 'INDB', 'batata vada bonda'),
 ('Veg cutlet (mess)', 'Street food & chaat', '1 piece (60 g)', 60, I('ASC366', cook=0.9, oil=0.12), 'INDB', 'vegetable cutlet tikki'),
 ('Masala vada (mess)', 'South Indian', '1 piece (40 g)', 40, R([(CHANAD, 100), (ONION, 30), ('water', 40)], cooked=160, oil=0.15), 'recipe', 'paruppu vadai dal vada'),
 ('Paneer kathi roll (mess)', 'Street food & chaat', '1 roll (150 g)', 150, I('ASC149', cook=1.0), 'INDB', 'paneer frankie paneer roll kati roll'),
 ('Corn chaat (butter)', 'Street food & chaat', '1 cup (120 g)', 120, R([(CORN, 110), (BUTTER, 6), (LEMON, 3)], cooked=118), 'recipe', 'butter corn masala corn bhutta'),
 ('Pizza (cheese, mess)', 'Fast food', '1 slice (100 g)', 100, I('ASC376', cook=0.9), 'INDB', 'cheese pizza margherita'),
 ('Veg burger (mess)', 'Fast food', '1 burger (180 g)', 180, M([(G(BUN), 60), (I('ASC366', cook=0.9, oil=0.12), 70), (G(MAYO), 12), (G(TOM), 20), (G(LETTUCE), 18)]), 'recipe', 'aloo burger veggie burger'),
 # ---- more mess / canteen dishes
 ('Egg Kolhapuri', 'Eggs', '1 bowl with 2 eggs (200 g)', 200, R([(EGG, 100), (ONION, 40), (DCOCO, 10), (OIL, 12), (TOM, 25), ('water', 60)], cooked=230), 'recipe', 'anda kolhapuri spicy egg curry'),
 ('Chicken saoji', 'Chicken', '1 bowl with 3 pieces (250 g)', 250, R([(CHKT, 150), (ONION, 50), (DCOCO, 15), (OIL, 25), ('water', 150)], cooked=330), 'recipe', 'saoji chicken nagpuri savji'),
 ('Paneer Kolhapuri', 'Paneer & soya', '1 katori (150 g)', 150, R([(PANEER, 70), (ONION, 50), (DCOCO, 12), (TOM, 40), (OIL, 14), ('water', 60)], cooked=220), 'recipe', 'kolhapuri paneer spicy'),
 ('Usal pav', 'Street food & chaat', '1 plate (usal 250 g + 2 pav + farsan 20 g)', 350, M([(B_SPROUT_USAL, 250), (B_PAV, 80), (B_SEV, 20)]), 'recipe', 'usal pao matki usal pav'),
 ('Sabudana thalipeeth', 'Breakfast', '1 piece (90 g)', 90, R([(SAGO, 60), (POT, 60), (PNUT, 15), (OIL, 8)], cooked=150), 'recipe', 'upvas thalipeeth fasting sago'),
 ('Tomato saar', 'Soups', '1 bowl (200 ml)', 200, R([(TOM, 200), (COCO, 15), (JAGGERY, 6), (GHEE, 4), ('water', 150)], cooked=330), 'recipe', 'tomato saar tomatoche saar'),
 ('Banana sheera', 'Sweets & desserts', '1 katori (120 g)', 120, R([(SUJI, 40), (GHEE, 20), (SUGAR, 40), (BANANA, 60), (MILK, 120), ('water', 60)], cooked=280), 'recipe', 'satyanarayan prasad sheera kela sheera'),
 ('Sheer khurma', 'Sweets & desserts', '1 katori (150 g)', 150, R([(MILK, 400), (VERMI, 20), (SUGAR, 30), ('E017', 20), (ALMOND, 6), (PISTA, 4), (GHEE, 6)], cooked=380), 'recipe', 'sheer korma eid seviyan'),
 ('Rabri jalebi', 'Sweets & desserts', '2 jalebi (60 g) + rabri (60 g)', 120, M([(B_JALEBI, 60), (B_RABRI, 60)]), 'recipe', 'jalebi rabdi'),
 ('Hot chocolate fudge sundae', 'Sweets & desserts', '1 cup (160 g)', 160, M([(I('BFP346', cook=1.0), 120), (I('BFP353', cook=1.0), 30), (G(PNUT), 10)]), 'INDB', 'hot chocolate fudge hcf sundae'),
 ('Trifle pudding', 'Sweets & desserts', '1 bowl (120 g)', 120, I('ASC319', cook=0.95), 'INDB', 'trifle custard cake'),
 ('Apple pie', 'Bakery', '1 slice (100 g)', 100, I('ASC403', cook=0.9), 'INDB', 'apple pie'),
 ('Swiss roll', 'Bakery', '1 slice (40 g)', 40, I('ASC429', cook=1.0), 'INDB', 'jam roll swiss roll'),
 ('Mango mastani', 'Beverages', '1 glass (320 g)', 320, M([(R([(MANGO, 150), (MILK, 150), (SUGAR, 15)], cooked=315), 255), (I('ASC305', cook=1.0), 60), (G(CASHEW), 5)]), 'recipe', 'mastani pune mango shake with ice cream'),
 ('Oreo milkshake', 'Beverages', '1 glass (290 g)', 290, M([(G(MILK), 200), (I('ASC442', cook=1.0), 30), (I('BFP346', cook=1.0), 50), (G(SUGAR), 10)]), 'recipe', 'oreo shake cookies and cream shake'),
 ('Black tea with sugar', 'Beverages', '1 cup (150 ml)', 150, R([(SUGAR, 8), (TEA, 1), ('water', 150)], cooked=150), 'recipe', 'kali chai black chai lal chai'),
 ('Paneer 65', 'Indo-Chinese', '1 plate (150 g)', 150, R([(PANEER, 150), (MAIDA, 10), (CORNFLOUR, 12), (CURD, 15)], cooked=180, oil=0.12), 'recipe', 'paneer65'),
 ('Mushroom fried rice', 'Indo-Chinese', '1 plate (300 g)', 300, I('ASC129', cook=0.85, extra=[(MUSH, 60), (OIL, 4)]), 'INDB', 'mushroom rice'),
 ('Parotta with veg kurma', 'Meals & combos', '2 parotta + 1 katori kurma (330 g)', 330, M([(B_PAROTTA, 180), (R([(POT, 50), (CARROT, 30), (BEANS, 30), (PEAS, 30), (COCO, 30), (OIL, 10), (ONION, 30), ('water', 120)], cooked=280), 150)]), 'recipe', 'porotta kurma parotta salna'),
 ('Akki rotti', 'Breads', '1 piece (80 g)', 80, R([(RICEFLOUR, 100), (ONION, 25), (COCO, 10), (OIL, 8), ('water', 90)], cooked=190), 'recipe', 'akki roti rice roti tandalachi bhakri'),
 ('Sarson da saag + makki roti', 'Meals & combos', '1 katori saag + 2 makki roti + butter (300 g)', 300, M([(I('ASC217', cook=0.85), 150), (I('ASC150', cook=0.9), 145), (G(BUTTER), 5)]), 'INDB', 'makki di roti sarson saag'),
 ('Dal baati churma', 'Meals & combos', '2 baati + dal 150 g + churma 50 g (350 g)', 350, M([(B_BAATI, 150), (I('OSR144', cook=0.85), 150), (R([(ATTA, 100), (GHEE, 30), (SUGAR, 35)], cooked=150), 50)]), 'recipe', 'dal bati churma rajasthani'),
 ('Dal baati (2 baati + dal)', 'Meals & combos', '2 baati + dal 150 g (300 g)', 300, M([(B_BAATI, 150), (I('OSR144', cook=0.85), 150)]), 'recipe', 'dal bati'),
 ('Gujarati thali', 'Meals & combos', '2 rotli, dal, rice, shaak, kadhi, sweet (630 g)', 630, M([(B_ROTI, 80), (R([(TOOR, 30), (JAGGERY, 8), (OIL, 4), (TAMARIND, 2), ('water', 220)], cooked=240), 150), (B_RICE, 150), (I('BFP239', cook=0.85), 100), (R([(CURD, 100), (BESAN, 10), (SUGAR, 5), (GHEE, 3), ('water', 100)], cooked=200), 100), (I('OSR024', cook=0.9), 50)]), 'recipe', 'gujju thali gujarati meal'),
 ('Fish and chips', 'Continental', '1 plate (285 g)', 285, M([(R([(ROHU, 100), (MAIDA, 15), (CORNFLOUR, 5), ('water', 15)], cooked=120, oil=0.12), 150), (B_FRIES, 120), (G(MAYO), 15)]), 'recipe', 'fish n chips fried fish fillet'),
 ('Hash browns', 'Continental', '2 pieces (100 g)', 100, R([(POT, 100), (CORNFLOUR, 5)], cooked=80, oil=0.12), 'recipe', 'hashbrown potato'),
 ('Pancakes with syrup', 'Continental', '3 pancakes (120 g) + 1 tbsp syrup', 140, M([(I('ASC063', cook=0.85), 120), (G(HONEY), 20)]), 'INDB', 'pancake hotcakes'),
 ('Veg enchiladas', 'Continental', '2 enchiladas (350 g)', 350, M([(B_TORTILLA, 100), (B_BEANS, 80), (R([(TOM, 100), (TPUREE, 15), (OIL, 5)], cooked=110), 70), (G(MOZZ), 40), (R([(CAPS, 30), (ONION, 20), (CORN, 30), (OIL, 3)], cooked=80), 60)]), 'recipe', 'enchilada mexican'),
 ('Mexican beans', 'Sides & chutneys', '1 katori (100 g)', 100, B_BEANS, 'recipe', 'refried beans rajma mexican beans'),
 ('Flour tortilla', 'Continental', '1 tortilla (40 g)', 40, B_TORTILLA, 'recipe', 'wrap roti tortilla'),
 ('Mathri', 'Packaged snacks', '2 pieces (30 g)', 30, R([(MAIDA, 100), (GHEE, 20), ('water', 35)], cooked=140, oil=0.20), 'recipe', 'mathi mathiya'),
 ('Namak pare', 'Packaged snacks', '1 katori (30 g)', 30, R([(MAIDA, 100), (GHEE, 10), ('water', 40)], cooked=135, oil=0.22), 'recipe', 'namakpare nimki khara'),
 ('Palak pakoda', 'Street food & chaat', '1 plate (100 g)', 100, I('ASC355', cook=0.85, oil=0.18), 'INDB', 'spinach pakora palak bhaji'),
 ('Methi pakoda', 'Street food & chaat', '1 plate (100 g)', 100, I('ASC356', cook=0.85, oil=0.18), 'INDB', 'methi bhaji methi na gota methi pakora'),
]


# new specs that turned out to be the same dish as an existing row: applied as corrections
DUP_TO_EXISTING = {
 'Aloo bonda (mess)': 'Aloo bonda', 'Veg cutlet (mess)': 'Veg cutlet', 'Bread pakora (mess)': 'Bread pakora',
 'Kanda bhaji (plate)': 'Onion bhajji', 'Masala vada (mess)': 'Masala vada (paruppu vada)',
 'Paneer kathi roll (mess)': 'Paneer kathi roll', 'Besan chilla (mess)': 'Besan chilla',
 'Pizza (cheese, mess)': 'Margherita pizza slice', 'Veg burger (mess)': 'Veg burger',
 'Coconut chutney (mess)': 'Coconut chutney',
 'Garlic bread (mess, 2 slices)': 'Garlic bread', 'Chicken korma (mess)': 'Chicken korma',
 'Cold coffee (mess, sweet)': 'Cold coffee', 'Kesar badam milk (mess)': 'Badam milk', 'Masala milk': 'Masala doodh',
 'Cucumber slices': 'Cucumber', 'Guava (100 g)': 'Guava', 'Papaya (1 bowl)': 'Papaya',
 'Watermelon (1 bowl)': 'Watermelon', 'Pomegranate seeds (1 bowl)': 'Pomegranate', 'Orange (1 medium)': 'Orange',
 'Sapota (chikoo, 100 g)': 'Chikoo', 'Vermicelli upma': 'Semiya upma (vermicelli)', 'Plain khichdi': 'Moong dal khichdi',
 'Veg khichdi': 'Masala khichdi', 'Tamarind rice (mess)': 'Tamarind rice (puliyogare)', 'Gatte ki kadhi': 'Gatte ki sabzi',
 'Cabbage matar': 'Cabbage sabzi', 'Bread omelette (2 egg, mess)': 'Bread omelette', 'Corn chaat (butter)': 'Corn chaat',
 'Jowar bhakri (plain)': 'Jowar roti', 'Lemon soda (sweet)': 'Lemon soda',
}

# ---------------------------------------------------------------- build
def rnd5(x): return int(round(x / 5.0) * 5)
def rhalf(x):
    v = round(x * 2) / 2
    return int(v) if v == int(v) else v

def serving(base, g):
    return (rnd5(base['k'] * g / 100), rhalf(base['p'] * g / 100), rhalf(base['c'] * g / 100), rhalf(base['f'] * g / 100))

def grams_from_label(lbl):
    m = re.search(r'([\d.]+)\s*(g|ml)\b', lbl)
    return float(m.group(1)) if m else None

def parse_ts():
    # original 1,040 rows (pre-verification snapshot); the build always starts from it
    d = json.load(open(os.path.join(HERE, 'foods_legacy.json'), encoding='utf-8'))
    return d['cats'], [list(r) for r in d['rows']]

def main():
    cats, rows = parse_ts()
    for c in ['Continental', 'Sides & chutneys']:
        if c not in cats: cats.append(c)
    names = {r[0].lower() for r in rows}
    changes = []
    for r in rows:
        name = r[0]
        if name in CORR:
            lbl, g, base, src, kw = CORR[name]
            if base is not None:
                if lbl is None:
                    lbl = r[2]; g = grams_from_label(lbl)
                old = list(r[3:7])
                r[2] = lbl
                r[3:7] = serving(base, g)
                while len(r) < 8: r.append('')
                r[7] = src
                changes.append((name, old, r[3:7]))
            if kw:
                while len(r) < 9: r.append('')
                r[8] = kw
        if name in KW:
            while len(r) < 9: r.append('')
            if not r[7]: r[7] = ''
            r[8] = (r[8] + ' ' + KW[name]).strip() if r[8] else KW[name]
    byname = {r[0]: r for r in rows}
    added = 0
    for name, cat, lbl, g, base, src, kw in NEW:
        if name in DUP_TO_EXISTING:
            r = byname[DUP_TO_EXISTING[name]]
            old = list(r[3:7])
            r[2] = lbl; r[3:7] = serving(base, g)
            while len(r) < 9: r.append('')
            r[7] = src
            r[8] = ' '.join(dict.fromkeys((r[8] + ' ' + kw).split())) if kw else r[8]
            changes.append((r[0], old, r[3:7]))
            continue
        if name.lower() in names:
            raise SystemExit('duplicate: ' + name)
        names.add(name.lower())
        row = [name, cats.index(cat), lbl, *serving(base, g), src]
        if kw: row.append(kw)
        rows.append(row); added += 1
    # normalise: drop empty trailing fields; keep 8th as '' placeholder only if kw present
    out = []
    for r in rows:
        r = list(r)
        while len(r) > 7 and r[-1] in ('', None): r.pop()
        if len(r) == 9 and r[7] == '': r[7] = ''
        out.append(r)
    write_ts(cats, out)
    json.dump([dict(zip(['n', 'c', 's', 'k', 'p', 'cb', 'f', 'src', 'kw'], [r[0], cats[r[1]], *r[2:]])) for r in out],
              open(os.path.join(HERE, 'foods_all.json'), 'w'), indent=1, ensure_ascii=False)
    json.dump(changes, open(os.path.join(HERE, 'corrections.json'), 'w'), indent=0)
    print('rows', len(out), 'added', added, 'corrected', len(changes))

HEADER = '''// Food database: typical Indian hostel / mess portions.
// Sources: INDB 2024 (Indian Nutrient Databank, standard Indian recipes), IFCT 2017 (ICMR-NIN,
// raw ingredients), USDA FoodData Central and UK CoFID (continental / packaged-style items),
// official brand labels. Recipes from INDB are re-totalled from their ingredients with cooked
// weights and realistic frying-oil uptake; see data/sources.md and data/build_foods.py.
// Mess recipes vary (oil, ghee, dilution), so the portion size you actually eat is the biggest
// source of error: weigh a katori/plate once to calibrate.
// Row: [name, categoryIndex, serving, kcal, protein g, carbs g, fat g, source?, keywords?]
// source: 'INDB' | 'IFCT' | 'USDA' | 'label' | 'recipe' (own standard recipe computed from IFCT 2017,
// USDA and UK CoFID ingredient values). Rows without a source are older estimates not yet re-verified.
'''

def write_ts(cats, rows):
    lines = [HEADER.rstrip('\n'),
             'export type Food = { id: number; name: string; cat: string; serving: string; kcal: number; protein: number; carbs: number; fat: number; src?: string; kw?: string };',
             '',
             'export const FOOD_CATS: string[] = ' + json.dumps(cats, ensure_ascii=False).replace('","', '", "') + ';',
             '',
             'type Row = [string, number, string, number, number, number, number, string?, string?];',
             '',
             'const ROWS: Row[] = [']
    body = []
    for r in rows:
        body.append('[' + ', '.join(json.dumps(x, ensure_ascii=False) for x in r) + ']')
    lines.append(',\n'.join(body))
    lines.append('];')
    lines.append('')
    lines.append('export const FOODS: Food[] = ROWS.map((r, id) => ({ id, name: r[0], cat: FOOD_CATS[r[1]], serving: r[2], kcal: r[3], protein: r[4], carbs: r[5], fat: r[6], src: r[7] || undefined, kw: r[8] || undefined }));')
    txt = '\n'.join(lines) + '\n'
    txt = txt.replace('—', '-')
    open(TS, 'w', encoding='utf-8').write(txt)

if __name__ == '__main__':
    main()
