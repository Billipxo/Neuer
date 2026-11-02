# Arena der Verdammten

Ein Fantasy-Roguelike-Arenaspiel für das Handy. Es läuft komplett im Browser, ohne Installation und ohne Abhängigkeiten.

## Spielen

`index.html` im Browser öffnen. Am Handy geht das am besten über GitHub Pages:
**Settings → Pages → Branch auswählen → Save**. Danach kann man die Seite im Handy-Browser öffnen und über
„Zum Home-Bildschirm hinzufügen“ wie eine App starten.

## Steuerung

- **Bewegen:** irgendwo auf den Bildschirm tippen und ziehen (schwebender Joystick)
- **Angriff:** automatisch auf den nächsten Gegner
- **Fähigkeit:** runder Knopf unten rechts
- Tastatur: WASD / Pfeiltasten, Leertaste = Fähigkeit, Esc = Pause

## Inhalt

- **3 Helden:** Krieger (Nahkampf, Wirbelwind), Magierin (zielsuchende Explosivgeschosse, Frostnova), Jägerin (durchbohrende Pfeile, Pfeilhagel)
- **3 Akte:** Die Verliese, Die Krypta, Der Drachenhort. Jeder Akt hat eine eigene Karte mit Abzweigungen:
  Kampf, Elite, Händler, Lagerfeuer, Schatz und am Ende einen Boss (Steingolem, Lichkönig, Drache Ignaroth)
- **21 Upgrades** in drei Seltenheitsstufen, z. B. Feuerkugeln, Kettenblitz, Explosive Seelen, Phönixfeder
- **7 Gegnertypen**, dazu Elite-Varianten mit Krone
- **Meta-Fortschritt:** Seelen bleiben nach jedem Lauf erhalten und gehen in die Schmiede (6 dauerhafte Upgrades) oder in neue Helden
- **Ruhmeshalle:** die 10 besten Läufe, lokal gespeichert
- Ein laufendes Abenteuer wird auf der Karte automatisch gespeichert und lässt sich fortsetzen

Alles steckt in `index.html` (Canvas-Grafik, synthetische Soundeffekte per Web Audio).
