/**
 * Alltägliches zum Eintragen: Backwaren, Aufschnitt, Käse, Obst, Gerichte aus Imbiss, Restaurant und Kantine, Suppen,
 * Soßen, Süßes, Snacks und Getränke – mit typischer Menge (1 Brötchen, 1 Döner, 1 Kugel Eis, 1 Glas Wein …), sofort
 * und ohne Internet auffindbar.
 *
 * Gerundete Richtwerte pro 100 g, Getränke pro 100 ml (1 ml ≈ 1 g), nach gängigen Nährwerttabellen und
 * Herstellerangaben. Rezepte, Portionen und Produkte unterscheiden sich – für Genaueres das Produkt scannen oder ein
 * eigenes Lebensmittel anlegen. Alkohol zählt mit 7 kcal pro Gramm.
 */

/** Kategorien zum Stöbern beim Erfassen */
export const FOOD_GROUPS = [
  { id: 'baeckerei', label: 'Bäckerei & Frühstück', emoji: '🥐' },
  { id: 'milch', label: 'Milch, Käse & Eier', emoji: '🧀' },
  { id: 'wurst', label: 'Wurst, Fleisch & Fisch', emoji: '🥓' },
  { id: 'obst', label: 'Obst', emoji: '🍎' },
  { id: 'gemuese', label: 'Gemüse', emoji: '🥕' },
  { id: 'imbiss', label: 'Imbiss & Fast Food', emoji: '🍔' },
  { id: 'restaurant', label: 'Restaurant & International', emoji: '🍝' },
  { id: 'hausmannskost', label: 'Hausmannskost & Kantine', emoji: '🍽️' },
  { id: 'suppen', label: 'Suppen & Eintöpfe', emoji: '🍲' },
  { id: 'beilagen', label: 'Beilagen, Salate & Soßen', emoji: '🥗' },
  { id: 'suesses', label: 'Süßes & Desserts', emoji: '🍰' },
  { id: 'snacks', label: 'Snacks & Nüsse', emoji: '🥨' },
  { id: 'getraenke', label: 'Getränke', emoji: '🥤' },
  { id: 'alkohol', label: 'Bier, Wein & Cocktails', emoji: '🍺' },
] as const

export type FoodGroupId = (typeof FOOD_GROUPS)[number]['id']

export interface EverydayFood {
  name: string
  group: FoodGroupId
  /** Weitere Suchbegriffe: regionale Namen, Kurzformen, Schreibweisen */
  aliases: string[]
  kcal: number
  protein: number
  carbs: number
  fat: number
  /** Alkohol in Gramm pro 100 ml */
  alcohol: number
  /** Typische Menge zum Abzählen (Stück, Scheibe, Kugel, Becher …) in Gramm */
  piece: number | null
  /** Typische Menge als Portion (Teller, Glas, Dose …) in Gramm bzw. Milliliter */
  portion: number | null
  /** Gramm pro Esslöffel – für Soßen, Dips und Aufstriche */
  spoon: number | null
  /** Wie die typische Menge heißt, z. B. „Kugel“ oder „Dose“ */
  measure: string
  /** Getränk: Mengen in Millilitern anzeigen */
  liquid: boolean
}

interface Size {
  /** Zählbar: Gramm pro Stück */
  stück?: number
  /** Als Portion: Gramm (bzw. ml) pro Portion */
  portion?: number
  /** Gramm pro Esslöffel */
  el?: number
  /** Name der Menge, z. B. „Scheibe“, „Kugel“, „Dose“ */
  als?: string
}

interface Options {
  aliases?: string[]
  /** Alkohol in g pro 100 ml */
  alcohol?: number
}

const LIST: EverydayFood[] = []
let current: FoodGroupId = 'baeckerei'

/** Folgende Einträge gehören zu dieser Kategorie */
function group(id: FoodGroupId) {
  current = id
}

/** Werte pro 100 g: kcal, Eiweiß, Kohlenhydrate, Fett */
function food(name: string, [kcal, protein, carbs, fat]: [number, number, number, number], size: Size, opts: Options = {}) {
  LIST.push({
    name,
    group: current,
    aliases: opts.aliases ?? [],
    kcal,
    protein,
    carbs,
    fat,
    alcohol: opts.alcohol ?? 0,
    piece: size.stück ?? null,
    portion: size.portion ?? null,
    spoon: size.el ?? null,
    measure: size.als ?? (size.stück ? 'Stück' : size.el ? 'EL' : 'Portion'),
    liquid: false,
  })
}

/** Getränk: Werte pro 100 ml */
function drink(name: string, values: [number, number, number, number], size: Size, opts: Options = {}) {
  food(name, values, size, opts)
  LIST[LIST.length - 1].liquid = true
}

// --- Bäckerei & Frühstück ---------------------------------------------------------------------------------------
group('baeckerei')
food('Brötchen', [270, 9, 52, 2], { stück: 60 }, { aliases: ['Semmel', 'Schrippe', 'Weck', 'Weckle', 'Wecken', 'Weizenbrötchen', 'Rundstück'] })
food('Körnerbrötchen', [280, 10, 44, 6.5], { stück: 80 }, { aliases: ['Mehrkornbrötchen', 'Kürbiskernbrötchen'] })
food('Laugenbrezel', [275, 8.5, 54, 2.5], { stück: 80 }, { aliases: ['Brezel', 'Breze', 'Brezn'] })
food('Laugenbrötchen', [270, 9, 52, 2.5], { stück: 70 }, { aliases: ['Laugenstange', 'Laugenstück'] })
food('Laugencroissant', [400, 8.5, 42, 21.5], { stück: 70 })
food('Butterbrezel', [330, 7, 45, 13], { stück: 100 }, { aliases: ['Butterbreze'] })
food('Rosinenbrötchen', [290, 8, 52, 5], { stück: 70 }, { aliases: ['Rosinenweck'] })
food('Milchbrötchen', [330, 9, 52, 9], { stück: 40 })
food('Ciabatta', [255, 8.5, 49, 2.5], { stück: 80 }, { aliases: ['Ciabattabrötchen'] })
food('Bagel', [260, 10, 50, 1.6], { stück: 90 })
food('Toastbrot', [265, 8, 48, 4], { stück: 25, als: 'Scheibe' }, { aliases: ['Toast', 'Weizentoast', 'Sandwichtoast'] })
food('Mischbrot', [235, 7, 46, 1.5], { stück: 50, als: 'Scheibe' }, { aliases: ['Brot', 'Graubrot', 'Bauernbrot', 'Roggenmischbrot'] })
food('Roggenbrot', [210, 6, 40, 1.2], { stück: 50, als: 'Scheibe' }, { aliases: ['Sauerteigbrot', 'Brot'] })
food('Dinkelbrot', [240, 9, 44, 2.5], { stück: 50, als: 'Scheibe' }, { aliases: ['Brot'] })
food('Pumpernickel', [190, 6, 37, 1], { stück: 40, als: 'Scheibe' })
food('Fladenbrot', [260, 8.5, 52, 1.5], { stück: 100 }, { aliases: ['Pide-Brot'] })
food('Zwieback', [400, 11, 75, 5.5], { stück: 10, als: 'Zwieback' })
food('Butterbrot', [315, 6, 38, 15], { stück: 60, als: 'Scheibe' }, { aliases: ['Brot mit Butter', 'Stulle', 'Bemme'] })
food('Käsebrötchen', [260, 11, 30, 10.5], { stück: 110 }, { aliases: ['Belegtes Brötchen mit Käse', 'Käsesemmel'] })
food('Schinkenbrötchen', [230, 11, 32, 6], { stück: 110 }, { aliases: ['Belegtes Brötchen mit Schinken', 'Schinkensemmel'] })
food('Salamibrötchen', [300, 11, 30, 15], { stück: 110 }, { aliases: ['Belegtes Brötchen mit Salami', 'Salamisemmel'] })
food('Mettbrötchen', [250, 13, 25, 11], { stück: 120 }, { aliases: ['Hackepeterbrötchen', 'Mettsemmel'] })
food('Croissant', [410, 8, 45, 21], { stück: 60 }, { aliases: ['Hörnchen', 'Buttercroissant'] })
food('Schokocroissant', [430, 7, 48, 23], { stück: 75 }, { aliases: ['Pain au Chocolat', 'Schokohörnchen'] })
food('Brioche', [370, 8, 50, 15], { stück: 50 })
food('Hefezopf', [330, 8, 52, 9.5], { stück: 50, als: 'Scheibe' }, { aliases: ['Zopf', 'Striezel'] })
food('Berliner', [360, 6, 50, 15], { stück: 70 }, { aliases: ['Krapfen', 'Kreppel'] })
food('Donut', [420, 5, 48, 23], { stück: 60 }, { aliases: ['Doughnut'] })
food('Muffin', [410, 5, 50, 21], { stück: 100 }, { aliases: ['Schokomuffin', 'Cupcake'] })
food('Zimtschnecke', [370, 6, 52, 15], { stück: 90 }, { aliases: ['Franzbrötchen', 'Zimtbrötchen'] })
food('Mohnschnecke', [380, 7, 45, 18.5], { stück: 90 }, { aliases: ['Mohnstrudel'] })
food('Puddingschnecke', [320, 5.5, 40, 15], { stück: 100 }, { aliases: ['Puddingbrezel', 'Plunder', 'Puddingteilchen'] })
food('Quarktasche', [300, 8, 35, 14], { stück: 110 }, { aliases: ['Quarkteilchen'] })
food('Nussecke', [470, 7, 45, 29], { stück: 100 })
food('Brownie', [440, 5.5, 52, 23.5], { stück: 60 })
food('Käsekuchen', [250, 9, 25, 12], { stück: 120 }, { aliases: ['Quarkkuchen', 'Käsetorte', 'Kuchen'] })
food('Apfelkuchen', [250, 3.5, 35, 10.5], { stück: 120 }, { aliases: ['Kuchen', 'Obstkuchen'] })
food('Obsttorte', [170, 2.5, 27, 5.5], { stück: 120 }, { aliases: ['Erdbeerkuchen', 'Obstkuchen', 'Kuchen'] })
food('Streuselkuchen', [380, 6, 52, 16.5], { stück: 90 }, { aliases: ['Kuchen'] })
food('Marmorkuchen', [400, 6, 50, 19.5], { stück: 70 }, { aliases: ['Rührkuchen', 'Kuchen'] })
food('Bienenstich', [330, 5, 38, 17], { stück: 110 }, { aliases: ['Kuchen'] })
food('Donauwelle', [330, 4.5, 37, 18], { stück: 110 }, { aliases: ['Kuchen'] })
food('Schwarzwälder Kirschtorte', [280, 4, 30, 16], { stück: 130 }, { aliases: ['Kirschtorte', 'Sahnetorte', 'Torte'] })
food('Apfelstrudel', [230, 3, 32, 10], { stück: 150 }, { aliases: ['Strudel'] })
food('Waffel', [330, 6, 40, 16], { stück: 60 }, { aliases: ['Waffeln'] })
food('Pfannkuchen', [220, 7, 28, 9], { stück: 80 }, { aliases: ['Eierkuchen', 'Crêpe', 'Crepe', 'Palatschinken', 'Plinsen'] })
food('Pancakes', [230, 6.5, 30, 9], { stück: 50, als: 'Pancake' }, { aliases: ['Pancake', 'Amerikanische Pfannkuchen'] })
food('French Toast', [230, 8, 26, 10.5], { stück: 80, als: 'Scheibe' }, { aliases: ['Arme Ritter'] })
food('Müsli', [360, 10, 60, 7], { portion: 50, als: 'Schale' }, { aliases: ['Früchtemüsli', 'Bircher'] })
food('Knuspermüsli', [450, 9, 62, 18], { portion: 50, als: 'Schale' }, { aliases: ['Granola', 'Crunchy Müsli', 'Schokomüsli'] })
food('Cornflakes', [375, 7, 84, 1], { portion: 30, als: 'Schale' }, { aliases: ['Frühstücksflocken', 'Flakes'] })
food('Porridge', [95, 4, 13, 3], { portion: 250, als: 'Schale' }, { aliases: ['Haferbrei', 'Haferschleim', 'Oatmeal', 'Haferflocken mit Milch'] })
food('Müsliriegel', [400, 6, 64, 13], { stück: 25, als: 'Riegel' }, { aliases: ['Getreideriegel', 'Haferriegel'] })
food('Nuss-Nougat-Creme', [540, 6.3, 57.5, 31], { portion: 15 }, { aliases: ['Nutella', 'Schokocreme', 'Schokoaufstrich', 'Nougatcreme'] })
food('Konfitüre', [245, 0.4, 60, 0.1], { portion: 20 }, { aliases: ['Marmelade', 'Gelee', 'Fruchtaufstrich'] })
food('Rührei', [190, 11, 1.5, 15.5], { portion: 150 }, { aliases: ['Rühreier'] })
food('Spiegelei', [200, 13, 0.5, 16], { stück: 60 }, { aliases: ['Spiegeleier', 'Ei gebraten'] })

// --- Milch, Käse & Eier ---------------------------------------------------------------------------------------
group('milch')
food('Ei (gekocht)', [155, 12.5, 1, 11], { stück: 60, als: 'Ei' }, { aliases: ['Frühstücksei', 'gekochtes Ei', 'Ei'] })
food('Joghurt 3,5 %', [65, 3.5, 4.5, 3.5], { stück: 150, als: 'Becher' }, { aliases: ['Naturjoghurt', 'Vollmilchjoghurt', 'Joghurt'] })
food('Fruchtjoghurt', [100, 3.5, 14, 3], { stück: 150, als: 'Becher' }, { aliases: ['Joghurt mit Frucht', 'Erdbeerjoghurt', 'Joghurt'] })
food('Quark 20 %', [110, 12.5, 3, 5], { portion: 125 }, { aliases: ['Speisequark', 'Quark', 'Topfen'] })
food('Quark 40 %', [160, 11, 3, 11.5], { portion: 125 }, { aliases: ['Sahnequark', 'Quark'] })
food('Kräuterquark', [145, 9, 4, 10.5], { portion: 50 }, { aliases: ['Quark'] })
food('Frischkäse (Doppelrahm)', [250, 5.5, 3, 24], { portion: 30 }, { aliases: ['Frischkäse', 'Doppelrahmfrischkäse'] })
food('Schmand', [240, 2.7, 3.5, 24], { el: 15 })
food('Crème fraîche', [290, 2.5, 3, 30], { el: 15 }, { aliases: ['Creme fraiche'] })
food('Sprühsahne', [255, 2.2, 10, 23], { portion: 20, als: 'Klecks' }, { aliases: ['Schlagsahne', 'Sahne aus der Dose'] })
food('Emmentaler', [380, 28, 0, 29.5], { stück: 25, als: 'Scheibe' }, { aliases: ['Käse', 'Schweizer Käse'] })
food('Edamer', [340, 26, 0, 26], { stück: 25, als: 'Scheibe' }, { aliases: ['Käse'] })
food('Butterkäse', [345, 22, 0, 28.5], { stück: 25, als: 'Scheibe' }, { aliases: ['Käse'] })
food('Tilsiter', [350, 26, 0, 27.5], { stück: 25, als: 'Scheibe' }, { aliases: ['Käse'] })
food('Brie', [340, 20, 0, 28.5], { portion: 30 }, { aliases: ['Käse', 'Weichkäse'] })
food('Mozzarella', [250, 18, 1, 19.5], { stück: 125, als: 'Kugel' }, { aliases: ['Büffelmozzarella'] })
food('Schmelzkäsescheibe', [270, 14, 6, 21], { stück: 20, als: 'Scheibe' }, { aliases: ['Scheiblettenkäse', 'Burgerkäse', 'Schmelzkäse'] })
food('Harzer Käse', [125, 28, 0, 0.5], { portion: 30 }, { aliases: ['Harzer', 'Handkäse', 'Quargel'] })
food('Margarine', [720, 0.2, 0.5, 80], { portion: 10, als: 'Portion (fürs Brot)' }, { aliases: ['Streichfett', 'Halbfettmargarine'] })
food('Kräuterbutter', [640, 1, 2, 70], { portion: 10, als: 'Scheibe' })
drink('Milch 3,5 %', [64, 3.3, 4.8, 3.5], { portion: 200, als: 'Glas' }, { aliases: ['Vollmilch', 'Milch'] })
drink('Kefir', [65, 3.3, 4, 3.5], { portion: 250, als: 'Glas' })
drink('Buttermilch', [37, 3.3, 4, 0.5], { portion: 250, als: 'Glas' })
drink('Joghurtdrink', [75, 3, 12, 1.5], { portion: 250, als: 'Flasche' }, { aliases: ['Trinkjoghurt', 'Fruchtbuttermilch'] })
drink('Sojadrink', [40, 3.3, 2.5, 1.8], { portion: 200, als: 'Glas' }, { aliases: ['Sojamilch'] })
drink('Mandeldrink', [15, 0.5, 0.5, 1.2], { portion: 200, als: 'Glas' }, { aliases: ['Mandelmilch'] })
drink('Kaffeesahne', [120, 3, 4, 10], { portion: 10, als: 'Schuss' }, { aliases: ['Kaffeerahm'] })
drink('Kondensmilch', [130, 6.5, 9.5, 7.5], { portion: 10, als: 'Schuss' }, { aliases: ['Dosenmilch'] })

// --- Wurst, Fleisch & Fisch -------------------------------------------------------------------------------------
group('wurst')
food('Kochschinken', [125, 19.5, 1, 5], { stück: 20, als: 'Scheibe' }, { aliases: ['Schinken', 'gekochter Schinken'] })
food('Salami', [400, 21, 1, 35], { stück: 10, als: 'Scheibe' })
food('Lyoner', [280, 12, 1, 25.5], { stück: 20, als: 'Scheibe' }, { aliases: ['Fleischwurst', 'Lyoner Wurst'] })
food('Mortadella', [310, 15, 0.5, 27.5], { stück: 15, als: 'Scheibe' })
food('Bierschinken', [200, 16, 0.5, 15], { stück: 20, als: 'Scheibe' })
food('Geflügelwurst', [190, 14, 1, 14.5], { stück: 20, als: 'Scheibe' }, { aliases: ['Putenwurst', 'Hähnchenwurst', 'Geflügelmortadella'] })
food('Leberwurst', [330, 13, 1.5, 30], { portion: 20 }, { aliases: ['Streichwurst', 'Leberwurst grob'] })
food('Teewurst', [370, 14, 0.5, 35], { portion: 20 }, { aliases: ['Streichwurst'] })
food('Mett', [240, 19, 0.5, 18], { portion: 50 }, { aliases: ['Hackepeter', 'Schweinemett'] })
food('Fleischsalat', [300, 6, 4, 29], { portion: 50 })
food('Eiersalat', [210, 6.5, 2.5, 19.5], { portion: 50 })
food('Hackfleisch (gemischt)', [250, 18, 0, 20], { portion: 125 }, { aliases: ['Hackfleisch', 'Gehacktes', 'Hack', 'Faschiertes'] })
food('Rumpsteak (gebraten)', [180, 26, 0, 8.5], { stück: 200, als: 'Steak' }, { aliases: ['Steak', 'Rindersteak'] })
food('Schweinekotelett (gebraten)', [230, 26, 0, 14], { stück: 180, als: 'Kotelett' }, { aliases: ['Kotelett'] })
food('Nackensteak (gegrillt)', [260, 24, 0, 18], { stück: 180, als: 'Steak' }, { aliases: ['Schweinenackensteak', 'Grillsteak', 'Steak'] })
food('Hähnchenkeule (gebraten)', [220, 24, 0, 13.5], { stück: 150, als: 'Keule' }, { aliases: ['Hähnchenschenkel', 'Chicken Drumstick'] })
food('Spareribs', [290, 18, 6, 21.5], { portion: 300 }, { aliases: ['Rippchen', 'Ribs'] })
food('Schweinshaxe', [260, 20, 0, 20], { portion: 450, als: 'Haxe' }, { aliases: ['Haxe', 'Eisbein'] })
food('Thunfisch in Öl', [200, 25, 0, 11], { portion: 80, als: 'Dose (abgetropft)' })
food('Hering in Tomatensoße', [200, 13, 4, 15], { portion: 100 }, { aliases: ['Heringsfilet in Tomatensoße'] })
food('Bismarckhering', [210, 16, 1, 16], { stück: 75, als: 'Filet' }, { aliases: ['Rollmops', 'Hering'] })
food('Fischfrikadelle', [190, 13, 10, 11], { stück: 80 })
food('Surimi', [100, 8, 13, 1.5], { stück: 15, als: 'Stick' }, { aliases: ['Krebsfleischimitat'] })

// --- Obst (dazu die Grundnahrungsmittel wie Apfel und Banane) -------------------------------------------------
group('obst')
food('Mandarine', [50, 0.7, 10.5, 0.3], { stück: 70 }, { aliases: ['Clementine', 'Klementine'] })
food('Nektarine', [45, 1, 9.5, 0.3], { stück: 140 })
food('Pfirsich', [41, 0.8, 9, 0.1], { stück: 140 })
food('Aprikose', [45, 0.9, 9, 0.1], { stück: 50 }, { aliases: ['Marille'] })
food('Kirschen', [60, 1, 13, 0.3], { portion: 150, als: 'Schale' }, { aliases: ['Süßkirschen'] })
food('Himbeeren', [36, 1.3, 5, 0.3], { portion: 125, als: 'Schale' })
food('Brombeeren', [44, 1.2, 6, 1], { portion: 125, als: 'Schale' })
food('Johannisbeeren', [45, 1.1, 7, 0.2], { portion: 125, als: 'Schale' }, { aliases: ['Ribisel'] })
food('Wassermelone', [32, 0.6, 7.5, 0.2], { stück: 250, als: 'Scheibe' }, { aliases: ['Melone'] })
food('Honigmelone', [55, 0.9, 12.5, 0.1], { stück: 200, als: 'Scheibe' }, { aliases: ['Melone', 'Cantaloupe'] })
food('Grapefruit', [40, 0.6, 8.5, 0.1], { stück: 250 }, { aliases: ['Pampelmuse'] })
food('Granatapfel', [75, 1.5, 16, 0.6], { stück: 150, als: 'Frucht (Kerne)' })
food('Feige', [70, 1.3, 15, 0.4], { stück: 50 }, { aliases: ['Feigen'] })
food('Papaya', [32, 0.5, 7, 0.1], { portion: 150 })
food('Litschi', [66, 0.8, 16, 0.4], { portion: 100, als: 'Handvoll' }, { aliases: ['Lychee'] })
food('Getrocknete Aprikosen', [230, 3.5, 50, 0.5], { portion: 30, als: 'Handvoll' }, { aliases: ['Trockenaprikosen', 'Trockenobst'] })
food('Getrocknete Pflaumen', [225, 2.2, 48, 0.4], { portion: 30, als: 'Handvoll' }, { aliases: ['Backpflaumen', 'Trockenpflaumen', 'Trockenobst'] })
food('Fruchtpüree im Beutel', [65, 0.5, 14, 0.3], { stück: 100, als: 'Beutel' }, { aliases: ['Quetschie', 'Fruchtmus'] })
food('Obstsalat', [60, 0.6, 13.5, 0.3], { portion: 200 })

// --- Imbiss & Fast Food -----------------------------------------------------------------------------------------
group('imbiss')
food('Döner Kebab', [215, 12, 21, 9.5], { portion: 350, als: 'Döner' }, { aliases: ['Döner', 'Kebab', 'Dönerkebab', 'Doner'] })
food('Dürüm', [210, 11.5, 21, 9], { portion: 400, als: 'Dürüm' }, { aliases: ['Dürüm Döner', 'Yufka', 'Döner', 'Durum'] })
food('Dönerbox', [230, 11, 20, 12], { portion: 400, als: 'Box' }, { aliases: ['Döner Box', 'Pommesbox', 'Döner'] })
food('Döner-Teller', [180, 12, 13, 9], { portion: 550, als: 'Teller' }, { aliases: ['Dönerteller', 'Döner'] })
food('Vegetarischer Döner', [190, 7, 22, 8], { portion: 350, als: 'Döner' }, { aliases: ['Veggie-Döner', 'Gemüsedöner', 'Döner'] })
food('Shawarma', [200, 12, 19, 8.5], { portion: 350 }, { aliases: ['Schawarma'] })
food('Falafel im Brot', [220, 7, 27, 9.5], { portion: 350 }, { aliases: ['Falafel', 'Falafel-Sandwich'] })
food('Lahmacun', [210, 9, 28, 7], { stück: 250 }, { aliases: ['Türkische Pizza'] })
food('Pide', [250, 12, 30, 9], { stück: 300 })
food('Börek', [300, 9, 25, 18], { stück: 150 }, { aliases: ['Burek', 'Börek mit Käse'] })
food('Pizza Margherita', [245, 10, 31, 9], { portion: 380, als: 'Pizza' }, { aliases: ['Pizza'] })
food('Pizza Salami', [270, 11, 29, 12], { portion: 380, als: 'Pizza' }, { aliases: ['Pizza', 'Salamipizza'] })
food('Pizza Tonno', [250, 12, 28, 10], { portion: 380, als: 'Pizza' }, { aliases: ['Pizza', 'Thunfischpizza'] })
food('Pizza Funghi', [230, 9.5, 30, 8], { portion: 380, als: 'Pizza' }, { aliases: ['Pizza', 'Champignonpizza'] })
food('Pizza Hawaii', [240, 10.5, 30, 8.5], { portion: 380, als: 'Pizza' }, { aliases: ['Pizza'] })
food('Pizza Quattro Formaggi', [290, 13, 28, 14], { portion: 380, als: 'Pizza' }, { aliases: ['Pizza', 'Vier-Käse-Pizza'] })
food('Pizza Spinat', [225, 9.5, 28, 8.5], { portion: 380, als: 'Pizza' }, { aliases: ['Pizza', 'Pizza Spinaci'] })
food('Pizzastück', [250, 10, 30, 10], { stück: 150 }, { aliases: ['Pizzaschnitte', 'Pizza'] })
food('Calzone', [250, 11, 30, 9.5], { portion: 400, als: 'Calzone' }, { aliases: ['Pizza'] })
food('Currywurst', [200, 9, 8, 15], { portion: 200 }, { aliases: ['Curry-Wurst'] })
food('Currywurst mit Pommes', [210, 6, 20, 12], { portion: 400, als: 'Teller' }, { aliases: ['Currywurst Pommes'] })
food('Pommes frites', [290, 3.5, 35, 15], { portion: 150 }, { aliases: ['Pommes', 'Fritten', 'Frites'] })
food('Pommes mit Mayo', [330, 3.5, 30, 22], { portion: 180 }, { aliases: ['Pommes rot-weiß', 'Pommes'] })
food('Süßkartoffel-Pommes', [230, 2.5, 30, 11], { portion: 150 }, { aliases: ['Sweet Potato Fries', 'Pommes'] })
food('Kroketten', [190, 3, 25, 8.5], { stück: 20, als: 'Krokette' })
food('Zwiebelringe', [330, 4.5, 33, 20], { portion: 100 }, { aliases: ['Onion Rings'] })
food('Mozzarella-Sticks', [300, 13, 25, 16.5], { stück: 25 })
food('Bratwurst', [300, 13, 1, 27], { stück: 100 }, { aliases: ['Rostbratwurst', 'Grillwurst', 'Thüringer'] })
food('Bratwurst im Brötchen', [280, 11, 18, 18], { stück: 160 }, { aliases: ['Rostbratwurst im Brötchen', 'Bratwurstbrötchen'] })
food('Bockwurst', [250, 13, 1, 21.5], { stück: 100 }, { aliases: ['Würstchen'] })
food('Krakauer', [280, 15, 1, 24], { stück: 100 })
food('Wiener Würstchen', [270, 13, 1, 24], { stück: 50, als: 'Würstchen' }, { aliases: ['Wiener', 'Frankfurter', 'Würstchen', 'Wienerle'] })
food('Leberkäse', [300, 12, 1, 27.5], { stück: 100, als: 'Scheibe' }, { aliases: ['Fleischkäse', 'Leberkäs'] })
food('Leberkäsesemmel', [285, 11, 22, 17], { stück: 160 }, { aliases: ['Leberkäsbrötchen', 'Fleischkäsebrötchen', 'Leberkässemmel'] })
food('Frikadellenbrötchen', [260, 12, 25, 12.5], { stück: 150 }, { aliases: ['Bulettenbrötchen'] })
food('Schaschlik', [180, 14, 6, 11], { stück: 200, als: 'Spieß' }, { aliases: ['Schaschlikspieß'] })
food('Hamburger', [250, 13, 28, 9.5], { stück: 105 }, { aliases: ['Burger'] })
food('Cheeseburger', [265, 14, 26, 11.5], { stück: 120 }, { aliases: ['Burger'] })
food('Großer Burger', [255, 13, 20, 13.5], { stück: 220, als: 'Burger' }, { aliases: ['Burger', 'Doppelburger'] })
food('Chickenburger', [250, 13, 25, 10.5], { stück: 150, als: 'Burger' }, { aliases: ['Chicken Burger', 'Hähnchenburger', 'Burger'] })
food('Fischburger', [260, 11, 28, 11.5], { stück: 140, als: 'Burger' }, { aliases: ['Fish Burger', 'Burger'] })
food('Veggie-Burger', [230, 9, 27, 9.5], { stück: 180, als: 'Burger' }, { aliases: ['Vegetarischer Burger', 'Burger'] })
food('Chicken Nuggets', [260, 15, 17, 15], { stück: 17, portion: 120, als: 'Nugget' }, { aliases: ['Nuggets', 'Hähnchen-Nuggets'] })
food('Chicken Wings', [270, 24, 3, 18], { stück: 30, als: 'Wing' }, { aliases: ['Hähnchenflügel', 'Wings'] })
food('Hot Dog', [270, 10, 26, 14], { stück: 130 }, { aliases: ['Hotdog'] })
food('Gyros', [230, 18, 3, 16], { portion: 250 }, { aliases: ['Gyros mit Zaziki'] })
food('Gyros-Teller mit Pommes', [220, 11, 17, 12], { portion: 500, als: 'Teller' }, { aliases: ['Gyros'] })
food('Fischbrötchen', [230, 11, 22, 11], { stück: 130 }, { aliases: ['Matjesbrötchen', 'Bismarckbrötchen'] })
food('Club Sandwich', [230, 12, 20, 11.5], { stück: 250, als: 'Sandwich' }, { aliases: ['Sandwich'] })
food('Sandwich', [230, 9.5, 24, 10.5], { stück: 180, als: 'Sandwich' }, { aliases: ['Sandwich Thunfisch', 'Sandwich Ei'] })
food('Panini', [250, 11, 28, 10.5], { stück: 200 })
food('Croque Monsieur', [270, 13, 22, 14.5], { stück: 200, als: 'Croque' }, { aliases: ['Croque'] })
food('Belegtes Baguette', [240, 10, 30, 8.5], { stück: 250, als: 'Baguette' }, { aliases: ['Baguettebrötchen', 'Sandwich-Baguette'] })
food('Quesadilla', [270, 12, 25, 13.5], { stück: 200 })

// --- Restaurant & International ---------------------------------------------------------------------------------
group('restaurant')
food('Spaghetti Bolognese', [150, 7, 18, 5.5], { portion: 400, als: 'Teller' }, { aliases: ['Bolognese', 'Nudeln mit Hackfleischsoße'] })
food('Spaghetti Carbonara', [200, 8, 22, 9], { portion: 350, als: 'Teller' }, { aliases: ['Carbonara'] })
food('Spaghetti mit Tomatensoße', [130, 4.5, 23, 2.3], { portion: 400, als: 'Teller' }, { aliases: ['Spaghetti Napoli', 'Nudeln mit Tomatensoße'] })
food('Spaghetti aglio e olio', [200, 5.5, 30, 6.5], { portion: 350, als: 'Teller' }, { aliases: ['Aglio Olio'] })
food('Penne all’Arrabbiata', [140, 4.5, 24, 2.8], { portion: 400, als: 'Teller' }, { aliases: ['Arrabbiata', 'Penne'] })
food('Pasta mit Pesto', [230, 7, 28, 10], { portion: 350, als: 'Teller' }, { aliases: ['Spaghetti Pesto', 'Pesto-Nudeln'] })
food('Tortellini alla panna', [210, 8, 22, 10], { portion: 350, als: 'Teller' }, { aliases: ['Tortellini mit Sahnesoße', 'Tortellini'] })
food('Lasagne', [160, 8, 13, 8.5], { portion: 350 }, { aliases: ['Lasagna'] })
food('Risotto', [150, 4, 22, 5], { portion: 350, als: 'Teller' }, { aliases: ['Pilzrisotto'] })
food('Paella', [150, 9, 17, 5], { portion: 400, als: 'Teller' })
food('Bruschetta', [200, 5.5, 26, 8], { stück: 50 })
food('Tomate-Mozzarella', [180, 9, 3, 15], { portion: 200 }, { aliases: ['Caprese', 'Insalata Caprese'] })
food('Antipasti', [120, 2, 6, 10], { portion: 100 }, { aliases: ['Grillgemüse in Öl'] })
food('Caesar Salad', [150, 8, 6, 10.5], { portion: 250 }, { aliases: ['Caesar-Salat', 'Salat'] })
food('Griechischer Salat', [110, 4, 4, 9], { portion: 300 }, { aliases: ['Bauernsalat', 'Salat'] })
food('Salat mit Hähnchenbrust', [100, 10, 4, 5], { portion: 350 }, { aliases: ['Hähnchensalat', 'Salat'] })
food('Thunfischsalat', [110, 9, 4, 6.5], { portion: 300 }, { aliases: ['Salat'] })
food('Moussaka', [140, 7, 8, 9], { portion: 350 })
food('Souvlaki', [200, 22, 1, 12], { stück: 150, als: 'Spieß' })
food('Bifteki', [260, 17, 3, 20], { stück: 150 })
food('Gyros Pita', [240, 12, 25, 10], { stück: 300, als: 'Pita' }, { aliases: ['Pita Gyros'] })
food('Cevapcici', [260, 17, 3, 20], { stück: 40 }, { aliases: ['Ćevapčići'] })
food('Köfte', [260, 16, 4, 20], { stück: 40 }, { aliases: ['Kofta'] })
food('Sushi', [150, 6, 28, 1.5], { stück: 30 }, { aliases: ['Maki', 'Nigiri', 'Sushi-Rolle'] })
food('Poke Bowl', [140, 8, 18, 4], { portion: 450, als: 'Bowl' }, { aliases: ['Poké', 'Bowl'] })
food('Buddha Bowl', [130, 5, 15, 5.5], { portion: 400, als: 'Bowl' }, { aliases: ['Bowl'] })
food('Gebratene Nudeln', [170, 6, 22, 6.5], { portion: 350 }, { aliases: ['Bami Goreng', 'Chow Mein', 'Asia-Nudeln'] })
food('Gebratener Reis', [170, 5, 24, 6], { portion: 350 }, { aliases: ['Nasi Goreng', 'Fried Rice'] })
food('Frühlingsrolle', [230, 5, 25, 12], { stück: 60 }, { aliases: ['Frühlingsrollen'] })
food('Gyoza', [210, 8, 25, 8.5], { stück: 25 }, { aliases: ['Dumplings', 'Dim Sum', 'Teigtaschen'] })
food('Hühnchen süß-sauer mit Reis', [150, 7, 23, 3.5], { portion: 450, als: 'Teller' }, { aliases: ['Süß-sauer', 'Chicken süß-sauer'] })
food('Ente süß-sauer mit Reis', [170, 7, 22, 6], { portion: 450, als: 'Teller' }, { aliases: ['Knusprige Ente', 'Süß-sauer'] })
food('Pad Thai', [170, 7, 22, 6], { portion: 350 })
food('Curry mit Reis', [140, 7, 17, 5], { portion: 450, als: 'Teller' }, { aliases: ['Hähnchencurry', 'Chicken Curry', 'Curry'] })
food('Butter Chicken', [150, 11, 5, 9.5], { portion: 300 }, { aliases: ['Murgh Makhani', 'Curry'] })
food('Chicken Tikka Masala', [135, 12, 5, 7.5], { portion: 300 }, { aliases: ['Tikka Masala', 'Curry'] })
food('Dal', [110, 6.5, 15, 2.5], { portion: 300 }, { aliases: ['Linsen-Dal', 'Dhal', 'Curry'] })
food('Biryani', [170, 7, 24, 5], { portion: 400, als: 'Teller' })
food('Naan', [290, 9, 50, 6], { stück: 90 }, { aliases: ['Naan-Brot'] })
food('Samosa', [260, 5, 28, 14], { stück: 60 })
food('Ramen', [90, 4.5, 11, 3], { portion: 600, als: 'Schale' }, { aliases: ['Nudelsuppe'] })
food('Pho', [60, 4, 8, 1.2], { portion: 600, als: 'Schale' }, { aliases: ['Pho Bo', 'Nudelsuppe'] })
food('Bibimbap', [140, 6, 20, 4], { portion: 500, als: 'Schale' })
food('Chili con Carne', [115, 8.5, 9, 5], { portion: 350, als: 'Teller' }, { aliases: ['Chili'] })
food('Burrito', [190, 8, 23, 7], { stück: 300 })
food('Tacos', [220, 9, 20, 11.5], { stück: 100, als: 'Taco' }, { aliases: ['Taco'] })
food('Enchiladas', [190, 9, 18, 9], { stück: 200, als: 'Enchilada' }, { aliases: ['Enchilada'] })
food('Fajitas', [170, 10, 16, 7.5], { stück: 200, als: 'Fajita' }, { aliases: ['Fajita'] })
food('Nachos mit Käse', [330, 8, 35, 17.5], { portion: 150 }, { aliases: ['Nachos'] })
food('Wrap mit Hähnchen', [190, 11, 20, 7], { stück: 250, als: 'Wrap' }, { aliases: ['Chicken Wrap', 'Wrap'] })
food('Fish & Chips', [230, 10, 22, 11.5], { portion: 450 }, { aliases: ['Fish and Chips'] })
food('Quiche', [270, 9, 17, 18.5], { stück: 150 }, { aliases: ['Quiche Lorraine', 'Tarte'] })
food('Flammkuchen', [260, 8, 26, 13.5], { portion: 350, als: 'Flammkuchen' }, { aliases: ['Tarte flambée'] })

// --- Hausmannskost & Kantine ------------------------------------------------------------------------------------
group('hausmannskost')
food('Schnitzel paniert', [240, 20, 10, 13], { stück: 180, als: 'Schnitzel' }, { aliases: ['Wiener Schnitzel', 'Schnitzel', 'Schweineschnitzel paniert'] })
food('Schnitzel mit Pommes', [250, 12, 22, 13], { portion: 400, als: 'Teller' }, { aliases: ['Schnitzel'] })
food('Jägerschnitzel', [200, 14, 9, 12], { portion: 300 }, { aliases: ['Schnitzel mit Pilzsoße', 'Schnitzel'] })
food('Paprikaschnitzel', [180, 14, 9, 10], { portion: 300 }, { aliases: ['Schnitzel mit Paprikasoße', 'Schnitzel'] })
food('Cordon bleu', [270, 21, 9, 17], { stück: 200 }, { aliases: ['Schnitzel Cordon bleu'] })
food('Frikadelle', [250, 15, 8, 17.5], { stück: 100 }, { aliases: ['Bulette', 'Fleischpflanzerl', 'Fleischküchle', 'Klops'] })
food('Hackbraten', [230, 15, 6, 16.5], { stück: 150, als: 'Scheibe' }, { aliases: ['Falscher Hase'] })
food('Königsberger Klopse', [170, 11, 6, 11], { portion: 300 }, { aliases: ['Klopse'] })
food('Gulasch mit Soße', [140, 14, 4, 7.5], { portion: 250 }, { aliases: ['Gulasch', 'Rindergulasch mit Soße'] })
food('Rinderroulade mit Soße', [180, 18, 4, 10.5], { stück: 200, als: 'Roulade' }, { aliases: ['Roulade', 'Rouladen'] })
food('Sauerbraten', [170, 20, 6, 7], { portion: 250 })
food('Schweinebraten mit Soße', [200, 22, 3, 11], { portion: 200 }, { aliases: ['Schweinebraten', 'Krustenbraten', 'Braten'] })
food('Brathähnchen', [220, 25, 0, 13.5], { portion: 250, als: 'halbes Hähnchen' }, { aliases: ['Grillhähnchen', 'Hendl', 'Hähnchen gegrillt', 'halbes Hähnchen', 'halbes Hendl', 'Broiler'] })
food('Hähnchen mit Reis und Gemüse', [110, 10, 13, 2], { portion: 450, als: 'Teller' }, { aliases: ['Hähnchen mit Reis'] })
food('Kohlroulade', [120, 7, 6, 7.5], { stück: 250 }, { aliases: ['Kohlrouladen', 'Krautwickel'] })
food('Weißwurst', [270, 11, 0.5, 25], { stück: 70 }, { aliases: ['Weisswurst'] })
food('Labskaus', [120, 7, 11, 5], { portion: 400, als: 'Teller' })
food('Grünkohl mit Pinkel', [170, 9, 7, 12], { portion: 400, als: 'Teller' }, { aliases: ['Grünkohl mit Wurst'] })
food('Fischstäbchen', [210, 13, 18, 9.5], { stück: 30 })
food('Backfisch', [220, 13, 15, 12], { stück: 150 }, { aliases: ['Fisch paniert', 'Bratfisch'] })
food('Käsespätzle', [230, 10, 22, 11.5], { portion: 350, als: 'Teller' }, { aliases: ['Kässpätzle', 'Kasspatzen'] })
food('Maultaschen', [190, 8.5, 22, 7.5], { stück: 70, als: 'Maultasche' }, { aliases: ['Maultasche'] })
food('Kartoffelpuffer', [200, 3, 22, 11], { stück: 80 }, { aliases: ['Reibekuchen', 'Reiberdatschi', 'Rösti', 'Kartoffelpfannkuchen'] })
food('Pellkartoffeln mit Quark', [100, 6, 13, 2.5], { portion: 400, als: 'Teller' }, { aliases: ['Kartoffeln mit Quark'] })
food('Ofenkartoffel mit Kräuterquark', [120, 4, 15, 4.5], { portion: 350 }, { aliases: ['Folienkartoffel', 'Baked Potato'] })
food('Kartoffelgratin', [140, 4, 12, 8.5], { portion: 250 }, { aliases: ['Gratin'] })
food('Nudelauflauf', [170, 8, 16, 8], { portion: 350 }, { aliases: ['Auflauf'] })
food('Gemüseauflauf', [110, 5, 8, 6.5], { portion: 350 }, { aliases: ['Auflauf'] })
food('Strammer Max', [240, 12, 15, 14.5], { stück: 200 })
food('Toast Hawaii', [210, 11, 18, 10], { stück: 150 })
food('Zwiebelkuchen', [240, 6, 22, 14], { stück: 150 })
food('Kaiserschmarrn', [250, 7, 32, 10.5], { portion: 250 })

// --- Suppen & Eintöpfe ------------------------------------------------------------------------------------------
group('suppen')
food('Tomatensuppe', [50, 1.2, 7, 2], { portion: 300, als: 'Teller' }, { aliases: ['Suppe'] })
food('Gemüsesuppe', [40, 1.5, 6, 1], { portion: 300, als: 'Teller' }, { aliases: ['Suppe'] })
food('Kürbissuppe', [60, 1.2, 6, 3.5], { portion: 300, als: 'Teller' }, { aliases: ['Suppe'] })
food('Kartoffelsuppe', [70, 2, 9, 2.8], { portion: 300, als: 'Teller' }, { aliases: ['Suppe', 'Kartoffeleintopf'] })
food('Hühnersuppe', [40, 3.5, 3.5, 1.3], { portion: 300, als: 'Teller' }, { aliases: ['Hühnerbrühe', 'Hühnernudelsuppe', 'Nudelsuppe', 'Suppe'] })
food('Gulaschsuppe', [80, 6, 5, 4], { portion: 300, als: 'Teller' }, { aliases: ['Suppe'] })
food('Soljanka', [70, 4, 4, 4.5], { portion: 300, als: 'Teller' }, { aliases: ['Suppe'] })
food('Minestrone', [45, 2, 6.5, 1.2], { portion: 300, als: 'Teller' }, { aliases: ['Suppe'] })
food('Brokkolicremesuppe', [65, 2, 4.5, 4.5], { portion: 300, als: 'Teller' }, { aliases: ['Brokkolisuppe', 'Cremesuppe', 'Suppe'] })
food('Spargelcremesuppe', [65, 1.5, 5, 4.5], { portion: 300, als: 'Teller' }, { aliases: ['Spargelsuppe', 'Cremesuppe', 'Suppe'] })
food('Zwiebelsuppe', [55, 2, 6, 2.5], { portion: 300, als: 'Teller' }, { aliases: ['Suppe'] })
food('Erbseneintopf', [100, 6, 11, 3.5], { portion: 400, als: 'Teller' }, { aliases: ['Erbsensuppe', 'Eintopf'] })
food('Linseneintopf', [100, 6, 12, 2.8], { portion: 400, als: 'Teller' }, { aliases: ['Linsensuppe', 'Eintopf'] })
food('Bohneneintopf', [90, 5, 10, 3], { portion: 400, als: 'Teller' }, { aliases: ['Bohnensuppe', 'Eintopf'] })
food('Miso-Suppe', [25, 2, 2.5, 0.8], { portion: 250, als: 'Schale' }, { aliases: ['Misosuppe', 'Suppe'] })
food('Tom Kha Gai', [90, 5, 3.5, 6.5], { portion: 300, als: 'Schale' }, { aliases: ['Kokossuppe', 'Suppe'] })

// --- Beilagen, Salate & Soßen -----------------------------------------------------------------------------------
group('beilagen')
food('Reis (gekocht)', [130, 2.7, 28.5, 0.3], { portion: 180 }, { aliases: ['Reis', 'gekochter Reis', 'Beilagenreis'] })
food('Nudeln (gekocht)', [150, 5.5, 30, 0.8], { portion: 250 }, { aliases: ['Nudeln', 'Pasta', 'gekochte Nudeln', 'Spaghetti gekocht'] })
food('Spätzle (gekocht)', [160, 6, 28, 2.5], { portion: 200 }, { aliases: ['Spätzle'] })
food('Couscous (gekocht)', [120, 4, 23, 0.5], { portion: 150 }, { aliases: ['Couscous'] })
food('Quinoa (gekocht)', [120, 4.4, 21, 1.9], { portion: 150 }, { aliases: ['Quinoa'] })
food('Bulgur (gekocht)', [85, 3, 17, 0.3], { portion: 150 }, { aliases: ['Bulgur'] })
food('Kartoffelpüree', [90, 2, 13, 3.5], { portion: 200 }, { aliases: ['Kartoffelbrei', 'Stampf', 'Püree'] })
food('Bratkartoffeln', [140, 2.5, 17, 7], { portion: 200 })
food('Ofenpommes', [160, 2.5, 25, 5], { portion: 150 }, { aliases: ['Backofenpommes', 'Pommes'] })
food('Semmelknödel', [200, 7, 30, 5.5], { stück: 100, als: 'Knödel' }, { aliases: ['Knödel', 'Serviettenknödel'] })
food('Kartoffelknödel', [110, 2, 23, 0.5], { stück: 100, als: 'Knödel' }, { aliases: ['Klöße', 'Kartoffelklöße', 'Knödel'] })
food('Apfelrotkohl', [70, 1.2, 12, 1.8], { portion: 150 }, { aliases: ['Rotkraut', 'Blaukraut', 'Rotkohl gekocht'] })
food('Rahmspinat', [70, 3, 4, 4.5], { portion: 150 }, { aliases: ['Spinat'] })
food('Erbsen und Möhren', [60, 3, 9, 1.2], { portion: 150 }, { aliases: ['Leipziger Allerlei', 'Mischgemüse'] })
food('Gemischter Salat', [20, 1.2, 2.5, 0.3], { portion: 150 }, { aliases: ['Beilagensalat', 'grüner Salat', 'Salat'] })
food('Gurkensalat', [35, 0.8, 3, 2], { portion: 150 }, { aliases: ['Salat'] })
food('Tomatensalat', [55, 1, 3.5, 4], { portion: 150 }, { aliases: ['Salat'] })
food('Krautsalat', [60, 1.2, 6, 3.3], { portion: 150 }, { aliases: ['Coleslaw', 'Weißkrautsalat', 'Salat'] })
food('Kartoffelsalat mit Mayonnaise', [190, 2, 13, 14.5], { portion: 200 }, { aliases: ['Kartoffelsalat'] })
food('Kartoffelsalat mit Essig und Öl', [110, 2, 14, 5], { portion: 200 }, { aliases: ['Kartoffelsalat', 'Schwäbischer Kartoffelsalat'] })
food('Nudelsalat', [230, 5, 20, 14], { portion: 200 }, { aliases: ['Salat'] })
food('Hummus', [250, 7.5, 13, 18], { portion: 50 }, { aliases: ['Humus', 'Kichererbsenpüree', 'Dip'] })
food('Guacamole', [160, 2, 8, 13.5], { portion: 50 }, { aliases: ['Avocado-Dip', 'Dip'] })
food('Tzatziki', [110, 4, 4, 8.5], { portion: 50 }, { aliases: ['Zaziki', 'Dip'] })
food('Ketchup', [110, 1.5, 25, 0.2], { el: 15 }, { aliases: ['Tomatenketchup', 'Soße'] })
food('Mayonnaise', [680, 1.2, 1.5, 75], { el: 15 }, { aliases: ['Mayo', 'Soße'] })
food('Remoulade', [460, 1, 6, 48], { el: 15 }, { aliases: ['Soße'] })
food('Grillsoße', [150, 1, 35, 0.3], { el: 15 }, { aliases: ['BBQ-Soße', 'Barbecue-Soße', 'Soße'] })
food('Currysoße', [120, 1, 25, 1.5], { el: 15 }, { aliases: ['Curryketchup', 'Soße'] })
food('Sweet-Chili-Soße', [210, 0.5, 51, 0.2], { el: 15 }, { aliases: ['Süß-sauer-Soße', 'Soße'] })
food('Knoblauchsoße', [380, 2, 5, 39], { el: 15 }, { aliases: ['Knoblauchsauce', 'Aioli', 'Soße'] })
food('Pesto', [450, 5, 5, 45], { el: 15 }, { aliases: ['Pesto Genovese', 'Basilikumpesto'] })
food('Joghurtdressing', [120, 2.5, 7, 9], { el: 15 }, { aliases: ['Dressing', 'Salatsoße'] })
food('Vinaigrette', [300, 0.2, 5, 31], { el: 15 }, { aliases: ['Essig-Öl-Dressing', 'Dressing', 'Salatsoße'] })
food('Sauce Hollandaise', [480, 1.5, 5, 50], { portion: 50 }, { aliases: ['Hollandaise', 'Soße'] })
food('Bratensoße', [50, 1.5, 6, 2.2], { portion: 60, als: 'Kelle' }, { aliases: ['Soße', 'Jus'] })

// --- Süßes & Desserts -------------------------------------------------------------------------------------------
group('suesses')
food('Vollmilchschokolade', [535, 7.5, 57, 30], { portion: 25, als: 'Riegel (4 Stückchen)' }, { aliases: ['Schokolade', 'Milchschokolade'] })
food('Weiße Schokolade', [550, 6, 59, 32], { portion: 25, als: 'Riegel (4 Stückchen)' }, { aliases: ['Schokolade'] })
food('Schokoriegel', [480, 4.5, 64, 23], { stück: 50, als: 'Riegel' }, { aliases: ['Schokoladenriegel', 'Karamellriegel'] })
food('Waffelschnitte', [530, 6, 58, 30], { stück: 10, als: 'Waffel' }, { aliases: ['Haselnusswaffel'] })
food('Pralinen', [520, 6, 52, 32], { stück: 12, als: 'Praline' }, { aliases: ['Praline', 'Konfekt'] })
food('Marzipan', [490, 8, 55, 25], { stück: 20 }, { aliases: ['Marzipankartoffeln'] })
food('Schokokuss', [420, 3.5, 65, 16], { stück: 22 }, { aliases: ['Schaumkuss'] })
food('Gummibärchen', [340, 7, 77, 0.2], { portion: 25, als: 'Handvoll' }, { aliases: ['Fruchtgummi', 'Weingummi', 'Gummibären'] })
food('Lakritz', [350, 3.5, 80, 0.5], { portion: 25, als: 'Handvoll' }, { aliases: ['Lakritze', 'Salmiak'] })
food('Butterkekse', [440, 7.5, 72, 13.5], { stück: 5, als: 'Keks' }, { aliases: ['Kekse', 'Butterkeks'] })
food('Doppelkeks', [480, 5, 68, 20.5], { stück: 12, als: 'Keks' }, { aliases: ['Schokokeks', 'Sandwichkeks', 'Kekse'] })
food('Cookies', [490, 6, 63, 23.5], { stück: 12, als: 'Cookie' }, { aliases: ['Schokokekse', 'Cookie', 'Kekse'] })
food('Kokosmakrone', [450, 5, 50, 25], { stück: 15 }, { aliases: ['Makrone'] })
food('Lebkuchen', [380, 5.5, 70, 9], { stück: 30 }, { aliases: ['Pfefferkuchen'] })
food('Spekulatius', [470, 6, 70, 18.5], { stück: 8, als: 'Keks' })
food('Zimtstern', [430, 7, 55, 20], { stück: 10 }, { aliases: ['Zimtsterne', 'Plätzchen'] })
food('Vanillekipferl', [520, 6, 50, 33], { stück: 8 }, { aliases: ['Plätzchen'] })
food('Butterplätzchen', [480, 6, 60, 23.5], { stück: 8, als: 'Plätzchen' }, { aliases: ['Plätzchen', 'Weihnachtsplätzchen', 'Kekse'] })
food('Stollen', [400, 6, 52, 18.5], { stück: 80, als: 'Scheibe' }, { aliases: ['Christstollen'] })
food('Speiseeis', [210, 3.5, 24, 11], { stück: 50, als: 'Kugel' }, { aliases: ['Eis', 'Eiskugel', 'Sahneeis', 'Milcheis'] })
food('Sorbet', [120, 0.5, 29, 0.2], { stück: 50, als: 'Kugel' }, { aliases: ['Fruchteis', 'Eis', 'Wassereis'] })
food('Eis am Stiel', [290, 3.5, 27, 18.5], { stück: 70 }, { aliases: ['Stieleis'] })
food('Eisbecher', [210, 3, 25, 11], { portion: 250, als: 'Becher' }, { aliases: ['Spaghettieis', 'Bananensplit'] })
food('Frozen Yogurt', [130, 4, 22, 3], { portion: 150, als: 'Becher' }, { aliases: ['Froyo'] })
food('Schokopudding', [110, 3.5, 17, 3], { stück: 125, als: 'Becher' }, { aliases: ['Pudding', 'Vanillepudding'] })
food('Milchreis (Becher)', [115, 3.5, 18, 3], { stück: 200, als: 'Becher' }, { aliases: ['Grießbrei', 'Grießpudding'] })
food('Quarkspeise mit Obst', [120, 6, 15, 4], { portion: 150 }, { aliases: ['Quarkcreme', 'Quarkspeise'] })
food('Tiramisu', [280, 5, 25, 17.5], { portion: 120 })
food('Mousse au Chocolat', [300, 5, 25, 20], { portion: 100 }, { aliases: ['Schokomousse'] })
food('Panna cotta', [250, 3, 22, 16.5], { portion: 120 })
food('Crème brûlée', [300, 4.5, 22, 22], { portion: 120 }, { aliases: ['Creme brulee'] })
food('Rote Grütze', [110, 0.7, 26, 0.3], { portion: 150 })
food('Dampfnudel', [260, 6.5, 40, 8.5], { stück: 150 }, { aliases: ['Germknödel', 'Hefekloß'] })
food('Churros', [400, 5, 45, 22], { portion: 100 })
food('Gebrannte Mandeln', [500, 11, 50, 28.5], { portion: 50, als: 'Tüte' })
food('Zuckerwatte', [395, 0, 99, 0], { portion: 30 })

// --- Snacks & Nüsse ---------------------------------------------------------------------------------------------
group('snacks')
food('Kartoffelchips', [540, 6, 50, 34], { portion: 30, als: 'Handvoll' }, { aliases: ['Chips'] })
food('Tortilla-Chips', [490, 7, 60, 24], { portion: 30, als: 'Handvoll' }, { aliases: ['Nachochips', 'Chips'] })
food('Gemüsechips', [500, 5, 50, 30], { portion: 30, als: 'Handvoll' }, { aliases: ['Chips'] })
food('Erdnussflips', [520, 13, 50, 29], { portion: 30, als: 'Handvoll' }, { aliases: ['Flips'] })
food('Salzstangen', [380, 10, 77, 3.5], { portion: 30, als: 'Handvoll' }, { aliases: ['Salzbrezeln', 'Salzgebäck'] })
food('Cracker', [460, 9, 65, 18], { portion: 30, als: 'Handvoll' }, { aliases: ['Kräcker'] })
food('Reiscracker', [380, 7, 82, 2], { portion: 30, als: 'Handvoll' })
food('Grissini', [410, 12, 68, 9.5], { stück: 5, als: 'Stange' })
food('Popcorn (süß)', [470, 6, 70, 18], { portion: 50 }, { aliases: ['Popcorn', 'Kinopopcorn'] })
food('Popcorn (salzig)', [520, 8.5, 55, 28], { portion: 50 }, { aliases: ['Popcorn'] })
food('Erdnüsse (gesalzen)', [610, 26, 12, 50], { portion: 30, als: 'Handvoll' }, { aliases: ['Erdnüsse', 'Nüsse'] })
food('Pistazien', [600, 21, 18, 50], { portion: 30, als: 'Handvoll' }, { aliases: ['Nüsse'] })
food('Studentenfutter', [470, 13, 40, 29], { portion: 30, als: 'Handvoll' }, { aliases: ['Nussmischung', 'Trail Mix', 'Nüsse'] })
food('Bananenchips', [520, 2.3, 58, 31], { portion: 30, als: 'Handvoll' })
food('Beef Jerky', [280, 45, 12, 5.5], { portion: 25 }, { aliases: ['Trockenfleisch'] })
food('Proteinriegel', [360, 32, 30, 12], { stück: 60, als: 'Riegel' }, { aliases: ['Eiweißriegel'] })
food('Fruchtschnitte', [340, 2, 75, 3.5], { stück: 25, als: 'Riegel' }, { aliases: ['Fruchtriegel'] })
food('Energy Balls', [400, 9, 50, 18], { stück: 20, als: 'Kugel' }, { aliases: ['Energiekugeln', 'Energiebällchen'] })

// --- Getränke (pro 100 ml) -------------------------------------------------------------------------------------
group('getraenke')
drink('Wasser', [0, 0, 0, 0], { portion: 250, als: 'Glas' }, { aliases: ['Mineralwasser', 'Sprudel', 'Sprudelwasser', 'Leitungswasser', 'stilles Wasser', 'Tafelwasser'] })
drink('Cola', [42, 0, 10.6, 0], { portion: 330, als: 'Dose' }, { aliases: ['Cola-Getränk'] })
drink('Cola ohne Zucker', [0, 0, 0, 0], { portion: 330, als: 'Dose' }, { aliases: ['Cola light', 'Cola zero', 'Light-Cola'] })
drink('Spezi', [43, 0, 10.5, 0], { portion: 500, als: 'Flasche' }, { aliases: ['Cola-Orange', 'Cola-Mix'] })
drink('Limonade', [40, 0, 10, 0], { portion: 330, als: 'Dose' }, { aliases: ['Orangenlimonade', 'Zitronenlimonade', 'Brause'] })
drink('Ginger Ale', [36, 0, 9, 0], { portion: 330, als: 'Dose' })
drink('Tonic Water', [35, 0, 8.5, 0], { portion: 200, als: 'Flasche' }, { aliases: ['Tonic'] })
drink('Eistee', [30, 0, 7.5, 0], { portion: 500, als: 'Flasche' })
drink('Fassbrause', [25, 0, 6, 0], { portion: 330, als: 'Flasche' })
drink('Malzbier', [45, 0.5, 10.5, 0], { portion: 330, als: 'Flasche' }, { aliases: ['Malztrunk'] })
drink('Energydrink', [45, 0, 11, 0], { portion: 250, als: 'Dose' }, { aliases: ['Energy-Drink'] })
drink('Sportgetränk', [25, 0, 6, 0], { portion: 500, als: 'Flasche' }, { aliases: ['Isotonisches Getränk', 'Iso-Drink'] })
drink('Vitaminwasser', [20, 0, 5, 0], { portion: 500, als: 'Flasche' })
drink('Sirup (verdünnt)', [30, 0, 7.5, 0], { portion: 250, als: 'Glas' }, { aliases: ['Sirupwasser', 'Holundersirup'] })
drink('Kokoswasser', [20, 0.2, 4.5, 0.2], { portion: 330, als: 'Packung' })
drink('Kombucha', [20, 0, 4.5, 0], { portion: 330, als: 'Flasche' })
drink('Apfelsaft', [46, 0.1, 11, 0], { portion: 200, als: 'Glas' }, { aliases: ['Saft'] })
drink('Orangensaft', [43, 0.7, 9.5, 0.2], { portion: 200, als: 'Glas' }, { aliases: ['O-Saft', 'Saft'] })
drink('Multivitaminsaft', [50, 0.3, 11.5, 0.1], { portion: 200, als: 'Glas' }, { aliases: ['ACE-Saft', 'Saft'] })
drink('Traubensaft', [70, 0.3, 16.5, 0], { portion: 200, als: 'Glas' }, { aliases: ['Saft'] })
drink('Tomatensaft', [17, 0.8, 3, 0.1], { portion: 200, als: 'Glas' }, { aliases: ['Saft'] })
drink('Apfelschorle', [23, 0, 5.5, 0], { portion: 330, als: 'Glas' }, { aliases: ['Schorle', 'Saftschorle'] })
drink('Smoothie', [55, 0.6, 12, 0.3], { portion: 250, als: 'Flasche' })
drink('Milchshake', [110, 3.5, 16, 3.5], { portion: 300, als: 'Becher' }, { aliases: ['Shake'] })
drink('Proteinshake', [75, 9, 5, 2], { portion: 300, als: 'Shaker' }, { aliases: ['Eiweißshake', 'Protein-Shake', 'Shake'] })
drink('Kakao', [80, 3.5, 11, 2.5], { portion: 250, als: 'Tasse' }, { aliases: ['Kakao mit Milch', 'Trinkschokolade', 'Heiße Schokolade'] })
drink('Kaffee (schwarz)', [2, 0.2, 0.3, 0], { portion: 200, als: 'Tasse' }, { aliases: ['Kaffee', 'Filterkaffee'] })
drink('Kaffee mit Milch', [15, 0.8, 1.1, 0.8], { portion: 200, als: 'Tasse' }, { aliases: ['Kaffee'] })
drink('Cappuccino', [40, 2.2, 3, 2], { portion: 200, als: 'Tasse' }, { aliases: ['Kaffee'] })
drink('Latte Macchiato', [50, 2.8, 4, 2.6], { portion: 300, als: 'Glas' }, { aliases: ['Latte', 'Kaffee'] })
drink('Milchkaffee', [45, 2.5, 3.5, 2.3], { portion: 250, als: 'Tasse' }, { aliases: ['Café au Lait', 'Kaffee'] })
drink('Flat White', [55, 3, 4.5, 2.8], { portion: 180, als: 'Tasse' }, { aliases: ['Kaffee'] })
drink('Caffè Mocha', [80, 3, 10, 3], { portion: 300, als: 'Tasse' }, { aliases: ['Mocha', 'Kaffee mit Schokolade', 'Kaffee'] })
drink('Iced Latte', [45, 2.5, 4, 2], { portion: 400, als: 'Becher' }, { aliases: ['Eis-Latte', 'Kaffee'] })
drink('Eiskaffee', [110, 2.3, 13, 5.5], { portion: 300, als: 'Glas' }, { aliases: ['Kaffee'] })
drink('Chai Latte', [65, 2.5, 10, 1.8], { portion: 300, als: 'Tasse' }, { aliases: ['Chai'] })
drink('Matcha Latte', [55, 2.8, 6, 2.2], { portion: 300, als: 'Tasse' }, { aliases: ['Matcha'] })
drink('Bubble Tea', [70, 0.5, 15, 1], { portion: 500, als: 'Becher' })
drink('Tee (ungesüßt)', [1, 0, 0.2, 0], { portion: 250, als: 'Tasse' }, { aliases: ['Tee', 'Kräutertee', 'Früchtetee', 'Grüner Tee'] })
drink('Alkoholfreier Cocktail', [60, 0, 15, 0], { portion: 300, als: 'Glas' }, { aliases: ['Mocktail', 'Virgin Cocktail'] })

// --- Bier, Wein & Cocktails (pro 100 ml) -----------------------------------------------------------------------
group('alkohol')
drink('Bier', [42, 0.5, 3, 0], { portion: 500, als: 'Flasche (0,5 l)' }, { aliases: ['Pils', 'Helles', 'Lager', 'Export'], alcohol: 3.9 })
drink('Weißbier', [45, 0.5, 3.5, 0], { portion: 500, als: 'Glas (0,5 l)' }, { aliases: ['Weizen', 'Hefeweizen', 'Weizenbier', 'Bier'], alcohol: 4.1 })
drink('Dunkles Bier', [45, 0.5, 4, 0], { portion: 500, als: 'Flasche (0,5 l)' }, { aliases: ['Dunkles', 'Schwarzbier', 'Bier'], alcohol: 3.8 })
drink('Kölsch', [40, 0.5, 2.8, 0], { portion: 200, als: 'Stange (0,2 l)' }, { aliases: ['Bier'], alcohol: 3.8 })
drink('Altbier', [42, 0.5, 3, 0], { portion: 250, als: 'Glas (0,25 l)' }, { aliases: ['Alt', 'Bier'], alcohol: 3.8 })
drink('Radler', [35, 0.3, 5.5, 0], { portion: 500, als: 'Flasche (0,5 l)' }, { aliases: ['Alsterwasser', 'Bier'], alcohol: 2 })
drink('Alkoholfreies Bier', [25, 0.4, 5.5, 0], { portion: 500, als: 'Flasche (0,5 l)' }, { aliases: ['Bier alkoholfrei', 'Bier'] })
drink('Rotwein', [70, 0, 0.5, 0], { portion: 200, als: 'Glas (0,2 l)' }, { aliases: ['Wein'], alcohol: 9.5 })
drink('Weißwein', [70, 0, 1, 0], { portion: 200, als: 'Glas (0,2 l)' }, { aliases: ['Wein'], alcohol: 9.3 })
drink('Roséwein', [70, 0, 1.5, 0], { portion: 200, als: 'Glas (0,2 l)' }, { aliases: ['Rosé', 'Wein'], alcohol: 9.2 })
drink('Weinschorle', [35, 0, 0.5, 0], { portion: 250, als: 'Glas' }, { aliases: ['Weißweinschorle', 'Schorle'], alcohol: 4.7 })
drink('Sekt', [75, 0, 3, 0], { portion: 100, als: 'Glas (0,1 l)' }, { aliases: ['Prosecco', 'Champagner', 'Schaumwein'], alcohol: 9 })
drink('Federweißer', [65, 0, 8, 0], { portion: 200, als: 'Glas' }, { aliases: ['Neuer Wein', 'Sturm'], alcohol: 4.7 })
drink('Apfelwein', [40, 0, 2.5, 0], { portion: 300, als: 'Glas' }, { aliases: ['Äppler', 'Ebbelwoi', 'Cidre', 'Most'], alcohol: 4.4 })
drink('Sangria', [80, 0, 9, 0], { portion: 250, als: 'Glas' }, { alcohol: 6.5 })
drink('Glühwein', [95, 0, 10, 0], { portion: 200, als: 'Tasse' }, { alcohol: 8 })
drink('Aperol Spritz', [65, 0, 5.5, 0], { portion: 200, als: 'Glas' }, { aliases: ['Spritz', 'Aperol'], alcohol: 6 })
drink('Hugo', [60, 0, 5, 0], { portion: 250, als: 'Glas' }, { aliases: ['Holunder-Spritz', 'Spritz'], alcohol: 5.5 })
drink('Gin Tonic', [70, 0, 4.5, 0], { portion: 250, als: 'Glas' }, { aliases: ['Longdrink'], alcohol: 7.5 })
drink('Cuba Libre', [80, 0, 7, 0], { portion: 300, als: 'Glas' }, { aliases: ['Rum Cola', 'Longdrink'], alcohol: 7.5 })
drink('Wodka Energy', [90, 0, 8, 0], { portion: 300, als: 'Glas' }, { aliases: ['Vodka Energy', 'Longdrink'], alcohol: 8.3 })
drink('Mojito', [100, 0, 12, 0], { portion: 300, als: 'Glas' }, { aliases: ['Cocktail'], alcohol: 7.5 })
drink('Caipirinha', [160, 0, 18, 0], { portion: 250, als: 'Glas' }, { aliases: ['Cocktail'], alcohol: 12 })
drink('Piña Colada', [180, 0.5, 22, 5], { portion: 250, als: 'Glas' }, { aliases: ['Pina Colada', 'Cocktail'], alcohol: 7 })
drink('Schnaps', [230, 0, 0, 0], { portion: 20, als: 'Glas (2 cl)' }, { aliases: ['Wodka', 'Korn', 'Obstler', 'Kurzer'], alcohol: 33 })
drink('Whisky', [250, 0, 0, 0], { portion: 40, als: 'Glas (4 cl)' }, { aliases: ['Whiskey', 'Bourbon'], alcohol: 35 })
drink('Likör', [290, 0, 30, 0], { portion: 20, als: 'Glas (2 cl)' }, { aliases: ['Kräuterlikör'], alcohol: 24 })
drink('Eierlikör', [280, 4, 27, 6], { portion: 20, als: 'Glas (2 cl)' }, { alcohol: 14 })

export const EVERYDAY_FOODS: readonly EverydayFood[] = LIST
