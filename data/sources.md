# Food database sources

Rebuild: `python3 data/build_foods.py && python3 data/validate.py`.
`build_foods.py` starts from `foods_legacy.json` (the original 1,040 rows) and writes
`src/lib/foods.ts` and `foods_all.json`. `corrections.json` lists every changed row (before/after).

## Source codes (8th field of each row)

| code | meaning |
|---|---|
| `INDB` | Indian Nutrient Databank 2024 recipe, re-totalled from its ingredient list (see method) |
| `IFCT` | Raw food straight from IFCT 2017 (ICMR-NIN), or IFCT ingredient with only water/yield change (e.g. boiled rice) |
| `USDA` | USDA FoodData Central value (no rows use this alone yet; USDA ingredient values are used inside recipes) |
| `label` | Official brand label (whey scoop: Optimum Nutrition Gold Standard, 24 g protein per 30 g scoop) |
| `recipe` | Standard recipe computed from IFCT 2017 / USDA / UK CoFID ingredient values. Ingredient amounts and cooked weight are listed in `build_foods.py` |
| `""` | Older estimate, not re-verified yet. The row only gained search keywords |
| (none) | Older estimate, not re-verified yet |

## Data files and where they came from

- `indb_2024.json`, `indb_recipes.json`: INDB.xlsx, recipes.xlsx, recipes_servingsize.xlsx from
  https://github.com/lindsayjaacks/Indian-Nutrient-Databank-INDB- (raw files via raw.githubusercontent.com).
  INDB: Vijayakumar A, Jaacks LM et al., Indian Nutrient Databank, 2024. 1,014 recipes from
  *The Art & Science of Cooking* (ASC codes), *Basic Food Preparation* (BFP codes) and online recipes (OSR codes).
- `ingredients.json`, per 100 g edible portion:
  - IFCT 2017 (codes A001-T014): Longvah T et al., *Indian Food Composition Tables 2017*, ICMR-NIN Hyderabad.
    Machine-readable copy from the npm package `@ifct2017/compositions` v2.0.9 (energy given in kJ, converted at 4.184 kJ/kcal;
    oils and ghee set to 900 kcal / 100 g fat because the energy column is empty for them).
  - UK CoFID 2021 (McCance & Widdowson) and USDA FoodData Central: the `UK_fct.xlsx` / `US_fct.xlsx` tables shipped
    in the INDB repository (the same values INDB itself uses for ingredients missing from IFCT: sugar, butter,
    cream, cheese, pasta, bread, mayonnaise, gram flour, sago, buns, sour cream etc.).
- Direct USDA FDC API and brand websites (Amul, Maggi/Nestle, Nutrela) could not be read from this environment,
  so packaged/branded rows (Maggi, soya chunks, Amul milk variants, bread brands, peanut butter) were NOT changed.

## Method (why we do not copy INDB's per-100 g numbers directly)

Checked by re-totalling INDB recipes from their ingredient lists (matches INDB within ~3 %):

1. INDB divides recipe nutrients by the **raw** weight of all ingredients, including water that later evaporates
   (e.g. chapati 202 kcal/100 g, kheer 75 kcal/100 g). We divide the same recipe totals by a realistic
   **cooked** weight instead (`cook` factor or explicit `cooked=` grams in `build_foods.py`).
2. INDB counts the **entire deep-frying oil pot** (480 ml) as eaten (samosa 577 kcal/100 g, puri 738). We drop the pot
   and add a stated oil uptake as a fraction of the fried food's final weight: pakora/bhaji/samosa 18 %, puri 15 %,
   bhatura/luchi 18 %, vada/bonda 14-15 %, cutlet 12 %, gulab jamun ball 10-12 %, sev/farsan 35 %, chakli 28 %,
   fryums 30 %, French fries 14 %.
3. Syrup sweets (gulab jamun, rasgulla, rasmalai) are modelled as fried ball / chhena plus the syrup it holds
   (gulab jamun 22 g ball + 18 g 60 % syrup; rasgulla 12 g chhena + 38 g 35 % syrup). Chhena from whole cow milk keeps
   ~80 % of protein, 95 % of fat, 10 % of lactose, ~160 g per litre.
4. Yields used: raw rice x2.8 when boiled; dry pasta x2.35; poha x2.0-2.2 after soaking; dals 40 g dry per 230 g cooked
   (thin mess dal 30 g per ~235 g); rajma/chole 45-50 g dry per 220 g curry; chapati dough loses ~20 % of its raw weight.
5. Dahi (curd) is taken as IFCT whole cow milk (fermentation does not change macros materially); full-cream curd as
   IFCT buffalo milk.
6. Paneer dishes (kadai, palak) use a mess recipe with ~30-35 % paneer by cooked weight, because INDB's home recipes
   contain only ~16 % paneer and would under-count a mess katori.
7. Rounding: kcal to nearest 5, macros to 0.5 g, from the gram weight written in the serving text.

## Known limits

- IFCT values sometimes differ a lot from USDA for the same food (IFCT energy excludes fibre): guava 32 vs 68 kcal/100 g,
  papaya 23 vs 43, banana 105 vs 89, apple 62 vs 52. IFCT is used for Indian produce.
- IFCT 2017 lists Indian broiler breast with 9 g fat/100 g raw (USDA: ~2.6 g). Chicken curries/biryanis use IFCT
  thigh/breast; the plain "Grilled/Boiled chicken breast" rows were left at their older USDA-like values.
- Mess cooking varies (oil, ghee, dilution): the portion you actually eat is the largest source of error.
  Weigh your usual katori and plate once.

## Batches

| batch | source |
|---|---|
| Breads, parathas, naan, rice, pulao, biryani-style rice, dals, sabzis, paneer curries, curries, upma, poha, idli, dosa, raitas, chutneys, halwas, kheers, burfis, ladoos, pakoras, cutlets, sandwiches, custards, ice creams | INDB 2024 recipes (codes in `build_foods.py`, e.g. ASC096 chapati, ASC151 moong dal, ASC167 sambar, BFP044 poha, ASC222 paneer butter masala, ASC240 chicken curry) |
| Milk, eggs, paneer, fruits, plain rice, jowar bhakri | IFCT 2017 |
| Maharashtrian dishes (usal, misal variants, pithla/zunka bhakri, bharli vangi, aamti, varan bhaat, masale bhaat, Kolhapuri, chakli, bhakarwadi, chivda, amrakhand, piyush) | recipe (IFCT ingredients), puran poli from INDB ASC467 |
| Continental (arrabbiata, alfredo, pesto, pink/white/red sauce, baked pasta, Mexican rice, burrito bowls, nachos, quesadilla, sizzlers, enchiladas, fish and chips) | recipe (IFCT + CoFID/USDA ingredients); mac and cheese INDB ASC133, pasta salad INDB ASC255, veg au gratin INDB BFP293 |
| Whey scoop | label, Optimum Nutrition Gold Standard 100 % Whey (https://www.optimumnutrition.com), 24 g protein / scoop |
