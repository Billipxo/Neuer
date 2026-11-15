/**
 * Alltägliches zum Eintragen: Backwaren, Gerichte aus Kantine und Imbiss, Süßes, Snacks und Getränke – mit typischer
 * Menge (1 Brötchen, 1 Döner, 1 Kugel Eis, 1 Glas Wein …), sofort und ohne Internet auffindbar.
 *
 * Gerundete Richtwerte pro 100 g, Getränke pro 100 ml (1 ml ≈ 1 g), nach gängigen Nährwerttabellen und
 * Herstellerangaben. Rezepte, Portionen und Produkte unterscheiden sich – für Genaueres das Produkt scannen oder ein
 * eigenes Lebensmittel anlegen. Alkohol zählt mit 7 kcal pro Gramm.
 */
export interface EverydayFood {
  name: string
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
  /** Name der Menge, z. B. „Scheibe“, „Kugel“, „Dose“ */
  als?: string
}

interface Options {
  aliases?: string[]
  /** Alkohol in g pro 100 ml */
  alcohol?: number
}

const LIST: EverydayFood[] = []

/** Werte pro 100 g: kcal, Eiweiß, Kohlenhydrate, Fett */
function food(name: string, [kcal, protein, carbs, fat]: [number, number, number, number], size: Size, opts: Options = {}) {
  LIST.push({
    name,
    aliases: opts.aliases ?? [],
    kcal,
    protein,
    carbs,
    fat,
    alcohol: opts.alcohol ?? 0,
    piece: size.stück ?? null,
    portion: size.portion ?? null,
    measure: size.als ?? (size.stück ? 'Stück' : 'Portion'),
    liquid: false,
  })
}

/** Getränk: Werte pro 100 ml */
function drink(name: string, values: [number, number, number, number], size: Size, opts: Options = {}) {
  food(name, values, size, opts)
  LIST[LIST.length - 1].liquid = true
}

// --- Backwaren & Frühstück -----------------------------------------------------------------------------------
food('Brötchen', [270, 9, 52, 2], { stück: 60 }, { aliases: ['Semmel', 'Schrippe', 'Weck', 'Weckle', 'Wecken', 'Weizenbrötchen', 'Rundstück'] })
food('Körnerbrötchen', [280, 10, 44, 6.5], { stück: 80 }, { aliases: ['Mehrkornbrötchen', 'Kürbiskernbrötchen'] })
food('Laugenbrezel', [275, 8.5, 54, 2.5], { stück: 80 }, { aliases: ['Brezel', 'Breze', 'Brezn'] })
food('Laugenbrötchen', [270, 9, 52, 2.5], { stück: 70 }, { aliases: ['Laugenstange', 'Laugenstück'] })
food('Butterbrezel', [330, 7, 45, 13], { stück: 100 }, { aliases: ['Butterbreze'] })
food('Toastbrot', [265, 8, 48, 4], { stück: 25, als: 'Scheibe' }, { aliases: ['Toast', 'Weizentoast', 'Sandwichtoast'] })
food('Mischbrot', [235, 7, 46, 1.5], { stück: 50, als: 'Scheibe' }, { aliases: ['Brot', 'Graubrot', 'Bauernbrot', 'Roggenmischbrot'] })
food('Butterbrot', [315, 6, 38, 15], { stück: 60, als: 'Scheibe' }, { aliases: ['Brot mit Butter', 'Stulle', 'Bemme'] })
food('Croissant', [410, 8, 45, 21], { stück: 60 }, { aliases: ['Hörnchen', 'Buttercroissant'] })
food('Schokocroissant', [430, 7, 48, 23], { stück: 75 }, { aliases: ['Pain au Chocolat', 'Schokohörnchen'] })
food('Berliner', [360, 6, 50, 15], { stück: 70 }, { aliases: ['Krapfen', 'Kreppel'] })
food('Donut', [420, 5, 48, 23], { stück: 60 }, { aliases: ['Doughnut'] })
food('Muffin', [410, 5, 50, 21], { stück: 100 }, { aliases: ['Schokomuffin', 'Cupcake'] })
food('Zimtschnecke', [370, 6, 52, 15], { stück: 90 }, { aliases: ['Franzbrötchen', 'Zimtbrötchen'] })
food('Käsekuchen', [250, 9, 25, 12], { stück: 120 }, { aliases: ['Quarkkuchen', 'Käsetorte', 'Kuchen'] })
food('Apfelkuchen', [250, 3.5, 35, 10.5], { stück: 120 }, { aliases: ['Kuchen', 'Obstkuchen'] })
food('Streuselkuchen', [380, 6, 52, 16.5], { stück: 90 }, { aliases: ['Kuchen'] })
food('Schwarzwälder Kirschtorte', [280, 4, 30, 16], { stück: 130 }, { aliases: ['Kirschtorte', 'Sahnetorte', 'Torte'] })
food('Apfelstrudel', [230, 3, 32, 10], { stück: 150 }, { aliases: ['Strudel'] })
food('Waffel', [330, 6, 40, 16], { stück: 60 }, { aliases: ['Waffeln'] })
food('Pfannkuchen', [220, 7, 28, 9], { stück: 80 }, { aliases: ['Eierkuchen', 'Crêpe', 'Crepe', 'Palatschinken', 'Pancake', 'Plinsen'] })
food('Bagel', [260, 10, 50, 1.6], { stück: 90 })
food('Müsli', [360, 10, 60, 7], { portion: 50, als: 'Schale' }, { aliases: ['Früchtemüsli', 'Bircher'] })
food('Knuspermüsli', [450, 9, 62, 18], { portion: 50, als: 'Schale' }, { aliases: ['Granola', 'Crunchy Müsli', 'Schokomüsli'] })
food('Cornflakes', [375, 7, 84, 1], { portion: 30, als: 'Schale' }, { aliases: ['Frühstücksflocken', 'Flakes'] })
food('Müsliriegel', [400, 6, 64, 13], { stück: 25, als: 'Riegel' }, { aliases: ['Getreideriegel', 'Haferriegel'] })
food('Nuss-Nougat-Creme', [540, 6.3, 57.5, 31], { portion: 15 }, { aliases: ['Nutella', 'Schokocreme', 'Schokoaufstrich', 'Nougatcreme'] })
food('Konfitüre', [245, 0.4, 60, 0.1], { portion: 20 }, { aliases: ['Marmelade', 'Gelee', 'Fruchtaufstrich'] })
food('Rührei', [190, 11, 1.5, 15.5], { portion: 150 }, { aliases: ['Rühreier'] })
food('Spiegelei', [200, 13, 0.5, 16], { stück: 60 }, { aliases: ['Spiegeleier', 'Ei gebraten'] })
food('Porridge', [95, 4, 13, 3], { portion: 250, als: 'Schale' }, { aliases: ['Haferbrei', 'Haferschleim', 'Oatmeal'] })
food('Fruchtjoghurt', [100, 3.5, 14, 3], { stück: 150, als: 'Becher' }, { aliases: ['Joghurt mit Frucht', 'Erdbeerjoghurt'] })
food('Käsebrötchen', [260, 11, 30, 10.5], { stück: 110 }, { aliases: ['Belegtes Brötchen mit Käse', 'Käsesemmel'] })
food('Schinkenbrötchen', [230, 11, 32, 6], { stück: 110 }, { aliases: ['Belegtes Brötchen mit Schinken', 'Schinkensemmel'] })

// --- Gerichte: Imbiss, Kantine, Restaurant ---------------------------------------------------------------------
food('Pizza Margherita', [245, 10, 31, 9], { portion: 380, als: 'Pizza' }, { aliases: ['Pizza'] })
food('Pizza Salami', [270, 11, 29, 12], { portion: 380, als: 'Pizza' }, { aliases: ['Pizza', 'Salamipizza'] })
food('Pizza Tonno', [250, 12, 28, 10], { portion: 380, als: 'Pizza' }, { aliases: ['Pizza', 'Thunfischpizza'] })
food('Pizza Funghi', [230, 9.5, 30, 8], { portion: 380, als: 'Pizza' }, { aliases: ['Pizza', 'Champignonpizza'] })
food('Döner Kebab', [215, 12, 21, 9.5], { portion: 350, als: 'Döner' }, { aliases: ['Döner', 'Kebab', 'Dönerkebab', 'Doner'] })
food('Dürüm', [210, 11.5, 21, 9], { portion: 400, als: 'Dürüm' }, { aliases: ['Dürüm Döner', 'Yufka', 'Döner', 'Durum'] })
food('Falafel im Brot', [220, 7, 27, 9.5], { portion: 350 }, { aliases: ['Falafel', 'Falafel-Sandwich'] })
food('Lahmacun', [210, 9, 28, 7], { stück: 250 }, { aliases: ['Türkische Pizza'] })
food('Currywurst', [200, 9, 8, 15], { portion: 200 }, { aliases: ['Curry-Wurst'] })
food('Currywurst mit Pommes', [210, 6, 20, 12], { portion: 400, als: 'Teller' }, { aliases: ['Currywurst Pommes'] })
food('Pommes frites', [290, 3.5, 35, 15], { portion: 150 }, { aliases: ['Pommes', 'Fritten', 'Frites'] })
food('Bratwurst', [300, 13, 1, 27], { stück: 100 }, { aliases: ['Rostbratwurst', 'Grillwurst', 'Thüringer'] })
food('Bratwurst im Brötchen', [280, 11, 18, 18], { stück: 160 }, { aliases: ['Rostbratwurst im Brötchen', 'Bratwurstbrötchen'] })
food('Leberkäse', [300, 12, 1, 27.5], { stück: 100, als: 'Scheibe' }, { aliases: ['Fleischkäse', 'Leberkäs'] })
food('Leberkäsesemmel', [285, 11, 22, 17], { stück: 160 }, { aliases: ['Leberkäsbrötchen', 'Fleischkäsebrötchen', 'Leberkässemmel'] })
food('Wiener Würstchen', [270, 13, 1, 24], { stück: 50, als: 'Würstchen' }, { aliases: ['Wiener', 'Frankfurter', 'Würstchen', 'Wienerle'] })
food('Weißwurst', [270, 11, 0.5, 25], { stück: 70 }, { aliases: ['Weisswurst'] })
food('Frikadelle', [250, 15, 8, 17.5], { stück: 100 }, { aliases: ['Bulette', 'Fleischpflanzerl', 'Fleischküchle', 'Klops'] })
food('Hamburger', [250, 13, 28, 9.5], { stück: 105 }, { aliases: ['Burger'] })
food('Cheeseburger', [265, 14, 26, 11.5], { stück: 120 }, { aliases: ['Burger'] })
food('Großer Burger', [255, 13, 20, 13.5], { stück: 220, als: 'Burger' }, { aliases: ['Burger', 'Doppelburger'] })
food('Chicken Nuggets', [260, 15, 17, 15], { portion: 100 }, { aliases: ['Nuggets', 'Hähnchen-Nuggets'] })
food('Hot Dog', [270, 10, 26, 14], { stück: 130 }, { aliases: ['Hotdog'] })
food('Schnitzel paniert', [240, 20, 10, 13], { stück: 180, als: 'Schnitzel' }, { aliases: ['Wiener Schnitzel', 'Schnitzel', 'Schweineschnitzel paniert'] })
food('Schnitzel mit Pommes', [250, 12, 22, 13], { portion: 400, als: 'Teller' }, { aliases: ['Schnitzel'] })
food('Spaghetti Bolognese', [150, 7, 18, 5.5], { portion: 400, als: 'Teller' }, { aliases: ['Bolognese', 'Nudeln mit Hackfleischsoße'] })
food('Spaghetti Carbonara', [200, 8, 22, 9], { portion: 350, als: 'Teller' }, { aliases: ['Carbonara'] })
food('Lasagne', [160, 8, 13, 8.5], { portion: 350 }, { aliases: ['Lasagna'] })
food('Käsespätzle', [230, 10, 22, 11.5], { portion: 350, als: 'Teller' }, { aliases: ['Kässpätzle', 'Kasspatzen'] })
food('Maultaschen', [190, 8.5, 22, 7.5], { stück: 70, als: 'Maultasche' }, { aliases: ['Maultasche'] })
food('Gulasch mit Soße', [140, 14, 4, 7.5], { portion: 250 }, { aliases: ['Gulasch', 'Rindergulasch mit Soße'] })
food('Rinderroulade mit Soße', [180, 18, 4, 10.5], { stück: 200, als: 'Roulade' }, { aliases: ['Roulade', 'Rouladen'] })
food('Schweinebraten mit Soße', [200, 22, 3, 11], { portion: 200 }, { aliases: ['Schweinebraten', 'Krustenbraten', 'Braten'] })
food('Brathähnchen', [220, 25, 0, 13.5], { portion: 250, als: 'halbes Hähnchen' }, { aliases: ['Grillhähnchen', 'Hendl', 'Hähnchen gegrillt'] })
food('Chicken Wings', [270, 24, 3, 18], { stück: 30, als: 'Wing' }, { aliases: ['Hähnchenflügel', 'Wings'] })
food('Gyros', [230, 18, 3, 16], { portion: 250 }, { aliases: ['Gyros mit Zaziki'] })
food('Gyros-Teller mit Pommes', [220, 11, 17, 12], { portion: 500, als: 'Teller' }, { aliases: ['Gyros'] })
food('Fischstäbchen', [210, 13, 18, 9.5], { stück: 30 })
food('Backfisch', [220, 13, 15, 12], { stück: 150 }, { aliases: ['Fisch paniert', 'Bratfisch'] })
food('Fischbrötchen', [230, 11, 22, 11], { stück: 130 }, { aliases: ['Matjesbrötchen', 'Bismarckbrötchen'] })
food('Sushi', [150, 6, 28, 1.5], { stück: 30 }, { aliases: ['Maki', 'Nigiri', 'Sushi-Rolle'] })
food('Gebratene Nudeln', [170, 6, 22, 6.5], { portion: 350 }, { aliases: ['Bami Goreng', 'Chow Mein', 'Asia-Nudeln'] })
food('Gebratener Reis', [170, 5, 24, 6], { portion: 350 }, { aliases: ['Nasi Goreng', 'Fried Rice'] })
food('Frühlingsrolle', [230, 5, 25, 12], { stück: 60 }, { aliases: ['Frühlingsrollen'] })
food('Pad Thai', [170, 7, 22, 6], { portion: 350 })
food('Curry mit Reis', [140, 7, 17, 5], { portion: 450, als: 'Teller' }, { aliases: ['Hähnchencurry', 'Chicken Curry', 'Curry'] })
food('Ramen', [90, 4.5, 11, 3], { portion: 600, als: 'Schale' }, { aliases: ['Nudelsuppe'] })
food('Chili con Carne', [115, 8.5, 9, 5], { portion: 350, als: 'Teller' }, { aliases: ['Chili'] })
food('Burrito', [190, 8, 23, 7], { stück: 300 })
food('Tacos', [220, 9, 20, 11.5], { stück: 100, als: 'Taco' }, { aliases: ['Taco'] })
food('Nachos mit Käse', [330, 8, 35, 17.5], { portion: 150 }, { aliases: ['Nachos'] })
food('Wrap mit Hähnchen', [190, 11, 20, 7], { stück: 250, als: 'Wrap' }, { aliases: ['Chicken Wrap', 'Wrap'] })
food('Toast Hawaii', [210, 11, 18, 10], { stück: 150 })
food('Quiche', [270, 9, 17, 18.5], { stück: 150 }, { aliases: ['Quiche Lorraine', 'Tarte'] })
food('Flammkuchen', [260, 8, 26, 13.5], { portion: 350, als: 'Flammkuchen' }, { aliases: ['Tarte flambée'] })
food('Kaiserschmarrn', [250, 7, 32, 10.5], { portion: 250 })
food('Ofenkartoffel mit Kräuterquark', [120, 4, 15, 4.5], { portion: 350 }, { aliases: ['Folienkartoffel', 'Baked Potato'] })
food('Caesar Salad', [150, 8, 6, 10.5], { portion: 250 }, { aliases: ['Caesar-Salat', 'Salat'] })
food('Gemischter Salat', [20, 1.2, 2.5, 0.3], { portion: 150 }, { aliases: ['Beilagensalat', 'grüner Salat', 'Salat'] })
food('Kartoffelsalat mit Mayonnaise', [190, 2, 13, 14.5], { portion: 200 }, { aliases: ['Kartoffelsalat'] })
food('Kartoffelsalat mit Essig und Öl', [110, 2, 14, 5], { portion: 200 }, { aliases: ['Kartoffelsalat', 'Schwäbischer Kartoffelsalat'] })
food('Bratkartoffeln', [140, 2.5, 17, 7], { portion: 200 })
food('Kartoffelpüree', [90, 2, 13, 3.5], { portion: 200 }, { aliases: ['Kartoffelbrei', 'Stampf', 'Püree'] })
food('Reis (gekocht)', [130, 2.7, 28.5, 0.3], { portion: 180 }, { aliases: ['gekochter Reis'] })
food('Nudeln (gekocht)', [150, 5.5, 30, 0.8], { portion: 250 }, { aliases: ['Pasta', 'gekochte Nudeln', 'Spaghetti gekocht'] })
food('Tomatensuppe', [50, 1.2, 7, 2], { portion: 300, als: 'Teller' })
food('Gemüsesuppe', [40, 1.5, 6, 1], { portion: 300, als: 'Teller' }, { aliases: ['Suppe'] })
food('Kürbissuppe', [60, 1.2, 6, 3.5], { portion: 300, als: 'Teller' }, { aliases: ['Suppe'] })
food('Erbseneintopf', [100, 6, 11, 3.5], { portion: 400, als: 'Teller' }, { aliases: ['Erbsensuppe', 'Eintopf'] })
food('Obstsalat', [60, 0.6, 13.5, 0.3], { portion: 200 })

// --- Süßes & Snacks ----------------------------------------------------------------------------------------------
food('Vollmilchschokolade', [535, 7.5, 57, 30], { portion: 25, als: 'Riegel (4 Stückchen)' }, { aliases: ['Schokolade', 'Milchschokolade'] })
food('Schokoriegel', [480, 4.5, 64, 23], { stück: 50, als: 'Riegel' }, { aliases: ['Schokoladenriegel', 'Karamellriegel'] })
food('Gummibärchen', [340, 7, 77, 0.2], { portion: 25, als: 'Handvoll' }, { aliases: ['Fruchtgummi', 'Weingummi', 'Gummibären'] })
food('Kartoffelchips', [540, 6, 50, 34], { portion: 30, als: 'Handvoll' }, { aliases: ['Chips'] })
food('Salzstangen', [380, 10, 77, 3.5], { portion: 30, als: 'Handvoll' }, { aliases: ['Salzbrezeln', 'Salzgebäck'] })
food('Popcorn (süß)', [470, 6, 70, 18], { portion: 50 }, { aliases: ['Popcorn', 'Kinopopcorn'] })
food('Popcorn (salzig)', [520, 8.5, 55, 28], { portion: 50 }, { aliases: ['Popcorn'] })
food('Butterkekse', [440, 7.5, 72, 13.5], { stück: 5, als: 'Keks' }, { aliases: ['Kekse', 'Butterkeks'] })
food('Cookies', [490, 6, 63, 23.5], { stück: 12, als: 'Cookie' }, { aliases: ['Schokokekse', 'Cookie', 'Kekse'] })
food('Speiseeis', [210, 3.5, 24, 11], { stück: 50, als: 'Kugel' }, { aliases: ['Eis', 'Eiskugel', 'Sahneeis', 'Milcheis'] })
food('Sorbet', [120, 0.5, 29, 0.2], { stück: 50, als: 'Kugel' }, { aliases: ['Fruchteis', 'Eis', 'Wassereis'] })
food('Eis am Stiel', [290, 3.5, 27, 18.5], { stück: 70 }, { aliases: ['Eis', 'Stieleis'] })
food('Schokopudding', [110, 3.5, 17, 3], { stück: 125, als: 'Becher' }, { aliases: ['Pudding', 'Vanillepudding'] })
food('Milchreis (Becher)', [115, 3.5, 18, 3], { stück: 200, als: 'Becher' }, { aliases: ['Grießbrei'] })
food('Tiramisu', [280, 5, 25, 17.5], { portion: 120 })
food('Mousse au Chocolat', [300, 5, 25, 20], { portion: 100 }, { aliases: ['Schokomousse'] })
food('Rote Grütze', [110, 0.7, 26, 0.3], { portion: 150 })
food('Lebkuchen', [380, 5.5, 70, 9], { stück: 30 }, { aliases: ['Pfefferkuchen'] })
food('Spekulatius', [470, 6, 70, 18.5], { stück: 8, als: 'Keks' })
food('Studentenfutter', [470, 13, 40, 29], { portion: 30, als: 'Handvoll' }, { aliases: ['Nussmischung', 'Trail Mix'] })
food('Proteinriegel', [360, 32, 30, 12], { stück: 60, als: 'Riegel' }, { aliases: ['Eiweißriegel'] })

// --- Getränke (pro 100 ml) -------------------------------------------------------------------------------------
drink('Cola', [42, 0, 10.6, 0], { portion: 330, als: 'Dose' }, { aliases: ['Cola-Getränk'] })
drink('Cola ohne Zucker', [0, 0, 0, 0], { portion: 330, als: 'Dose' }, { aliases: ['Cola light', 'Cola zero', 'Light-Cola'] })
drink('Limonade', [40, 0, 10, 0], { portion: 330, als: 'Dose' }, { aliases: ['Orangenlimonade', 'Zitronenlimonade', 'Brause'] })
drink('Eistee', [30, 0, 7.5, 0], { portion: 500, als: 'Flasche' })
drink('Apfelsaft', [46, 0.1, 11, 0], { portion: 200, als: 'Glas' }, { aliases: ['Saft'] })
drink('Orangensaft', [43, 0.7, 9.5, 0.2], { portion: 200, als: 'Glas' }, { aliases: ['O-Saft', 'Saft'] })
drink('Multivitaminsaft', [50, 0.3, 11.5, 0.1], { portion: 200, als: 'Glas' }, { aliases: ['ACE-Saft', 'Saft'] })
drink('Apfelschorle', [23, 0, 5.5, 0], { portion: 330, als: 'Glas' }, { aliases: ['Schorle', 'Saftschorle'] })
drink('Smoothie', [55, 0.6, 12, 0.3], { portion: 250, als: 'Flasche' })
drink('Energydrink', [45, 0, 11, 0], { portion: 250, als: 'Dose' }, { aliases: ['Energy-Drink'] })
drink('Kakao', [80, 3.5, 11, 2.5], { portion: 250, als: 'Tasse' }, { aliases: ['Kakao mit Milch', 'Trinkschokolade', 'Heiße Schokolade'] })
drink('Kaffee (schwarz)', [2, 0.2, 0.3, 0], { portion: 200, als: 'Tasse' }, { aliases: ['Kaffee', 'Filterkaffee'] })
drink('Kaffee mit Milch', [15, 0.8, 1.1, 0.8], { portion: 200, als: 'Tasse' }, { aliases: ['Kaffee'] })
drink('Cappuccino', [40, 2.2, 3, 2], { portion: 200, als: 'Tasse' }, { aliases: ['Kaffee'] })
drink('Latte Macchiato', [50, 2.8, 4, 2.6], { portion: 300, als: 'Glas' }, { aliases: ['Latte', 'Kaffee'] })
drink('Milchkaffee', [45, 2.5, 3.5, 2.3], { portion: 250, als: 'Tasse' }, { aliases: ['Café au Lait', 'Kaffee'] })
drink('Tee (ungesüßt)', [1, 0, 0.2, 0], { portion: 250, als: 'Tasse' }, { aliases: ['Tee', 'Kräutertee', 'Früchtetee', 'Grüner Tee'] })
drink('Bier', [42, 0.5, 3, 0], { portion: 500, als: 'Flasche (0,5 l)' }, { aliases: ['Pils', 'Helles', 'Lager', 'Export'], alcohol: 3.9 })
drink('Weißbier', [45, 0.5, 3.5, 0], { portion: 500, als: 'Glas (0,5 l)' }, { aliases: ['Weizen', 'Hefeweizen', 'Weizenbier', 'Bier'], alcohol: 4.1 })
drink('Radler', [35, 0.3, 5.5, 0], { portion: 500, als: 'Flasche (0,5 l)' }, { aliases: ['Alsterwasser', 'Bier'], alcohol: 2 })
drink('Alkoholfreies Bier', [25, 0.4, 5.5, 0], { portion: 500, als: 'Flasche (0,5 l)' }, { aliases: ['Bier alkoholfrei', 'Bier'] })
drink('Rotwein', [70, 0, 0.5, 0], { portion: 200, als: 'Glas (0,2 l)' }, { aliases: ['Wein'], alcohol: 9.5 })
drink('Weißwein', [70, 0, 1, 0], { portion: 200, als: 'Glas (0,2 l)' }, { aliases: ['Wein'], alcohol: 9.3 })
drink('Sekt', [75, 0, 3, 0], { portion: 100, als: 'Glas (0,1 l)' }, { aliases: ['Prosecco', 'Champagner', 'Schaumwein'], alcohol: 9 })
drink('Aperol Spritz', [65, 0, 5.5, 0], { portion: 200, als: 'Glas' }, { aliases: ['Spritz', 'Aperol'], alcohol: 6 })
drink('Gin Tonic', [70, 0, 4.5, 0], { portion: 250, als: 'Glas' }, { aliases: ['Longdrink'], alcohol: 7.5 })
drink('Schnaps', [230, 0, 0, 0], { portion: 20, als: 'Glas (2 cl)' }, { aliases: ['Wodka', 'Korn', 'Obstler', 'Kurzer'], alcohol: 33 })
drink('Glühwein', [95, 0, 10, 0], { portion: 200, als: 'Tasse' }, { alcohol: 8 })

export const EVERYDAY_FOODS: readonly EverydayFood[] = LIST
