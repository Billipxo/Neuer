# Arena der Verdammten

Ein Fantasy-Roguelike-Arenaspiel für das Handy. Es läuft komplett im Browser, ohne Installation und ohne Abhängigkeiten.

## Spielen

`index.html` im Browser öffnen. Am Handy geht das am besten über GitHub Pages:
**Settings → Pages → Branch auswählen → Save**. Danach die Seite im Handy-Browser öffnen und über
„Zum Home-Bildschirm hinzufügen“ wie eine App starten. Nach dem ersten Laden funktioniert das Spiel auch offline.

## Steuerung

- **Bewegen:** irgendwo auf den Bildschirm tippen und ziehen (schwebender Joystick)
- **Angriff:** automatisch auf den nächsten Gegner in Sichtlinie
- **Ausweichen 💨:** kurzer Hechtsprung mit Unverwundbarkeit
- **Fähigkeit:** großer runder Knopf unten rechts
- Tastatur: WASD / Pfeiltasten, Leertaste = Fähigkeit, Umschalt = Ausweichen, Esc = Pause

Im allerersten Raum führt ein kurzes Tutorial durch die Steuerung.

## Inhalt

- **4 Helden:** Krieger, Magierin, Jägerin und Nekromantin, jeweils mit eigener Angriffsart, Fähigkeit und eigenen Upgrades
- **3 Akte** (Verliese, Krypta, Drachenhort), jeder mit einer Karte voller Abzweigungen:
  Kampf, Elite, Händler, Lagerfeuer, Schatz, Ereignis und am Ende ein Boss mit Wutphase
  (Steingolem, Lichkönig, Drache Ignaroth)
- **Arenen mit Hindernissen:** Säulen als Deckung, Sprengfässer, Stachelfallen und Lava
- **10 Gegnertypen** (u. a. Schildträger, Heiler, Grabwurm, Mimic) plus Elite-Varianten
- **35 Upgrades** in drei Seltenheitsstufen, davon 12 heldenspezifische, dazu **5 Synergien**,
  die beim Kombinieren bestimmter Upgrades aktiv werden. Die Upgrade-Karten zeigen die genaue Werteänderung.
- **8 Ereignisse** mit Entscheidungen zwischen Risiko und Belohnung
- **Endlosmodus** nach dem Sieg über den Drachen
- **Tägliche Herausforderung:** jeden Tag dieselbe Karte für alle, mit Held und Modifikator des Tages
- **Meta-Fortschritt:** Seelen bleiben erhalten und gehen in die Schmiede (6 dauerhafte Upgrades) oder in neue Helden
- **Ruhmeshalle** mit den 10 besten Läufen; laufende Abenteuer werden auf der Karte automatisch gespeichert
- Atmosphärische Arenen: dynamisches Licht und Schatten, Fackeln und Feuerbecken, Nebel, Funken,
  Kleintiere (Ratten, Spinnen, Feuersalamander) und je Akt eigene Bodendetails
- **Tribünen mit Zuschauern** (Menschen und Goblins, Skelette und Geister, Teufelchen und Kultisten),
  die auf deine Kämpfe reagieren, jubeln und dir Gold oder Heilung zuwerfen
- **Wetter** je Raum: Regen, Gewitter mit Blitzeinschlägen, Nebel, Schnee, Ascheregen und Feuersturm
- Prozedurale Musik und Soundeffekte (Web Audio), Hit-Stop, Zeitlupe bei Tod und Boss-Sieg
- Einstellungen für Sound, Musik, Atmosphäre und Licht, Bildschirmwackeln und Vibration

## Dateien

- `index.html`: das komplette Spiel (Canvas-Grafik, Logik, Oberfläche)
- `sw.js`: Service Worker für den Offline-Modus
- `manifest.webmanifest`, `icon.svg`: für die Installation als App
