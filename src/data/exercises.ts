/**
 * Übungen für Trainingsvorschläge – zu Hause (ohne Geräte oder mit Kurzhanteln) und im Fitnessstudio.
 * Die Hinweise beschreiben die Ausführung; sie ersetzen keine Anleitung durch Trainer:innen.
 */

/** Was man braucht: Körper = nichts, Matte = weicher Untergrund */
export type Equipment = 'koerper' | 'matte' | 'stuhl' | 'kurzhanteln' | 'langhantel' | 'maschine' | 'kabelzug' | 'bank' | 'kettlebell' | 'cardio'

export type Muscle = 'beine' | 'po' | 'brust' | 'ruecken' | 'schultern' | 'arme' | 'rumpf' | 'ausdauer' | 'mobilitaet'

export type ExerciseKind = 'kraft' | 'cardio' | 'mobil'

export interface Exercise {
  key: string
  name: string
  muscles: Muscle[]
  /** Alles, was für die Übung nötig ist */
  equipment: Equipment[]
  kind: ExerciseKind
  /** 1 = leicht, 2 = mittel, 3 = anspruchsvoll */
  level: 1 | 2 | 3
  /** Nach Zeit statt Wiederholungen (Unterarmstütz, Hampelmann) */
  timed?: boolean
  /** Je Seite (Ausfallschritt, Seitstütz) */
  perSide?: boolean
  /** Eignet sich zum Aufwärmen bzw. Abkühlen */
  warmup?: boolean
  cooldown?: boolean
  cues: string[]
  easier?: string
  harder?: string
}

const L: Exercise[] = []
function ex(e: Exercise) {
  L.push(e)
}

// --- Körpergewicht: Beine & Po ---------------------------------------------------------------------------------
ex({ key: 'kniebeuge', name: 'Kniebeugen', muscles: ['beine', 'po'], equipment: ['koerper'], kind: 'kraft', level: 1,
  cues: ['Füße etwa schulterbreit, Zehen leicht nach außen', 'Po nach hinten unten, als ob du dich setzt – Rücken bleibt gerade', 'Knie zeigen in Richtung der Zehen, Fersen bleiben am Boden'],
  easier: 'Auf einen Stuhl setzen und wieder aufstehen', harder: 'Unten 2 Sekunden halten oder Sprungkniebeugen' })
ex({ key: 'sumo-kniebeuge', name: 'Sumo-Kniebeugen', muscles: ['beine', 'po'], equipment: ['koerper'], kind: 'kraft', level: 1,
  cues: ['Weiter Stand, Zehen deutlich nach außen', 'Knie beim Absenken nach außen drücken', 'Oberkörper aufrecht'],
  easier: 'Weniger tief gehen', harder: 'Unten kurz nachfedern' })
ex({ key: 'ausfallschritt', name: 'Ausfallschritte', muscles: ['beine', 'po'], equipment: ['koerper'], kind: 'kraft', level: 2, perSide: true,
  cues: ['Großer Schritt nach vorn, hinteres Knie Richtung Boden', 'Vorderes Knie bleibt über dem Fußgelenk', 'Über die vordere Ferse zurückdrücken'],
  easier: 'Rückwärts ausfallen oder an einem Stuhl festhalten', harder: 'Im Wechsel springend' })
ex({ key: 'ausfallschritt-rueck', name: 'Ausfallschritte rückwärts', muscles: ['beine', 'po'], equipment: ['koerper'], kind: 'kraft', level: 1, perSide: true,
  cues: ['Ein Bein weit nach hinten setzen', 'Beide Knie beugen, Oberkörper aufrecht', 'Mit dem vorderen Bein zurück in den Stand'],
  easier: 'Weniger tief gehen', harder: 'Hinten nicht absetzen, sondern direkt ins Knieheben' })
ex({ key: 'seit-ausfall', name: 'Seitliche Ausfallschritte', muscles: ['beine', 'po'], equipment: ['koerper'], kind: 'kraft', level: 2, perSide: true,
  cues: ['Weiter Schritt zur Seite', 'Ein Bein beugen, das andere bleibt gestreckt', 'Po nach hinten, Brust bleibt oben'],
  easier: 'Kleinerer Schritt', harder: 'Langsam absenken (3 Sekunden)' })
ex({ key: 'beckenheben', name: 'Beckenheben (Glute Bridge)', muscles: ['po', 'rumpf'], equipment: ['matte'], kind: 'kraft', level: 1,
  cues: ['Rückenlage, Füße hüftbreit aufgestellt', 'Becken heben, bis Knie, Hüfte und Schultern eine Linie bilden', 'Oben den Po anspannen, langsam ablassen'],
  easier: 'Weniger hoch heben', harder: 'Einbeinig oder oben 3 Sekunden halten' })
ex({ key: 'beckenheben-einbeinig', name: 'Einbeiniges Beckenheben', muscles: ['po', 'rumpf'], equipment: ['matte'], kind: 'kraft', level: 2, perSide: true,
  cues: ['Ein Bein gestreckt in der Luft', 'Über die Ferse des aufgestellten Fußes drücken', 'Becken bleibt waagerecht'],
  easier: 'Beidbeinig', harder: 'Fuß auf einem Stuhl' })
ex({ key: 'wandsitzen', name: 'Wandsitzen', muscles: ['beine'], equipment: ['koerper'], kind: 'kraft', level: 2, timed: true,
  cues: ['Rücken an die Wand, Knie etwa im rechten Winkel', 'Knie über den Fußgelenken', 'Gleichmäßig weiteratmen'],
  easier: 'Höher sitzen', harder: 'Tiefer sitzen oder ein Bein leicht anheben' })
ex({ key: 'wadenheben', name: 'Wadenheben', muscles: ['beine'], equipment: ['koerper'], kind: 'kraft', level: 1,
  cues: ['Aufrecht stehen, bei Bedarf an der Wand abstützen', 'Langsam auf die Zehenspitzen', 'Kontrolliert absenken'],
  easier: 'Weniger Wiederholungen', harder: 'Einbeinig oder auf einer Stufe' })
ex({ key: 'vierfuessler-beinheben', name: 'Beinheben im Vierfüßlerstand', muscles: ['po'], equipment: ['matte'], kind: 'kraft', level: 1, perSide: true,
  cues: ['Hände unter den Schultern, Knie unter der Hüfte', 'Gebeugtes Bein nach oben drücken, Fußsohle zur Decke', 'Rücken bleibt gerade, kein Hohlkreuz'],
  easier: 'Kleinere Bewegung', harder: 'Oben 2 Sekunden halten' })
ex({ key: 'sprungkniebeuge', name: 'Sprungkniebeugen', muscles: ['beine', 'po', 'ausdauer'], equipment: ['koerper'], kind: 'cardio', level: 3,
  cues: ['Aus der Kniebeuge kraftvoll nach oben springen', 'Weich über die Fußballen landen', 'Direkt in die nächste Kniebeuge'],
  easier: 'Normale Kniebeugen auf Tempo', harder: 'Tiefer in die Kniebeuge' })

// --- Körpergewicht: Oberkörper ---------------------------------------------------------------------------------
ex({ key: 'liegestuetz', name: 'Liegestütze', muscles: ['brust', 'arme', 'rumpf'], equipment: ['koerper'], kind: 'kraft', level: 2,
  cues: ['Hände etwas weiter als schulterbreit', 'Körper bildet von Kopf bis Fuß eine Linie', 'Brust Richtung Boden, Ellbogen schräg nach hinten'],
  easier: 'Auf den Knien oder mit den Händen auf einer Tischkante', harder: 'Füße erhöht' })
ex({ key: 'liegestuetz-knie', name: 'Liegestütze auf den Knien', muscles: ['brust', 'arme'], equipment: ['matte'], kind: 'kraft', level: 1,
  cues: ['Knie auf der Matte, Körper von Kopf bis Knie gerade', 'Langsam absenken, kräftig hochdrücken', 'Bauch anspannen'],
  easier: 'An der Wand', harder: 'Klassische Liegestütze' })
ex({ key: 'dips-stuhl', name: 'Dips am Stuhl', muscles: ['arme', 'schultern'], equipment: ['stuhl'], kind: 'kraft', level: 2,
  cues: ['Hände an der Sitzkante, Finger nach vorn', 'Ellbogen nach hinten beugen, Rücken nah am Stuhl', 'Schultern weg von den Ohren'],
  easier: 'Knie stärker beugen', harder: 'Beine gestreckt' })
ex({ key: 'pike-liegestuetz', name: 'Pike-Liegestütze', muscles: ['schultern', 'arme'], equipment: ['koerper'], kind: 'kraft', level: 3,
  cues: ['Po hoch, Körper wie ein umgedrehtes V', 'Kopf zwischen die Hände absenken', 'Kräftig zurück nach oben drücken'],
  easier: 'Kleinere Bewegung', harder: 'Füße erhöht' })
ex({ key: 'schulter-taps', name: 'Schulter-Taps im Liegestütz', muscles: ['rumpf', 'schultern'], equipment: ['koerper'], kind: 'kraft', level: 2, timed: true,
  cues: ['Hohe Liegestützposition, Füße etwas weiter auseinander', 'Abwechselnd mit einer Hand die gegenüberliegende Schulter antippen', 'Hüfte bleibt ruhig'],
  easier: 'Auf den Knien', harder: 'Füße enger zusammen' })
ex({ key: 'superman', name: 'Superman', muscles: ['ruecken', 'po'], equipment: ['matte'], kind: 'kraft', level: 1,
  cues: ['Bauchlage, Arme nach vorn gestreckt', 'Arme und Beine gleichzeitig leicht anheben', 'Blick zum Boden, Nacken lang'],
  easier: 'Nur Arme oder nur Beine', harder: 'Oben 3 Sekunden halten' })
ex({ key: 'ytw', name: 'Y-T-W in Bauchlage', muscles: ['ruecken', 'schultern'], equipment: ['matte'], kind: 'kraft', level: 1,
  cues: ['Bauchlage, Stirn auf einem Handtuch', 'Arme nacheinander als Y, T und W anheben', 'Schulterblätter zusammenziehen'],
  easier: 'Nur Y und T', harder: 'Kleine Wasserflaschen in den Händen' })
ex({ key: 'bird-dog', name: 'Bird Dog', muscles: ['rumpf', 'ruecken'], equipment: ['matte'], kind: 'kraft', level: 1, perSide: true,
  cues: ['Vierfüßlerstand', 'Rechten Arm und linkes Bein strecken, Rücken bleibt gerade', 'Kurz halten, dann Seite wechseln'],
  easier: 'Nur Arm oder nur Bein', harder: 'Ellbogen und Knie unter dem Bauch zusammenführen' })

// --- Körpergewicht: Rumpf -----------------------------------------------------------------------------------
ex({ key: 'unterarmstuetz', name: 'Unterarmstütz (Plank)', muscles: ['rumpf'], equipment: ['matte'], kind: 'kraft', level: 1, timed: true,
  cues: ['Ellbogen unter den Schultern', 'Körper bildet eine Linie, Po nicht zu hoch', 'Bauch und Po anspannen, ruhig atmen'],
  easier: 'Auf den Knien', harder: 'Abwechselnd ein Bein anheben' })
ex({ key: 'seitstuetz', name: 'Seitstütz', muscles: ['rumpf'], equipment: ['matte'], kind: 'kraft', level: 2, timed: true, perSide: true,
  cues: ['Ellbogen unter der Schulter', 'Hüfte anheben, Körper bildet eine Linie', 'Nicht nach vorn kippen'],
  easier: 'Unteres Knie abgelegt', harder: 'Oberes Bein anheben' })
ex({ key: 'crunch', name: 'Crunches', muscles: ['rumpf'], equipment: ['matte'], kind: 'kraft', level: 1,
  cues: ['Rückenlage, Füße aufgestellt', 'Schultern nur leicht abheben, Blick schräg nach oben', 'Nicht am Kopf ziehen'],
  easier: 'Hände auf den Oberschenkeln Richtung Knie schieben', harder: 'Beine angehoben im rechten Winkel' })
ex({ key: 'dead-bug', name: 'Dead Bug', muscles: ['rumpf'], equipment: ['matte'], kind: 'kraft', level: 1,
  cues: ['Rückenlage, Arme zur Decke, Knie über der Hüfte', 'Gegenüberliegenden Arm und Bein langsam ausstrecken', 'Unterer Rücken bleibt am Boden'],
  easier: 'Nur die Beine bewegen', harder: 'Langsamer, ganz gestreckt' })
ex({ key: 'bergsteiger', name: 'Bergsteiger (Mountain Climbers)', muscles: ['rumpf', 'ausdauer'], equipment: ['koerper'], kind: 'cardio', level: 2, timed: true,
  cues: ['Hohe Liegestützposition', 'Knie im Wechsel zügig Richtung Brust ziehen', 'Hüfte bleibt tief'],
  easier: 'Langsam und abwechselnd setzen', harder: 'Schneller' })
ex({ key: 'russian-twist', name: 'Russian Twists', muscles: ['rumpf'], equipment: ['matte'], kind: 'kraft', level: 2,
  cues: ['Sitzen, Oberkörper leicht zurückgelehnt, Rücken gerade', 'Oberkörper abwechselnd nach links und rechts drehen', 'Füße am Boden lassen'],
  easier: 'Weniger weit zurücklehnen', harder: 'Füße anheben oder eine Wasserflasche halten' })
ex({ key: 'beinheben', name: 'Beinheben in Rückenlage', muscles: ['rumpf'], equipment: ['matte'], kind: 'kraft', level: 2,
  cues: ['Rückenlage, Hände unter dem Po', 'Gestreckte Beine langsam heben und senken', 'Unterer Rücken bleibt am Boden'],
  easier: 'Beine gebeugt', harder: 'Beine kurz über dem Boden halten' })
ex({ key: 'fahrrad-crunch', name: 'Fahrrad-Crunches', muscles: ['rumpf'], equipment: ['matte'], kind: 'kraft', level: 2,
  cues: ['Rückenlage, Hände locker an den Schläfen', 'Ellbogen zum gegenüberliegenden Knie, anderes Bein strecken', 'Langsam und kontrolliert'],
  easier: 'Füße abgelegt, nur der Oberkörper dreht', harder: 'Langsamer mit kurzer Pause' })

// --- Ausdauer ohne Geräte -------------------------------------------------------------------------------------
ex({ key: 'hampelmann', name: 'Hampelmann', muscles: ['ausdauer'], equipment: ['koerper'], kind: 'cardio', level: 1, timed: true, warmup: true,
  cues: ['Beine auseinander springen, Arme über den Kopf', 'Zurück in den Stand', 'Locker in den Knien landen'],
  easier: 'Ohne Sprung: abwechselnd seitlich tippen', harder: 'Schneller oder tiefer in die Knie' })
ex({ key: 'kniehebelauf', name: 'Kniehebelauf', muscles: ['ausdauer', 'beine'], equipment: ['koerper'], kind: 'cardio', level: 2, timed: true,
  cues: ['Auf der Stelle laufen, Knie bis Hüfthöhe', 'Arme schwingen mit', 'Leicht auf den Fußballen'],
  easier: 'Marschieren mit hohen Knien', harder: 'Schneller' })
ex({ key: 'burpee', name: 'Burpees', muscles: ['ausdauer', 'beine', 'brust'], equipment: ['koerper'], kind: 'cardio', level: 3,
  cues: ['Hände auf den Boden, Beine nach hinten in den Liegestütz', 'Beine zurückholen', 'Aufrichten und hochspringen'],
  easier: 'Beine schrittweise zurücksetzen, ohne Sprung', harder: 'Mit Liegestütz' })
ex({ key: 'skater', name: 'Eisschnellläufer-Sprünge', muscles: ['ausdauer', 'beine'], equipment: ['koerper'], kind: 'cardio', level: 2, timed: true,
  cues: ['Seitlich von einem Bein aufs andere springen', 'Hinteres Bein kreuzt hinter dem Standbein', 'Weich landen'],
  easier: 'Seitlich schreiten statt springen', harder: 'Weitere Sprünge' })
ex({ key: 'schattenboxen', name: 'Schattenboxen', muscles: ['ausdauer', 'schultern'], equipment: ['koerper'], kind: 'cardio', level: 1, timed: true, warmup: true,
  cues: ['Leicht federnder Stand', 'Abwechselnd zügig nach vorn boxen', 'Bauch fest, Fäuste locker'],
  easier: 'Langsamer', harder: 'Mit kleinen Sprüngen' })
ex({ key: 'seilspringen-ohne', name: 'Seilspringen (ohne Seil)', muscles: ['ausdauer', 'beine'], equipment: ['koerper'], kind: 'cardio', level: 2, timed: true,
  cues: ['Kleine Sprünge auf den Fußballen', 'Handgelenke kreisen wie mit Seil', 'Locker bleiben'],
  easier: 'Auf der Stelle wippen', harder: 'Abwechselnd auf einem Bein' })
ex({ key: 'marschieren', name: 'Marschieren auf der Stelle', muscles: ['ausdauer'], equipment: ['koerper'], kind: 'cardio', level: 1, timed: true, warmup: true,
  cues: ['Knie locker anheben', 'Arme gegengleich mitnehmen', 'Tempo langsam steigern'] })

// --- Beweglichkeit, Aufwärmen, Abkühlen ------------------------------------------------------------------------
ex({ key: 'armkreisen', name: 'Armkreisen', muscles: ['mobilitaet', 'schultern'], equipment: ['koerper'], kind: 'mobil', level: 1, timed: true, warmup: true,
  cues: ['Arme seitlich, große Kreise', 'Nach der Hälfte die Richtung wechseln'] })
ex({ key: 'hueftkreisen', name: 'Hüftkreisen', muscles: ['mobilitaet'], equipment: ['koerper'], kind: 'mobil', level: 1, timed: true, warmup: true,
  cues: ['Hände an die Hüfte', 'Große, ruhige Kreise', 'Richtung wechseln'] })
ex({ key: 'weltbeste-dehnung', name: 'Ausfallschritt mit Drehung', muscles: ['mobilitaet', 'beine'], equipment: ['koerper'], kind: 'mobil', level: 1, timed: true, perSide: true, warmup: true,
  cues: ['Großer Ausfallschritt, Hände neben den vorderen Fuß', 'Den inneren Arm zur Decke öffnen und nachschauen', 'Ruhig atmen'] })
ex({ key: 'katze-kuh', name: 'Katze und Kuh', muscles: ['mobilitaet', 'ruecken'], equipment: ['matte'], kind: 'mobil', level: 1, timed: true, warmup: true, cooldown: true,
  cues: ['Vierfüßlerstand', 'Ausatmend den Rücken rund machen, einatmend leicht ins Hohlkreuz', 'Langsam im Atemrhythmus'] })
ex({ key: 'hund', name: 'Herabschauender Hund', muscles: ['mobilitaet', 'beine', 'schultern'], equipment: ['matte'], kind: 'mobil', level: 1, timed: true, cooldown: true,
  cues: ['Aus dem Vierfüßlerstand den Po nach oben schieben', 'Arme lang, Fersen Richtung Boden', 'Knie dürfen gebeugt bleiben'] })
ex({ key: 'kindhaltung', name: 'Kindhaltung', muscles: ['mobilitaet', 'ruecken'], equipment: ['matte'], kind: 'mobil', level: 1, timed: true, cooldown: true,
  cues: ['Fersensitz, Oberkörper nach vorn ablegen', 'Arme lang nach vorn', 'Ruhig in den Rücken atmen'] })
ex({ key: 'dehnung-oberschenkel-vorn', name: 'Dehnung Oberschenkel vorn', muscles: ['mobilitaet', 'beine'], equipment: ['koerper'], kind: 'mobil', level: 1, timed: true, perSide: true, cooldown: true,
  cues: ['Im Stand eine Ferse zum Po ziehen', 'Knie zeigen nach unten, Hüfte leicht nach vorn', 'Bei Bedarf an der Wand festhalten'] })
ex({ key: 'dehnung-oberschenkel-hinten', name: 'Dehnung Oberschenkel hinten', muscles: ['mobilitaet', 'beine'], equipment: ['koerper'], kind: 'mobil', level: 1, timed: true, perSide: true, cooldown: true,
  cues: ['Ferse eines gestreckten Beins vor dir aufsetzen', 'Mit geradem Rücken leicht nach vorn beugen', 'Ziehen, nicht schmerzen'] })
ex({ key: 'dehnung-hueftbeuger', name: 'Dehnung Hüftbeuger', muscles: ['mobilitaet', 'beine'], equipment: ['matte'], kind: 'mobil', level: 1, timed: true, perSide: true, cooldown: true,
  cues: ['Kniender Ausfallschritt', 'Hüfte nach vorn schieben, Po anspannen', 'Oberkörper aufrecht'] })
ex({ key: 'dehnung-brust', name: 'Brustdehnung an der Wand', muscles: ['mobilitaet', 'brust'], equipment: ['koerper'], kind: 'mobil', level: 1, timed: true, perSide: true, cooldown: true,
  cues: ['Unterarm an Wand oder Türrahmen, Ellbogen auf Schulterhöhe', 'Oberkörper sanft wegdrehen', 'Schulter bleibt unten'] })
ex({ key: 'rueckenrotation', name: 'Rückendrehung im Liegen', muscles: ['mobilitaet', 'ruecken'], equipment: ['matte'], kind: 'mobil', level: 1, timed: true, perSide: true, cooldown: true,
  cues: ['Rückenlage, Arme seitlich', 'Angewinkelte Knie zu einer Seite ablegen', 'Schultern bleiben am Boden'] })
ex({ key: 'schmetterling', name: 'Schmetterlings-Dehnung', muscles: ['mobilitaet', 'beine'], equipment: ['matte'], kind: 'mobil', level: 1, timed: true, cooldown: true,
  cues: ['Sitzen, Fußsohlen zusammen', 'Knie sinken lassen, Rücken lang', 'Leicht nach vorn neigen'] })
ex({ key: 'tiefe-hocke', name: 'Tiefe Hocke halten', muscles: ['mobilitaet', 'beine'], equipment: ['koerper'], kind: 'mobil', level: 2, timed: true,
  cues: ['So tief wie bequem in die Hocke', 'Fersen möglichst am Boden, Ellbogen schieben die Knie nach außen', 'Bei Bedarf an etwas festhalten'] })

// --- Kurzhanteln ---------------------------------------------------------------------------------------------
ex({ key: 'goblet-squat', name: 'Goblet Squat', muscles: ['beine', 'po'], equipment: ['kurzhanteln'], kind: 'kraft', level: 1,
  cues: ['Eine Kurzhantel senkrecht vor der Brust halten', 'Tief in die Kniebeuge, Ellbogen zwischen die Knie', 'Rücken gerade, Fersen am Boden'],
  easier: 'Ohne Gewicht', harder: 'Schwerere Hantel oder unten kurz halten' })
ex({ key: 'kh-kreuzheben', name: 'Rumänisches Kreuzheben mit Kurzhanteln', muscles: ['po', 'beine', 'ruecken'], equipment: ['kurzhanteln'], kind: 'kraft', level: 2,
  cues: ['Hanteln vor den Oberschenkeln, Knie leicht gebeugt', 'Hüfte nach hinten schieben, Hanteln nah am Bein abwärts', 'Rücken bleibt gerade, über die Hüfte aufrichten'],
  easier: 'Leichtere Hanteln, weniger tief', harder: 'Einbeinig' })
ex({ key: 'kh-ausfall', name: 'Ausfallschritte mit Kurzhanteln', muscles: ['beine', 'po'], equipment: ['kurzhanteln'], kind: 'kraft', level: 2, perSide: true,
  cues: ['Hanteln seitlich am Körper', 'Großer Schritt, hinteres Knie Richtung Boden', 'Oberkörper aufrecht'],
  easier: 'Ohne Gewicht', harder: 'Gehende Ausfallschritte' })
ex({ key: 'kh-rudern', name: 'Kurzhantel-Rudern vorgebeugt', muscles: ['ruecken', 'arme'], equipment: ['kurzhanteln'], kind: 'kraft', level: 1,
  cues: ['Oberkörper mit geradem Rücken nach vorn neigen', 'Hanteln zur Hüfte ziehen, Ellbogen nah am Körper', 'Schulterblätter zusammen, langsam ablassen'],
  easier: 'Einarmig mit Abstützen auf einem Stuhl', harder: 'Oben 2 Sekunden halten' })
ex({ key: 'kh-schulterdruecken', name: 'Schulterdrücken mit Kurzhanteln', muscles: ['schultern', 'arme'], equipment: ['kurzhanteln'], kind: 'kraft', level: 1,
  cues: ['Hanteln auf Schulterhöhe', 'Nach oben drücken, ohne ins Hohlkreuz zu gehen', 'Kontrolliert zurück'],
  easier: 'Im Sitzen', harder: 'Abwechselnd einarmig' })
ex({ key: 'kh-bodendruecken', name: 'Bodendrücken mit Kurzhanteln', muscles: ['brust', 'arme'], equipment: ['kurzhanteln', 'matte'], kind: 'kraft', level: 1,
  cues: ['Rückenlage, Knie aufgestellt, Hanteln über der Brust', 'Ellbogen schräg zum Boden senken, kurz ablegen', 'Gerade nach oben drücken'],
  easier: 'Leichtere Hanteln', harder: 'Langsam absenken (3 Sekunden)' })
ex({ key: 'kh-curls', name: 'Bizepscurls', muscles: ['arme'], equipment: ['kurzhanteln'], kind: 'kraft', level: 1,
  cues: ['Ellbogen bleiben am Körper', 'Hanteln zur Schulter beugen', 'Langsam absenken, nicht schwingen'],
  easier: 'Abwechselnd', harder: 'Oben kurz halten' })
ex({ key: 'kh-kickbacks', name: 'Trizeps-Kickbacks', muscles: ['arme'], equipment: ['kurzhanteln'], kind: 'kraft', level: 1,
  cues: ['Vorgebeugt, Oberarme parallel zum Körper', 'Unterarme nach hinten strecken', 'Oberarme bleiben still'],
  easier: 'Einarmig mit Abstützen', harder: 'Oben 2 Sekunden halten' })
ex({ key: 'kh-seitheben', name: 'Seitheben', muscles: ['schultern'], equipment: ['kurzhanteln'], kind: 'kraft', level: 1,
  cues: ['Arme leicht gebeugt seitlich bis Schulterhöhe heben', 'Schultern nicht hochziehen', 'Langsam ablassen'],
  easier: 'Leichtere Hanteln', harder: 'Oben kurz halten' })
ex({ key: 'kh-thruster', name: 'Kurzhantel-Thruster', muscles: ['beine', 'schultern', 'ausdauer'], equipment: ['kurzhanteln'], kind: 'cardio', level: 3,
  cues: ['Hanteln auf Schulterhöhe, tiefe Kniebeuge', 'Aus der Kniebeuge kraftvoll hoch und die Hanteln über den Kopf drücken', 'Fließend in die nächste Wiederholung'],
  easier: 'Leichtere Hanteln, langsamer', harder: 'Schwerere Hanteln' })

// --- Fitnessstudio: Geräte, Langhantel, Kabelzug ----------------------------------------------------------------
ex({ key: 'beinpresse', name: 'Beinpresse', muscles: ['beine', 'po'], equipment: ['maschine'], kind: 'kraft', level: 1,
  cues: ['Füße hüftbreit auf der Platte, Rücken fest an der Lehne', 'Langsam beugen, bis die Knie etwa im rechten Winkel sind', 'Beim Drücken die Knie nicht ganz durchstrecken'],
  easier: 'Weniger Gewicht', harder: 'Mehr Gewicht oder einbeinig' })
ex({ key: 'beinstrecker', name: 'Beinstrecker', muscles: ['beine'], equipment: ['maschine'], kind: 'kraft', level: 1,
  cues: ['Drehachse auf Höhe der Knie einstellen', 'Beine kontrolliert strecken', 'Langsam zurück, Gewicht nicht fallen lassen'] })
ex({ key: 'beinbeuger', name: 'Beinbeuger', muscles: ['beine'], equipment: ['maschine'], kind: 'kraft', level: 1,
  cues: ['Polster knapp über den Fersen', 'Fersen Richtung Po ziehen', 'Langsam zurück'] })
ex({ key: 'lh-kniebeuge', name: 'Kniebeugen mit Langhantel', muscles: ['beine', 'po', 'rumpf'], equipment: ['langhantel'], kind: 'kraft', level: 3,
  cues: ['Stange auf dem oberen Rücken, nicht im Nacken', 'Bauch fest, Po nach hinten unten, Knie Richtung Zehen', 'Mit geradem Rücken aufrichten – im Zweifel erst mit leichtem Gewicht üben'],
  easier: 'Goblet Squat mit Kurzhantel', harder: 'Mehr Gewicht' })
ex({ key: 'hip-thrust', name: 'Hip Thrust', muscles: ['po', 'beine'], equipment: ['langhantel', 'bank'], kind: 'kraft', level: 2,
  cues: ['Schulterblätter an der Bank, Stange mit Polster auf der Hüfte', 'Becken heben, bis der Oberkörper waagerecht ist', 'Oben den Po anspannen'],
  easier: 'Ohne Gewicht (Beckenheben)', harder: 'Mehr Gewicht' })
ex({ key: 'lh-kreuzheben', name: 'Kreuzheben (Langhantel)', muscles: ['po', 'ruecken', 'beine'], equipment: ['langhantel'], kind: 'kraft', level: 3,
  cues: ['Stange über der Fußmitte, Rücken gerade, Brust raus', 'Stange nah am Körper aus Beinen und Hüfte hochziehen', 'Kontrolliert ablassen – im Zweifel erst mit leichtem Gewicht üben'],
  easier: 'Rumänisches Kreuzheben mit Kurzhanteln', harder: 'Mehr Gewicht' })
ex({ key: 'brustpresse', name: 'Brustpresse', muscles: ['brust', 'arme'], equipment: ['maschine'], kind: 'kraft', level: 1,
  cues: ['Griffe auf Brusthöhe einstellen', 'Nach vorn drücken, Schultern bleiben hinten', 'Langsam zurück'] })
ex({ key: 'bankdruecken', name: 'Bankdrücken', muscles: ['brust', 'arme', 'schultern'], equipment: ['langhantel', 'bank'], kind: 'kraft', level: 2,
  cues: ['Füße fest am Boden, Schulterblätter zusammen', 'Stange kontrolliert zur unteren Brust', 'Gerade nach oben drücken – bei schwerem Gewicht mit Hilfestellung'],
  easier: 'Brustpresse oder Kurzhanteln', harder: 'Mehr Gewicht' })
ex({ key: 'latzug', name: 'Latzug', muscles: ['ruecken', 'arme'], equipment: ['kabelzug'], kind: 'kraft', level: 1,
  cues: ['Griff etwas weiter als schulterbreit', 'Stange zur oberen Brust ziehen, Brust raus', 'Langsam nach oben zurück'] })
ex({ key: 'kabel-rudern', name: 'Rudern am Kabelzug', muscles: ['ruecken', 'arme'], equipment: ['kabelzug'], kind: 'kraft', level: 1,
  cues: ['Aufrecht sitzen, Knie leicht gebeugt', 'Griff zum Bauch ziehen, Schulterblätter zusammen', 'Oberkörper bleibt ruhig'] })
ex({ key: 'klimmzug-assistiert', name: 'Klimmzüge (mit Unterstützung)', muscles: ['ruecken', 'arme'], equipment: ['maschine'], kind: 'kraft', level: 2,
  cues: ['Klimmzugmaschine oder Band zur Unterstützung', 'Brust Richtung Stange ziehen', 'Langsam ablassen'],
  easier: 'Mehr Unterstützung oder Latzug', harder: 'Weniger Unterstützung' })
ex({ key: 'schulterpresse', name: 'Schulterpresse (Maschine)', muscles: ['schultern', 'arme'], equipment: ['maschine'], kind: 'kraft', level: 1,
  cues: ['Griffe auf Schulterhöhe', 'Nach oben drücken, Rücken an der Lehne', 'Kontrolliert zurück'] })
ex({ key: 'trizeps-kabel', name: 'Trizepsdrücken am Kabelzug', muscles: ['arme'], equipment: ['kabelzug'], kind: 'kraft', level: 1,
  cues: ['Ellbogen am Körper', 'Seil oder Stange nach unten strecken', 'Langsam zurück, Oberarme bleiben ruhig'] })
ex({ key: 'bizeps-kabel', name: 'Bizepscurls am Kabelzug', muscles: ['arme'], equipment: ['kabelzug'], kind: 'kraft', level: 1,
  cues: ['Aufrecht stehen, Ellbogen am Körper', 'Griff zur Schulter beugen', 'Langsam zurück'] })
ex({ key: 'kabel-crunch', name: 'Bauchmaschine', muscles: ['rumpf'], equipment: ['maschine'], kind: 'kraft', level: 1,
  cues: ['Gewicht leicht wählen', 'Oberkörper einrollen, Bauch anspannen', 'Langsam zurück'] })
ex({ key: 'rueckenstrecker', name: 'Rückenstrecker', muscles: ['ruecken', 'po'], equipment: ['bank'], kind: 'kraft', level: 1,
  cues: ['Hüfte am Polster, Beine fixiert', 'Mit geradem Rücken absenken und bis zur Linie aufrichten', 'Nicht ins Hohlkreuz überstrecken'] })
ex({ key: 'kettlebell-swing', name: 'Kettlebell-Schwung', muscles: ['po', 'beine', 'ausdauer'], equipment: ['kettlebell'], kind: 'cardio', level: 2,
  cues: ['Kettlebell zwischen den Beinen nach hinten schwingen, Rücken gerade', 'Kraft kommt aus der Hüfte, nicht aus den Armen', 'Bis auf Brusthöhe schwingen'],
  easier: 'Leichtere Kettlebell', harder: 'Schwerere Kettlebell' })

// --- Fitnessstudio: Ausdauergeräte ----------------------------------------------------------------------------
ex({ key: 'ergometer', name: 'Ergometer (Rad)', muscles: ['ausdauer', 'beine'], equipment: ['cardio'], kind: 'cardio', level: 1, timed: true, warmup: true,
  cues: ['Sattel so, dass das Knie unten leicht gebeugt ist', 'Gleichmäßig treten, Oberkörper locker'] })
ex({ key: 'laufband', name: 'Laufband', muscles: ['ausdauer', 'beine'], equipment: ['cardio'], kind: 'cardio', level: 1, timed: true, warmup: true,
  cues: ['Mit Gehen beginnen, Tempo langsam steigern', 'Aufrecht, nicht an den Griffen festhalten', 'Steigung macht Gehen anstrengender'] })
ex({ key: 'rudergeraet', name: 'Rudergerät', muscles: ['ausdauer', 'ruecken', 'beine'], equipment: ['cardio'], kind: 'cardio', level: 2, timed: true, warmup: true,
  cues: ['Reihenfolge: Beine strecken, Oberkörper zurück, Arme ziehen', 'Zurück in umgekehrter Reihenfolge', 'Rücken bleibt gerade'] })
ex({ key: 'crosstrainer', name: 'Crosstrainer', muscles: ['ausdauer'], equipment: ['cardio'], kind: 'cardio', level: 1, timed: true, warmup: true,
  cues: ['Aufrecht stehen, Arme arbeiten mit', 'Gleichmäßiger Rhythmus', 'Widerstand für die schnellen Abschnitte erhöhen'] })

export const EXERCISES: readonly Exercise[] = L

export function exercise(key: string): Exercise | undefined {
  return L.find((e) => e.key === key) ?? MORE_EXERCISES.find((e) => e.key === key)
}

const more = (key: string, name: string, muscles: Muscle[], equipment: Equipment[], o: Partial<Exercise> = {}): Exercise => ({
  key,
  name,
  muscles,
  equipment,
  kind: 'kraft',
  level: 2,
  cues: [],
  ...o,
})

/** Weitere gängige Übungen aus dem Studio – zum Eintragen des eigenen Trainings (nicht in den Vorschlägen) */
export const MORE_EXERCISES: readonly Exercise[] = [
  more('schraegbankdruecken', 'Schrägbankdrücken', ['brust', 'schultern'], ['langhantel', 'bank']),
  more('kh-bankdruecken', 'Bankdrücken mit Kurzhanteln', ['brust', 'arme'], ['kurzhanteln', 'bank']),
  more('butterfly', 'Butterfly (Maschine)', ['brust'], ['maschine']),
  more('dips-barren', 'Dips am Barren', ['brust', 'arme'], ['koerper']),
  more('klimmzuege', 'Klimmzüge', ['ruecken', 'arme'], ['koerper'], { level: 3 }),
  more('lh-rudern', 'Langhantel-Rudern', ['ruecken'], ['langhantel']),
  more('kh-rudern-einarmig', 'Einarmiges Kurzhantel-Rudern', ['ruecken', 'arme'], ['kurzhanteln', 'bank'], { perSide: true }),
  more('face-pulls', 'Face Pulls', ['schultern', 'ruecken'], ['kabelzug']),
  more('reverse-butterfly', 'Reverse Butterfly', ['schultern', 'ruecken'], ['maschine']),
  more('kh-frontheben', 'Frontheben', ['schultern'], ['kurzhanteln']),
  more('lh-schulterdruecken', 'Schulterdrücken mit Langhantel', ['schultern', 'arme'], ['langhantel']),
  more('hammercurls', 'Hammercurls', ['arme'], ['kurzhanteln']),
  more('sz-curls', 'SZ-Curls', ['arme'], ['langhantel']),
  more('french-press', 'French Press', ['arme'], ['langhantel', 'bank']),
  more('bulgarische-kniebeuge', 'Bulgarische Kniebeugen', ['beine', 'po'], ['kurzhanteln', 'bank'], { perSide: true }),
  more('frontkniebeuge', 'Frontkniebeugen', ['beine', 'rumpf'], ['langhantel'], { level: 3 }),
  more('hackenschmidt', 'Hackenschmidt-Kniebeugen', ['beine', 'po'], ['maschine']),
  more('adduktoren', 'Adduktorenmaschine', ['beine'], ['maschine'], { level: 1 }),
  more('abduktoren', 'Abduktorenmaschine', ['po'], ['maschine'], { level: 1 }),
  more('wadenheben-maschine', 'Wadenheben an der Maschine', ['beine'], ['maschine'], { level: 1 }),
  more('haengendes-beinheben', 'Hängendes Beinheben', ['rumpf'], ['koerper'], { level: 3 }),
  more('farmers-walk', "Farmer's Walk", ['rumpf', 'arme'], ['kurzhanteln'], { timed: true }),
  more('stepper', 'Stepper', ['ausdauer', 'beine'], ['cardio'], { kind: 'cardio', level: 1, timed: true }),
  more('seilspringen', 'Seilspringen', ['ausdauer'], ['koerper'], { kind: 'cardio', timed: true }),
]
