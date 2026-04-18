---
layout: page
title: "OpenWebRX+ Receiver Plugin: Frequency-Scanner"
permalink: /receiver/freq_scanner
---

Dieses `receiver` Plugin fügt OpenWebRX+ einen leistungsstarken Frequenz-Scanner hinzu. Es nutzt **FFT-basiertes "Virtuelles Scanning"**, um Wasserfalldaten zu analysieren und direkt zu aktiven Signalen zu springen. Es enthält Funktionen wie eine Blacklist, Filterung digitaler Signale und verschiedene Scan-Modi.

## Vorschau

![freq_scanner Preview](https://0xaf.github.io/openwebrxplus-plugins/receiver/freq_scanner/freq_scanner.jpg)

## Laden

Füge diese Zeile in deine `init.js` Datei ein:

```js
// Remote (Github)
Plugins.load('https://0xaf.github.io/openwebrxplus-plugins/receiver/freq_scanner/freq_scanner.js');
// Lokal
Plugins.load('freq_scanner');
```

## Bedienung

Ein kleiner **SC**-Button wird unten links im Receiver-Panel hinzugefügt. Ein Klick auf diesen Button öffnet ein verschiebbares Fenster mit der Scanner-Anzeige und den Steuerelementen.

### Status des SC-Buttons
* **Grau**: Scanner ist gestoppt und das Fenster ist geschlossen.
* **Grün**: Das Scanner-Fenster ist geöffnet.
* **Gelb**: Der Scanner läuft im Hintergrund ODER "Always Show Blocked Ranges" ist aktiv (Fenster geschlossen).
* **Gelber Rand**: Der Modus "Edit Blocks" ist aktiv (Bereiche können verschoben/geändert werden).

### Scanner-Anzeige
Der Anzeigebereich nutzt rote Schrift auf tiefblauem Hintergrund:
* **Ready**: Der Scanner ist momentan gestoppt.
* **Scanning...**: Der Scanner sucht aktiv nach Signalen.
* **Frequenz / Name**: Wenn ein Signal erkannt wird, wird die Frequenz angezeigt. Stimmt die Frequenz mit einem Lesezeichen überein, wird stattdessen der Name des Lesezeichens angezeigt.
* **wait**: Eine kleine "wait"-Anzeige erscheint, wenn der Scanner während der Verzögerungszeit (nach Signalverlust) auf einer Frequenz wartet, bevor er den Scan fortsetzt.

### Schaltflächen im Scanner-Fenster
* **Scan**: Startet oder stoppt den Suchlauf.
    * **Langer Klick (> 800ms)**: Öffnet das Menü **Scan Options** (gekennzeichnet durch ein Dreieck).
* **Skip**: Überspringt die aktuelle Frequenz (nur aktiv, wenn der Suchlauf läuft).
* **Block**: Fügt die aktuelle Frequenz der Blacklist hinzu.
    * **Langer Klick (> 800ms)**: Öffnet das Menü **Block Options** (gekennzeichnet durch ein Dreieck).
* **Setup**: Öffnet das Menü **Scanner Setup & Blacklist**.

### Scan-Optionen (Scan-Button)
* **Scan-Modi**:
    * **Normal (Carrier)**: Bleibt auf der Frequenz, solange ein Signal vorhanden ist (plus eine kurze Verzögerung).
    * **Stop on signal**: Stoppt den Suchlauf komplett, wenn ein Signal gefunden wird.
    * **10s Sample**: Hört 10 Sekunden lang zu und setzt den Suchlauf dann unabhängig vom Signal fort.
* **Erkennungslogik (Detection Logic)**:
    * **Standard (Squelch)**: Einfache Erkennung basierend auf dem Squelch-Regler der Benutzeroberfläche.
    * **Width Filter (<= Bandwidth)**: Intelligente Erkennung, die sich an die aktuelle Filterbreite (z. B. NFM, AM) anpasst. Signale, die breiter als der Filter oder schmaler als 20% davon sind, werden ignoriert. Enthält eine **Plateau-Erkennung** zum Überspringen von breitem Rauschen und eine **Split-Peak-Erkennung** für digitale Twin-Carrier-Signale.
* **Ignore Squelch Slider (Auto)**: Nur im Modus "Width Filter" verfügbar. Ignoriert den manuellen Squelch-Regler und nutzt einen internen SNR-basierten Schwellenwert, um auch sehr schwache Signale automatisch zu finden.
* **Delay**: Legt die Wartezeit nach Signalverlust fest (Standard, 5s, 10s).
* **Dwell Time**: Schieberegler zum Einstellen der Zeit, die der Scanner auf einer Frequenz verweilt, um ein Signal zu verifizieren, bevor er zum nächsten Peak springt.
* **Filter: Only Analog**: Überspringt automatisch Frequenzen, die in den Lesezeichen als digital markiert sind (DMR, YSF, D-Star, etc.).

### Block-Optionen (Block-Button)
* **Clear Visible Blocked Ranges**: Entfernt alle Blacklist-Einträge, die derzeit in der Wasserfall-Ansicht sichtbar sind.
* **Remove Blocked Range**: Ermöglicht das Entfernen eines blockierten Bereichs durch Anklicken im Wasserfall.
* **Block Range**: Ermöglicht die Auswahl eines Frequenzbereichs im Wasserfall, der blockiert werden soll (Klicken und Ziehen).

### Scanner-Setup (Setup-Button)
* **Always Show Blocked Ranges**: Visualisiert blockierte Frequenzen als farbige Balken im Wasserfall, auch wenn der Scanner nicht läuft.
* **Edit Blocks (Move/Resize)**: Erlaubt das interaktive Verschieben und Ändern der Größe von Blöcken direkt im Wasserfall.
* **Color Picker**: Farbauswahl für die Visualisierung der blockierten Bereiche.
* **Export / Import Plugin Settings**: Speichert oder lädt die Plugin-Konfiguration inklusive der Blacklist (JSON).
* **Manage Blacklist**: Öffnet einen Dialog zur manuellen Verwaltung der Blacklist-Einträge.
* **Clear Blacklist**: Löscht alle blockierten Frequenzen.
* **Audio Sync**: Regler zur Einstellung der Synchronisationsverzögerung (überbrückt kurze Signalaussetzer).
* **Bookmark Tolerance**: Regler zur Einstellung der Toleranz für die Übereinstimmung mit Lesezeichen.

### Interaktion & Leistung
* **Smarte Analyse**: Der Scanner ist hochgradig CPU-effizient, da er direkt auf die Wasserfalldaten zugreift.
* **Virtuelles Scanning**: Der Scanner "teleportiert" direkt zu Signal-Peaks, was langsames lineares Abstimmen überflüssig macht.
* **Hysterese**: Sobald ein Signal eingerastet ist, wird der Schwellenwert intern leicht gesenkt, um einen stabilen Empfang bei Fading zu gewährleisten.
* **DC-Spike Schutz**: Technische Störungen auf der Mittenfrequenz (+/- 1,5 kHz) werden automatisch ignoriert.
* **Dynamische Schrittweite**: Der Scanner berechnet die optimale Sprungweite automatisch basierend auf der **doppelten aktuellen Filterbandbreite**.

## Lizenz
MIT
