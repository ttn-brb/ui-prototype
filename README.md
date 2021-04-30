# TTN BRB UI Prototyp

> Web-Oberfläche für Prototyp des Brandenburger TTN Portals

## Schnellstart

```sh
npm i
npm run build
npm start
```

## Entwicklung

Bevorzugte IDE ist Visual Studio Code.

Automatisches kompilieren mit TypeScript: Strg + Umschalt + T → `tsc: watch`

Beispiel für das Starten mit Befehlszeilenargumenten:

```sh
node build/cli.js --port 88 --host 192.168.77.2 --verbose
```

## Umgebungsvariablen

Das Verhalten des Servers kann durch Umgebungsvariablen gesteuert werden.

* `SNAPSHOT_INTERVAL`
  Das Intervall in dem Daten vom Zeitreihenserver abgefragt und im Arbeitsspeicher zwischengespeichert werden.
  Standard ist `PT1M` = 1 Minute.
* `DISPLAY_RANGE`
  Der Zeitraum der abgefragt werden soll.
  Standard ist `P7D` = 7 Tage.
* `DISPLAY_WINDOW`
  Die zeitliche Auflösung der Daten. Feiner aufgelöste Daten werden gemittelt.
  Standard ist `PT1H` = 1 Stunde.

Die zu Demonstrationszwecken zufällig erzeugten Messwerte können mit den folgenden Umgebungsvariablen gesteuert werden:

* `DEMO_SAMPLE_INTERVAL`
  Das Intervall in dem zufällige Daten in den Zeitreihenserver geschrieben werden.
  Standard ist `PT1H` = 1 Stunde.
* `DEMO_SAMPLE_PROPABILITY`
  Die Wahrscheinlichkeit für Messwerte in Prozent.
  Standard ist 90.

Alle Intervalle werden als _ISO 8601 Duration_ angegeben.
Beispiele:

2 Wochen und 3 Tage &rarr; `P2W3D`
(lies: **P**eriod of **2** **W**eeks and **3** **D**ays),  
1 Jahr, 8 Stunden und 33 Sekunden &rarr; `P1YT8H33S`
(lies: **P**eriod of **1** **Y**ear plus **T**ime of **8** **H**ours and **33** **S**econds),  
5 Minuten &rarr; `PT5M`
(lies: **P**eriod of **T**ime of **5** **M**inutes)

## Lizenz

MIT
