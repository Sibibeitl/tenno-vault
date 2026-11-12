# Tenno Vault V5

## Was neu ist

- Der Timer ist entfernt. Der Ablauf ist jetzt: Foto machen -> kurze Wartezeit -> Ergebnis mit dem wertvollsten Gegenstand.
- Erkennung versteht deutsche UND englische Itemnamen. Beim Laden werden beide Namen aus der Warframe.market-Itemliste geholt, OCR laeuft mit englischen und deutschen Sprachdaten.
- Preisermittlung mit Ausreisser-Schutz: bei mindestens drei Angeboten wird der zweitniedrigste Preis genommen, damit ein einzelnes Billigangebot das Ergebnis nicht verzerrt.

## Bedienung im Relikt-Modus

1. Belohnungsbildschirm fotografieren (auch mehrere Fotos nacheinander moeglich).
2. Die erkannten Namen erscheinen im Textfeld und koennen korrigiert werden.
3. Die App wertet aus und zeigt oben den wertvollsten Gegenstand.

## Grenzen

- Die Auswertung stuetz sich auf die guenstigsten Verkaufsangebote. Der angezeigte Preis ist eine Schaetzung, kein garantierter Verkaufspreis.
- Bei sehr unscharfen Fotos kann die Erkennung Namen verwechseln. Das Textfeld bleibt deshalb immer editierbar.
- Anfragen laufen gedrosselt (340 ms Abstand), um das Limit von 3 pro Sekunde einzuhalten.
