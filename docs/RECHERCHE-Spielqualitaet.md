# Klarheit, Nachsicht und echte Wahl tragen Arena-Roguelites

Ob sich ein Action-Roguelite gut spielen lässt, hängt weniger an der Menge an Inhalten als an vier Eigenschaften, die ähnliche und fremde Erfolgsspiele gemeinsam haben. **Angriffe bleiben jederzeit lesbar.** Das Spiel **verzeiht unsichtbar**: Eingabepuffer, kleine Trefferflächen, Schutzzeit nach Treffern. **Jede Wahl bietet etwas anderes, nicht nur mehr.** Und der Langzeitfortschritt **erweitert Optionen und Herausforderung, statt nur die Stärke zu erhöhen**. Dazu kommt eine kurze, jederzeit unterbrechbare Schleife ohne Reibung, die im Browser zum echten Vorteil wird. Auch die genrefremden Erfolge bestätigen das: Into the Breach opfert „coole Ideen jedes Mal der Klarheit“, Celeste macht Nachsicht zum Kern des Spielgefühls, und Wordle wurde über ein teilbares, spoilerfreies Ergebnisraster groß. Ein Blick in den Code der „Arena der Verdammten“ zeigt, dass viele Grundlagen schon stimmen: ein kurzer Dash mit Unverwundbarkeit, 0,75 s Schutz nach Treffern, dosierter Trefferstopp, eine gedeckelte Schmiede, und rund 20 der 50 Upgrades ändern Verhalten statt Zahlen. Den größten Hebel haben deshalb dünne Schichten über vorhandenen Systemen:

- ein Eingabepuffer für Ausweichen und Fähigkeit,
- eine verbindliche Gefahrenfarbe mit Bodenwarnungen,
- ein wertfrei benannter Hilfsmodus mit langsamerem Tempo,
- Verdammnis-Stufen je Held anstelle des rein zahlenmäßigen NG+,
- sichtbarer Synergie-Fortschritt,
- ein Teilen-Text für die Tagesherausforderung,
- Musik, die mit dem Kampf anschwillt.

Die meisten dieser Punkte kosten eher Tage als Wochen. Einschränkend gilt: Keine Webquelle wurde im Volltext gelesen, die Vorbilder haben kaum konkrete Zahlenwerte veröffentlicht, und alle Angaben zu Nutzen und Aufwand sind eigene Einschätzungen.

## Alle Webbelege stammen aus Such-Snippets – so ist die Beleglage markiert

Die sechs Recherche-Notizen, auf denen dieser Bericht beruht, entstanden am 2. November 2026 in einer Cloud-Sitzung. Deren Netzwerk-Sandbox blockierte fast alle direkten Seitenabrufe, darunter gamedeveloper.com, pcgamer.com, gamesradar.com, MDN, Poki, die Xbox Accessibility Guidelines und gameaccessibilityguidelines.com. **Keine verlinkte Seite wurde im Volltext gelesen. Jede verlinkte Aussage gibt wieder, was die Websuche als Zusammenfassung dieser Seite lieferte** – auch dort, wo kein weiteres Kennzeichen steht. Wortlaute, Zahlen und Versionsangaben sollten Sie vor einem Zitat an der Originalseite prüfen. Darüber hinaus unterscheidet der Bericht folgende Fälle:

| Kennzeichen | Bedeutung | Umgang |
|---|---|---|
| Link ohne Zusatz | Such-Snippet einer belastbaren Quelle: Entwickleraussage in der Fachpresse, offizielle Dokumentation, Wiki, Patchnotes, Studie | inhaltlich verwendbar, Details vor einem Zitat prüfen |
| [Indiz] | Such-Snippet einer schwachen Quelle: Forum, Steam-Diskussion, Fan- oder Design-Blog, KI-Bewertungsaggregator, Ratgeberseite, Spiegelseite | Stimmungsbild oder Faustregel, kein Beleg |
| [ungeprüft] | Vorwissen aus dem Training, in dieser Sitzung durch keine Quelle gestützt | Hypothese, vor Verwendung prüfen |
| [Code] | im Quelltext dieses Projekts nachgesehen, Stand des letzten Commits (a74bd0e vom 2. 11. 2026) | belastbar |
| [Einschätzung] | eigene Ableitung; gilt für **alle** Angaben zu Nutzen und Aufwand in den Tabellen | Diskussionsgrundlage |

Zwei Lücken ziehen sich durch alle Themen. Erstens haben die Entwickler der Vorbilder nach dieser Recherche **keine konkreten Zahlen** zu Ausweichdauern, Vorwarnzeiten oder Belohnungsfrequenzen veröffentlicht. Jede Zahl, die hier für das eigene Spiel genannt wird, ist ein Startwert zum Ausprobieren. Zweitens fand sich zu **Clash Royale** keine einzige Quelle, zu Windblown und Death Must Die nur wenig.

Der Codeabgleich korrigiert zwei Annahmen der Notizen: Das Spiel hat **16, nicht 24 Erfolge**, und **deutlich mehr regelverändernde Upgrades**, als eine Notiz vermutete. Außerdem wurden während der Berichtserstellung in der Arbeitskopie erste Empfehlungen begonnen, die noch nicht committet sind (siehe Abschnitt zur Browser-Technik).

## Zwanzig Vergleichsspiele lehren fünf gemeinsame Regeln

Legt man die Vorbilder nebeneinander, bleibt wenig Genre-Konvention und viel Allgemeingültiges übrig. Fünf Regeln tauchen immer wieder auf:

1. **Klarheit schlägt Spektakel.** Into the Breach kündigt jede Gegneraktion an, Enter the Gungeon gilt als Maßstab für sichtbare Geschosse, und selbst Hades II wird dort kritisiert, wo Warnfarbe und Angriffsfarbe verschwimmen.
2. **Unsichtbare Nachsicht erzeugt das Spielgefühl.** Beispiele sind Celestes Sprungpuffer, das bewusste Schummeln zugunsten der Spieler in Dead Cells und die Schutzzeit nach Treffern in Brotato.
3. **Gute Wahl heißt: verschiedene Optionen mit sichtbaren Voraussetzungen.** Hades-Duo-Segen, Vampire-Survivors-Evolutionen und Gungeon-Synergien zeigen, was zur Kombination fehlt. Brotato erzeugt Spielweisen über Nachteile.
4. **Langzeitmotivation wächst in die Breite und in die Herausforderung.** Ascension, Einsätze und Gefahrenstufen je Figur schaffen Ziele ohne neue Inhalte. Archeros Machtschranke dagegen hängt an Monetarisierung.
5. **Die Schleife muss kurz, reibungslos und teilbar sein.** Das belegen Wordle, Pokis Ladegrenzen und der Weg von Vampire Survivors über HTML5 und YouTube.

Gerade die genrefremden Spiele sind aufschlussreich: Ein Rundentaktikspiel, ein Präzisions-Plattformer und ein Worträtsel liefern drei der fünf Regeln. Es sind also Regeln guter Spiele, nicht nur guter Roguelites.

| Spiel | Was es nachweislich gut macht | Lehre für die Arena |
|---|---|---|
| **Hades** | Dash als Ausweichen, das durch Gegner hindurchführt ([PC Gamer](https://www.pcgamer.com/hades-review)); Segen in vier Seltenheiten, Duo-Segen mit sichtbaren Voraussetzungen ([Prima Games](https://primagames.com/gaming/hades-guide-legendary-heroic-duo-boons)); „Pakt der Bestrafung“ nach dem Vorbild der Ascension aus Slay the Spire ([GameDaily](https://www.gamedaily.biz/?p=588)); Figuren reagieren auf die Laufgeschichte ([AV Club](https://www.avclub.com/how-hades-rescues-the-roguelike-from-its-own-limit)) | Fairness, sichtbare Kombi-Ziele, wählbare Härte, Erzählung über Tode hinweg |
| **Hades II** | Ein Dash in einen angekündigten Angriff lädt den Dash neu ([PC Gamer](https://pcgamer.com/games/action/if-youre-struggling-with-hades-2s-small-changes-dont-worrytheyll-click)); Metascore 95 ([Metacritic](https://www.metacritic.com/game/hades-ii/)), aber Klagen über Effektgewirr und gleichfarbige Warnungen ([Steam](https://steamcommunity.com/app/1145350/discussions/2/591775992008276315/)) [Indiz] | Mutiges Ausweichen belohnen; die Gefahrenfarbe exklusiv halten |
| **Vampire Survivors** | Begann als HTML5-Spiel auf Phaser ([Phaser](https://phaser.io/news/2024/02/vampire-survivors-space-54)); Evolutionstabelle 2022 nachgerüstet ([Automaton](https://automaton-media.com/articles/newsjp/20220624-208016/)); Belohnungsdesign aus der Glücksspielbranche ([The Conversation](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613)) | Der Browser reicht, um den Spaß zu finden; Rezepte auffindbar machen; Effektdichte regelbar machen |
| **Brotato** | Figuren mit Nachteilen wie Lucky oder Bull ([number13](https://en.number13.de/brotato-lucky-build/)); bezwungene Gefahrenstufe je Figur sichtbar ([Brotato Wiki](https://brotato.wiki.spellsandguns.com/Progress)); Hauptkritik ist Gleichförmigkeit ([Tryhard Guides](https://tryhardguides.com/brotato-review/)) [Indiz] | Einschränkungen erzeugen Spielweisen; Abwechslung muss sichtbar sein |
| **Archero** | „Nur im Stand schießen“ macht die Positionierung zur Dauerentscheidung ([PocketGamer](https://www.pocketgamer.com/archero/how-to-play-archero-the-latest-free-mobile-rogueli)); Systeme werden tröpfchenweise freigeschaltet ([mobilegamer.biz](https://mobilegamer.biz/the-design-secrets-powering-habbys-hit-machine/)); Kapitel sind bewusst so abgestimmt, dass man zu schwach ankommt ([Game Developer](https://www.gamedeveloper.com/design/finding-the-fun-archero-part-2---progression)) | Einhandbedienung mit Können; tröpfchenweise Freischaltung übernehmen, die Machtschranke nicht |
| **Soul Knight** | Auto-Zielen als Verkaufsargument, später um Richtungsangriff ergänzt ([App Store](https://apps.apple.com/us/app/soul-knight/id1184159988); [APKMirror](https://www.apkmirror.com/apk/chillyroom/soul-knight/soul-knight-4-2-6-release/)); Klagen über Werbung, fehlenden Offline-Modus und verlorene Spielstände ([JustUseApp](https://justuseapp.com/en/app/1184159988/soul-knight/reviews)) [Indiz] | Werbefrei, offline spielbar und mit robusten Spielständen hat man einen Ruf-Vorteil |
| **Dead Cells** | Schummeln zugunsten der Spieler ([Game Developer](https://gamedeveloper.com/design/video-how-cheating-and-making-player-life-easier-helped-i-dead-cells-i-shine)); drei Farben lenken die Builds ([Dead Cells Wiki](https://deadcells.wiki.gg/wiki/Mutation)); Tageslauf mit eigener Wertung für den ersten Versuch ([PC Gamer](https://pcgamer.com/dead-cells-adds-daily-challenge-mode)); Kritik am Grind ([Steam](https://steamcommunity.com/app/588650/discussions/0/1813170373215338482)) [Indiz] | Nachsicht; Kategorien für Spezialisierung; Grind vermeiden |
| **Enter the Gungeon** | Die Rolle durch Geschosse ist der Kern ([Nintendo Wire](https://nintendowire.com/news/2017/12/15/review-enter-gungeon/)); Pfeil über der Figur bei aktiver Synergie ([Steam](https://steamcommunity.com/app/311690/discussions/0/1711816259057725817)) [Indiz]; der Ableger verkleinerte die Trefferflächen ([Game Developer](https://www.gamedeveloper.com/design/building-i-enter-the-gungeon-i-s-dungeon-climbing-spin-off-i-exit-the-gungeon-i-)) | Synergien anzeigen; kleine Trefferfläche für den Helden |
| **Risk of Rain 2** | Prozentchancen stapeln hyperbolisch und erreichen nie 100 % ([RoR2 Wiki](https://riskofrain2.wiki.gg/wiki/Item_Stacking)); Eclipse-Leiter je Figur, Mods erleichtern den Aufstieg ([Thunderstore](https://thunderstore.io/package/Nuxlar/EasierEclipseClimb/)) | Formel gegen Extremwerte; Stufenleitern nicht zur Pflicht machen |
| **Slay the Spire** | Ascension je Figur, in StS2 von 20 auf 10 Stufen verdichtet ([PCGamesN](https://www.pcgamesn.com/slay-the-spire-2/ascension-levels)); datengetriebenes Balancing ([GDC Vault](https://www.gdcvault.com/browse/gdc-19/play/1025731)); der Rastplatz erzwingt eine Abwägung ([StS Wiki](https://slaythespire.wiki.gg/wiki/Peace_Pipe)) | Stufenleiter je Held; Statistik fürs Balancing; Lagerfeuer als Dilemma |
| **Balatro** | Punkte zählen mit steigenden Tönen hoch ([GMTK](https://gmtk.substack.com/p/balatros-cursed-design-problem)); 8 Einsätze je Deck ([Dot Esports](https://dotesports.com/indies/news/all-balatro-stakes-in-unlock-order)); 20 Herausforderungsläufe ([Kosgames](https://kosgames.com/balatro-achievements-and-challenge-guide-53458/)) [Indiz]; ein verwirrender Joker wurde überarbeitet ([PC Gamer](https://pcgamer.com/games/roguelike/balatro-1-1-will-include-new-jokers-plus-a-revamp-of-a-really-confusing-existing-one)) | Ton als Belohnung; Läufe mit festen Regeln; Verständlichkeit nachbessern |
| **Windblown** | Kampfsystem nach zwei Jahren verworfen und in drei Wochen neu gebaut ([PC Gamer](https://pcgamer.com/games/roguelike/for-their-new-roguelite-the-dead-cells-team-scrapped-2-years-of-work-on-combat-and-redid-it-in-just-3-weeks-we-need-to-be-able-to-dare-to-kill-a-feature-when-it-doesnt-work)); das Studio nennt das Spiel selbst „etwas zu strafend“ ([PCGamesN](https://www.pcgamesn.com/windblown/too-extreme)) | Mut zum Streichen; Härte gesondert prüfen |
| **Death Must Die** | Bessere Relikte gegen stärkere Gegner als Kernversprechen ([Gematsu](https://gematsu.com/games/death-must-die)); Neuwürfeln wirkt wertlos, wenn es nur Gewöhnliches bringt ([Steam](https://steamcommunity.com/app/2334730/discussions/0/4357871582657576968)) [Indiz] | Risiko-Wahl anbieten; Steuerwerkzeuge spürbar machen |
| **Brawl Stars** | Tippen schießt automatisch, Ziehen zielt manuell; Neulinge starten mit „Tippen zum Bewegen“ ([PocketGamer](https://www.pocketgamer.com/brawl-stars/brawl-stars-tips-and-tricks-a-guide-for-the-beginner-brawler/)); die Trophäenstraße soll mehr Spieler belohnen und binden – eine erklärte Absicht, kein Messwert ([Supercell](https://supercell.com/en/games/brawlstars/blog/news/rip-masteries)) | Zweistufige Eingabe für die Fähigkeit; langer Belohnungspfad |
| **Clash Royale** | In dieser Sitzung keine Quelle gefunden; Angaben zu Trophäenstraße und Pässen nur aus Vorwissen [ungeprüft] | Keine belastbare Lehre; das Prinzip langer Belohnungspfade ist über Brawl Stars belegt |
| **Celeste** | Coyote-Zeit und Sprungpuffer als Kern des Spielgefühls ([Celeste & Forgiveness](https://maddymakesgames.com/articles/celeste_and_forgiveness/)); Assist-Modus mit „überwältigend positivem“ Echo ([Vice](https://www.vice.com/en/article/celeste-assist-mode-change-and-accessibility)) | Eingabepuffer; wertfrei benannte Hilfsoptionen |
| **Hollow Knight / Silksong** | Bosse mit festem Bewegungssatz ([Console & PC Gaming](https://consolepcgaming.com/how-team-cherry-evolved-hollow-knights-bosses-for-silksong)) [Indiz]; die schnellere Heldin verlangte klügere Grundgegner ([PC Gamer](https://www.pcgamer.com/games/action/team-cherry-explains-silksong-is-more-lethal-because-players-are-too-hornet-is-inherently-faster-and-more-skillful-than-the-knight-the-base-level-enemy-had-to-be-more-complicated-more-intelligent/)); ein sanfterer Einstieg wurde nachgerüstet ([GamesRadar](https://www.gamesradar.com/games/action/silksongs-first-area-was-only-added-after-team-cherry-realized-it-needed-a-softer-intro-were-trying-to-be-kind-of-respectful-to-the-player-were-not-trying-to-baby-them)) | Lernbare Muster; Gegner wachsen mit dem Helden mit |
| **Into the Breach** | Klarheit vor Coolness, jede Gegneraktion wird angekündigt ([Game Developer](https://gamedeveloper.com/design/-i-into-the-breach-i-dev-on-ui-design-sacrifice-cool-ideas-for-the-sake-of-clarity-every-time-)) | Wirkung zeigen, bevor man sich entscheidet |
| **Wordle** | Spoilerfreies Emoji-Raster zum Kopieren, das Spieler vorher schon von Hand tippten ([Smithsonian](https://www.smithsonianmag.com/smart-news/heres-why-the-word-game-wordle-went-viral-180979439/)); ein Rätsel pro Tag, ohne App und ohne Anmeldung ([Boston Globe](https://www.bostonglobe.com/2022/01/09/lifestyle/what-is-wordle-why-is-everyone-twitter-playing-it)) | Teilen-Text für die Tagesherausforderung |
| **Weitere Browserspiele** | Poki verlangt höchstens 8 MB Erst-Download und sichtbares Laden ([Poki](https://sdk.poki.com/requirements)); CrazyGames verlangt unter 20 MB für die Mobil-Startseite ([CrazyGames](https://docs.crazygames.com/requirements/technical)); Kingdom Rush wurde vom Flash-Hit zur Mobile-Umsetzung ([Wikipedia](https://en.wikipedia.org/wiki/Kingdom_Rush)) | Den Sofortstart schützen; den Browser als Testmarkt nutzen |

Die folgenden Abschnitte gehen die gefragten Qualitätsmerkmale einzeln durch. Jeder endet mit übertragbaren Ideen samt Nutzen und Aufwand.

## Spielgefühl entsteht aus vielen kleinen Rückmeldungen, Fairness aus einer reservierten Gefahrenfarbe

### Unsichtbare Nachsicht zählt mehr als sichtbare Effekte

Jan Willem Nijman (Vlambeer) begann seinen Vortrag „The Art of Screenshake“ (2013) mit einem bewusst faden Shooter. Dann fügte er nacheinander **rund 30 kleine Rückmeldungen** hinzu, und jede machte das Spiel spürbar besser ([Game Developer](https://gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games)). Ein Blog zitiert aus einem Interview sein Beispiel: Bei jedem Schuss stößt die Kamera 6 Pixel zurück, und das Bildschirmwackeln steigt um 4 ([infovore.org](https://infovore.org/?p=5275)) [Indiz].

Mindestens so wichtig ist, was man nicht sieht. Celeste lässt kurz nach dem Verlassen einer Kante noch springen und führt einen zu früh gedrückten Sprung exakt beim Landen aus. Maddy Thorson nennt diese Hilfen wichtige Teile des Moment-zu-Moment-Erlebnisses und betont, sie habe keine davon erfunden ([Celeste & Forgiveness](https://maddymakesgames.com/articles/celeste_and_forgiveness/); [GameSpot](https://www.gamespot.com/articles/celeste-dev-explains-how-they-made-their-game-feel/1100-6474775/)). Der Dead-Cells-Vortrag auf der GDC 2019 stellt dasselbe Prinzip unter das Motto, den Spielern das Leben leichter zu machen, also zu ihren Gunsten zu schummeln ([Game Developer](https://gamedeveloper.com/design/video-how-cheating-and-making-player-life-easier-helped-i-dead-cells-i-shine)).

Für den Trefferstopp (Hitstop) liefern nur Kampfspiele harte Zahlen. Masahiro Sakurai beschreibt, dass Smash Bros. ihn stark nutzt und selbst Ryus erhöhter Wert unter dem von Street Fighter II liegt ([Source Gaming](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)). Bei einem Treffer mit 15 % Schaden reicht er von **8 Frames in Melee bis 15 Frames in Ultimate** ([SSBWiki](https://www.ssbwiki.com/Hitlag)). Indie-Ratgeber empfehlen 2–4 Frames für leichte Treffer ([gamejuice](https://gamejuice.pages.dev/articles/hit-stop-frame-trick)) [Indiz]. Werte von Supergiant, Motion Twin oder Dodge Roll fanden sich nicht.

Bei Auto-Angriff verschiebt sich das Spielgefühl. Es gibt keine Zielbewegung, die sich „anfühlen“ kann, also müssen die Trefferreaktionen der Gegner und die beiden Knöpfe die Arbeit leisten [Einschätzung]. Die „Arena der Verdammten“ dosiert den Trefferstopp bereits so, wie es die Quellen nahelegen [Code]:

- 0,03 s bei kritischen Treffern, höchstens alle 0,25 s,
- 0,06 s bei eigenem Schaden,
- 0,09 s beim Tod eines Elitegegners,
- 0,2 s, wenn ein Boss wütend wird,
- 0,35 s beim Tod eines Bosses.

Die größte Lücke ist unsichtbar: **Wer während der Abklingzeit auf Ausweichen oder die Fähigkeit drückt, dessen Druck wird verworfen** [Code]. Ein Eingabepuffer von etwa 100–150 ms überträgt Celestes Sprungpuffer direkt. Er beseitigt das Gefühl „der Knopf hat nicht reagiert“, das auf Touchscreens durch die Eingabelatenz noch verstärkt wird [Einschätzung].

Wie viel ein gutes Kampfgefühl wert ist, zeigt Windblown. Motion Twin verwarf zwei Jahre Arbeit am Kampfsystem und baute es in drei Wochen neu, denn man müsse „den Mut haben, ein Feature zu töten, wenn es nicht funktioniert“ ([PC Gamer](https://pcgamer.com/games/roguelike/for-their-new-roguelite-the-dead-cells-team-scrapped-2-years-of-work-on-combat-and-redid-it-in-just-3-weeks-we-need-to-be-able-to-dare-to-kill-a-feature-when-it-doesnt-work)).

### Unfaire Treffer haben fünf Ursachen, jede mit billiger Abhilfe

Effektgewirr ist die beständigste visuelle Klage des Genres, und sie trifft auch Spitzentitel:

- Spieler von Hades II berichten, dass Cerberus' rote Warnkreise in die folgenden roten Angriffe übergehen, und nennen späte Regionen ein „absolutes Durcheinander“ ([Steam-Diskussion](https://steamcommunity.com/app/1145350/discussions/2/591775992008276315/)) [Indiz].
- Bei Vampire Survivors machen Waffenblitze das Ausweichen vor Bossen „nahezu unmöglich“ ([Steam-Diskussion](https://steamcommunity.com/app/1794680/discussions/0/4631482569784862581/)) [Indiz]. Laut Rock Paper Shotgun trennen die meisten Nachahmer den Helden noch schlechter vom Gewimmel ([Wikipedia](https://en.wikipedia.org/wiki/Vampire_Survivors%E2%80%93like)).
- Für Windblown meldet ein Bewertungsaggregator dasselbe Problem ([Vaporlens](https://vaporlens.app/app/1911610/windblown)) [Indiz].

Die Gegenmittel sind gut beschrieben. Feindliche Geschosse dürfen als eine der wenigen Ausnahmen die Farbpalette brechen und sollen über fast allem anderen gezeichnet werden ([Game Developer: Bright, slow and deadly](https://www.gamedeveloper.com/design/bright-slow-and-deadly)). Justin Ma von Subset Games würde „coole Ideen jedes Mal der Klarheit opfern“; Into the Breach kündigt jede Gegneraktion an ([Game Developer](https://gamedeveloper.com/design/-i-into-the-breach-i-dev-on-ui-design-sacrifice-cool-ideas-for-the-sake-of-clarity-every-time-)). Hollow Knight zeichnet Gegner und Gefahren heller als die Umgebung ([Medium-Analyse](https://medium.com/3d-environmental-art/the-art-of-hollow-knight-f4c05dda3882)) [Indiz]. Die Xbox-Richtlinie 103 verlangt für Gefahrenzonen einen Hinweis, der nicht allein auf Farbe beruht ([Microsoft XAG 103](https://learn.microsoft.com/en-gb/gaming/accessibility/xbox-accessibility-guidelines/103)). Und Exit the Gungeon verkleinerte die Trefferflächen, damit dichtere Geschossmuster funktionieren ([Game Developer](https://www.gamedeveloper.com/design/building-i-enter-the-gungeon-i-s-dungeon-climbing-spin-off-i-exit-the-gungeon-i-)).

Daraus lassen sich fünf typische Ursachen für das Gefühl „das war unfair“ ableiten [Einschätzung]:

1. Schaden von außerhalb des Bildes oder durch Gegner, die direkt am Helden erscheinen.
2. Warnungen, die unter Effekten verschwinden.
3. Trefferflächen, die größer sind als die Figur.
4. Kontaktschaden in Schwärmen ohne Schutzzeit.
5. Touch-Latenz, die das Reaktionsfenster auffrisst.

Das Spiel deckt zwei davon ab: **0,75 s Unverwundbarkeit nach einem Treffer** und **0,45 s Einblendzeit**, in der neue Gegner noch nicht handeln [Code]. Der Farbenblind-Modus ergänzt Formen: gestrichelte Warnkreise und weiße Ringe um feindliche Geschosse. Im Normalmodus dagegen tragen Geschosse ihre Eigenfarbe, ein Pfeil etwa ist braun [Code]. Damit fehlen eine verbindliche Gefahrenfarbe auch im Normalmodus, eine Zeichenreihenfolge, die feindliche Angriffe über die eigenen Effekte legt, einheitliche Bodenwarnungen für Flächenangriffe und ein Mindestabstand für das Erscheinen neuer Gegner [Einschätzung].

Wie lang Vorwarnungen sein müssen, hat kein Entwickler in Millisekunden veröffentlicht. Die verbreitete Faustregel – 0,5–1 s für normale Nahkampfangriffe, mehr für Bossangriffe, gemessen an einer menschlichen Reaktionszeit von etwa 200–250 ms – ist [ungeprüft]. Der vorhandene Test-Bot kann diese Lücke schließen, indem er Treffer pro Raum und pro Gegnertyp zählt [Einschätzung].

Bei Schadenszahlen lautet der Forenkonsens „standardmäßig an, abschaltbar“ ([ResetEra](https://www.resetera.com/threads/most-overlooked-feature-that-can-be-a-dealbreaker-in-a-game-damage-numbers.469467/page-2)) [Indiz]. Das Spiel bietet An und Aus [Code]. Eine Zwischenstufe „nur kritische Treffer“, die Zahlen pro Ziel zusammenfasst, würde das Bild weiter beruhigen [Einschätzung].

| Übertragbare Idee | Vorbild | Nutzen | Aufwand |
|---|---|---|---|
| Eingabepuffer (≈ 120 ms) für Ausweichen und Fähigkeit | Celeste, Dead Cells | hoch | sehr gering |
| Kontrastring des Farbenblind-Modus für alle feindlichen Geschosse zum Standard machen; eine reservierte Gefahrenfarbe; feindliche Angriffe über den eigenen Effekten zeichnen | Bright, slow and deadly; Into the Breach | hoch | gering |
| Bodenwarnung, die sich bis zum Einschlag füllt, für jeden Flächen- und Bossangriff; Mindestvorwarnzeit per Bot prüfen | Into the Breach | hoch | mittel |
| Trefferfläche des Helden kleiner als die Figur (≈ 60–70 %; aktuellen Wert prüfen) | Exit the Gungeon | mittel bis hoch | sehr gering |
| Eigene Effekte bei hoher Grafikstufe transparenter, Obergrenze für Partikel | Kritik an Vampire Survivors | mittel | gering |
| Schadenszahlen in drei Stufen (alle, nur kritische, aus), pro Ziel zusammengefasst | Forenkonsens | mittel | gering |
| Sichtbare, „klebrige“ Zielmarkierung des Auto-Angriffs (das Ziel springt nicht ständig um) | Kritik an Dead Cells mobil und an 20 Minutes Till Dawn | mittel | gering |

## Gegner brauchen klare Rollen, Bosse lernbare Muster, das Ausweichen Kürze

Das Level Design Book beschreibt, wie Skylanders mit vier Grundtypen auskam: Nah, Fern, Schwärmer, Schwer. Jeder Typ lässt sich anders bekämpfen, und kombiniert ergeben sie neue Probleme ([The Level Design Book](https://book.leveldesignbook.com/process/combat/enemy)). Erweiterte Listen ergänzen Flankierer, Geschütz, Unterstützer und Hinterhalt ([Wayline](https://www.wayline.io/blog/designing-engaging-enemy-archetypes)) [Indiz]. Das Kampfsystem von Dead Cells entstand ausdrücklich aus Tower-Defense-Spielen und den Klassen von Team Fortress 2 ([PC Gamer](https://pcgamer.com/dead-cells-combat-evolved-from-tower-defense-games-and-team-fortress-2)).

Team Cherry formuliert die Regel, die mit dem Machtzuwachs des Helden einhergeht: Weil Hornet schneller und geschickter ist als der Ritter, mussten schon die einfachsten Gegner in Silksong „komplizierter, intelligenter“ werden ([PC Gamer](https://www.pcgamer.com/games/action/team-cherry-explains-silksong-is-more-lethal-because-players-are-too-hornet-is-inherently-faster-and-more-skillful-than-the-knight-the-base-level-enemy-had-to-be-more-complicated-more-intelligent/)). Zugleich baute das Studio nachträglich ein sanfteres erstes Gebiet ein. Man wolle die Spieler respektieren, sie aber „nicht bemuttern“ ([GamesRadar](https://www.gamesradar.com/games/action/silksongs-first-area-was-only-added-after-team-cherry-realized-it-needed-a-softer-intro-were-trying-to-be-kind-of-respectful-to-the-player-were-not-trying-to-baby-them)).

Methodisch fällt auf, wie klein die Testeinheit ist. Das Gungeon-Team baute einen einzigen Raum und testete ihn wieder und wieder, bevor es ganze Etagen darum herum plante ([Game Developer](https://www.gamedeveloper.com/design/q-a-the-guns-and-dungeons-of-i-enter-the-gungeon-i-)). Motion Twin änderte Dead Cells, nachdem Spieler es anders spielten als gedacht ([Game Developer](https://gamedeveloper.com/design/how-watching-people-play-i-dead-cells-i-incorrectly-influenced-its-designers)).

Für die 22 Gegnertypen des Spiels [Code] folgt daraus ein Rollen-Audit [Einschätzung]:

- jedem Typ eine Hauptrolle zuweisen,
- Doppelbesetzungen erkennen, die sich nur kosmetisch unterscheiden,
- neue Typen zuerst allein oder zusammen mit bekannten schwachen Gegnern einführen,
- pro Welle höchstens zwei bis drei Rollen mischen.

Auto-Angriff-Spiele füllen den Bildschirm mit vielen harmlosen und wenigen gefährlichen Gegnern. Deshalb müssen sich die gefährlichen durch Größe, Kontur oder Elitefarbe abheben [Einschätzung]. Eine Zahl für die ideale Menge gleichzeitiger Gegner fand die Recherche nicht.

Bosse wirken fair, wenn ihr Bewegungssatz fest und lernbar ist. Eine Fan-Analyse beschreibt Hollow-Knight-Bosse als Kombination von etwa drei bis sechs Angriffen zu Mustern und Rhythmen. Die Schwierigkeit entsteht dort aus Tempo und Fehlerkosten, nicht aus Zufall ([Console & PC Gaming](https://consolepcgaming.com/how-team-cherry-evolved-hollow-knights-bosses-for-silksong)) [Indiz]. Silksongs Bosse sind um Hornets Beweglichkeit herum gebaut ([GamesRadar](https://www.gamesradar.com/games/action/team-cherry-demonstrates-the-evolution-between-hollow-knight-and-silksong-if-the-last-judge-had-existed-in-the-previous-game-it-would-have-probably-been-more-of-a-big-round-blob)). Team Cherry hält Niederlagen für akzeptabel, weil Spieler die Muster meistern oder die Herausforderung umgehen können ([PC Games](https://www.pcgames.de/Hollow-Knight-Silksong-Spiel-62187/News/Team-Cherry-Schwierigkeitsgrad-1482517/)).

Dead Cells beschreibt seine Bosse als musterbasiert, mit einer Ausweichrolle samt Unverwundbarkeit ([Motion Twin](https://motiontwin.itch.io/dead-cells)). In Enter the Gungeon gilt das Durchrollen von Bossgeschossen als Kern der Balance aus Glück und Können ([Nintendo Wire](https://nintendowire.com/news/2017/12/15/review-enter-gungeon/)). Hades führt „unblockbare“ Angriffe als eigene Klasse mit eigenen Regeln ([Hades Wiki](https://hades.fandom.com/wiki/Unblockable)). Zwei verbreitete Praktiken ließen sich dagegen nicht belegen [ungeprüft]: dass Gungeon beim Tod oder Phasenwechsel eines Bosses alle feindlichen Geschosse löscht und einen trefferlosen Sieg mit einer „Master Round“ belohnt, und dass Hades-Bosse mit steigender Hitze neue Angriffe erhalten.

Das Spiel kündigt die zweite Bossphase bereits deutlich an: mit dem Banner „Der Boss wird wütend!“, 0,2 s Trefferstopp, Bildschirmwackeln und Publikumsjubel. NG+ zieht die Phase früher vor, und die Statistik „Boss ohne Treffer“ samt Erfolg existiert [Code]. Ausbaufähig sind [Einschätzung]:

- feindliche Geschosse beim Phasenwechsel löschen,
- die Musik wechseln,
- ein bis zwei neue Angriffe pro Phase hinzufügen und die alten behalten,
- die Musterfolge über `seeded()` festlegen, damit man sie auswendig lernen kann,
- trefferlose Siege wiederkehrend belohnen.

Beim Ausweichen setzen die Vorbilder auf Kürze. In Hades ist der Dash das Ausweichen; er führt durch Gegner hindurch und verbindet sich mit Angriffen ([PC Gamer](https://www.pcgamer.com/hades-review)). In Hades II lädt ein Dash in einen angekündigten Angriff den Dash neu ([PC Gamer](https://pcgamer.com/games/action/if-youre-struggling-with-hades-2s-small-changes-dont-worrytheyll-click)). Laut Spielern hat dort der Dash-Schlag keine Unverwundbarkeit, und eine Sternenspur markiert das unverwundbare Fenster ([Steam-Diskussion](https://steamcommunity.com/app/1145350/discussions/0/4635986512580724515); [Gameland](https://gameland.gg/hades-2-melinoes-dash-is-great-youre-just-using-it-wrong/)) [Indiz]. Brotato dokumentiert die Schutzzeit nach Treffern als eigene Mechanik ([Brotato Wiki](https://brotato.wiki.spellsandguns.com/Iframes)).

Veröffentlichte Ausweichdauern fehlen. Die Community-Werte von etwa 0,2–0,3 s für den Hades-Dash und etwa 0,7 s für die Gungeon-Rolle (unverwundbar nur im ersten Teil) sind [ungeprüft]. Auf Touchscreens, wo ohnehin Latenz besteht, fühlt sich eine kurze, häufig verfügbare Ausweichbewegung reaktionsschneller an als eine lange Rolle, auf die man sich festlegt [Einschätzung]. Das Spiel liegt mit **0,13 s Bewegung, 0,24 s Unverwundbarkeit und 1,0 s Abklingzeit** [Code] genau in diesem Bereich. Es fehlt vor allem der Eingabepuffer. Optional käme ein kurzes Aufblitzen bei knappem Ausweichen als Belohnung nach dem Vorbild von Hades II hinzu [Einschätzung].

| Übertragbare Idee | Vorbild | Nutzen | Aufwand |
|---|---|---|---|
| Rollen-Audit der 22 Gegner; neue Typen einzeln einführen; höchstens zwei bis drei Rollen je Welle; Eliten deutlich abheben | Skylanders, Dead Cells | mittel bis hoch | mittel |
| Phasenwechsel mit kurzer Unverwundbarkeit, Löschen der Geschosse und Musikwechsel; ein bis zwei neue Angriffe je Phase; Musterfolge über `seeded()` | Hollow Knight; Gungeon [ungeprüft] | hoch | mittel |
| Boss-Varianten für höhere Stufen: ein neuer Angriff statt nur mehr Lebenspunkte | Hades [ungeprüft] | hoch | mittel bis hoch |
| Wiederkehrende Belohnung für trefferlose Bosssiege (die Statistik existiert) | Gungeon [ungeprüft] | mittel | gering |
| „Perfektes Ausweichen“: Aufblitzen oder kurze Zeitlupe bei knappem Ausweichen | Hades II | mittel | gering bis mittel |
| Fairness-Kennzahl im Bot-Test: Treffer je Raum und je Gegnertyp | Mega Crit (Metriken) | mittel bis hoch | gering bis mittel |

## Am Handy entscheiden der Daumen, die ersten Minuten und verlustfreies Unterbrechen

### Ein Daumen, Auto-Angriff und sichtbare Zielwahl bilden den Massenmarktstandard

Archero, Survivor.io und Soul Knight setzen auf einen schwebenden Joystick, der dort erscheint, wo der Daumen aufsetzt. Dazu kommt automatisches Angreifen oder Zielen. Archero ergänzt eine Regel, die passiv klingt und doch Können verlangt: Der Held schießt nur im Stillstand. Laufen und Angreifen schließen sich also aus, und Rezensenten sprechen von ständigen Mikroentscheidungen ([PocketGamer](https://www.pocketgamer.com/archero/how-to-play-archero-the-latest-free-mobile-rogueli)). Eine Begründung von Habby selbst fand sich nicht.

Brawl Stars löst Fähigkeiten zweistufig: Antippen feuert einen automatisch gezielten Schnellschuss, Ziehen zielt manuell, und die Super-Fähigkeit folgt derselben Logik. Neulinge starten zudem im einfacheren Modus „Tippen zum Bewegen“ ([PocketGamer](https://www.pocketgamer.com/brawl-stars/brawl-stars-tips-and-tricks-a-guide-for-the-beginner-brawler/)). Soul Knight bewirbt sein Auto-Zielen als „super intuitiv“ und ergänzte später gerichtetes Angreifen per Joystick ([App Store](https://apps.apple.com/us/app/soul-knight/id1184159988); [APKMirror](https://www.apkmirror.com/apk/chillyroom/soul-knight/soul-knight-4-2-6-release/)).

Wo Automatik fehlt oder stört, häufen sich Klagen. 20 Minutes Till Dawn zielt automatisch, verlangt aber ständiges Tippen auf den Feuerknopf ([TapSmart](https://www.tapsmart.com/games/review-20-minutes-till-dawn/?amp=1)). Das mobile „Auto-Hit“ von Dead Cells erschwert laut Forennutzern das Ausweichen und schlägt nach einem Kill noch einmal zu ([TouchArcade-Forum](https://toucharcade.com/community/threads/dead-cells-by-motion-twin-playdigious-ta-game-of-the-year-2019.400252/page-4)) [Indiz]. Die Presse urteilt gespalten, zwischen „funktioniert meistens“ ([NME](https://www.nme.com/reviews/dead-cells-review-a-good-mobile-port-of-an-excellent-roguelike-game-2699135)) und „schlecht umgesetzt“ ([Gamezebo](https://www.gamezebo.com/?p=491570)). Als Mindestgrößen für Bedienelemente nennen Sekundärquellen 44 pt (Apple), 48 dp (Material) und 24 CSS-Pixel (WCAG 2.2, Stufe AA) ([Front-End Checklist](https://frontendchecklist.io/rules/accessibility/touch-targets)).

Die „Arena der Verdammten“ erfüllt diesen Standard bereits: schwebender Joystick als Voreinstellung, fester Joystick als Option, Linkshänder-Modus, Radius 56 px, Totzone 12 % und Auto-Angriff ohne Feuerknopf [Code]. Offen sind [Einschätzung]:

- eine sichtbare Markierung des aktuellen Auto-Ziels,
- ausreichend große Trefferflächen für den Ausweich- und den Fähigkeitsknopf (mindestens 56–64 px plus Rand),
- optional die Brawl-Stars-Logik „tippen = automatisch, ziehen = zielen“ für die Fähigkeit.

### Fünf bis neun Minuten pro Sitzung verlangen Kapitel und sicheres Fortsetzen

Erfolgreiche Mobile-Roguelites lehren durch Spielen und schalten ihre Systeme tröpfchenweise frei. Habby zeigt Funktionen anfangs ausgegraut, während die Spieler die Grundmechanik lernen ([mobilegamer.biz](https://mobilegamer.biz/the-design-secrets-powering-habbys-hit-machine/)). Survivor.io soll laut einer Naavik-Analyse eine Bindung am ersten Tag (D1) auf Archero-Niveau erreicht haben, um Mitte 40 % ([Naavik](https://naavik.co/deep-dives/survivorio-archeros-footsteps/)). Die Messlatte liegt allerdings tiefer: Nach GameAnalytics-Daten für 2025 beträgt der Median **etwa 22 % nach einem Tag (D1) und unter 4 % nach einer Woche (D7)**; die besten 10 % erreichen etwa 40 % D1 und 12 % D7 ([GameDevReports](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game)).

Ebenso klar ist das Bild bei der Sitzungslänge. Top-Spiele kommen auf 8–9 Minuten, das Mittelfeld auf 5–6 Minuten; Midcore-Titel haben dafür 6–7 Sitzungen am Tag ([GameDevReports](https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks)). Adjust misst mit anderer Methode rund 31 Minuten, das ist nicht vergleichbar ([GameDevReports/Adjust](https://gamedevreports.substack.com/p/adjust-gaming-app-insights-report)). Slay the Spire auf dem Handy gilt als Vorbild, weil man einen Lauf auch Tage später ohne Nachteil fortsetzen kann ([TwoAverageGamers](https://www.twoaveragegamers.com/best-roguelikes-short-sessions/)) [Indiz]. Für das eigene Spiel folgt daraus [Einschätzung]: Räume von 60–120 Sekunden, ein Akt von 10–15 Minuten als natürliches Kapitel und ein optionaler Kurzlauf über einen Akt.

Der Einstieg ist bereits spielerisch gelöst. Der erste Kampf führt schrittweise durch Bewegen, erste Welle, Ausweichen und Fähigkeit und hebt dabei die Knöpfe hervor [Code]. Zwei Stellschrauben bleiben [Einschätzung]: Hinweise an den Bedarf koppeln, etwa den Ausweich-Hinweis zeigen, sobald das erste Geschoss fliegt; und Händler, Schmiede, Ereignisse und weitere Helden erst nach dem ersten Lauf oder ersten Boss einblenden. Außerdem startet ein neuer Spielstand mit **Tempo 1,2**, und zur Wahl stehen nur 1, 1,2 und 1,5 [Code]. Für Neulinge ist das eher eine Hürde [Einschätzung].

Beim Unterbrechen speichert der letzte Commit den Lauf, sobald die Karte erscheint und nach Räumen ohne Kampf. Das Verlassen des Tabs pausiert nur [Code]. Wird die App mitten im Kampf beendet, landet man also wieder auf der Karte vor der Raumwahl und könnte einen anderen Weg nehmen [Einschätzung]. Die Arbeitskopie speichert inzwischen den laufenden Raum und offene Belohnungen mit, das ist aber noch nicht committet [Code].

### Hilfsmodi werden gefeiert, wenn sie wertfrei heißen

Die Xbox-Richtlinien verlangen, Kamerawackeln zu vermeiden oder regelbar zu machen; Halo Infinite bietet dafür einen Regler von 0 bis 100 % ([Xbox XAG 117](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/117)). Sie warnen vor bestimmten Lichtblitz-Mustern ([Microsoft XAG 118](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/118)) und fordern Hinweise, die nicht allein auf Farbe beruhen ([XAG 103](https://learn.microsoft.com/en-gb/gaming/accessibility/xbox-accessibility-guidelines/103)). Unity nennt als Textkontrast 4,5 : 1 für normalen und 3 : 1 für großen Text ([Unity](https://unity.com/blog/video-game-accessibility-basics)).

Die stärkste Lehre liefert Celeste. Der Assist-Modus bietet Spieltempo, unbegrenzte Ausdauer und Unverwundbarkeit. Laut Matt Thorson war das Echo „überwältigend positiv“; viele hätten das Spiel sonst nie versucht. Kritisiert wurde nur die Formulierung vom „vorgesehenen“ Erlebnis, die das Team daraufhin änderte. Intern hieß die Funktion anfangs „Cheat Mode“ ([Vice](https://www.vice.com/en/article/celeste-assist-mode-change-and-accessibility)). Hades' Gottmodus erhöht die Schadensresistenz mit jedem Tod und lässt sich jederzeit ohne Strafe schalten ([Indie Game Culture](https://indiegameculture.com/listicles/indies-with-great-accessibility-features)) [Indiz]. Rogue Legacy 2 ergänzt mit „House Rules“ Schalter für Kontaktschaden und Gegnerwerte ([GameSkinny](https://www.gameskinny.com/?p=71843)). Vampire Survivors erlaubt zwar, Blitze und Wackeln abzuschalten, hat aber weder einstellbare Schriftgrößen noch einen Farbenblind-Modus ([Family Gaming Database](https://www.familygamingdatabase.com/accessibility/Vampire+Survivors)).

Hier ist das Spiel weiter als mancher Hit. Das Wackeln ist abschaltbar und bei der Systemeinstellung „reduzierte Bewegung“ standardmäßig aus. Der Farbenblind-Modus ergänzt Formen, und Schadenszahlen sowie Vibration lassen sich schalten [Code]. Es fehlen [Einschätzung]:

- Wackelstufen statt nur An und Aus,
- gedämpfte Blitze bei reduzierter Bewegung,
- einstellbare Text- und Knopfgröße,
- ein Tempo unter 1,
- ein Hilfsmodus nach dem Vorbild von Celeste und Hades mit neutralem Namen.

| Übertragbare Idee | Vorbild | Nutzen | Aufwand |
|---|---|---|---|
| Hilfsmodus „Gnade der Götter“: wachsende Schadensreduktion pro Niederlage, jederzeit abschaltbar, wertfrei benannt; Tempo 0,8; Standardtempo 1,0 für neue Spielstände | Celeste, Hades | hoch | gering |
| Hinweise nach Bedarf; Händler, Schmiede, Ereignisse und weitere Helden erst nach dem ersten Lauf einblenden | Habby, Silksong | hoch | mittel |
| Laufenden Raum beim Betreten speichern, nach einem Abbruch denselben Raum neu starten (in Arbeit) | Slay the Spire mobil | mittel bis hoch | gering bis mittel |
| Wackelstärke 0 / 50 / 100 %, gedämpfte Blitze bei reduzierter Bewegung, Text- und Knopfgröße, Knopftransparenz | XAG 117 und 118 | mittel | gering |
| Fähigkeit: Tippen = automatisch, Ziehen = zielen | Brawl Stars | mittel | mittel |
| Kurzlauf über einen Akt (≈ 10–15 Minuten) | 20 Minutes Till Dawn | mittel | mittel |
| Gamepad-Unterstützung | 20 Minutes Till Dawn, Dead Cells | gering bis mittel | mittel |

## Jede Dreierwahl braucht eine Option, die anders ist, nicht nur größer

### Seltenheit allein macht keine gute Wahl

Hades staffelt seine Segen in vier Seltenheiten. Die höchste (heroisch) erreicht man nur über Umwege, und Duo- sowie Legendär-Segen lassen sich nicht weiter aufwerten ([Prima Games](https://primagames.com/gaming/hades-guide-legendary-heroic-duo-boons)). Spannender als die Stufe ist jedoch die Art des Segens. Duo-Segen verändern laut einer Besprechung „oft komplett, wie man spielt“ ([Scientific Gamer](https://scientificgamer.com/thoughts-hades/)) [Indiz], während manche als „giftig schlecht“ gelten ([TheGamer](https://www.thegamer.com/hades-boon-replay-escape/)). Seltenheit garantiert also keine gute Wahl. Chaos-Segen koppeln einen Fluch, den man erst eine Anzahl Begegnungen lang ertragen muss, an einen späteren Vorteil; schon das Chaos-Tor kostet Leben ([Prima Games](https://primagames.com/gaming/hades-chaos-realm-chaos-blessings)).

Brotato baut Nachteile direkt in Gegenstände ein, etwa +30 Glück gegen −2 Nahkampf- und −1 Fernkampfschaden ([number13](https://en.number13.de/brotato-lucky-build/)). Dead Cells lenkt Builds über drei Farben: Brutalität, Taktik und Überleben. Von den 53 Mutationen gehören je 12 zu einer Farbe, 17 sind farblos. Patch 2.1 balancierte den Berserker allein dadurch, dass er die Farbe wechselte ([Dead Cells Wiki](https://deadcells.wiki.gg/wiki/Mutation); [Dead Cells Wiki: Berserker](https://deadcells.wiki.gg/wiki/Berserker)). Das Gegenbeispiel liefert Death Must Die: Spieler kritisieren, reine Werte-Upgrades machten die Builds gleichförmig, und das Neuwürfeln fühle sich wertlos an, wenn es nur Gewöhnliches bringt ([Steam-Diskussion](https://steamcommunity.com/app/2334730/discussions/0/4357871582657576968)) [Indiz]. Into the Breach zeigt schließlich, warum jede Option sofort verständlich sein muss: Man sieht das Ergebnis einer Aktion, bevor man sie bestätigt ([Prototypr](https://blog.prototypr.io/into-the-breachs-ux-makes-you-feel-smart-a9cb03210757)) [Indiz].

Das eigene Spiel ist hier stärker, als eine Notiz annahm [Code]:

- Es gibt **50 Upgrades**: 9 gewöhnliche, 22 seltene, 13 epische und 6 verfluchte.
- Nach eigener Zählung verändern **rund 20 davon das Verhalten** statt nur Zahlen, etwa Kettenblitz, Feuerkugeln, Schattenspur, Rammen beim Ausweichen und Meteor.
- **22 Upgrades sind heldenspezifisch**, drei bis vier je Held.
- Die verfluchten Upgrades tauschen dauerhaft Stärke gegen einen Nachteil.
- Fast alle Upgrades haben Stapelgrenzen.

Die Hebel liegen deshalb weniger in noch mehr Upgrades als in der Klarheit. Eine Zahlenvorschau wie „Schaden 12 → 15“ auf der Karte würde helfen. Dazu käme eine zweite Art von Fluch nach Chaos-Vorbild, die nur befristet wirkt [Einschätzung].

### Mächtige Kombinationen brauchen sichtbare Voraussetzungen

Alle erfolgreichen Kombinationssysteme knüpfen die große Belohnung an Bedingungen, die das Spiel anzeigt. Hades nennt für jeden Duo-Segen die benötigten Segen beider Götter ([Prima Games](https://primagames.com/gaming/hades-guide-legendary-heroic-duo-boons)). Vampire Survivors rüstete mit Patch 0.7.3 im Juni 2022 eine Evolutionstabelle im Spiel nach ([Automaton](https://automaton-media.com/articles/newsjp/20220624-208016/)). Noch heute widersprechen sich Ratgeber, ob für eine Evolution zwei oder drei Bedingungen gelten ([PC Gamer](https://www.pcgamer.com/au/vampire-survivors-evolve-weapons-evolutions-guide); [Digital Trends](https://digitaltrends.com/gaming/vampire-survivors-evolution-guide/)) – ein Zeichen, dass versteckte Rezepte allein nicht reichen. Enter the Gungeon blendet bei aktiver Synergie einen blauen Pfeil über der Figur ein und zeigt die Partner im Ammonomicon, seinem Nachschlagebuch ([Steam-Diskussion](https://steamcommunity.com/app/311690/discussions/0/1711816259057725817)) [Indiz]. Risk of Rain 2 stapelt Prozentchancen hyperbolisch, sodass sie nie 100 % erreichen: Tougher Times liegt bei sechs Stapeln bei etwa 47 % ([RoR2 Wiki](https://riskofrain2.wiki.gg/wiki/Item_Stacking)).

Das Spiel hat **fünf Synergien aus je zwei Upgrades**. Bei der Auswahl zeigt es an, wenn eine Wahl eine Synergie vervollständigt, und belohnt das Entdecken aller fünf mit einem Erfolg [Code]. Bei 50 Upgrades sind fünf Kombinationen allerdings wenig. Mit Teilfortschritt („1/2 für Inferno“), einem Codex mit „???“-Einträgen und 10–15 Synergien würde aus Zufall Planung [Einschätzung]. Nach dem Muster von Vampire Survivors könnte zudem ein Heldenangriff auf hoher Stufe zusammen mit einem bestimmten Upgrade eine Evolution in Schatz- oder Bosstruhen freischalten. Das gäbe diesen Knoten eine planbare Bedeutung [Einschätzung].

### Belohnungen wirken durch Opportunitätskosten, nicht durch Häufigkeit

Harte Zahlen zur idealen Belohnungsfrequenz fand die Recherche nicht. Die Vorbilder zeigen aber, dass Entscheidungen auf der Karte durch Abwägung entstehen. Am Rastplatz von Slay the Spire heilt man, verbessert eine Karte oder nutzt Relikt-Optionen wie das Entfernen einer Karte ([StS Wiki](https://slaythespire.wiki.gg/wiki/Peace_Pipe)). Entfernen ist so stark, dass Slay the Spire 2 die Händlerkosten dafür steiler steigen lässt: Start bei 100 Gold, dann +50 statt +25 je Nutzung ([Pulse](https://www.pulse.bot/gaming/news/slay-the-spire-2-nerfs-card-removal-buffs-shivs-and-adds-a-new-reward-system-ae62a358-c372-4e4d-9dfd-cf94ece210ec)) [Indiz]. Death Must Die verspricht bessere Relikte „auf Kosten“ stärkerer Gegnerlegionen ([Gematsu](https://gematsu.com/games/death-must-die)). Für Halls of Torment argumentieren Ratgeber, Wiederbelebungs-Segen seien schwächer als gedacht, weil Tode meist an fehlendem Schaden oder Tempo liegen ([Prima Games](https://primagames.com/gaming/best-blessings-in-halls-of-torment)) [Indiz]. Belohnungen, die nur Fehler verzeihen, zählen also weniger als echter Kraftzuwachs. Dass Hades das Belohnungssymbol jeder Tür schon vor dem Betreten zeigt, ist [ungeprüft], im Genre aber verbreitet.

Im Spiel zeigt die Karte bereits die Knotentypen: Kampf, Elite, Händler, Lagerfeuer, Schatz, Ereignis und Boss. Am Lagerfeuer wählt man zwischen Ausruhen (40 % Heilung) und Trainieren (+10 max. LP, +8 % Schaden) [Code]. Drei Ergänzungen würden den Rhythmus schärfen [Einschätzung]: eine dritte Lagerfeuer-Option „Upgrade entfernen oder verwandeln“; unterschiedliche und vorab sichtbare Belohnungen für Kampfräume; und alle drei bis vier Knoten ein großer Moment, etwa eine Elite mit garantiert seltener oder besserer Belohnung oder ein Schatz mit Evolution.

Fürs Balancing lohnt der Blick zu Mega Crit, das Slay the Spire früh anhand von Messdaten abstimmte ([GDC Vault](https://www.gdcvault.com/browse/gdc-19/play/1025731)), und zu Supergiant. Supergiant schwächte beliebte Segen in Hades II nicht ab, sondern gab ihnen „neue Heimaten“ ([PC Gamer](https://www.pcgamer.com/games/roguelike/hades-2-lead-says-they-didnt-nerf-the-games-most-popular-boons-but-rather-found-new-homes-for-them-during-early-access-development)). Ohne Server ersetzen lokale Wahl- und Siegquoten je Upgrade sowie massenhafte Bot-Läufe diese Telemetrie [Einschätzung]. Dass „kaputte“ Builds gefeiert werden, solange sie selten sind und erarbeitet werden müssen, zeigt ein Zwei-Karten-Deck, das in Slay the Spire Bosse mit einer Endloskombo besiegt ([PC Gamer](https://pcgamer.com/watch-a-two-card-deck-lay-waist-to-slay-the-spires-bosses-with-an-infinite-combo)).

| Übertragbare Idee | Vorbild | Nutzen | Aufwand |
|---|---|---|---|
| Synergie-Teilfortschritt („1/2“) auf den Upgrade-Karten und ein Synergie-Codex mit „???“ | Hades, Enter the Gungeon, Vampire Survivors | hoch | gering |
| Synergien von 5 auf 10–15 ausbauen, auch mit heldenspezifischen Upgrades | Duo-Segen in Hades | hoch | mittel |
| Lagerfeuer mit dritter Option „Upgrade entfernen oder verwandeln“ | Slay the Spire | mittel bis hoch | gering |
| Zahlenvorschau („Schaden 12 → 15“) und aktuelle Stufe auf jeder Upgrade-Karte | Into the Breach | mittel | gering |
| Evolution des Heldenangriffs: Angriff auf Stufe N plus Upgrade Y ergibt eine Evolution in der Schatz- oder Bosstruhe | Vampire Survivors | hoch | mittel |
| Befristeter Fluch als zweite Fluchart („3 Räume −20 % LP, danach ein starker Effekt“) | Chaos-Segen in Hades | mittel bis hoch | gering bis mittel |
| Unterschiedliche, vorab sichtbare Belohnungen für Kampfknoten | Hades [ungeprüft], Slay the Spire | mittel bis hoch | mittel |
| Verbannen (1–3 je Lauf) als Schmiede-Freischaltung neben dem vorhandenen Neuwurf | Vampire Survivors [ungeprüft], Kritik an Death Must Die | mittel | gering |
| Lokale Wahl- und Siegquoten je Upgrade plus Bot-Simulation | Mega Crit | mittel bis hoch (für die Entwicklung) | gering bis mittel |

## Meta-Fortschritt soll in die Breite und in die Herausforderung wachsen, nicht in die Höhe

### Machtzuwachs wird geduldet, solange er gedeckelt und ausgeglichen ist

Meta-Fortschritt, also Fortschritt, der über einzelne Läufe hinaus erhalten bleibt, gibt es in vier Spielarten [Einschätzung]:

- **Macht**: Schmiede, Hades' Spiegel der Nacht, Archeros Talente,
- **Vielfalt**: neue Figuren, Waffen, Karten,
- **Wissen**: die eigene Fertigkeit, ein Codex,
- **Erzählung**.

Hinzu kommt Meisterschaft über Schwierigkeitsstufen.

Umstritten ist vor allem die erste Spielart. Eine Designseite fordert, Meta-Fortschritt solle „mehr Optionen, nicht mehr Stärke“ freischalten ([saschb2b](https://saschb2b.github.io/game-mechanics/concepts/meta-as-variety-not-power)) [Indiz]. Ein Entwicklerblog warnt, dass wachsende Meta-Macht den Anfang eines Laufs trivial macht ([Echoes of Myth](https://echoesofmyth-devblog.blogspot.com/2025/02/roguelite-meta-progression-and.html)) [Indiz]. In Spielerforen gelten frühe Level, die erst ab einer Meta-Schwelle zugänglich sind, als schlechtes Design, während neue Startpunkte als Freischaltung akzeptiert werden ([Reddit-Spiegel](https://redlib.reallyaweso.me/r/roguelites/comments/17u524f/i_really_hate_meta_progression_in_modern/k96ng2g/?context=3)) [Indiz].

Archero zeigt die Kehrseite. Talente und Ausrüstung tragen in jeden Lauf, und neue Kapitel sind bewusst so abgestimmt, dass man zu schwach ankommt. Diese Machtschranke hängt an der Monetarisierung ([Game Developer](https://www.gamedeveloper.com/design/finding-the-fun-archero-part-2---progression)). Hades gilt dagegen als akzeptierter Mittelweg. Greg Kasavin nennt Wiederspielbarkeit ein vorrangiges Ziel und das „multiplikative“ Inhaltsdesign samt mitwachsender Geschichte den Schlüssel dazu. Der Pakt der Bestrafung entstand direkt nach dem Vorbild der Ascension aus Slay the Spire, damit Spieler die Härte fein einstellen können ([GameDaily](https://www.gamedaily.biz/?p=588)).

Die Schmiede der „Arena der Verdammten“ bleibt in einem vertretbaren Rahmen. Ihre sechs Verbesserungen sind gedeckelt, etwa +8 LP bis Stufe 5, +6 % Schaden bis Stufe 5 und bis zu drei Neuwürfe je Lauf. Zum Ausgleich erhalten Bosse je Stufe der Kraft-Verbesserung 8 % mehr Lebenspunkte [Code]. Sinnvoll ist, das Maximum sichtbar zu machen und Seelen danach in die Breite zu lenken, statt die Stärke weiter zu erhöhen [Einschätzung]. Möglich wären Helden-Aspekte nach Hades-Vorbild, wo jede Waffe vier Aspekte mit je fünf Stufen hat ([RPG Site](https://www.rpgsite.net/feature/10254-hades-infernal-arms-weapon-aspects-guideevery-weapon-aspect-and-upgrade-unlock)), dazu kosmetische Varianten oder Arena-Themen. Ein Bot-Test mit voll ausgebauter Schmiede zeigt, ob Akt 1 dadurch trivial wird [Einschätzung].

### Stufenleitern je Figur vervielfachen die Ziele ohne neue Inhalte

Zwei Modelle dominieren. Feste, aufeinander aufbauende Stufen sind leicht lesbar. Slay the Spire hat 20 Ascension-Stufen je Figur, und die erste öffnet sich nach einem Sieg mit dieser Figur ([PocketGamer](https://www.pocketgamer.com/slay-the-spire/ascension-guide)). Slay the Spire 2 verdichtet die Leiter auf 10 Stufen, wobei Stufe 10 den alten Doppelboss trägt ([PCGamesN](https://www.pcgamesn.com/slay-the-spire-2/ascension-levels)). Selbst Mega Crit hielt 20 Stufen mit vielen kleinen Füllschritten offenbar für zu viel [Einschätzung]. Balatro hat acht Einsätze je Deck; ein Gold-Sticker für jeden Joker, der auf höchster Stufe gewonnen hat, verbindet Sammlung, Leiter und Erfolg ([Dot Esports](https://dotesports.com/indies/news/all-balatro-stakes-in-unlock-order); [Sportskeeda](https://www.sportskeeda.com/esports/balatro-complete-list-achievements-trophies)). Brotato zeigt je Figur, welche der sechs Gefahrenstufen bezwungen ist ([Brotato Wiki](https://brotato.wiki.spellsandguns.com/Progress)).

Das zweite Modell sind frei kombinierbare Modifikatoren mit Punktwert, etwa Hades' Hitze oder die 16 Gelübde aus Hades II ([Hades Wiki](https://hades.fandom.com/wiki/Oath_of_the_Unseen)). Sie sind flexibler, brauchen aber Lenkung. Hades vergibt die Boss-Belohnungen bei jeder Hitze-Erhöhung erneut, deckelt das Farmen ab einer Schwelle und setzt Kopfgelder für Siege mit bestimmten Waffen aus ([RPG Site](https://www.rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards)). Risk of Rain 2 zeigt die Grenze: Die acht Eclipse-Stufen je Überlebendem sind so mühsam, dass Mods den Aufstieg erleichtern ([Thunderstore](https://thunderstore.io/package/Nuxlar/EasierEclipseClimb/)).

Das NG+ des Spiels ist dagegen eine Fortsetzung nach dem Endboss [Code]. Pro Stufe steigen die Lebenspunkte der Bosse um 50 % und ihr Schaden um 25 %. Gegner werden bis Stufe 5 je 4 % schneller; es gibt mehr Eliten, zwei Affixe und eine frühere zweite Bossphase. Die höchste erreichte Stufe wird gespeichert, und ein Erfolg verlangt NG+3. Das ist überwiegend Zahlenskalierung, also genau die Art von Stufe, die sich nach Grind anfühlt [Einschätzung].

Wirksamer wäre eine benannte Leiter, etwa „Verdammnis 1–10“ [Einschätzung]:

- vor dem Lauf wählbar und je Held freigeschaltet,
- mit einem spürbaren Modifikator pro Stufe, zum Beispiel mehr Eliten, schnellere Bosse, weniger Heilung oder Boss-Varianten,
- mit einem Raster aus Held und Stufe, das den Fortschritt zeigt.

7 Helden mal 10 Stufen ergeben 70 sichtbare Ziele ohne neue Inhalte. Belohnt würden sie mit Farbvarianten, Rahmen oder Titeln statt mit Stärke.

### Tägliche Läufe, feste Regeln und Geschichten halten nach dem ersten Sieg

Spelunky gilt als Begründer des Tageslaufs: ein generiertes Level für alle, nur ein Versuch ([Game Developer](https://www.gamedeveloper.com/design/the-24-hour-ticket-examining-daily-runs-); [Shacknews](https://www.shacknews.com/article/80294/spelunky-pc-introduces-daily-challenges)). Dead Cells erlaubt unbegrenzte Versuche, wertet den besten und führt eine eigene Rangliste für den ersten Versuch ([PC Gamer](https://pcgamer.com/dead-cells-adds-daily-challenge-mode)). Slay the Spire kombiniert einen gemeinsamen Seed mit Modifikatoren ([PC Gamer](https://pcgamer.com/slay-the-spire-deals-super-hard-daily-challenge-mode-in-latest-patch)). Kennzahlen zur Wirkung veröffentlichte keiner. Ein Einzelentwickler berichtet nur, wenige Zeilen Code für einen Tages-Seed hätten sein Spiel „jeden Tag spielenswert“ gemacht ([dev.to](https://dev.to/yurukusa/5-lines-of-code-that-made-my-roguelike-worth-playing-every-day-3klj)) [Indiz]. Balatro ergänzt 20 Herausforderungsläufe mit festen Regeln, die sich nach Siegen mit fünf Decks und danach kettenweise öffnen ([Kosgames](https://kosgames.com/balatro-achievements-and-challenge-guide-53458/)) [Indiz].

Die Tagesherausforderung des Spiels nutzt sechs Modifikatoren: Glaskanone, Die Horde, Hast, Elitekrieg, Blutmond und Goldrausch. Sie zählt die Versuche, speichert das Tagesbeste, und ein Erfolg schaltet einen Skin frei [Code]. Es fehlen eine Serie, ein Kalender vergangener Tage, eine eigene Wertung für den ersten Versuch, ein Wochenlauf und ein Teilen-Text. Aus denselben Modifikatoren ließen sich außerdem 10–15 handgemachte „Prüfungen“ bauen, die sich nacheinander freischalten [Einschätzung].

Für Spieler, die eher Geschichten als Meisterschaft suchen, ist Hades das Vorbild. Kasavin spricht von „zyklischer Erzählung“: Figuren reagieren unterschiedlich, je nachdem, ob es die erste oder die zwanzigste Begegnung ist ([AV Club](https://www.avclub.com/how-hades-rescues-the-roguelike-from-its-own-limit)). Getragen wird das von 21.020 Sprachzeilen, damit sich Dialoge nicht schnell wiederholen ([Nintendo Life](https://www.nintendolife.com/news/2020/12/supergiant_shares_hades_voiceover_stats_charon_hardly_gets_a_word_in)). Hades II wird dagegen vorgeworfen, seine Geschichte an den Rand zu drängen ([VGC](https://www.videogameschronicle.com/review/hades-2/)). Ohne Sprachaufnahmen bleibt eine günstige Variante [Einschätzung]: Bosssprüche aus `BOSS_LINES`, die von Begegnungszahl, Niederlagen, Held und Stufe abhängen; kurze Lore-Fragmente je Held; und ein „wahres Ende“ nach einer hohen Verdammnis-Stufe. Pro Ereignis genügen ein bis zwei Zeilen, und sie sollten sich überspringen lassen.

Sammelsysteme wirken, wenn leere Plätze sichtbar sind. Luca Galante, der Schöpfer von Vampire Survivors, bringt Belohnungsdesign aus der Glücksspielbranche mit und liefert laufend neue Geheimnisse nach ([The Conversation](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613)). Er hielt das Spiel einst für zwei Stunden gut, spielte es selbst rund 3.000 Stunden und sagt: „Kurze Spiele regieren“ ([GamesRadar](https://www.gamesradar.com/games/roguelike/on-steam-alone-i-probably-have-3-000-hours-nobody-loves-vampire-survivors-more-than-its-creator-who-once-thought-nobody-would-play-it-for-more-than-two-hours-and-ironically-says-short-games-rule)). Mit 16 Erfolgen und einem Bestiarium [Code] hat das Spiel die Basis für mehr [Einschätzung]: ein gestuftes Bestiarium (Silhouette, Eintrag, Lore, gemeistert), eine Prozentzahl für die Vervollständigung je Spielstand nach Hollow-Knight-Muster [ungeprüft] und versteckte „???“-Erfolge. Die nächste Stufe wäre ein langer, linearer Belohnungspfad nach dem Vorbild von Brawl Stars. Supercell will mit der überarbeiteten Trophäenstraße ausdrücklich mehr Spieler belohnen und binden ([Supercell](https://supercell.com/en/games/brawlstars/blog/news/rip-masteries)). Ein Saisonpass mit Pflichtaufgaben dagegen riskiert, dass sich das Spiel wie eine Pflicht anfühlt [Einschätzung].

| Übertragbare Idee | Vorbild | Nutzen | Aufwand |
|---|---|---|---|
| Verdammnis-Stufen 1–10 je Held mit je einem spürbaren Modifikator und einem Raster aus Held und Stufe; die NG+-Modifikatoren wiederverwenden | Slay the Spire, Balatro, Brotato | sehr hoch | gering bis mittel |
| Kosmetische Belohnungen je Stufe (Farbvariante, Rahmen, Titel) über das vorhandene Skin-System | Balatro-Sticker | hoch | gering |
| 10–15 „Prüfungen“ mit festen Regeln aus `DAILY_MODS`, nacheinander freigeschaltet | Herausforderungen in Balatro | hoch | gering |
| Tagesserie, Kalender, Wertung für den ersten Versuch, Wochenlauf mit Wochen-Seed | Spelunky, Dead Cells | hoch | gering bis mittel |
| Kopfgeld-Brett „Stufe N mit Held X“ mit einmaligem Seelenbonus | Hades | mittel bis hoch | gering |
| Bosssprüche, die vom Kontext abhängen; Lore je Held; wahres Ende | Hades | hoch für Story-Spieler | mittel (Schreibarbeit) |
| Maximum der Schmiede sichtbar machen, danach Seelen in Aspekte oder Kosmetik lenken | Hades (Schwelle, Aspekte) | mittel | gering bis mittel |
| Gestuftes Bestiarium, Vervollständigung in Prozent, versteckte Erfolge | Vampire Survivors, Hollow Knight [ungeprüft] | mittel | gering bis mittel |
| „Ruhmesweg“: langer Belohnungspfad aus dem Gesamtfortschritt | Brawl Stars | mittel bis hoch | mittel |

## Steigende Töne und geschichtete Musik tragen einfache Grafik

Ratgeber zum Spielgefühl einigen sich auf einen kleinen Werkzeugkasten: Bildschirmwackeln, Trefferstopp, Partikel, weiche Übergänge und eben Ton ([Wayline](https://www.wayline.io/blog/shake-spark-sound-level-up-your-game-feel)) [Indiz]. Wiederholung ermüdet; manche Spieler schalten repetitiven Spielton schlicht ab. Deshalb ist es Standard, mehrere Varianten pro Aktion abzuspielen, mit etwa ±10 % Tonhöhe und ±3 dB Lautstärke ([A Sound Effect](https://www.asoundeffect.com/game-audio-immersion/); [Game Audio Learning Portal](https://www.gameaudiolearning.com/knowledgebase/how-audio-is-manipulated-in-games)). Bestätigungstöne für kritische Treffer, Stufenaufstieg oder Aufsammeln sollen dagegen wiedererkennbar bleiben ([sfxengine](https://sfxengine.com/blog/common-game-audio-mistakes)) [Indiz]. Für Ton, der wie hier per Web Audio erzeugt wird, ist ein Patent aufschlussreich: Es empfiehlt synthetisierte Varianten statt veränderter Aufnahmen ([USPTO](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10453434)). Genau das kann synthetisierter Ton billig leisten [Einschätzung].

Balatro macht Ton zum Belohnungssignal. Die Punkte zählen mit eskalierenden Klängen hoch, während jede Karte und jeder Joker etwas beiträgt ([GMTK](https://gmtk.substack.com/p/balatros-cursed-design-problem)). Die Presse nennt die „kleinen Soundeffekte und Wackler“ einen sinnlichen Genuss ([GamesRadar](https://www.gamesradar.com/games/roguelike/after-winning-big-at-the-game-awards-and-taking-hours-of-our-time-in-2024-balatro-creator-reveals-their-most-productive-night-resulted-in-one-of-the-games-most-satisfying-features)). Vampire Survivors übertrug Galantes Erfahrung mit grellen Spielautomaten-Effekten auf das Bild und verdankt laut Galante viel seinem Soundtrack ([Wikipedia](https://en.wikipedia.org/wiki/Vampire_Survivors); [PC Gamer](https://pcgamer.com/vampire-survivors-saved-its-creator-from-working-on-mobile-gambling-games)). Dieser erschien inzwischen orchestral eingespielt auf Vinyl ([NME](https://www.nme.com/news/vampire-survivors-soundtrack-vinyl-iam8bit-3599674)). Die Forschung dazu ist dünn. Eine Studie von 2024 fand aber in einem von zwei Experimenten, dass Figurengeräusche Immersion, Identifikation mit der Figur und Spaß signifikant steigern ([MDPI](https://www.mdpi.com/2076-3417/14/2/583)).

Darren Korb setzt die meisten Hades-Stücke aus **acht Stems** zusammen, also Einzelspuren, die in beliebigen Kombinationen gleichzeitig laufen ([Vox Groovy](https://www.voxgroovy.is/archives/13829)). Erscheint ein Boss, wechselt das Stück in eine Hard-Rock-Variante mit härteren Drums und E-Gitarre ([Everything Is Noise](https://everythingisnoise.net/features/sound-test-darren-korb-and-supergiant-games/)). Eine gesungene Klageschicht bleibt dabei erhalten und macht das Stück erkennbar ([Soundtrack World](https://soundtrackworld.com/2020/10/hades-darren-korb/)). Celeste baut die Musik entlang des Levels in Schichten auf ([Game Audio Lookout](https://medium.com/game-audio-lookout/enhancing-gameplay-with-music-in-celeste-5da210bbc602)) [Indiz]. Spieler vermissten genau diese Anpassung in den Remixen der B-Seiten ([Steam-Diskussion](https://steamcommunity.com/app/504230/discussions/0/5170673756528380528)) [Indiz]. Risk of Rain 2 trennt Level- und Bossstücke, die sich in ihrer Intensität steigern ([Indie Game Fans](https://indiegamefans.com/soundtrack-spotlight-risk-of-rain-2-with-chris-christodoulou/); [PC Gamer](https://pcgamer.com/risk-of-rain-2s-excellent-moody-soundtrack-is-on-spotify-and-vinyl-now)).

Das Spiel hat acht synthetisierte Stücke: das Menü, je drei ruhige und drei Kampfstücke sowie ein gemeinsames Bossstück für alle sechs Bosse. Es wechselt die Stücke im Takt und senkt die Musik bei Sieg- und Niederlage-Fanfaren ab [Code]. Der Schritt zu Hades' Prinzip ist kurz [Einschätzung]: Schlagzeug, Bass, Melodie und Klangfläche bekommen eigene Lautstärkeregler (Gain-Knoten), die mit der Kampfintensität im Takt ein- und ausblenden. Und statt eines Bossstücks für alle gibt es eine Bossversion jedes Akt-Themas.

Einfache Grafik ist kein Hindernis, wenn Rückmeldung und Stil stimmen. Brotato kommt auf rund 96 % positive Steam-Bewertungen bei über 100.000 Rezensionen ([Mein-MMO](https://mein-mmo.de/en/over-150-hours-i-defeated-endless-alien-hordes-as-a-potato-on-steam-and-with-96-happy-players-im-not-alone,1553176)). Ein Nutzer schreibt, die Grafik sei einfach, aber bei dem Tempo merke man das nicht ([Gamebrain](https://gamebrain.co/game/brotato)) [Indiz]. Die häufigste Kritik an Brotato betrifft nicht die Optik, sondern die Wiederholung; Spieler wünschen sich, dass sich die Karte ab und zu ändert ([Tryhard Guides](https://tryhardguides.com/brotato-review/)) [Indiz]. Dead Cells erntet ähnliche Klagen über Grind und sich wiederholende Level ([Steam-Diskussion](https://steamcommunity.com/app/588650/discussions/0/1813170373215338482)) [Indiz].

Für eine Canvas-Grafik ohne Bilddateien folgt daraus [Einschätzung]: pro Akt eine begrenzte Palette und ein Musikmotiv, einheitliche Konturen und sichtbare Abwechslung durch Wetter, Publikum und Deko. Das Publikum kann außerdem als Belohnungskanal dienen, das bei großen Kombos jubelt und bei eigenen Treffern buht. Jubel per gefiltertem Rauschen und einen Stimmungswert gibt es bereits [Code].

| Übertragbare Idee | Vorbild | Nutzen | Aufwand |
|---|---|---|---|
| Aufsammel-Tonleiter: Gold oder Seelen in schneller Folge steigen um Halbtöne bis zur Oktave | Balatro | hoch | gering |
| Variation (±50–100 Cent, Filter) bei Treffergeräuschen, höchstens wenige gleiche Töne pro 50 ms; Kompressor (in Arbeit) | Audio-Praxis | hoch | gering |
| Musik bei Boss-Gebrüll und eigenem Treffer kurz absenken (Ducking) | Audio-Praxis | mittel | gering |
| Intensitätsschichten pro Akt, im Takt geschaltet; Bossversion des Akt-Themas statt eines Bossstücks für alle | Hades, Risk of Rain 2 | hoch | mittel |
| Kurze Fanfare beim Abschluss eines Raums, Variation bei Wiederholung eines Akts, Melodievarianten per Seed | Hades, Celeste | mittel | mittel |
| Publikum als Belohnungskanal: Jubel bei Kombos und Bosssiegen, Buhen bei Treffern | Ersatz für die Sprachzeilen von Hades | mittel | gering bis mittel |

## Sofortstart und Teilbarkeit sind der Browser-Vorteil, iOS bleibt die Hürde

Browser-Hits verbindet ein Muster: Man spielt ohne Installation und Anmeldung, die Kernschleife ist sehr kurz, und ein Verbreitungsweg ist eingebaut. Vampire Survivors entstand auf dem HTML5-Framework Phaser ([Phaser](https://phaser.io/news/2024/02/vampire-survivors-space-54)) und wurde durch ein YouTube-Video bekannt ([Wikipedia](https://en.wikipedia.org/wiki/Vampire_Survivors)). Erst später wechselte es zu Unity, weil die HTML5-Fassung auf Mobilgeräten und Konsolen nicht gut lief ([inkl](https://inkl.com/news/vampire-survivors-was-rebuilt-just-to-run-well-on-xbox-consoles)). Wordle verbreitete sich über ein spoilerfreies Emoji-Raster zum Kopieren, das Spieler schon vor dem Teilen-Knopf von Hand tippten ([Smithsonian](https://www.smithsonianmag.com/smart-news/heres-why-the-word-game-wordle-went-viral-180979439/)), und über ein gemeinsames Rätsel pro Tag ohne App, Anmeldung oder Werbung ([Boston Globe](https://www.bostonglobe.com/2022/01/09/lifestyle/what-is-wordle-why-is-everyone-twitter-playing-it)).

Spieleportale messen die Reibung genau. Poki verlangt höchstens 8 MB für den Erst-Download, einen sichtbaren Ladebalken und schrittweises Laden ([Poki](https://sdk.poki.com/requirements); [Poki for Developers](https://developers.poki.com/guide/easy-access)). Als solide gilt, wenn über 70 % der Besucher tatsächlich zu spielen beginnen ([Poki for Developers](https://developers.poki.com/guide/easy-access)); eine ältere Poki-Folie ordnet einem Download von 10 MB etwa 60 % zu ([Poki-Folien](https://docs.google.com/presentation/d/1RTgAgBiJN4TW_D7Ax_qxpVOgP5Roxnou4Gx9G8MF9cQ/htmlpresent)). CrazyGames verlangt für die Mobil-Startseite weniger als 20 MB ([CrazyGames](https://docs.crazygames.com/requirements/technical)). Ein Spiel ohne Grafik- und Tondateien liegt weit darunter. Entscheidender ist die Zeit bis zur ersten Eingabe auf einem schwachen Handy, während Boden, Sprites und Publikum vorberechnet werden [Einschätzung].

Ausgerechnet den stärksten Browser-Hebel nutzt das Spiel noch nicht: Es gibt weder einen Teilen-Text noch Links mit Seed [Code]. Ein Ergebnis wie „Arena der Verdammten · Tagesherausforderung 2.11.2026 · Akt 3, Raum 14“ mit Emoji-Zeile und Link, geteilt per `navigator.share` oder über die Zwischenablage, kostet wenig. Ein Link mit Seed, Held und Modifikator ließe Freunde exakt denselben Lauf spielen [Einschätzung]. Für das Teilen eines Bildes bietet die Web Share API auch Dateien an, nach einer Prüfung mit `canShare` ([web.dev](https://web.dev/articles/files/share-files)).

Für die Canvas-Leistung nennt MDN die Standardliste ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)): Wiederkehrendes vorab in Offscreen-Canvas zeichnen, Skalieren in `drawImage` vermeiden, ganzzahlige Koordinaten verwenden, Ebenen trennen, `alpha:false` setzen, Aufrufe bündeln, `shadowBlur` und Textzeichnen meiden und `requestAnimationFrame` nutzen. Die Gerätepixeldichte (DPR) vervielfacht die zu füllenden Pixel mit ihrem Quadrat [Einschätzung]. Das Spiel setzt die wichtigsten Punkte bereits um [Code]:

- Die DPR ist auf 2 (hohe Grafikstufe) bzw. 1,25 (niedrige Grafikstufe) begrenzt.
- Die Lichtkarte wird in halber Auflösung aus einem vorgerenderten Licht-Sprite gebaut.
- Das Publikum besteht aus vorgerenderten Sprites, wird auf den sichtbaren Bereich beschnitten und bei niedriger Grafikstufe halbiert.

Übrig ist der Heldenumriss, der jedes Bild per `shadowBlur` gezeichnet wird [Code]. Für einen Wechsel auf WebGL spricht wenig. Angaben wie „100.000 Sprites mit 60 Bildern pro Sekunde“ für PixiJS nennen keine Hardware ([learnwithhasan](https://learnwithhasan.com/js-libraries/pixi-js/)) [Indiz]. Ein Community-Benchmark warnt selbst, dass WebGL bei einfachem 2D kaum schneller sein muss ([GitHub](https://github.com/Shirajuki/js-game-rendering-benchmark)). Zudem verstößt jede Bibliothek gegen die Projektregel. Vor solchen Schritten sollte gemessen werden [Einschätzung].

Auf iOS liegen die eigentlichen Hürden:

- **Bildrate:** Safari drosselt `requestAnimationFrame` im Stromsparmodus und in fremden iframes bis zum ersten Tippen auf 30 Bilder pro Sekunde ([Motion](https://motion.dev/blog/when-browsers-throttle-requestanimationframe)). Höhere Bildwiederholraten ab 90 Hz kosten mehr Strom ([WebKit-Bug 202269](https://www2.webkit.org/show_bug.cgi?id=202269)). Die Teilschritte der Spielschleife fangen schwankende Bildraten bereits ab [Code].
- **Speicher:** Safari löscht Speicher, den Skripte angelegt haben, nach 7 Tagen ohne Interaktion mit der Seite; Web-Apps auf dem Home-Bildschirm sind davon angeblich ausgenommen ([Michael Tsai](https://mjtsai.com/blog/?p=28475)). Ob `navigator.storage.persist()` auf iOS hilft, ist umstritten ([swoff](https://swoff.netlify.app/docs/concepts/ios-safari-limitations); [Apple Developer Forums](https://developer.apple.com/forums/thread/710157)) [Indiz]. Web-Apps auf dem Home-Bildschirm bleiben auch in der EU erhalten, nachdem Apple seine Pläne im März 2024 zurückgenommen hat ([MacRumors](https://www.macrumors.com/2024/03/01/apple-walks-back-decision-to-disable-eu-web-apps/)).
- **Vibration und Vollbild:** Vibration gibt es in keinem WebKit-Browser ([W3C](https://w3c.github.io/vibration/reports/implementation.html)). Das Element-Vollbild fehlt auf dem iPhone, damit auch die Sperre der Bildschirmausrichtung ([WebKit-Bug 257695](https://bugs.webkit.org/show_bug.cgi?id=257695)).
- **Bildschirm wach halten:** Zur Wake Lock API widersprechen sich die Angaben, von iOS 16.4 bis 18.4 und mit unklarer Lage in Home-Bildschirm-Apps ([caniuse](https://caniuse.com/wake-lock); [whatpwacando](https://whatpwacando.today/wake-lock)).
- **Ton:** Web Audio wechselt beim Verlassen der Seite in den Zustand „interrupted“ und muss fortgesetzt werden ([MDN](https://developer.mozilla.org/docs/Web/API/BaseAudioContext/state)). Mehrere WebKit-Fehler beschreiben eine Audio-Engine, die „running“ meldet und trotzdem stumm bleibt ([WebKit-Bug 291892](https://bugs.webkit.org/show_bug.cgi?id=291892); [WebKit-Bug 283419](https://bugs.webkit.org/show_bug.cgi?id=283419)).

Der letzte Commit setzt den Ton bei jeder Eingabe fort, pausiert beim Verstecken der Seite und beschriftet die Vibration mit „nur Android“ [Code]. Die Arbeitskopie ergänzt gerade, noch nicht committet [Code]: einen Kompressor für Soundeffekte, `navigator.storage.persist()`, Wake Lock während des Kampfes und den Neuaufbau der Audio-Engine nach dem Hintergrund.

Offen bleiben drei Punkte [Einschätzung]: ein Hinweis „Zum Home-Bildschirm hinzufügen“ für Safari-Nutzer, der Spielstände schützt und Bildfläche bringt; ein Akkusparmodus mit 30 Bildern pro Sekunde samt Bildratenbremse auf 120-Hz-Geräten; und eine automatisch sinkende Grafikstufe bei Dauerlast. Poki testet Spiele vor und nach dem Start in eigenen Playtests und „Web Fit Tests“ ([Poki-Blog](https://poki.com/blog/how-we-made-cannon-clash-load-fast-and-boosted-conversion)). Die vorhandenen Headless-Tests mit Bot können Ähnliches leisten: mit einem Leistungstest bei gedrosselter CPU und einem Größenbudget für `dist/` [Einschätzung].

| Übertragbare Idee | Vorbild | Nutzen | Aufwand |
|---|---|---|---|
| Teilen-Text der Tagesherausforderung (Emoji-Zeile, Datum, Link) über `navigator.share` oder die Zwischenablage | Wordle | hoch (Reichweite) | gering |
| Links mit Seed, Held und Modifikator: „Spiel genau meinen Lauf“ | Wordle, Spelunky | mittel bis hoch | gering bis mittel |
| Heldenumriss vorrendern statt `shadowBlur` in jedem Bild | MDN | mittel | gering |
| Akkusparmodus (30 Bilder pro Sekunde), Bildratenbremse auf 120-Hz-Geräten, automatische Grafikstufe bei Dauerlast | WebKit, Poki | mittel | gering bis mittel |
| iOS-Hinweis „Zum Home-Bildschirm hinzufügen“ samt Erinnerung an den Sicherungscode | Speicherregel von WebKit | mittel | gering |
| Leistungstest mit gedrosselter CPU und Größenbudget in der CI | Web Fit Tests von Poki | mittel | mittel |
| Ergebniskarte als Bild über die Web Share API teilen | web.dev | mittel | mittel |
| Wechsel auf WebGL oder PixiJS | – | unklar | hoch, verstößt gegen die Regel „ohne Bibliotheken“ |

## Fazit

Der Abgleich von Recherche und Code verschiebt die Ausgangsfrage. Die Notizen empfahlen vieles, was das Spiel bereits kann: Dash-Werte im Bereich von Hades, Schutzzeit nach Treffern, dosierten Trefferstopp, Formen im Farbenblind-Modus, begrenzte DPR und Lichtkarte in halber Auflösung, heldenspezifische und regelverändernde Upgrades sowie eine gedeckelte Schmiede mit Ausgleich bei den Bossen. Der nächste Qualitätssprung kommt deshalb nicht aus neuen Gegnern oder Bossen. Er kommt aus dünnen Schichten über Vorhandenem, die die Inhalte in dreierlei Hinsicht verbessern:

- **lesbar** machen: Gefahrenfarbe, Bodenwarnungen, Synergie-Fortschritt, Zahlenvorschau,
- **verzeihend** machen: Eingabepuffer, Hilfsmodus, Tempo unter 1,
- **zielbildend** machen: Verdammnis-Stufen je Held, Prüfungen, Tagesserie.

Diese Schichten sind meist klein, lassen sich einzeln ausliefern und mit dem Bot prüfen. Zugleich verlangt Habbys Prinzip der tröpfchenweisen Freischaltung, dass jedes neue System erst nach dem ersten Lauf auftaucht. Sonst verstopfen gute Ideen genau die ersten fünf Minuten, auf die es bei Sitzungen von 5–9 Minuten ankommt.

Zwei Einsichten gehen über die Vorbilder hinaus. Erstens hat das Genre fast keine veröffentlichten Zahlen, weder zu Vorwarnzeiten noch zu Ausweichdauern oder Belohnungsfrequenzen. Der vorhandene Headless-Bot ist deshalb mehr als ein Testwerkzeug. Er kann Faustregeln in projekteigene Messwerte verwandeln: Treffer pro Gegnertyp, Siegquote je Held und Stufe, die Wirkung einer voll ausgebauten Schmiede. Damit übernimmt er ohne Server die Rolle, die bei Mega Crit die Messdaten spielten. Zweitens nutzt keines der nativen Vorbilder den Vorteil, den nur ein Browserspiel hat: Ein Link startet in Sekunden genau denselben Lauf. Wordle zeigt, dass ein spoilerfreies Ergebnis zum Kopieren ein tägliches Spiel tragen kann. Ob das bei Actionspielen ebenso wirkt, ist unbelegt. Als günstigste Wachstumsmaßnahme für die Tagesherausforderung bietet es sich trotzdem an.

## Priorisierte Gesamtliste der vielversprechendsten Ideen

Die Rangfolge wägt den erwarteten Nutzen für Spielbarkeit und Bindung gegen den Aufwand ab und bevorzugt Ideen, die vorhandene Systeme wiederverwenden. Die Spalte „Beleglage“ beschreibt, wie gut das zugrunde liegende Prinzip gestützt ist, nicht die genannten Zahlenwerte. Alle Angaben zu Nutzen und Aufwand sind [Einschätzung].

Nicht aufgeführt sind Punkte, die der Code bereits erfüllt, und solche, die in der Arbeitskopie gerade entstehen: Speichern des laufenden Raums, Wake Lock, Kompressor, `storage.persist()` und Neuaufbau der Audio-Engine nach dem Hintergrund. Bewusst nicht empfohlen werden Machtschranken nach Art von Archero, Werbung und Energiesysteme, Saisonpässe mit Pflichtaufgaben, Schwierigkeitsstufen mit reinem Zuwachs bei den Werten und ein Wechsel auf WebGL.

| Rang | Idee | Vorbild | Nutzen | Aufwand | Beleglage des Prinzips |
|---|---|---|---|---|---|
| 1 | Eingabepuffer (≈ 120 ms) für Ausweichen und Fähigkeit | Celeste, Dead Cells | hoch | sehr gering | gut; der Wert ist ungeprüft |
| 2 | Einheitliche Gefahrensprache: Kontrastring für alle feindlichen Geschosse auch im Normalmodus, reservierte Gefahrenfarbe, feindliche Angriffe über den eigenen Effekten | Bright, slow and deadly; Into the Breach | hoch | gering | gut |
| 3 | Hilfsmodus „Gnade der Götter“ (wachsende Schadensreduktion pro Niederlage, abschaltbar), Tempo 0,8, Standardtempo 1,0 | Celeste, Hades | hoch | gering | gut (für Hades nur Indiz) |
| 4 | Teilen-Text und Serie für die Tagesherausforderung, Link mit Seed | Wordle, Spelunky | hoch | gering | gut für Wordle; bei Actionspielen unbelegt |
| 5 | Verdammnis-Stufen 1–10 je Held mit spürbaren Modifikatoren, Raster aus Held und Stufe, kosmetische Belohnungen | Slay the Spire, Balatro, Brotato | sehr hoch | gering bis mittel | gut |
| 6 | Synergie-Teilfortschritt „1/2“, Codex mit „???“, Ausbau auf 10–15 Synergien | Hades, Enter the Gungeon, Vampire Survivors | hoch | gering bis mittel | gut |
| 7 | Bodenwarnungen mit Füllanzeige für alle Flächen- und Bossangriffe, Mindestvorwarnzeit per Bot gemessen | Into the Breach | hoch | mittel | Prinzip gut; Zeiten ungeprüft |
| 8 | 10–15 „Prüfungen“ mit festen Regeln aus `DAILY_MODS` | Balatro | hoch | gering | mittel |
| 9 | Aufsammel-Tonleiter, Variation der Treffergeräusche mit Obergrenze gleicher Töne, Ducking | Balatro, Audio-Praxis | hoch | gering | mittel |
| 10 | Bot-gestützte Messung von Balance und Fairness (Siegquote je Held und Stufe, Treffer je Gegnertyp, Test mit voller Schmiede) plus lokale Wahlquoten | Mega Crit | hoch (für die Entwicklung) | mittel | gut |
| 11 | Intensitätsschichten der Musik pro Akt und eine Bossversion jedes Akt-Themas | Hades, Risk of Rain 2 | hoch | mittel | gut |
| 12 | Bossphasen schärfen: Geschosse löschen, Musik wechseln, ein bis zwei neue Angriffe, Musterfolge per Seed, Belohnung für trefferlose Siege | Hollow Knight, Gungeon | hoch | mittel | mittel (Gungeon ungeprüft) |
| 13 | Hinweise nach Bedarf und tröpfchenweise Freischaltung der Meta-Systeme nach dem ersten Lauf | Habby, Silksong | hoch | mittel | mittel |
| 14 | Lagerfeuer mit dritter Option „Upgrade entfernen oder verwandeln“ | Slay the Spire | mittel bis hoch | gering | gut |
| 15 | Kopfgeld-Brett „Stufe N mit Held X“ | Hades | mittel bis hoch | gering | gut |
| 16 | Bosssprüche, die vom Kontext abhängen, und Lore je Held | Hades | mittel bis hoch | mittel | gut |
| 17 | Evolutionen des Heldenangriffs in Schatz- und Bosstruhen | Vampire Survivors | hoch | mittel | mittel |
| 18 | Rollen-Audit der 22 Gegner, neue Typen einzeln einführen | Skylanders, Dead Cells | mittel bis hoch | mittel | mittel |
| 19 | Zahlenvorschau und Stufe auf den Upgrade-Karten; Schadenszahlen in drei Stufen | Into the Breach | mittel | gering | gut bzw. Indiz |
| 20 | Akkusparmodus, Bildratenbremse bei 120 Hz, Heldenumriss ohne `shadowBlur` | MDN, WebKit | mittel | gering | gut |
| 21 | iOS-Hinweis „Zum Home-Bildschirm hinzufügen“ zum Schutz der Spielstände | Speicherregel von WebKit | mittel | gering | mittel (Quellen widersprüchlich) |
| 22 | Unterschiedliche, vorab sichtbare Belohnungen für Kampfknoten | Hades, Slay the Spire | mittel bis hoch | mittel | schwach (ungeprüft) |
| 23 | Sichtbare Zielmarkierung und für die Fähigkeit „tippen = automatisch, ziehen = zielen“ | Brawl Stars, Soul Knight | mittel | gering bis mittel | mittel |
| 24 | „Ruhmesweg“ als langer Belohnungspfad | Brawl Stars | mittel bis hoch | mittel | mittel (erklärte Absicht, kein Messwert) |
