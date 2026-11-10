/**
 * Kochwissen: kurze, praktische Anleitungen. Zeiten und Temperaturen sind Richtwerte für den Haushalt.
 */

export type GuideBlock =
  | { type: 'text'; text: string }
  | { type: 'list'; title?: string; items: string[] }
  | { type: 'steps'; title?: string; items: string[] }
  | { type: 'table'; title?: string; head: string[]; rows: string[][] }
  | { type: 'tip'; text: string }
  /** Aus Daten erzeugte Inhalte (Saisonkalender, Gewichtstabelle) */
  | { type: 'generated'; kind: 'season' | 'weights' }

export type GuideCategory = 'geraete' | 'grundlagen' | 'planen' | 'wissen'

export const GUIDE_CATEGORY_LABELS: Record<GuideCategory, string> = {
  geraete: 'Geräte & Techniken',
  grundlagen: 'Grundlagen',
  planen: 'Planen & Vorrat',
  wissen: 'Gut zu wissen',
}

export interface Guide {
  id: string
  title: string
  emoji: string
  summary: string
  category: GuideCategory
  /** Lesezeit in Minuten */
  minutes: number
  blocks: GuideBlock[]
  /** Passende Rezepte zum Ausprobieren */
  recipeIds?: string[]
}

export const GUIDES: Guide[] = [
  {
    id: 'heissluftfritteuse',
    title: 'Heißluftfritteuse: Grundlagen & Garzeiten',
    emoji: '💨',
    summary: 'So wird es knusprig mit wenig Öl – plus Garzeiten-Tabelle und Umrechnung von Backofen-Rezepten.',
    category: 'geraete',
    minutes: 4,
    blocks: [
      {
        type: 'text',
        text: 'Eine Heißluftfritteuse ist im Grunde ein kleiner, sehr kräftiger Umluftofen. Heiße Luft strömt schnell um das Gargut – dadurch wird es mit wenig Öl außen knusprig und bleibt innen saftig.',
      },
      {
        type: 'list',
        title: 'Die wichtigsten Regeln',
        items: [
          'Korb nicht überfüllen: höchstens ein bis zwei Lagen – sonst wird das Gargut eher gedämpft als knusprig.',
          'Nach etwa der Hälfte der Zeit schütteln oder wenden.',
          'Wenig Öl genügt: 1 TL bis 1 EL pro Portion, am besten mit dem Gargut vermischen oder aufsprühen.',
          'Lebensmittel trocken tupfen – Feuchtigkeit verhindert das Bräunen.',
          'Vorheizen (2–3 Minuten) sorgt für gleichmäßigere Ergebnisse, ist bei vielen Geräten aber nicht zwingend.',
          'Backpapier nur zusammen mit Gargut einlegen oder gelochtes Papier nutzen – loses Papier kann zum Heizelement gewirbelt werden.',
          'Kleine ofenfeste Formen und Silikonförmchen eignen sich für Aufläufe, Muffins und Kuchen.',
        ],
      },
      {
        type: 'table',
        title: 'Garzeiten (Richtwerte)',
        head: ['Lebensmittel', 'Temperatur', 'Zeit', 'Hinweis'],
        rows: [
          ['Pommes, frisch geschnitten', '200 °C', '18–25 Min.', '30 Min. wässern, trocknen, 1 TL Öl'],
          ['Pommes, tiefgekühlt', '200 °C', '12–16 Min.', 'ohne zusätzliches Öl'],
          ['Süßkartoffel-Pommes', '200 °C', '15–20 Min.', 'mit etwas Stärke bestäuben'],
          ['Kartoffelspalten', '200 °C', '20–25 Min.', '2–3-mal schütteln'],
          ['Hähnchenbrust (ca. 200 g)', '190 °C', '12–16 Min.', 'Kerntemperatur mind. 75 °C'],
          ['Hähnchenschenkel mit Knochen', '200 °C', '22–28 Min.', 'Hautseite nach oben'],
          ['Lachsfilet', '190 °C', '8–10 Min.', 'Hautseite nach unten'],
          ['Frikadellen, Burger-Patties', '190–200 °C', '10–12 Min.', 'nach der Hälfte wenden'],
          ['Gemüse in Stücken', '190 °C', '8–12 Min.', 'z. B. Paprika, Zucchini, Brokkoli'],
          ['Rosenkohl, halbiert', '200 °C', '13–15 Min.', 'nach der Hälfte schütteln'],
          ['Tofu-Würfel', '200 °C', '12–15 Min.', 'vorher pressen, mit Stärke bestäuben'],
          ['Kichererbsen aus der Dose', '200 °C', '12–15 Min.', 'sehr gut trocken tupfen'],
          ['Eier, hart', '150 °C', '14–16 Min.', 'danach kalt abschrecken'],
          ['Brötchen aufbacken', '180 °C', '3–5 Min.', ''],
          ['Tiefkühlgemüse', '200 °C', '10–14 Min.', 'nicht auftauen'],
        ],
      },
      {
        type: 'text',
        text: 'Backofen-Rezepte umrechnen: Als Faustregel die Temperatur um etwa 20 °C senken und die Garzeit um rund 20 % verkürzen. Bei Kuchen und Aufläufen lieber früher nachsehen.',
      },
      {
        type: 'list',
        title: 'Reinigen',
        items: [
          'Korb und Einsatz nach dem Abkühlen mit warmem Spülwasser reinigen – keine Scheuermittel auf der Antihaft-Beschichtung.',
          'Fett aus der Schublade regelmäßig entfernen, sonst kann es beim nächsten Garen rauchen.',
        ],
      },
      { type: 'tip', text: 'Garzeiten schwanken je nach Gerät, Korbgröße und Menge. Beim ersten Mal lieber ein paar Minuten früher kontrollieren.' },
    ],
    recipeIds: ['suesskartoffel-pommes', 'knusprige-haehnchenstreifen', 'rosenkohl-kartoffeln-airfryer', 'gemuese-ei-muffins', 'knuspermuesli'],
  },
  {
    id: 'reis-kochen',
    title: 'Reis perfekt kochen',
    emoji: '🍚',
    summary: 'Die Quellmethode Schritt für Schritt – mit Wassermengen und Garzeiten für jede Sorte.',
    category: 'grundlagen',
    minutes: 3,
    blocks: [
      {
        type: 'text',
        text: 'Reis lässt sich auf zwei Arten garen: mit der Quellmethode, bei der er das gesamte Wasser aufnimmt, oder wie Nudeln in viel Wasser. Für lockeren, aromatischen Reis ist die Quellmethode ideal.',
      },
      {
        type: 'steps',
        title: 'Quellmethode',
        items: [
          'Reis in einem Sieb unter kaltem Wasser waschen, bis das Wasser fast klar abläuft – so wird er weniger klebrig.',
          'Reis mit der passenden Menge Wasser (siehe Tabelle) und einer Prise Salz in einen Topf geben und aufkochen.',
          'Hitze auf die kleinste Stufe stellen, Deckel auflegen und quellen lassen. Nicht umrühren und den Deckel möglichst geschlossen lassen.',
          'Nach der Garzeit vom Herd nehmen, 5–10 Minuten mit Deckel ruhen lassen und mit einer Gabel auflockern.',
        ],
      },
      {
        type: 'table',
        title: 'Wassermenge und Garzeit',
        head: ['Sorte', 'Wasser pro Tasse Reis', 'Garzeit'],
        rows: [
          ['Basmati, Jasmin', '1,5 Tassen', '10–12 Min.'],
          ['Langkornreis', '2 Tassen', '15–18 Min.'],
          ['Vollkornreis', '2,5 Tassen', '35–40 Min.'],
          ['Risottoreis', 'nach und nach 3–4 Tassen Brühe', '18–20 Min. unter Rühren'],
          ['Milchreis', 'ca. 6 Tassen Milch', '25–30 Min.'],
        ],
      },
      { type: 'text', text: 'Menge: Als Beilage rechnet man etwa 60–75 g ungekochten Reis pro Person.' },
      {
        type: 'tip',
        text: 'Reste schnell abkühlen lassen und im Kühlschrank aufbewahren (höchstens 1–2 Tage). Steht gekochter Reis lange warm, können sich Keime vermehren, deren Gifte beim Aufwärmen nicht zerstört werden.',
      },
    ],
    recipeIds: ['thunfisch-reis-bowl', 'pilzrisotto', 'gemuese-reispfanne-ei', 'milchreis-apfelmus'],
  },
  {
    id: 'nudeln-kochen',
    title: 'Nudeln al dente',
    emoji: '🍝',
    summary: 'Wasser, Salz, Garpunkt und warum man das Nudelwasser aufheben sollte.',
    category: 'grundlagen',
    minutes: 2,
    blocks: [
      {
        type: 'list',
        title: 'So gelingen Nudeln',
        items: [
          'Pro 100 g Nudeln etwa 1 Liter Wasser verwenden.',
          'Salz erst ins kochende Wasser geben – etwa 10 g (2 TL) pro Liter.',
          'Nudeln ins sprudelnd kochende Wasser geben und in den ersten 2 Minuten umrühren, damit nichts zusammenklebt.',
          '1–2 Minuten vor Ende der Packungsangabe probieren: Al dente heißt, der Kern hat noch leichten Biss.',
          'Vor dem Abgießen eine Tasse Nudelwasser abnehmen – die Stärke darin bindet Saucen.',
          'Nudeln nicht kalt abspülen (außer für Salat) – sonst haftet die Sauce schlechter.',
          'Kein Öl ins Kochwasser – es sorgt nur dafür, dass die Sauce weniger gut haftet.',
        ],
      },
      {
        type: 'table',
        title: 'Mengen pro Person (ungekocht)',
        head: ['Verwendung', 'Menge'],
        rows: [
          ['Hauptgericht', '100–125 g'],
          ['Beilage oder Suppe', '50–80 g'],
          ['Vollkornnudeln', 'sättigen stärker – 80–100 g reichen meist'],
        ],
      },
      { type: 'tip', text: 'Vollkornnudeln enthalten deutlich mehr Ballaststoffe und brauchen oft 1–2 Minuten länger.' },
    ],
    recipeIds: ['pasta-brokkoli-zitrone', 'spaghetti-tomatensauce', 'linsen-bolognese', 'kuerbis-pasta-salbei'],
  },
  {
    id: 'kartoffeln',
    title: 'Kartoffeln: Sorten & Garzeiten',
    emoji: '🥔',
    summary: 'Festkochend oder mehlig? Welche Sorte wofür passt, wie lange sie brauchen und wie man sie lagert.',
    category: 'grundlagen',
    minutes: 3,
    blocks: [
      {
        type: 'table',
        title: 'Welche Sorte wofür?',
        head: ['Kochtyp', 'Ideal für'],
        rows: [
          ['festkochend', 'Kartoffelsalat, Bratkartoffeln, Gratin, Pellkartoffeln'],
          ['vorwiegend festkochend', 'Salzkartoffeln, Ofenkartoffeln, Eintöpfe'],
          ['mehligkochend', 'Püree, Suppe, Klöße, Reibekuchen'],
        ],
      },
      {
        type: 'steps',
        title: 'Salzkartoffeln',
        items: [
          'Kartoffeln schälen und in gleich große Stücke schneiden.',
          'Mit kaltem Wasser knapp bedecken, salzen (ca. 1 TL pro Liter) und aufkochen.',
          'Zugedeckt bei mittlerer Hitze 15–20 Minuten garen – sie sind fertig, wenn ein Messer leicht hineingleitet.',
          'Abgießen und im offenen Topf kurz ausdampfen lassen.',
        ],
      },
      {
        type: 'table',
        title: 'Garzeiten',
        head: ['Zubereitung', 'Zeit'],
        rows: [
          ['Pellkartoffeln, mittelgroß', '20–25 Min.'],
          ['Salzkartoffeln in Stücken', '15–20 Min.'],
          ['Für Püree, gewürfelt', 'ca. 15 Min.'],
          ['Ofenkartoffeln (200 °C Umluft)', '50–60 Min.'],
          ['Ganze Kartoffeln in der Heißluftfritteuse (200 °C)', '35–40 Min.'],
        ],
      },
      {
        type: 'list',
        title: 'Lagerung',
        items: [
          'Kühl, dunkel und trocken lagern (ideal 4–8 °C) – nicht im Kühlschrank.',
          'Grüne Stellen und Keime großzügig entfernen, sie enthalten Solanin.',
          'Nicht neben Äpfeln lagern – sie lassen Kartoffeln schneller keimen.',
        ],
      },
      { type: 'tip', text: 'Für Kartoffelsalat und Bratkartoffeln die Kartoffeln am Vortag kochen – abgekühlt zerfallen sie nicht.' },
    ],
    recipeIds: ['bratkartoffeln-spiegelei', 'kartoffelsalat-joghurt', 'pellkartoffeln-kraeuterquark', 'fischstaebchen-pueree'],
  },
  {
    id: 'eier',
    title: 'Eier kochen & braten',
    emoji: '🥚',
    summary: 'Von weich bis hart, dazu Rührei, Spiegelei und der Frischetest im Wasserglas.',
    category: 'grundlagen',
    minutes: 2,
    blocks: [
      { type: 'text', text: 'Die Zeiten gelten für Eier der Größe M direkt aus dem Kühlschrank, die in sprudelnd kochendes Wasser gelegt werden.' },
      {
        type: 'table',
        title: 'Kochzeiten',
        head: ['Ergebnis', 'Zeit'],
        rows: [
          ['weich (Eiweiß fest, Eigelb flüssig)', '5–6 Min.'],
          ['wachsweich', '7–8 Min.'],
          ['hart', '9–10 Min.'],
          ['Größe L', 'jeweils ca. 1 Minute länger'],
        ],
      },
      {
        type: 'steps',
        title: 'So geht’s',
        items: [
          'Eier am stumpfen Ende anstechen – so platzen sie seltener.',
          'Mit einem Löffel vorsichtig ins kochende Wasser legen und den Timer stellen.',
          'Nach der Garzeit sofort kalt abschrecken. Das stoppt den Garprozess und die Eier lassen sich leichter pellen.',
        ],
      },
      {
        type: 'list',
        title: 'In der Pfanne',
        items: [
          'Rührei: bei kleiner Hitze langsam stocken lassen und vom Herd nehmen, solange es noch glänzt.',
          'Spiegelei: mittlere Hitze, 3–4 Minuten. Mit Deckel wird das Eigelb oben fester.',
          'Omelett: Eier verquirlen, in die mittelheiße Pfanne geben und die gestockten Ränder zur Mitte schieben.',
        ],
      },
      { type: 'tip', text: 'Frischetest: Ein frisches Ei bleibt im Wasserglas am Boden liegen, ein älteres stellt sich auf, ein sehr altes schwimmt oben.' },
    ],
    recipeIds: ['ruehrei-raeucherlachs', 'herzhaftes-porridge', 'senfeier', 'avocado-spiegelei-brot'],
  },
  {
    id: 'gemuese-garen',
    title: 'Gemüse richtig garen',
    emoji: '🥦',
    summary: 'Dämpfen, dünsten, blanchieren oder rösten – damit Gemüse knackig und aromatisch bleibt.',
    category: 'grundlagen',
    minutes: 3,
    blocks: [
      { type: 'text', text: 'Kurz und schonend gegart bleibt Gemüse knackig, farbintensiv und aromatisch. Welche Methode passt, hängt vom Gemüse und vom Gericht ab.' },
      {
        type: 'table',
        title: 'Garmethoden',
        head: ['Methode', 'So geht’s'],
        rows: [
          ['Dämpfen', 'im Siebeinsatz über wenig kochendem Wasser – sehr schonend'],
          ['Dünsten', 'mit wenig Fett und etwas Flüssigkeit im geschlossenen Topf'],
          ['Blanchieren', '1–3 Minuten in sprudelndem Salzwasser, dann in Eiswasser – für Salate oder vor dem Einfrieren'],
          ['Braten', 'in der heißen Pfanne, nicht zu viel auf einmal'],
          ['Rösten', 'im Ofen oder in der Heißluftfritteuse bei 200–220 °C – Röstaromen, süßlicher Geschmack'],
        ],
      },
      {
        type: 'table',
        title: 'Garzeiten beim Dämpfen',
        head: ['Gemüse', 'Zeit'],
        rows: [
          ['Brokkoli-Röschen', '5–7 Min.'],
          ['Blumenkohl-Röschen', '8–10 Min.'],
          ['Karotten in Scheiben', '8–10 Min.'],
          ['Grüne Bohnen', '8–10 Min.'],
          ['Erbsen (TK)', '3–4 Min.'],
          ['Spinat', '1–2 Min.'],
          ['Weißer Spargel', '12–15 Min.'],
        ],
      },
      {
        type: 'list',
        title: 'Tipps',
        items: [
          'Gleich große Stücke schneiden – dann ist alles gleichzeitig gar.',
          'Beim Braten erst salzen, wenn das Gemüse Farbe hat – sonst zieht es Wasser.',
          'Ein Spritzer Zitrone oder Essig zum Schluss hebt den Geschmack.',
        ],
      },
    ],
    recipeIds: ['ofengemuese-halloumi', 'ratatouille-quinoa', 'blechgemuese-feta-kichererbsen', 'brokkoli-kartoffel-suppe'],
  },
  {
    id: 'huelsenfruechte',
    title: 'Hülsenfrüchte: Linsen, Bohnen, Kichererbsen',
    emoji: '🫘',
    summary: 'Einweichen oder nicht? Kochzeiten, Umrechnung von Dose zu getrocknet und Tipps für Bekömmlichkeit.',
    category: 'grundlagen',
    minutes: 3,
    blocks: [
      { type: 'text', text: 'Hülsenfrüchte sind günstig, sättigend und reich an Eiweiß und Ballaststoffen. Viele Sorten gibt es auch fertig gegart in der Dose.' },
      {
        type: 'table',
        title: 'Einweichen und Kochzeit',
        head: ['Sorte', 'Einweichen', 'Kochzeit'],
        rows: [
          ['rote Linsen', 'nein', '10–15 Min. (zerfallen)'],
          ['gelbe Linsen', 'nein', '15–20 Min.'],
          ['Teller- oder braune Linsen', 'nein', '25–35 Min.'],
          ['Belugalinsen', 'nein', '20–25 Min.'],
          ['Schälerbsen', 'nein', '40–60 Min.'],
          ['Kichererbsen, getrocknet', 'über Nacht (ca. 12 Std.)', '60–90 Min.'],
          ['Kidney- und weiße Bohnen, getrocknet', 'über Nacht (ca. 12 Std.)', '60–90 Min.'],
        ],
      },
      {
        type: 'list',
        title: 'Gut zu wissen',
        items: [
          'Getrocknete Bohnen und Kichererbsen immer vollständig durchgaren – roh oder halbgar sind sie unverträglich.',
          'Einweichwasser wegschütten und in frischem Wasser kochen.',
          'Erst nach dem Garen salzen, sonst werden sie langsamer weich.',
          'Dosenware in einem Sieb abspülen – das entfernt überschüssiges Salz.',
        ],
      },
      { type: 'text', text: 'Umrechnung: Eine Dose (400 g) enthält etwa 240–250 g abgetropfte Hülsenfrüchte – das entspricht rund 100 g getrockneter Ware.' },
    ],
    recipeIds: ['dal-rote-linsen', 'linsensuppe', 'hummus-gemuesesticks', 'chili-sin-carne', 'linsensalat-feta'],
  },
  {
    id: 'kerntemperaturen',
    title: 'Fleisch & Fisch sicher garen',
    emoji: '🌡️',
    summary: 'Kerntemperaturen als Richtwerte und die wichtigsten Regeln für eine saubere Küche.',
    category: 'wissen',
    minutes: 3,
    blocks: [
      {
        type: 'text',
        text: 'Mit einem Bratenthermometer gelingt der Garpunkt zuverlässig. Gemessen wird an der dicksten Stelle, ohne den Knochen zu berühren. Die Werte sind Richtwerte für den Haushalt.',
      },
      {
        type: 'table',
        title: 'Kerntemperaturen',
        head: ['Lebensmittel', 'Kerntemperatur', 'Erkennungszeichen'],
        rows: [
          ['Geflügel (Hähnchen, Pute)', 'mind. 75 °C', 'Saft klar, Fleisch nicht mehr rosa'],
          ['Hackfleisch (Frikadellen, Burger)', 'mind. 70 °C', 'innen durchgehend gegart'],
          ['Schweinefilet', '60–65 °C', 'zart rosa'],
          ['Schweinebraten', '70–75 °C', 'durchgegart'],
          ['Rindersteak medium', '54–57 °C', 'rosa, saftig'],
          ['Lachs, glasig', '45–50 °C', 'innen noch leicht glasig'],
          ['Lachs und weißer Fisch, durch', '55–60 °C', 'lässt sich in Lamellen teilen'],
        ],
      },
      {
        type: 'list',
        title: 'Küchenhygiene',
        items: [
          'Rohes Geflügel nicht waschen – Spritzwasser verteilt Keime in der Küche. Trocken tupfen genügt.',
          'Für rohes Fleisch ein eigenes Schneidebrett verwenden und danach heiß spülen.',
          'Hände nach dem Kontakt mit rohem Fleisch, Fisch oder Ei gründlich waschen.',
          'Tiefgekühltes Fleisch im Kühlschrank auftauen und das Auftauwasser wegschütten.',
        ],
      },
      { type: 'tip', text: 'Nach dem Braten 3–5 Minuten ruhen lassen – die Temperatur steigt noch etwas an und der Saft verteilt sich.' },
    ],
    recipeIds: ['haehnchen-kartoffel-blech', 'koenigsberger-klopse', 'ofenlachs-kartoffeln', 'burger-leicht'],
  },
  {
    id: 'meal-prep',
    title: 'Meal Prep: Vorkochen für die Woche',
    emoji: '📦',
    summary: 'In fünf Schritten zur vorbereiteten Woche – mit Haltbarkeiten und was sich einfrieren lässt.',
    category: 'planen',
    minutes: 4,
    blocks: [
      {
        type: 'steps',
        title: 'In fünf Schritten',
        items: [
          'Plane 2–3 Gerichte für die Woche – zum Beispiel mit „Woche vorschlagen“ im Planer.',
          'Erzeuge daraus die Einkaufsliste und kaufe einmal gebündelt ein.',
          'Koche Grundzutaten in größerer Menge: Reis, Quinoa, Linsen, Ofengemüse, Hähnchen, gekochte Eier.',
          'Bewahre Saucen und Dressings getrennt auf, damit nichts durchweicht.',
          'Fülle alles portionsweise in Dosen, beschrifte sie mit Datum und lass sie schnell abkühlen.',
        ],
      },
      {
        type: 'table',
        title: 'Haltbarkeit im Kühlschrank (Richtwerte, bei max. 5 °C)',
        head: ['Lebensmittel', 'Haltbarkeit'],
        rows: [
          ['Gekochter Reis', '1–2 Tage'],
          ['Gekochte Nudeln', '2–3 Tage'],
          ['Eintöpfe, Currys, Suppen', '3 Tage'],
          ['Gegartes Fleisch und Geflügel', '2–3 Tage'],
          ['Gegarter Fisch', '1–2 Tage'],
          ['Ofengemüse', '3–4 Tage'],
          ['Hart gekochte Eier (ungeschält)', 'bis zu 1 Woche'],
        ],
      },
      {
        type: 'list',
        title: 'Gut einfrierbar',
        items: [
          'Suppen, Eintöpfe, Currys und Chili',
          'Bolognese und Tomatensaucen',
          'Frikadellen, Muffins und Bananenbrot',
          'Weniger gut: Salate, Kartoffeln in Sauce (werden mehlig) und Joghurtsaucen',
        ],
      },
      { type: 'tip', text: 'Warme Speisen zum Abkühlen in flache Dosen verteilen und innerhalb von etwa 2 Stunden in den Kühlschrank stellen.' },
    ],
    recipeIds: ['chili-con-carne', 'dal-rote-linsen', 'linsensalat-feta', 'gemuese-ei-muffins', 'overnight-oats-beeren'],
  },
  {
    id: 'messen-ohne-waage',
    title: 'Messen ohne Waage',
    emoji: '🥄',
    summary: 'Löffel, Tassen, Handvoll – und was ein Stück Gemüse durchschnittlich wiegt.',
    category: 'wissen',
    minutes: 2,
    blocks: [
      {
        type: 'table',
        title: 'Löffelmaße (gestrichen)',
        head: ['Zutat', '1 EL', '1 TL'],
        rows: [
          ['Öl', 'ca. 10 g', 'ca. 4 g'],
          ['Mehl, Haferflocken', 'ca. 10 g', 'ca. 3 g'],
          ['Zucker', 'ca. 15 g', 'ca. 5 g'],
          ['Honig, Ahornsirup', 'ca. 20 g', 'ca. 7 g'],
          ['Salz', 'ca. 15 g', 'ca. 5 g'],
          ['Gemahlene Gewürze', 'ca. 7 g', 'ca. 2–3 g'],
        ],
      },
      {
        type: 'table',
        title: 'Tassen und Hände',
        head: ['Maß', 'entspricht etwa'],
        rows: [
          ['1 Tasse', '200–250 ml'],
          ['1 Becher Sahne oder Joghurt', '200 g'],
          ['1 Handvoll Nüsse', '25–30 g'],
          ['1 Handvoll Babyspinat', '20–30 g'],
          ['1 Portion Nudeln (ungekocht)', '100 g'],
        ],
      },
      { type: 'generated', kind: 'weights' },
      { type: 'tip', text: 'Mit der Zeit bekommt man ein gutes Augenmaß. Beim Backen lohnt sich trotzdem eine günstige Küchenwaage.' },
    ],
  },
  {
    id: 'wuerzen',
    title: 'Würzen mit Kräutern & Gewürzen',
    emoji: '🌿',
    summary: 'Grundregeln, was wozu passt und wie man mit weniger Salz kräftig würzt.',
    category: 'wissen',
    minutes: 3,
    blocks: [
      {
        type: 'list',
        title: 'Grundregeln',
        items: [
          'Salz verstärkt Aromen – lieber mehrmals wenig salzen und zwischendurch probieren.',
          'Säure (Zitrone, Essig) macht Gerichte frischer und wirkt ähnlich wie Salz.',
          'Getrocknete Kräuter früh mitgaren, frische Kräuter erst zum Schluss zugeben.',
          'Gewürze wie Kreuzkümmel, Curry oder Paprika kurz in Fett anrösten – so entfalten sie ihr Aroma.',
          'Paprikapulver nicht zu heiß anbraten, es wird schnell bitter.',
        ],
      },
      {
        type: 'table',
        title: 'Was passt wozu?',
        head: ['Kraut / Gewürz', 'Passt zu'],
        rows: [
          ['Basilikum', 'Tomaten, Mozzarella, Pasta'],
          ['Petersilie', 'fast allem: Kartoffeln, Salaten, Fisch, Suppen'],
          ['Dill', 'Fisch, Gurke, Kartoffelsalat, Quark'],
          ['Schnittlauch', 'Quark, Eiern, Kartoffeln'],
          ['Rosmarin, Thymian', 'Ofengemüse, Kartoffeln, Fleisch'],
          ['Majoran', 'Kartoffeln, Eintöpfen, Hülsenfrüchten'],
          ['Kreuzkümmel', 'Chili, Currys, Hummus, Linsen'],
          ['Zimt', 'Porridge, Äpfeln, Quark'],
          ['Muskat', 'Kartoffelpüree, Béchamel, Spinat'],
          ['Ingwer', 'asiatischen Gerichten, Suppen, Currys'],
        ],
      },
      { type: 'text', text: 'Frisch oder getrocknet: 1 TL getrocknete Kräuter ersetzen etwa 1 EL frische.' },
      { type: 'tip', text: 'Weniger Salz? Mit Kräutern, Zitrone, Knoblauch und Gewürzen schmeckt es trotzdem kräftig.' },
    ],
  },
  {
    id: 'schneiden',
    title: 'Schneiden wie die Profis',
    emoji: '🔪',
    summary: 'Sicher schneiden mit dem Krallengriff, Zwiebeln würfeln und Knoblauch vorbereiten.',
    category: 'geraete',
    minutes: 2,
    blocks: [
      {
        type: 'list',
        title: 'Sicher schneiden',
        items: [
          'Ein scharfes Messer ist sicherer als ein stumpfes – es rutscht weniger ab.',
          'Krallengriff: Die Fingerkuppen der Haltehand leicht einziehen, die Klinge gleitet an den Fingerknöcheln entlang.',
          'Ein feuchtes Tuch unter dem Brett verhindert, dass es verrutscht.',
          'Runde Lebensmittel zuerst halbieren und auf die flache Seite legen.',
        ],
      },
      {
        type: 'steps',
        title: 'Zwiebel würfeln',
        items: [
          'Zwiebel halbieren und schälen. Den Wurzelansatz dranlassen – er hält die Schichten zusammen.',
          'Die Hälfte flach hinlegen und längs in dünnen Abständen bis kurz vor die Wurzel einschneiden.',
          'Dann quer in Scheiben schneiden – dabei fallen gleichmäßige Würfel heraus.',
        ],
      },
      {
        type: 'steps',
        title: 'Knoblauch',
        items: [
          'Die Zehe mit der flachen Messerseite andrücken – so löst sich die Schale leicht.',
          'Fein hacken oder mit einer Prise Salz auf dem Brett zu einer Paste zerreiben.',
        ],
      },
      {
        type: 'table',
        title: 'Schnittarten',
        head: ['Schnitt', 'Wofür'],
        rows: [
          ['Würfel', 'Saucen, Suppen, Pfannengerichte'],
          ['Streifen', 'Wok-Gerichte, Salate'],
          ['Scheiben', 'Aufläufe, zum Braten'],
          ['Grob gehackt', 'Kräuter, Nüsse'],
        ],
      },
      { type: 'tip', text: 'Zwiebeln tränen weniger, wenn das Messer scharf ist und die Zwiebel vorher kurz im Kühlschrank lag.' },
    ],
  },
  {
    id: 'saisonkalender',
    title: 'Saisonkalender: Obst & Gemüse',
    emoji: '📅',
    summary: 'Was gerade regional Saison hat – Monat für Monat.',
    category: 'planen',
    minutes: 2,
    blocks: [
      {
        type: 'text',
        text: 'Regional und saisonal einkaufen schmeckt oft besser und ist meist günstiger. Markiert sind die Monate, in denen es Freilandware oder Lagerware aus heimischem Anbau gibt.',
      },
      { type: 'generated', kind: 'season' },
      { type: 'tip', text: 'Außerhalb der Saison sind Tiefkühlgemüse und -obst eine gute Wahl – sie werden erntefrisch eingefroren.' },
    ],
  },
  {
    id: 'vorrat',
    title: 'Grundvorrat für die schnelle Küche',
    emoji: '🧺',
    summary: 'Mit diesen Basics lassen sich viele Rezepte ohne großen Einkauf kochen.',
    category: 'planen',
    minutes: 2,
    blocks: [
      {
        type: 'table',
        title: 'Was in den Vorrat gehört',
        head: ['Bereich', 'Beispiele'],
        rows: [
          ['Trockenwaren', 'Haferflocken, Reis, Vollkornnudeln, rote Linsen, Bulgur oder Couscous, Mehl'],
          ['Konserven', 'Tomaten (stückig, passiert), Kichererbsen, Kidneybohnen, Mais, Thunfisch, Kokosmilch'],
          ['Würzen', 'Gemüsebrühe, Senf, Sojasauce, Tomatenmark, Essig, Olivenöl, Rapsöl'],
          ['Gewürze', 'Salz, Pfeffer, Paprikapulver, Kreuzkümmel, Curry, Oregano, Zimt, Chiliflocken'],
          ['Tiefkühler', 'Erbsen, Spinat, Beeren, Gemüsemischungen, Fischfilet'],
          ['Kühlschrank', 'Eier, Joghurt, Quark, Käse, Zitronen'],
          ['Lange frisch', 'Zwiebeln, Knoblauch, Kartoffeln, Karotten, Äpfel'],
        ],
      },
      {
        type: 'text',
        text: 'Tipp in der App: Unter „Was habe ich da?“ bei den Rezepten findest du Gerichte, die zu deinen vorhandenen Zutaten passen.',
      },
      { type: 'tip', text: 'Neues nach hinten, Älteres nach vorne räumen – so wird nichts vergessen.' },
    ],
  },
  {
    id: 'lagerung',
    title: 'Lebensmittel richtig lagern',
    emoji: '🧊',
    summary: 'Kühlschrank-Zonen, was nicht hineingehört und was das Mindesthaltbarkeitsdatum bedeutet.',
    category: 'wissen',
    minutes: 3,
    blocks: [
      {
        type: 'table',
        title: 'Kühlschrank-Zonen',
        head: ['Bereich', 'Temperatur', 'Was gehört hinein'],
        rows: [
          ['Oben', 'ca. 8 °C', 'Käse, Geräuchertes, Reste'],
          ['Mitte', 'ca. 5 °C', 'Milchprodukte, Joghurt, Quark'],
          ['Unten auf der Glasplatte', 'ca. 2 °C', 'Fleisch, Fisch, Wurst – die kälteste Zone'],
          ['Gemüsefach', 'ca. 8–10 °C', 'Gemüse, Salat, Obst'],
          ['Tür', 'ca. 10 °C', 'Butter, Eier, Getränke, Saucen'],
        ],
      },
      {
        type: 'list',
        title: 'Nicht in den Kühlschrank',
        items: [
          'Tomaten – sie verlieren Aroma.',
          'Kartoffeln, Zwiebeln und Knoblauch – kühl, dunkel und trocken lagern.',
          'Bananen, Ananas und Mangos – sie werden braun.',
          'Brot – es wird schneller altbacken.',
        ],
      },
      {
        type: 'list',
        title: 'Mindesthaltbarkeit',
        items: [
          'Das Mindesthaltbarkeitsdatum ist kein Wegwerfdatum: Viele Lebensmittel sind danach noch einwandfrei – anschauen, riechen, probieren.',
          'Anders beim Verbrauchsdatum („zu verbrauchen bis“) bei leicht verderblichem Fleisch und Fisch – dieses Datum einhalten.',
        ],
      },
      { type: 'tip', text: 'Äpfel und Tomaten geben Reifegas ab – getrennt von empfindlichem Obst und Gemüse lagern.' },
    ],
  },
]
